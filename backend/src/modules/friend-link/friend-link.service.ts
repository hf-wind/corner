import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { AiService } from '../ai/ai.service';
import { CreateFriendApplicationDto } from './dto/create-friend-application.dto';

@Injectable()
export class FriendLinkService {
  private readonly logger = new Logger(FriendLinkService.name);

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private emailService: EmailService,
    private notificationService: NotificationService,
    private aiService: AiService,
  ) {}

  async getMySiteInfo() {
    const data = await this.settings.get('my_site_info');
    if (!data) {
      return {
        name: '清欢小筑',
        url: 'https://corner.example.com',
        description: '一个热爱生活的小角落',
        avatar: '',
        rssUrl: '',
      };
    }
    return typeof data === 'string' ? JSON.parse(data) : data;
  }

  async updateMySiteInfo(data: Record<string, any>) {
    return this.settings.set('my_site_info', JSON.stringify(data));
  }

  async createApplication(dto: CreateFriendApplicationDto) {
    const existing = await this.prisma.friendApplication.findFirst({
      where: {
        siteUrl: dto.siteUrl,
        status: { in: ['pending', 'approved'] },
      },
    });

    if (existing) {
      throw new BadRequestException('该站点已提交过申请，请勿重复提交');
    }

    const application = await this.prisma.friendApplication.create({
      data: {
        siteName: dto.siteName,
        siteUrl: dto.siteUrl,
        siteAvatar: dto.siteAvatar,
        siteDescription: dto.siteDescription,
        siteRssUrl: dto.siteRssUrl,
        contactEmail: dto.contactEmail,
        friendPageUrl: dto.friendPageUrl,
        status: 'pending',
      },
    });

    this.moderateAndProcess(application).catch((err) => {
      this.logger.error('AI 友联审核流程异常:', err);
    });

    return application;
  }

  private async moderateAndProcess(application: any) {
    this.logger.log(`开始审核友联申请: ${application.id}`);
    try {
      const siteInfo = await this.getMySiteInfo();
      const review = await this.aiService.moderateFriendSite(
        application.siteUrl,
        application.friendPageUrl,
        siteInfo.url,
      );
      this.logger.log(`AI 友联审核结果: ${JSON.stringify(review)}`);

      await this.prisma.friendApplication.update({
        where: { id: application.id },
        data: {
          aiReview: review.reason,
          aiReviewResult: review.approved ? 'approved' : 'rejected',
          status: review.approved ? 'approved' : 'rejected',
          rejectReason: review.approved ? null : review.reason,
        },
      });

      if (review.approved) {
        await this.addToFriends(application);
        await this.sendApplicationResultEmail(application, true);
      } else {
        await this.sendApplicationResultEmail(application, false, review.reason);
      }
    } catch (error) {
      this.logger.error('AI 友联审核流程异常:', error);
      await this.prisma.friendApplication.update({
        where: { id: application.id },
        data: {
          status: 'pending',
          aiReview: 'AI 审核异常，等待人工审核',
        },
      });
    }
  }

  private async addToFriends(application: any) {
    const raw = await this.settings.get('friends');
    const friends: any[] = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];

    const exists = friends.some((f: any) => f.siteUrl === application.siteUrl);
    if (!exists) {
      friends.push({
        siteName: application.siteName,
        siteUrl: application.siteUrl,
        siteAvatar: application.siteAvatar,
        siteDescription: application.siteDescription,
        siteRssUrl: application.siteRssUrl,
        contactEmail: application.contactEmail,
        friendPageUrl: application.friendPageUrl,
        approvedAt: new Date().toISOString(),
      });
      await this.settings.set('friends', JSON.stringify(friends));
    }
  }

  private async sendApplicationResultEmail(
    application: any,
    approved: boolean,
    reason?: string,
  ) {
    try {
      const config = await this.emailService.getEmailConfig();
      const transporter = await this.emailService.getTransporter();

      const html = approved
        ? this.getApprovedEmailTemplate(application)
        : this.getRejectedEmailTemplate(application, reason);

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromAddress}>`,
        to: application.contactEmail,
        subject: approved
          ? `【清欢小筑】友联申请已通过`
          : `【清欢小筑】友联申请未通过`,
        html,
      });

      this.logger.log(`友联申请结果邮件已发送: ${application.contactEmail}`);
    } catch (error) {
      this.logger.error(`发送友联申请结果邮件失败: ${error}`);
    }
  }

  async getApplications(query: { page?: number; limit?: number; status?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: any = {};
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.friendApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.friendApplication.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getApplication(id: string) {
    const application = await this.prisma.friendApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('申请不存在');
    return application;
  }

  async approveApplication(id: string) {
    const application = await this.prisma.friendApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('申请不存在');
    if (application.status !== 'pending') {
      throw new BadRequestException('只能审核待处理的申请');
    }

    await this.prisma.friendApplication.update({
      where: { id },
      data: { status: 'approved', rejectReason: null },
    });

    await this.addToFriends(application);
    await this.sendApplicationResultEmail(application, true);

    return { success: true };
  }

  async rejectApplication(id: string, reason?: string) {
    const application = await this.prisma.friendApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('申请不存在');
    if (application.status !== 'pending') {
      throw new BadRequestException('只能审核待处理的申请');
    }

    await this.prisma.friendApplication.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectReason: reason || '管理员拒绝',
        aiReviewResult: 'rejected',
      },
    });

    await this.sendApplicationResultEmail(application, false, reason);

    return { success: true };
  }

  async deleteApplication(id: string) {
    const application = await this.prisma.friendApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('申请不存在');

    await this.prisma.friendApplication.delete({ where: { id } });
    return { success: true };
  }

  async sendRemoveCode(email: string) {
    return this.emailService.sendVerificationCode(email, 'friend_remove' as any);
  }

  async verifyAndRemove(email: string, code: string) {
    const verified = await this.emailService.verifyCode(email, code, 'friend_remove' as any);
    if (!verified) {
      throw new BadRequestException('验证码无效或已过期');
    }

    const raw = await this.settings.get('friends');
    const friends: any[] = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];

    const index = friends.findIndex((f: any) => f.contactEmail === email);
    if (index === -1) {
      throw new NotFoundException('未找到该邮箱对应的友联记录');
    }

    const removed = friends.splice(index, 1)[0];
    await this.settings.set('friends', JSON.stringify(friends));

    try {
      const config = await this.emailService.getEmailConfig();
      const transporter = await this.emailService.getTransporter();

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromAddress}>`,
        to: email,
        subject: `【清欢小筑】友联已移除`,
        html: this.getRemoveConfirmationTemplate(removed),
      });
    } catch (error) {
      this.logger.error(`发送移除确认邮件失败: ${error}`);
    }

    return { success: true, siteName: removed.siteName };
  }

  private getApprovedEmailTemplate(application: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#5b8def;margin:0;font-size:24px;">清欢小筑</h1>
    </div>
    
    <h2 style="text-align:center;color:#333;margin-bottom:24px;font-size:20px;">✅ 友联申请已通过</h2>
    
    <p style="color:#666;line-height:1.6;">您好，</p>
    <p style="color:#666;line-height:1.6;">
      您的友联申请已通过审核！感谢您对 <strong>清欢小筑</strong> 的认可。
    </p>
    
    <div style="background:#f8f9fa;border-left:4px solid #5b8def;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
      <p style="color:#333;margin:0;line-height:1.6;">
        <strong>站点名称：</strong>${application.siteName}<br>
        <strong>站点地址：</strong>${application.siteUrl}
      </p>
    </div>
    
    <p style="color:#666;line-height:1.6;">
      我们已将您的站点添加到友联列表中。如有任何问题，请联系我们。
    </p>
    
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">此邮件由系统自动发送，请勿直接回复</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getRejectedEmailTemplate(application: any, reason?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#5b8def;margin:0;font-size:24px;">清欢小筑</h1>
    </div>
    
    <h2 style="text-align:center;color:#333;margin-bottom:24px;font-size:20px;">❌ 友联申请未通过</h2>
    
    <p style="color:#666;line-height:1.6;">您好，</p>
    <p style="color:#666;line-height:1.6;">
      很抱歉，您的友联申请未通过审核。
    </p>
    
    ${reason ? `
    <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
      <p style="color:#856404;margin:0;line-height:1.6;">
        <strong>原因：</strong>${reason}
      </p>
    </div>
    ` : ''}
    
    <p style="color:#666;line-height:1.6;">
      如有疑问，请联系我们。
    </p>
    
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">此邮件由系统自动发送，请勿直接回复</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getRemoveConfirmationTemplate(removed: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#5b8def;margin:0;font-size:24px;">清欢小筑</h1>
    </div>
    
    <h2 style="text-align:center;color:#333;margin-bottom:24px;font-size:20px;">🗑️ 友联已移除</h2>
    
    <p style="color:#666;line-height:1.6;">您好，</p>
    <p style="color:#666;line-height:1.6;">
      您的友联 <strong>${removed.siteName}</strong> 已从我们的友联列表中移除。
    </p>
    
    <p style="color:#666;line-height:1.6;">
      感谢您曾经的支持，如有需要欢迎再次申请。
    </p>
    
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">此邮件由系统自动发送，请勿直接回复</p>
    </div>
  </div>
</body>
</html>`;
  }
}

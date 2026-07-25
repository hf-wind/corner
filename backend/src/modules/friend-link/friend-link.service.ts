import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateFriendApplicationDto } from './dto/create-friend-application.dto';

type FriendLink = {
  name: string;
  url: string;
  avatar?: string;
  description?: string;
  rssUrl?: string;
  webmasterName?: string;
  contactEmail?: string;
  friendPageUrl?: string;
  approvedAt?: string;
};

type SiteInfo = {
  name: string;
  url: string;
  description?: string;
  avatar?: string;
  rssUrl?: string;
};

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

  async getMySiteInfo(): Promise<SiteInfo> {
    const raw = await this.settings.get('my_site_info');
    const value = this.parseObject(raw);
    return {
      name: this.stringValue(value.name) || 'Corner',
      url: this.stringValue(value.url) || 'https://corner.example.com',
      description: this.stringValue(value.description),
      avatar: this.stringValue(value.avatar),
      rssUrl: this.stringValue(value.rssUrl),
    };
  }

  async updateMySiteInfo(data: Record<string, unknown>) {
    const info: SiteInfo = {
      name: this.requiredString(data.name, '站点名称不能为空'),
      url: this.validUrl(data.url, '站点地址'),
      description: this.stringValue(data.description),
      avatar: this.optionalUrl(data.avatar, '站点头像'),
      rssUrl: this.optionalUrl(data.rssUrl, 'RSS 地址'),
    };
    await this.settings.set('my_site_info', info);
    return info;
  }

  async createApplication(dto: CreateFriendApplicationDto) {
    const applicationData = {
      siteName: this.requiredString(dto.siteName, '站点名称不能为空'),
      siteUrl: this.validUrl(dto.siteUrl, '站点地址'),
      siteAvatar: this.optionalUrl(dto.siteAvatar, '站点头像'),
      siteDescription: this.stringValue(dto.siteDescription),
      siteRssUrl: this.optionalUrl(dto.siteRssUrl, 'RSS 地址'),
      contactEmail: this.requiredString(dto.contactEmail, '联系邮箱不能为空').toLowerCase(),
      friendPageUrl: this.validUrl(dto.friendPageUrl, '友链页面地址'),
    };

    const existing = await this.prisma.friendApplication.findFirst({
      where: {
        siteUrl: applicationData.siteUrl,
        status: { in: ['pending', 'approved'] },
      },
    });
    if (existing) {
      throw new BadRequestException('该站点已有待处理或已通过的友链申请，请勿重复提交');
    }

    const application = await this.prisma.friendApplication.create({ data: applicationData });
    await this.notifyAdmins(
      '新的友链申请',
      `${application.siteName} 提交了友链申请，等待审核。`,
    );

    void this.moderateAndProcess(application).catch((error) => {
      this.logger.error(`友链审核流程异常: ${error}`);
    });

    return {
      ...application,
      message: '申请已提交，审核结果会发送到联系邮箱。',
    };
  }

  async getApplications(query: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const where = query.status ? { status: query.status } : {};
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
    if (!application) throw new NotFoundException('友链申请不存在');
    return application;
  }

  async approveApplication(id: string) {
    const application = await this.getApplication(id);
    if (application.status === 'approved') {
      throw new BadRequestException('该申请已经通过');
    }

    const updated = await this.prisma.friendApplication.update({
      where: { id },
      data: {
        status: 'approved',
        rejectReason: null,
        aiReviewResult: application.aiReviewResult || 'manual_approved',
      },
    });
    await this.addToFriends(updated);
    await this.sendApplicationResultEmail(updated, true);
    return updated;
  }

  async rejectApplication(id: string, reason?: string) {
    const application = await this.getApplication(id);
    if (application.status === 'approved') {
      throw new BadRequestException('已通过的申请不能直接拒绝，请先在友链管理中移除链接');
    }

    const rejectReason = this.stringValue(reason) || '管理员审核未通过';
    const updated = await this.prisma.friendApplication.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectReason,
        aiReviewResult: application.aiReviewResult || 'manual_rejected',
      },
    });
    await this.sendApplicationResultEmail(updated, false, rejectReason);
    return updated;
  }

  async deleteApplication(id: string) {
    await this.getApplication(id);
    await this.prisma.friendApplication.delete({ where: { id } });
    return { success: true };
  }

  async sendRemoveCode(email: string) {
    return this.emailService.sendVerificationCode(email.toLowerCase(), 'friend_remove');
  }

  async verifyAndRemove(email: string, code: string) {
    const normalizedEmail = email.toLowerCase();
    const verified = await this.emailService.verifyCode(normalizedEmail, code, 'friend_remove');
    if (!verified) {
      throw new BadRequestException('验证码无效或已过期');
    }

    const friends = await this.loadFriends();
    const index = friends.findIndex((friend) => friend.contactEmail?.toLowerCase() === normalizedEmail);
    if (index === -1) {
      throw new NotFoundException('未找到该邮箱对应的友链');
    }

    const [removed] = friends.splice(index, 1);
    await this.saveFriends(friends);
    await this.sendRemoveConfirmationEmail(removed, normalizedEmail);
    return { success: true, siteName: removed.name };
  }

  private async moderateAndProcess(application: {
    id: string;
    siteName: string;
    siteUrl: string;
    siteAvatar: string | null;
    siteDescription: string | null;
    siteRssUrl: string | null;
    contactEmail: string;
    friendPageUrl: string;
  }) {
    const config = await this.aiService.getConfig();
    const configured = await this.aiService.isConfigured();
    if (!config.ai_friend_moderation_enabled || !configured) {
      const note = !config.ai_friend_moderation_enabled
        ? 'AI 友链审核已关闭，等待人工审核'
        : 'AI 未配置，等待人工审核';
      await this.prisma.friendApplication.update({
        where: { id: application.id },
        data: { aiReview: note, aiReviewResult: 'pending' },
      });
      return;
    }

    try {
      const siteInfo = await this.getMySiteInfo();
      const review = await this.aiService.moderateFriendSite(
        application.siteUrl,
        application.friendPageUrl,
        siteInfo.url,
      );

      const updated = await this.prisma.friendApplication.update({
        where: { id: application.id },
        data: {
          aiReview: review.reason,
          aiReviewResult: review.approved ? 'approved' : 'rejected',
          status: review.approved ? 'approved' : 'rejected',
          rejectReason: review.approved ? null : review.reason,
        },
      });

      if (review.approved) {
        await this.addToFriends(updated);
        await this.sendApplicationResultEmail(updated, true);
        await this.notifyAdmins('友链申请已自动通过', `${updated.siteName} 已通过 AI 审核并加入友链列表。`);
      } else {
        await this.sendApplicationResultEmail(updated, false, review.reason);
        await this.notifyAdmins('友链申请未通过', `${updated.siteName} 未通过 AI 审核：${review.reason}`);
      }
    } catch (error) {
      this.logger.error(`AI 友链审核失败: ${error}`);
      await this.prisma.friendApplication.update({
        where: { id: application.id },
        data: {
          status: 'pending',
          aiReview: 'AI 审核异常，等待人工审核',
          aiReviewResult: 'pending',
        },
      });
    }
  }

  private async addToFriends(application: {
    siteName: string;
    siteUrl: string;
    siteAvatar?: string | null;
    siteDescription?: string | null;
    siteRssUrl?: string | null;
    contactEmail?: string | null;
    friendPageUrl?: string | null;
  }) {
    const friends = await this.loadFriends();
    const found = friends.findIndex((friend) => friend.url === application.siteUrl);
    const link: FriendLink = {
      name: application.siteName,
      url: application.siteUrl,
      avatar: application.siteAvatar || undefined,
      description: application.siteDescription || undefined,
      rssUrl: application.siteRssUrl || undefined,
      contactEmail: application.contactEmail || undefined,
      friendPageUrl: application.friendPageUrl || undefined,
      approvedAt: new Date().toISOString(),
    };

    if (found >= 0) friends[found] = { ...friends[found], ...link };
    else friends.push(link);
    await this.saveFriends(friends);
  }

  private async loadFriends(): Promise<FriendLink[]> {
    const raw = await this.settings.get('friends');
    const value = this.parseValue(raw);
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => this.normalizeFriend(item))
      .filter((item): item is FriendLink => Boolean(item));
  }

  private async saveFriends(friends: FriendLink[]) {
    await this.settings.set('friends', friends);
  }

  private normalizeFriend(value: unknown): FriendLink | null {
    const input = this.parseObject(value);
    const name = this.stringValue(input.name || input.siteName);
    const url = this.stringValue(input.url || input.siteUrl);
    if (!name || !url) return null;
    return {
      name,
      url,
      avatar: this.stringValue(input.avatar || input.siteAvatar),
      description: this.stringValue(input.description || input.siteDescription || input.desc),
      rssUrl: this.stringValue(input.rssUrl || input.siteRssUrl),
      webmasterName: this.stringValue(input.webmasterName),
      contactEmail: this.stringValue(input.contactEmail),
      friendPageUrl: this.stringValue(input.friendPageUrl),
      approvedAt: this.stringValue(input.approvedAt),
    };
  }

  private async notifyAdmins(title: string, content: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notificationService.create(admin.id, {
          type: 'system',
          title,
          content,
          link: '/admin/friend-applications',
        }),
      ),
    );
  }

  private async sendApplicationResultEmail(
    application: { siteName: string; siteUrl: string; contactEmail: string },
    approved: boolean,
    reason?: string,
  ) {
    const config = await this.emailService.getEmailConfig();
    if (!config.enabled) return;

    try {
      const transporter = await this.emailService.getTransporter();
      const site = await this.getMySiteInfo();
      const subject = approved
        ? `【${site.name}】友链申请已通过`
        : `【${site.name}】友链申请未通过`;
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromAddress}>`,
        to: application.contactEmail,
        subject,
        html: this.resultEmailTemplate(site, application, approved, reason),
      });
    } catch (error) {
      this.logger.error(`发送友链申请结果邮件失败: ${error}`);
    }
  }

  private async sendRemoveConfirmationEmail(link: FriendLink, email: string) {
    const config = await this.emailService.getEmailConfig();
    if (!config.enabled) return;

    try {
      const transporter = await this.emailService.getTransporter();
      const site = await this.getMySiteInfo();
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromAddress}>`,
        to: email,
        subject: `【${site.name}】友链已移除`,
        html: this.removeEmailTemplate(site, link),
      });
    } catch (error) {
      this.logger.error(`发送友链移除确认邮件失败: ${error}`);
    }
  }

  private resultEmailTemplate(
    site: SiteInfo,
    application: { siteName: string; siteUrl: string },
    approved: boolean,
    reason?: string,
  ) {
    const title = approved ? '友链申请已通过' : '友链申请未通过';
    const body = approved
      ? `我们已将 <strong>${this.escapeHtml(application.siteName)}</strong> 添加到友链列表。`
      : `很抱歉，本次申请未能通过。${reason ? `<br><br>原因：${this.escapeHtml(reason)}` : ''}`;
    return this.emailShell(site.name, title, `
      <p>您好：</p>
      <p>${body}</p>
      <p>站点：<a href="${this.escapeHtml(application.siteUrl)}">${this.escapeHtml(application.siteUrl)}</a></p>
    `);
  }

  private removeEmailTemplate(site: SiteInfo, link: FriendLink) {
    return this.emailShell(site.name, '友链已移除', `
      <p>您好：</p>
      <p>友链 <strong>${this.escapeHtml(link.name)}</strong> 已按邮箱验证请求从列表中移除。</p>
    `);
  }

  private emailShell(siteName: string, title: string, content: string) {
    return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:24px;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#333;">
  <main style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;">
    <h1 style="margin:0 0 24px;font-size:22px;">${this.escapeHtml(siteName)}</h1>
    <h2 style="margin:0 0 18px;font-size:18px;">${this.escapeHtml(title)}</h2>
    <div style="line-height:1.7;color:#555;">${content}</div>
    <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #eee;color:#999;font-size:12px;">此邮件由系统自动发送，请勿直接回复。</p>
  </main>
</body>
</html>`;
  }

  private parseValue(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private parseObject(value: unknown): Record<string, unknown> {
    const parsed = this.parseValue(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private requiredString(value: unknown, message: string) {
    const text = this.stringValue(value);
    if (!text) throw new BadRequestException(message);
    return text;
  }

  private optionalUrl(value: unknown, label: string) {
    const text = this.stringValue(value);
    return text ? this.validUrl(text, label) : '';
  }

  private validUrl(value: unknown, label: string) {
    const text = this.requiredString(value, `${label}不能为空`);
    try {
      const url = new URL(text);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
      return url.toString();
    } catch {
      throw new BadRequestException(`${label}必须是 http 或 https 地址`);
    }
  }

  private escapeHtml(value: string) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char] || char);
  }
}

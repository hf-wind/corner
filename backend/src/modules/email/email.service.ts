import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    @InjectQueue('email-verification') private verificationQueue: Queue,
    @InjectQueue('email-notification') private notificationQueue: Queue,
  ) {}

  async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    const config = await this.getEmailConfig();
    if (!config.enabled) {
      throw new Error('邮件服务未启用');
    }

    this.transporter = nodemailer.createTransport({
      host: String(config.host),
      port: Number(config.port),
      secure: Boolean(config.secure),
      auth: {
        user: String(config.user),
        pass: String(config.pass),
      },
    });

    return this.transporter;
  }

  async getEmailConfig() {
    const [enabled, host, port, secure, user, pass, fromName, fromAddress, siteUrl] =
      await Promise.all([
        this.settings.get('email_enabled'),
        this.settings.get('email_smtp_host'),
        this.settings.get('email_smtp_port'),
        this.settings.get('email_smtp_secure'),
        this.settings.get('email_smtp_user'),
        this.settings.get('email_smtp_pass'),
        this.settings.get('email_from_name'),
        this.settings.get('email_from_address'),
        this.settings.get('site_url'),
      ]);

    return {
      enabled: enabled ?? true,
      host: host ?? 'smtp.qq.com',
      port: port ?? 465,
      secure: secure ?? true,
      user: user ?? '1833079849@qq.com',
      pass: pass ?? 'wncwabqengfubhbd',
      fromName: fromName ?? '清欢小筑',
      fromAddress: fromAddress ?? '1833079849@qq.com',
      siteUrl: (siteUrl as string) || 'https://corner.example.com',
    };
  }

  async generateVerificationCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async sendVerificationCode(email: string, type: 'register' | 'login'): Promise<{ success: boolean; message: string }> {
    const config = await this.getEmailConfig();
    if (!config.enabled) {
      return { success: false, message: '邮件服务未启用' };
    }

    const recentCode = await this.prisma.verificationCode.findFirst({
      where: {
        email,
        type,
        used: false,
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
    });

    if (recentCode) {
      return { success: false, message: '验证码已发送，请60秒后再试' };
    }

    const code = await this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.verificationCode.create({
      data: {
        email,
        code,
        type,
        expiresAt,
      },
    });

    const typeText = type === 'register' ? '注册' : '登录';
    const html = this.getVerificationCodeTemplate(code, typeText);

    await this.verificationQueue.add('send-verification', {
      to: email,
      subject: `【清欢小筑】${typeText}验证码`,
      html,
      type: 'verification',
    });

    this.logger.log(`验证码已加入队列: ${email} (${type})`);
    return { success: true, message: '验证码已发送' };
  }

  async verifyCode(email: string, code: string, type: 'register' | 'login'): Promise<boolean> {
    const verification = await this.prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        type,
        used: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!verification) return false;

    await this.prisma.verificationCode.update({
      where: { id: verification.id },
      data: { used: true },
    });

    return true;
  }

  async sendCommentNotification(data: {
    to: string;
    toName: string;
    senderName: string;
    postTitle: string;
    postId: string;
    content: string;
    siteUrl?: string;
  }): Promise<void> {
    const config = await this.getEmailConfig();
    const siteUrl = data.siteUrl || config.siteUrl;
    const html = this.getCommentNotificationTemplate({ ...data, siteUrl });

    await this.notificationQueue.add('send-notification', {
      to: data.to,
      subject: `【清欢小筑】${data.senderName} 评论了你的文章`,
      html,
      type: 'comment_notification',
      postId: data.postId,
    });

    this.logger.log(`评论通知已加入队列: ${data.to}`);
  }

  async sendReplyNotification(data: {
    to: string;
    toName: string;
    senderName: string;
    postTitle: string;
    postId: string;
    content: string;
    siteUrl?: string;
  }): Promise<void> {
    const config = await this.getEmailConfig();
    const siteUrl = data.siteUrl || config.siteUrl;
    const html = this.getReplyNotificationTemplate({ ...data, siteUrl });

    await this.notificationQueue.add('send-notification', {
      to: data.to,
      subject: `【清欢小筑】${data.senderName} 回复了你的评论`,
      html,
      type: 'reply_notification',
      postId: data.postId,
    });

    this.logger.log(`回复通知已加入队列: ${data.to}`);
  }

  async sendLikeNotification(data: {
    to: string;
    toName: string;
    senderName: string;
    postTitle: string;
    postId: string;
    siteUrl?: string;
  }): Promise<void> {
    const config = await this.getEmailConfig();
    const siteUrl = data.siteUrl || config.siteUrl;
    const html = this.getLikeNotificationTemplate({ ...data, siteUrl });

    await this.notificationQueue.add('send-notification', {
      to: data.to,
      subject: `【清欢小筑】${data.senderName} 赞了你的评论`,
      html,
      type: 'like_notification',
      postId: data.postId,
    });

    this.logger.log(`点赞通知已加入队列: ${data.to}`);
  }

  async testEmail(to: string): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.getEmailConfig();
      const transporter = await this.getTransporter();

      const html = this.getTestEmailTemplate();

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromAddress}>`,
        to,
        subject: '【清欢小筑】邮件测试',
        html,
      });

      this.logger.log(`测试邮件已发送: ${to}`);
      return { success: true, message: '测试邮件已发送' };
    } catch (error: any) {
      this.logger.error(`发送失败: ${error.message}`);
      return { success: false, message: `发送失败: ${error.message}` };
    }
  }

  async getEmailLogs(query: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private renderEmailContent(text: string): string {
    return text
      .replace(/◆emoji:([^◆]+)◆/g, '<img src="$1" alt="emoji" style="width:20px;height:20px;vertical-align:middle;display:inline;" />')
      .replace(/\n/g, '<br>')
  }

  private getVerificationCodeTemplate(code: string, type: string): string {
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
    
    <h2 style="text-align:center;color:#333;margin-bottom:24px;font-size:20px;">${type}验证码</h2>
    
    <p style="color:#666;line-height:1.6;margin-bottom:16px;">您好，您的验证码是：</p>
    
    <div style="background:linear-gradient(135deg,#5b8def,#7c6bef);color:#fff;font-size:36px;font-weight:700;letter-spacing:6px;padding:24px;border-radius:12px;text-align:center;margin:24px 0;font-family:monospace;">
      ${code}
    </div>
    
    <p style="color:#999;font-size:14px;text-align:center;line-height:1.6;">
      验证码有效期为 <strong>5 分钟</strong>，请勿泄露给他人。
    </p>
    
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">如非本人操作，请忽略此邮件</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getCommentNotificationTemplate(data: {
    toName: string;
    senderName: string;
    postTitle: string;
    postId: string;
    content: string;
    siteUrl?: string;
  }): string {
    const siteUrl = data.siteUrl || 'https://corner.example.com';
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
    
    <h2 style="text-align:center;color:#333;margin-bottom:24px;font-size:20px;">💬 新评论通知</h2>
    
    <p style="color:#666;line-height:1.6;">Hi <strong>${data.toName}</strong>，</p>
    <p style="color:#666;line-height:1.6;">
      <strong>${data.senderName}</strong> 评论了你的文章 <strong>${data.postTitle}</strong>
    </p>
    
      <div style="background:#f8f9fa;border-left:4px solid #5b8def;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:#333;margin:0;line-height:1.6;font-style:italic;">
          "${this.renderEmailContent(data.content)}"
        </p>
      </div>
      
      <div style="text-align:center;margin-top:32px;">
        <a href="${siteUrl}/article/${data.postId}" style="display:inline-block;background:linear-gradient(135deg,#5b8def,#7c6bef);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;">
          查看详情
        </a>
      </div>
      
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee;text-align:center;">
        <p style="color:#999;font-size:12px;margin:0;">此邮件由系统自动发送，请勿直接回复</p>
      </div>
    </div>
  </body>
</html>`;
  }

  private getReplyNotificationTemplate(data: {
    toName: string;
    senderName: string;
    postTitle: string;
    postId: string;
    content: string;
    siteUrl?: string;
  }): string {
    const siteUrl = data.siteUrl || 'https://corner.example.com';
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
    
    <h2 style="text-align:center;color:#333;margin-bottom:24px;font-size:20px;">↩️ 新回复通知</h2>
    
    <p style="color:#666;line-height:1.6;">Hi <strong>${data.toName}</strong>，</p>
    <p style="color:#666;line-height:1.6;">
      <strong>${data.senderName}</strong> 回复了你在 <strong>${data.postTitle}</strong> 的评论
    </p>
    
      <div style="background:#f8f9fa;border-left:4px solid #7c6bef;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:#333;margin:0;line-height:1.6;font-style:italic;">
          "${this.renderEmailContent(data.content)}"
        </p>
      </div>
    
    <div style="text-align:center;margin-top:32px;">
      <a href="${siteUrl}/article/${data.postId}" style="display:inline-block;background:linear-gradient(135deg,#5b8def,#7c6bef);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;">
        查看详情
      </a>
    </div>
    
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">此邮件由系统自动发送，请勿直接回复</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getLikeNotificationTemplate(data: {
    toName: string;
    senderName: string;
    postTitle: string;
    postId: string;
    siteUrl?: string;
  }): string {
    const siteUrl = data.siteUrl || 'https://corner.example.com';
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
    
    <h2 style="text-align:center;color:#333;margin-bottom:24px;font-size:20px;">❤️ 新点赞通知</h2>
    
    <p style="color:#666;line-height:1.6;">Hi <strong>${data.toName}</strong>，</p>
    <p style="color:#666;line-height:1.6;">
      <strong>${data.senderName}</strong> 赞了你在 <strong>${data.postTitle}</strong> 的评论
    </p>
    
    <div style="text-align:center;margin:32px 0;">
      <span style="font-size:48px;">❤️</span>
    </div>
    
    <div style="text-align:center;margin-top:32px;">
      <a href="${siteUrl}/article/${data.postId}" style="display:inline-block;background:linear-gradient(135deg,#5b8def,#7c6bef);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;">
        查看详情
      </a>
    </div>
    
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">此邮件由系统自动发送，请勿直接回复</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getTestEmailTemplate(): string {
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
    
    <h2 style="text-align:center;color:#333;margin-bottom:24px;font-size:20px;">✅ 邮件测试成功</h2>
    
    <p style="color:#666;line-height:1.6;text-align:center;">
      恭喜！您的邮件配置已成功连接。<br>
      现在可以正常使用邮件功能了。
    </p>
    
    <div style="text-align:center;margin:32px 0;">
      <span style="font-size:48px;">🎉</span>
    </div>
    
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">此邮件由系统自动发送</p>
    </div>
  </div>
</body>
</html>`;
  }
}

import { HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
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

  resetTransporter() {
    this.transporter?.close();
    this.transporter = null;
  }

  updateConfigValue(key: string, value: unknown) {
    return this.settings.set(key, value);
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
      user: user ?? process.env.EMAIL_SMTP_USER ?? '1833079849@qq.com',
      pass: (pass as string) || process.env.EMAIL_SMTP_PASS || '',
      fromName: fromName ?? process.env.EMAIL_FROM_NAME ?? '风隅随笔',
      fromAddress: fromAddress ?? process.env.EMAIL_FROM_ADDRESS ?? '1833079849@qq.com',
      siteUrl: (siteUrl as string) || 'https://corner.ink',
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

  async sendVerificationCode(
    email: string,
    type: 'register' | 'login' | 'change_password' | 'friend_remove',
  ): Promise<{ success: boolean; message: string }> {
    const config = await this.getEmailConfig();
    if (!config.enabled) {
      throw new ServiceUnavailableException('邮件服务未启用');
    }
    if (!String(config.pass || '').trim()) {
      throw new ServiceUnavailableException('邮件服务尚未配置 SMTP 授权码');
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
      throw new HttpException('验证码已发送，请 60 秒后再试', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = await this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const verification = await this.prisma.verificationCode.create({
      data: {
        email,
        code,
        type,
        expiresAt,
      },
    });

    const typeText = type === 'register'
      ? '注册'
      : type === 'login'
        ? '登录'
        : type === 'friend_remove'
          ? '移除友链'
          : '修改密码';
    const html = this.getVerificationCodeTemplate(code, typeText);

    const job = await this.verificationQueue.add(
      'send-verification',
      {
        to: email,
        subject: `【风隅随笔】${typeText}验证码`,
        html,
        type: 'verification',
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        timeout: 15000,
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );

    try {
      await job.finished();
    } catch (error) {
      await this.prisma.verificationCode.delete({ where: { id: verification.id } }).catch(() => undefined);
      this.logger.error(`验证码邮件发送失败: ${email}: ${(error as Error).message}`);
      throw new ServiceUnavailableException('验证码邮件发送失败，请稍后重试');
    }

    this.logger.log(`验证码邮件已发送: ${email} (${type})`);
    return { success: true, message: '验证码已发送' };
  }

  async verifyCode(
    email: string,
    code: string,
    type: 'register' | 'login' | 'change_password' | 'friend_remove',
  ): Promise<boolean> {
    const verification = await this.prisma.verificationCode.findFirst({
      where: {
        email,
        code: { equals: code, mode: 'insensitive' },
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
    sourceType?: '文章' | '瞬间';
    link?: string;
    siteUrl?: string;
  }): Promise<void> {
    const config = await this.getEmailConfig();
    const siteUrl = data.siteUrl || config.siteUrl;
    const html = this.getCommentNotificationTemplate({ ...data, siteUrl });

    await this.notificationQueue.add('send-notification', {
      to: data.to,
      subject: `【风隅随笔】${data.senderName} 评论了你的${data.sourceType || '文章'}`,
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
    link?: string;
    siteUrl?: string;
  }): Promise<void> {
    const config = await this.getEmailConfig();
    const siteUrl = data.siteUrl || config.siteUrl;
    const html = this.getReplyNotificationTemplate({ ...data, siteUrl });

    await this.notificationQueue.add('send-notification', {
      to: data.to,
      subject: `【风隅随笔】${data.senderName} 回复了你的评论`,
      html,
      type: 'reply_notification',
      postId: data.postId,
    });

    this.logger.log(`回复通知已加入队列: ${data.to}`);
  }

  async sendCommentModerationNotification(data: {
    to: string;
    toName: string;
    authorName: string;
    sourceType: '文章' | '瞬间';
    sourceTitle: string;
    sourceId: string;
    content: string;
    approved: boolean;
    reason?: string;
    link: string;
  }): Promise<void> {
    const config = await this.getEmailConfig();
    const html = this.getCommentModerationTemplate({ ...data, siteUrl: config.siteUrl });

    await this.notificationQueue.add('send-notification', {
      to: data.to,
      subject: `【风隅随笔】评论审核${data.approved ? '通过' : '未通过'}：${data.sourceTitle}`,
      html,
      type: 'comment_moderation_notification',
      postId: data.sourceId,
    });

    this.logger.log(`管理员评论审核通知已加入队列: ${data.to}`);
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
      subject: `【风隅随笔】${data.senderName} 赞了你的评论`,
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
        subject: '【风隅随笔】邮件测试',
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

  private renderEmailContent(text: string, siteUrl: string): string {
    const emojis: Array<{ source: string; label: string }> = [];
    const tokenized = String(text || '').replace(
      /(?:◆emoji:([^◆]+)◆|\[\[emoji:([^\]|]+)(?:\|([^\]]*))?\]\])/g,
      (_, oldSource, source, label) => {
        const index = emojis.push({
          source: String(oldSource || source || '').trim(),
          label: String(label || '表情').trim(),
        }) - 1;
        return `EMAIL_EMOJI_${index}`;
      },
    );

    return this.escapeHtml(tokenized)
      .replace(/\n/g, '<br>')
      .replace(/EMAIL_EMOJI_(\d+)/g, (_, rawIndex) => {
        const emoji = emojis[Number(rawIndex)];
        return emoji ? this.renderEmailEmoji(emoji.source, emoji.label, siteUrl) : '';
      });
  }

  private renderEmailEmoji(source: string, label: string, siteUrl: string): string {
    const original = this.unwrapEmojiProxy(source);
    const twemoji = this.twemojiCharacter(original);
    if (twemoji) return this.escapeHtml(twemoji);

    const baseUrl = siteUrl.replace(/\/$/, '');
    let imageUrl = source;
    try {
      const remote = new URL(original);
      if (['cdn.jsdelivr.net', 'koishi.js.org'].includes(remote.hostname.toLowerCase())) {
        imageUrl = `${baseUrl}/api/emoji-packs/asset?url=${encodeURIComponent(remote.toString())}`;
      }
    } catch {
      if (source.startsWith('/')) imageUrl = `${baseUrl}${source}`;
    }
    if (!/^(?:https?:\/\/)/i.test(imageUrl)) return this.escapeHtml(label);
    return `<img src="${this.escapeHtml(imageUrl)}" alt="${this.escapeHtml(label)}" style="width:20px;height:20px;vertical-align:-4px;display:inline-block;object-fit:contain;" />`;
  }

  private unwrapEmojiProxy(source: string): string {
    if (!source.startsWith('/api/emoji-packs/asset')) return source;
    try {
      return new URL(source, 'https://corner.local').searchParams.get('url') || source;
    } catch {
      return source;
    }
  }

  private twemojiCharacter(source: string): string {
    if (!/twemoji/i.test(source)) return '';
    const codepoints = source.match(/\/([0-9a-f]+(?:-[0-9a-f]+)*)\.(?:png|svg)(?:\?|$)/i)?.[1];
    if (!codepoints) return '';
    try {
      return String.fromCodePoint(...codepoints.split('-').map((value) => Number.parseInt(value, 16)));
    } catch {
      return '';
    }
  }

  private escapeHtml(value: string): string {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character] || character);
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
      <h1 style="color:#5b8def;margin:0;font-size:24px;">风隅随笔</h1>
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
    sourceType?: '文章' | '瞬间';
    link?: string;
    siteUrl?: string;
  }): string {
    const siteUrl = data.siteUrl || 'https://corner.ink';
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
      <h1 style="color:#5b8def;margin:0;font-size:24px;">风隅随笔</h1>
    </div>
    
    <h2 style="text-align:center;color:#333;margin-bottom:24px;font-size:20px;">💬 新评论通知</h2>
    
    <p style="color:#666;line-height:1.6;">Hi <strong>${data.toName}</strong>，</p>
    <p style="color:#666;line-height:1.6;">
      <strong>${data.senderName}</strong> 评论了你的${data.sourceType || '文章'} <strong>${data.postTitle}</strong>
    </p>
    
      <div style="background:#f8f9fa;border-left:4px solid #5b8def;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:#333;margin:0;line-height:1.6;font-style:italic;">
          "${this.renderEmailContent(data.content, siteUrl)}"
        </p>
      </div>
      
      <div style="text-align:center;margin-top:32px;">
        <a href="${data.link ? `${siteUrl}${data.link}` : `${siteUrl}/article/${data.postId}`}" style="display:inline-block;background:linear-gradient(135deg,#5b8def,#7c6bef);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;">
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
    link?: string;
    siteUrl?: string;
  }): string {
    const siteUrl = data.siteUrl || 'https://corner.ink';
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
      <h1 style="color:#5b8def;margin:0;font-size:24px;">风隅随笔</h1>
    </div>
    
    <h2 style="text-align:center;color:#333;margin-bottom:24px;font-size:20px;">↩️ 新回复通知</h2>
    
    <p style="color:#666;line-height:1.6;">Hi <strong>${data.toName}</strong>，</p>
    <p style="color:#666;line-height:1.6;">
      <strong>${data.senderName}</strong> 回复了你在 <strong>${data.postTitle}</strong> 的评论
    </p>
    
      <div style="background:#f8f9fa;border-left:4px solid #7c6bef;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:#333;margin:0;line-height:1.6;font-style:italic;">
          "${this.renderEmailContent(data.content, siteUrl)}"
        </p>
      </div>
    
    <div style="text-align:center;margin-top:32px;">
      <a href="${data.link ? `${siteUrl}${data.link}` : `${siteUrl}/article/${data.postId}`}" style="display:inline-block;background:linear-gradient(135deg,#5b8def,#7c6bef);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;">
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

  private getCommentModerationTemplate(data: {
    toName: string;
    authorName: string;
    sourceType: '文章' | '瞬间';
    sourceTitle: string;
    content: string;
    approved: boolean;
    reason?: string;
    link: string;
    siteUrl: string;
  }): string {
    const statusText = data.approved ? '审核通过' : '审核未通过';
    const statusColor = data.approved ? '#15803d' : '#b91c1c';
    const statusBackground = data.approved ? '#dcfce7' : '#fee2e2';
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;padding:36px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <h1 style="color:#334155;margin:0 0 24px;font-size:22px;">风隅随笔 · 评论审核</h1>
    <p style="color:#666;line-height:1.6;">Hi <strong>${data.toName}</strong>，以下评论已完成审核。</p>
    <div style="margin:20px 0;padding:16px;border:1px solid #e5e7eb;border-radius:10px;">
      <p style="margin:0 0 10px;color:#475569;line-height:1.6;">${data.sourceType}：<strong>${data.sourceTitle}</strong></p>
      <p style="margin:0 0 10px;color:#475569;line-height:1.6;">评论人：<strong>${data.authorName}</strong></p>
      <div style="padding:12px;background:#f8fafc;border-radius:8px;color:#334155;line-height:1.7;">${this.renderEmailContent(data.content, data.siteUrl)}</div>
    </div>
    <p style="margin:0 0 18px;"><span style="display:inline-block;padding:5px 10px;border-radius:6px;background:${statusBackground};color:${statusColor};font-weight:700;">${statusText}</span></p>
    ${!data.approved && data.reason ? `<p style="color:#b91c1c;line-height:1.6;">原因：${data.reason}</p>` : ''}
    <div style="text-align:center;margin-top:28px;">
      <a href="${data.siteUrl}${data.link}" style="display:inline-block;background:#334155;color:#fff;text-decoration:none;padding:11px 26px;border-radius:8px;font-weight:600;">查看评论管理</a>
    </div>
    <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #eee;color:#999;font-size:12px;text-align:center;">此邮件由系统自动发送</p>
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
    const siteUrl = data.siteUrl || 'https://corner.ink';
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
      <h1 style="color:#5b8def;margin:0;font-size:24px;">风隅随笔</h1>
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
      <h1 style="color:#5b8def;margin:0;font-size:24px;">风隅随笔</h1>
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

import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import * as nodemailer from 'nodemailer';

type EmailTemplateKey =
  | 'verification'
  | 'comment_notification'
  | 'reply_notification'
  | 'comment_moderation_notification'
  | 'like_notification'
  | 'test';

type StoredEmailTemplate = {
  custom?: boolean;
  subject?: string;
  html?: string;
};

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
    const [
      enabled,
      host,
      port,
      secure,
      user,
      pass,
      fromName,
      fromAddress,
      siteUrl,
    ] = await Promise.all([
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
      fromAddress:
        fromAddress ?? process.env.EMAIL_FROM_ADDRESS ?? '1833079849@qq.com',
      siteUrl: (siteUrl as string) || 'https://corner.ink',
    };
  }

  async getTemplates() {
    const config = await this.getEmailConfig();
    const stored = await this.getStoredTemplates();
    return this.templateDefinitions(config.siteUrl).map((definition) => ({
      ...definition,
      custom: Boolean(stored[definition.key]?.custom),
      subject: stored[definition.key]?.custom
        ? stored[definition.key]?.subject || definition.defaultSubject
        : definition.defaultSubject,
      html: stored[definition.key]?.custom
        ? stored[definition.key]?.html || definition.defaultHtml
        : definition.defaultHtml,
    }));
  }

  async updateTemplate(
    key: string,
    value: { custom: boolean; subject: string; html: string },
  ) {
    const definition = this.templateDefinitions('https://corner.ink').find(
      (item) => item.key === key,
    );
    if (!definition)
      throw new HttpException('邮件模板不存在', HttpStatus.NOT_FOUND);
    const stored = await this.getStoredTemplates();
    stored[key as EmailTemplateKey] = {
      custom: value.custom,
      subject: value.subject.trim(),
      html: value.html,
    };
    await this.settings.set('email_templates', stored);
    return (await this.getTemplates()).find((item) => item.key === key);
  }

  async previewTemplate(
    key: string,
    override?: { subject?: string; html?: string },
  ) {
    const config = await this.getEmailConfig();
    const definition = this.templateDefinitions(config.siteUrl).find(
      (item) => item.key === key,
    );
    if (!definition)
      throw new HttpException('邮件模板不存在', HttpStatus.NOT_FOUND);
    const stored = await this.getStoredTemplates();
    const selected = stored[key as EmailTemplateKey];
    return {
      key,
      subject: this.renderTemplateText(
        override?.subject || selected?.subject || definition.defaultSubject,
        definition.sample,
      ),
      html: this.renderTemplateText(
        override?.html || selected?.html || definition.defaultHtml,
        definition.sample,
      ),
    };
  }

  async generateVerificationCode(): Promise<string> {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
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
      throw new HttpException(
        '验证码已发送，请 60 秒后再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
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

    const typeText =
      type === 'register'
        ? '注册'
        : type === 'login'
          ? '登录'
          : type === 'friend_remove'
            ? '移除友链'
            : '修改密码';
    const template = await this.resolveTemplate(
      'verification',
      {
        code,
        type: typeText,
        siteName: '风隅随笔',
        siteUrl: config.siteUrl,
      },
      `【风隅随笔】${typeText}验证码`,
      this.getVerificationCodeTemplate(code, typeText),
    );

    const job = await this.verificationQueue.add(
      'send-verification',
      {
        to: email,
        subject: template.subject,
        html: template.html,
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
      await this.prisma.verificationCode
        .delete({ where: { id: verification.id } })
        .catch(() => undefined);
      this.logger.error(
        `验证码邮件发送失败: ${email}: ${(error as Error).message}`,
      );
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
    const detailUrl = data.link
      ? `${siteUrl}${data.link}`
      : `${siteUrl}/article/${data.postId}`;
    const template = await this.resolveTemplate(
      'comment_notification',
      {
        siteName: '风隅随笔',
        siteUrl,
        recipientName: data.toName,
        senderName: data.senderName,
        sourceType: data.sourceType || '文章',
        sourceTitle: data.postTitle,
        content: data.content,
        contentHtml: this.renderEmailContent(data.content, siteUrl),
        detailUrl,
      },
      `【风隅随笔】${data.senderName} 评论了你的${data.sourceType || '文章'}`,
      this.getCommentNotificationTemplate({ ...data, siteUrl }),
    );

    await this.notificationQueue.add('send-notification', {
      to: data.to,
      subject: template.subject,
      html: template.html,
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
    const detailUrl = data.link
      ? `${siteUrl}${data.link}`
      : `${siteUrl}/article/${data.postId}`;
    const template = await this.resolveTemplate(
      'reply_notification',
      {
        siteName: '风隅随笔',
        siteUrl,
        recipientName: data.toName,
        senderName: data.senderName,
        sourceTitle: data.postTitle,
        content: data.content,
        contentHtml: this.renderEmailContent(data.content, siteUrl),
        detailUrl,
      },
      `【风隅随笔】${data.senderName} 回复了你的评论`,
      this.getReplyNotificationTemplate({ ...data, siteUrl }),
    );

    await this.notificationQueue.add('send-notification', {
      to: data.to,
      subject: template.subject,
      html: template.html,
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
    const fallbackHtml = this.getCommentModerationTemplate({
      ...data,
      siteUrl: config.siteUrl,
    });
    const template = await this.resolveTemplate(
      'comment_moderation_notification',
      {
        siteName: '风隅随笔',
        siteUrl: config.siteUrl,
        recipientName: data.toName,
        authorName: data.authorName,
        sourceType: data.sourceType,
        sourceTitle: data.sourceTitle,
        content: data.content,
        contentHtml: this.renderEmailContent(data.content, config.siteUrl),
        approved: data.approved ? '通过' : '未通过',
        reason: data.reason || '',
        detailUrl: `${config.siteUrl}${data.link}`,
      },
      `【风隅随笔】评论审核${data.approved ? '通过' : '未通过'}：${data.sourceTitle}`,
      fallbackHtml,
    );

    await this.notificationQueue.add('send-notification', {
      to: data.to,
      subject: template.subject,
      html: template.html,
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
    const template = await this.resolveTemplate(
      'like_notification',
      {
        siteName: '风隅随笔',
        siteUrl,
        recipientName: data.toName,
        senderName: data.senderName,
        sourceTitle: data.postTitle,
        detailUrl: `${siteUrl}/article/${data.postId}`,
      },
      `【风隅随笔】${data.senderName} 赞了你的评论`,
      this.getLikeNotificationTemplate({ ...data, siteUrl }),
    );

    await this.notificationQueue.add('send-notification', {
      to: data.to,
      subject: template.subject,
      html: template.html,
      type: 'like_notification',
      postId: data.postId,
    });

    this.logger.log(`点赞通知已加入队列: ${data.to}`);
  }

  async testEmail(to: string): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.getEmailConfig();
      const transporter = await this.getTransporter();

      const template = await this.resolveTemplate(
        'test',
        { siteName: '风隅随笔', siteUrl: config.siteUrl },
        '【风隅随笔】邮件测试',
        this.getTestEmailTemplate(),
      );

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromAddress}>`,
        to,
        subject: template.subject,
        html: template.html,
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

  private async getStoredTemplates(): Promise<
    Partial<Record<EmailTemplateKey, StoredEmailTemplate>>
  > {
    const value = await this.settings.get('email_templates');
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Partial<Record<EmailTemplateKey, StoredEmailTemplate>>)
      : {};
  }

  private async resolveTemplate(
    key: EmailTemplateKey,
    variables: Record<string, unknown>,
    fallbackSubject: string,
    fallbackHtml: string,
  ) {
    const stored = (await this.getStoredTemplates())[key];
    if (!stored?.custom || !stored.subject?.trim() || !stored.html?.trim()) {
      const definition = this.templateDefinitions(String(variables.siteUrl || 'https://corner.ink')).find((item) => item.key === key);
      if (definition) {
        return {
          subject: this.renderTemplateText(definition.defaultSubject, variables),
          html: this.renderTemplateText(definition.defaultHtml, variables),
        };
      }
      return { subject: fallbackSubject, html: fallbackHtml };
    }
    return {
      subject: this.renderTemplateText(stored.subject, variables),
      html: this.renderTemplateText(stored.html, variables),
    };
  }

  private renderTemplateText(
    template: string,
    variables: Record<string, unknown>,
  ) {
    return String(template)
      .replace(/\{\{\{\s*([a-zA-Z][\w]*)\s*\}\}\}/g, (_, key) =>
        String(variables[key] ?? ''),
      )
      .replace(/\{\{\s*([a-zA-Z][\w]*)\s*\}\}/g, (_, key) =>
        this.escapeHtml(String(variables[key] ?? '')),
      );
  }

  private templateDefinitions(siteUrl: string) {
    const sampleBase = { siteName: '风隅随笔', siteUrl };
    const logoUrl = `${siteUrl.replace(/\/$/, '')}/logo.png`;
    const layout = (title: string, body: string) => `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#f4f5f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif;color:#30343b">
<main style="max-width:580px;margin:0 auto;padding:0 0 28px;background:#fff;border:1px solid #e1e4e8;border-radius:12px;overflow:hidden;box-shadow:0 14px 38px rgba(34,39,46,.08)">
<header style="padding:24px 32px 22px;background:#2b2f36;color:#fff"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle"><img src="${logoUrl}" width="42" height="42" alt="{{siteName}}" style="display:block;border-radius:9px"></td><td style="padding-left:12px;vertical-align:middle"><strong style="display:block;font-size:18px;line-height:1.2">{{siteName}}</strong><span style="display:block;margin-top:4px;color:#d58a45;font-size:11px;letter-spacing:1.4px">听风于隅，漫写人间</span></td></tr></table></header>
<section style="padding:30px 32px"><p style="margin:0 0 7px;color:#d58a45;font-size:11px;letter-spacing:1.6px">WIND · CORNER NOTES</p><h1 style="margin:0 0 22px;font-size:24px;line-height:1.35;color:#2b2f36">${title}</h1>${body}</section>
<footer style="margin:0 32px;padding-top:18px;border-top:1px solid #e5e7ea;color:#7b828c;font-size:12px;line-height:1.7">此邮件由 {{siteName}} 自动发送，请勿直接回复。<br><a href="{{siteUrl}}" style="color:#b36f32;text-decoration:none">访问 {{siteName}}</a></footer>
</main></body></html>`;
    return [
      {
        key: 'verification' as const,
        name: '验证码',
        description: '注册、登录、修改密码和移除友链时发送。',
        variables: ['siteName', 'siteUrl', 'type', 'code'],
        sample: { ...sampleBase, type: '登录', code: 'A8K2Q7' },
        defaultSubject: '【{{siteName}}】{{type}}验证码',
        defaultHtml: layout(
          '{{type}}验证码',
          '<p style="color:#5f6670">您的验证码是：</p><div style="margin:22px 0;padding:18px;border-radius:8px;background:#fff5e9;color:#a86227;font:700 32px/1 monospace;text-align:center;letter-spacing:6px">{{code}}</div><p style="color:#8a9098;font-size:13px">验证码 5 分钟内有效，请勿向他人泄露。</p>',
        ),
      },
      {
        key: 'comment_notification' as const,
        name: '新评论通知',
        description: '文章或瞬间收到新评论时发送给内容作者。',
        variables: [
          'siteName',
          'siteUrl',
          'recipientName',
          'senderName',
          'sourceType',
          'sourceTitle',
          'content',
          'contentHtml',
          'detailUrl',
        ],
        sample: {
          ...sampleBase,
          recipientName: '惠风',
          senderName: '访客',
          sourceType: '文章',
          sourceTitle: '夏日随笔',
          content: '写得真好。',
          contentHtml: '写得真好。',
          detailUrl: `${siteUrl}/article/sample`,
        },
        defaultSubject:
          '【{{siteName}}】{{senderName}} 评论了你的{{sourceType}}',
        defaultHtml: layout(
          '收到一条新评论',
          '<p>Hi <strong>{{recipientName}}</strong>，{{senderName}} 评论了你的{{sourceType}}《{{sourceTitle}}》。 </p><blockquote style="margin:20px 0;padding:14px;border-left:3px solid #d58a45;background:#faf7f2">{{{contentHtml}}}</blockquote><a href="{{detailUrl}}" style="color:#b36f32">查看详情</a>',
        ),
      },
      {
        key: 'reply_notification' as const,
        name: '评论回复通知',
        description: '评论收到回复时发送给原评论作者。',
        variables: [
          'siteName',
          'siteUrl',
          'recipientName',
          'senderName',
          'sourceTitle',
          'content',
          'contentHtml',
          'detailUrl',
        ],
        sample: {
          ...sampleBase,
          recipientName: '访客',
          senderName: '惠风',
          sourceTitle: '夏日随笔',
          content: '谢谢你的留言。',
          contentHtml: '谢谢你的留言。',
          detailUrl: `${siteUrl}/article/sample`,
        },
        defaultSubject: '【{{siteName}}】{{senderName}} 回复了你的评论',
        defaultHtml: layout(
          '你的评论收到回复',
          '<p>Hi <strong>{{recipientName}}</strong>，{{senderName}} 回复了你在《{{sourceTitle}}》的评论。</p><blockquote style="margin:20px 0;padding:14px;border-left:3px solid #d58a45;background:#faf7f2">{{{contentHtml}}}</blockquote><a href="{{detailUrl}}" style="color:#b36f32">查看详情</a>',
        ),
      },
      {
        key: 'comment_moderation_notification' as const,
        name: '评论审核结果',
        description: '管理员审核评论后发送审核结果。',
        variables: [
          'siteName',
          'siteUrl',
          'recipientName',
          'authorName',
          'sourceType',
          'sourceTitle',
          'content',
          'contentHtml',
          'approved',
          'reason',
          'detailUrl',
        ],
        sample: {
          ...sampleBase,
          recipientName: '访客',
          authorName: '访客',
          sourceType: '文章',
          sourceTitle: '夏日随笔',
          content: '期待更新。',
          contentHtml: '期待更新。',
          approved: '通过',
          reason: '',
          detailUrl: `${siteUrl}/article/sample`,
        },
        defaultSubject: '【{{siteName}}】评论审核{{approved}}：{{sourceTitle}}',
        defaultHtml: layout(
          '评论审核结果：{{approved}}',
          '<p>Hi <strong>{{recipientName}}</strong>，你在{{sourceType}}《{{sourceTitle}}》下的评论已完成审核。</p><blockquote style="margin:20px 0;padding:14px;background:#faf7f2">{{{contentHtml}}}</blockquote><p>审核结果：<strong>{{approved}}</strong></p><p>说明：{{reason}}</p><a href="{{detailUrl}}" style="color:#b36f32">查看内容</a>',
        ),
      },
      {
        key: 'like_notification' as const,
        name: '点赞通知',
        description: '评论被点赞时发送给评论作者。',
        variables: [
          'siteName',
          'siteUrl',
          'recipientName',
          'senderName',
          'sourceTitle',
          'detailUrl',
        ],
        sample: {
          ...sampleBase,
          recipientName: '访客',
          senderName: '惠风',
          sourceTitle: '夏日随笔',
          detailUrl: `${siteUrl}/article/sample`,
        },
        defaultSubject: '【{{siteName}}】{{senderName}} 赞了你的评论',
        defaultHtml: layout(
          '你的评论收到点赞',
          '<p>Hi <strong>{{recipientName}}</strong>，{{senderName}} 赞了你在《{{sourceTitle}}》下的评论。</p><a href="{{detailUrl}}" style="color:#b36f32">查看详情</a>',
        ),
      },
      {
        key: 'test' as const,
        name: '测试邮件',
        description: '管理员验证 SMTP 配置时发送。',
        variables: ['siteName', 'siteUrl'],
        sample: sampleBase,
        defaultSubject: '【{{siteName}}】邮件测试',
        defaultHtml: layout(
          '邮件服务测试成功',
          '<p>如果你看到这封邮件，说明 SMTP 发信配置可用。</p><a href="{{siteUrl}}" style="color:#b36f32">访问站点</a>',
        ),
      },
    ];
  }

  private renderEmailContent(text: string, siteUrl: string): string {
    const emojis: Array<{ source: string; label: string }> = [];
    const tokenized = String(text || '').replace(
      /(?:◆emoji:([^◆]+)◆|\[\[emoji:([^\]|]+)(?:\|([^\]]*))?\]\])/g,
      (_, oldSource, source, label) => {
        const index =
          emojis.push({
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
        return emoji
          ? this.renderEmailEmoji(emoji.source, emoji.label, siteUrl)
          : '';
      });
  }

  private renderEmailEmoji(
    source: string,
    label: string,
    siteUrl: string,
  ): string {
    const original = this.unwrapEmojiProxy(source);
    const twemoji = this.twemojiCharacter(original);
    if (twemoji) return this.escapeHtml(twemoji);

    const baseUrl = siteUrl.replace(/\/$/, '');
    let imageUrl = source;
    try {
      const remote = new URL(original);
      if (
        ['cdn.jsdelivr.net', 'koishi.js.org'].includes(
          remote.hostname.toLowerCase(),
        )
      ) {
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
      return (
        new URL(source, 'https://corner.local').searchParams.get('url') ||
        source
      );
    } catch {
      return source;
    }
  }

  private twemojiCharacter(source: string): string {
    if (!/twemoji/i.test(source)) return '';
    const codepoints = source.match(
      /\/([0-9a-f]+(?:-[0-9a-f]+)*)\.(?:png|svg)(?:\?|$)/i,
    )?.[1];
    if (!codepoints) return '';
    try {
      return String.fromCodePoint(
        ...codepoints.split('-').map((value) => Number.parseInt(value, 16)),
      );
    } catch {
      return '';
    }
  }

  private escapeHtml(value: string): string {
    return String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character] || character,
    );
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
      <h1 style="color:#2b2f36;margin:0;font-size:24px;">风隅随笔</h1>
    </div>
    
    <h2 style="text-align:center;color:#333;margin-bottom:24px;font-size:20px;">${type}验证码</h2>
    
    <p style="color:#666;line-height:1.6;margin-bottom:16px;">您好，您的验证码是：</p>
    
    <div style="background:#d58a45;color:#fff;font-size:36px;font-weight:700;letter-spacing:6px;padding:24px;border-radius:12px;text-align:center;margin:24px 0;font-family:monospace;">
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
      <h1 style="color:#2b2f36;margin:0;font-size:24px;">风隅随笔</h1>
    </div>
    
    <h2 style="text-align:center;color:#333;margin-bottom:24px;font-size:20px;">💬 新评论通知</h2>
    
    <p style="color:#666;line-height:1.6;">Hi <strong>${data.toName}</strong>，</p>
    <p style="color:#666;line-height:1.6;">
      <strong>${data.senderName}</strong> 评论了你的${data.sourceType || '文章'} <strong>${data.postTitle}</strong>
    </p>
    
      <div style="background:#faf7f2;border-left:4px solid #d58a45;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:#333;margin:0;line-height:1.6;font-style:italic;">
          "${this.renderEmailContent(data.content, siteUrl)}"
        </p>
      </div>
      
      <div style="text-align:center;margin-top:32px;">
        <a href="${data.link ? `${siteUrl}${data.link}` : `${siteUrl}/article/${data.postId}`}" style="display:inline-block;background:#d58a45;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;">
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
      <h1 style="color:#2b2f36;margin:0;font-size:24px;">风隅随笔</h1>
    </div>
    
    <h2 style="text-align:center;color:#333;margin-bottom:24px;font-size:20px;">↩️ 新回复通知</h2>
    
    <p style="color:#666;line-height:1.6;">Hi <strong>${data.toName}</strong>，</p>
    <p style="color:#666;line-height:1.6;">
      <strong>${data.senderName}</strong> 回复了你在 <strong>${data.postTitle}</strong> 的评论
    </p>
    
      <div style="background:#faf7f2;border-left:4px solid #d58a45;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:#333;margin:0;line-height:1.6;font-style:italic;">
          "${this.renderEmailContent(data.content, siteUrl)}"
        </p>
      </div>
    
    <div style="text-align:center;margin-top:32px;">
      <a href="${data.link ? `${siteUrl}${data.link}` : `${siteUrl}/article/${data.postId}`}" style="display:inline-block;background:#d58a45;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;">
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
      <h1 style="color:#2b2f36;margin:0;font-size:24px;">风隅随笔</h1>
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
      <a href="${siteUrl}/article/${data.postId}" style="display:inline-block;background:#d58a45;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;">
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
      <h1 style="color:#2b2f36;margin:0;font-size:24px;">风隅随笔</h1>
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

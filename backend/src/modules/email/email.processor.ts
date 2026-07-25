import { Process, Processor, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import * as nodemailer from 'nodemailer';

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  type: string;
  postId?: string;
  userId?: string;
}

@Processor('email-verification')
export class EmailVerificationProcessor {
  private readonly logger = new Logger(EmailVerificationProcessor.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    const [host, port, secure, user, pass] = await Promise.all([
      this.settings.get('email_smtp_host'),
      this.settings.get('email_smtp_port'),
      this.settings.get('email_smtp_secure'),
      this.settings.get('email_smtp_user'),
      this.settings.get('email_smtp_pass'),
    ]);

    this.transporter = nodemailer.createTransport({
      host: (host as string) || 'smtp.qq.com',
      port: (port as number) || 465,
      secure: secure !== false,
      auth: {
        user: (user as string) || '1833079849@qq.com',
        pass: (pass as string) || 'wncwabqengfubhbd',
      },
    });

    return this.transporter;
  }

  @Process('send-verification')
  async handleVerification(job: Job<EmailJobData>) {
    const { to, subject, html, type } = job.data;
    this.logger.log(`处理验证邮件: ${to}`);

    const [fromName, fromAddress] = await Promise.all([
      this.settings.get('email_from_name'),
      this.settings.get('email_from_address'),
    ]);

    const log = await this.prisma.emailLog.create({
      data: {
        to,
        subject,
        type: 'verification',
        content: html,
        status: 'sending',
      },
    });

    try {
      const transporter = await this.getTransporter();
      await transporter.sendMail({
        from: `"${(fromName as string) || '清欢小筑'}" <${(fromAddress as string) || '1833079849@qq.com'}>`,
        to,
        subject,
        html,
      });

      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'sent', sentAt: new Date() },
      });

      this.logger.log(`验证邮件发送成功: ${to}`);
      return { success: true };
    } catch (error: any) {
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'failed', error: error.message },
      });

      this.logger.error(`验证邮件发送失败: ${error.message}`);
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`队列任务失败: ${job.id} - ${error.message}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`队列任务完成: ${job.id}`);
  }
}

@Processor('email-notification')
export class EmailNotificationProcessor {
  private readonly logger = new Logger(EmailNotificationProcessor.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    const [host, port, secure, user, pass] = await Promise.all([
      this.settings.get('email_smtp_host'),
      this.settings.get('email_smtp_port'),
      this.settings.get('email_smtp_secure'),
      this.settings.get('email_smtp_user'),
      this.settings.get('email_smtp_pass'),
    ]);

    this.transporter = nodemailer.createTransport({
      host: (host as string) || 'smtp.qq.com',
      port: (port as number) || 465,
      secure: secure !== false,
      auth: {
        user: (user as string) || '1833079849@qq.com',
        pass: (pass as string) || 'wncwabqengfubhbd',
      },
    });

    return this.transporter;
  }

  @Process('send-notification')
  async handleNotification(job: Job<EmailJobData>) {
    const { to, subject, html, type, postId } = job.data;
    this.logger.log(`处理通知邮件: ${to} (${type})`);

    const [fromName, fromAddress] = await Promise.all([
      this.settings.get('email_from_name'),
      this.settings.get('email_from_address'),
    ]);

    const log = await this.prisma.emailLog.create({
      data: {
        to,
        subject,
        type,
        content: html,
        status: 'sending',
        postId: postId || null,
      },
    });

    try {
      const transporter = await this.getTransporter();
      await transporter.sendMail({
        from: `"${(fromName as string) || '清欢小筑'}" <${(fromAddress as string) || '1833079849@qq.com'}>`,
        to,
        subject,
        html,
      });

      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'sent', sentAt: new Date() },
      });

      this.logger.log(`通知邮件发送成功: ${to}`);
      return { success: true };
    } catch (error: any) {
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'failed', error: error.message },
      });

      this.logger.error(`通知邮件发送失败: ${error.message}`);
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`队列任务失败: ${job.id} - ${error.message}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`队列任务完成: ${job.id}`);
  }
}

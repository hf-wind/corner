import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { NewsletterService } from './newsletter.service';

@Processor('newsletter')
export class NewsletterProcessor {
  private readonly logger = new Logger(NewsletterProcessor.name);

  constructor(private newsletter: NewsletterService) {}

  @Process('tick')
  async handleTick(_job: Job) {
    try {
      return await this.newsletter.runDueCheck();
    } catch (error: any) {
      this.logger.error(`周报定时检查失败: ${error?.message}`);
      return { sent: 0, reason: 'error' };
    }
  }
}

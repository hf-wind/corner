import { Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { NewsletterProcessor } from './newsletter.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    EmailModule,
    NotificationModule,
    BullModule.registerQueue({ name: 'newsletter' }),
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService, NewsletterProcessor],
  exports: [NewsletterService],
})
export class NewsletterModule implements OnApplicationBootstrap {
  constructor(@InjectQueue('newsletter') private queue: Queue) {}

  async onApplicationBootstrap() {
    // 每分钟一次 tick，由 NewsletterService 判断是否到达配置的发送时刻
    await this.queue.add(
      'tick',
      {},
      { repeat: { cron: '* * * * *' }, jobId: 'newsletter-tick' },
    );
  }
}

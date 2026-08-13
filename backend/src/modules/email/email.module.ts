import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailService } from './email.service';
import {
  EmailVerificationProcessor,
  EmailNotificationProcessor,
} from './email.processor';
import { EmailController } from './email.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    BullModule.registerQueue(
      { name: 'email-verification' },
      { name: 'email-notification' },
    ),
  ],
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailVerificationProcessor,
    EmailNotificationProcessor,
  ],
  exports: [EmailService],
})
export class EmailModule {}

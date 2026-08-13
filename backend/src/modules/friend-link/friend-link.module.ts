import { Module } from '@nestjs/common';
import { FriendLinkController } from './friend-link.controller';
import { FriendLinkService } from './friend-link.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    EmailModule,
    NotificationModule,
    AiModule,
  ],
  controllers: [FriendLinkController],
  providers: [FriendLinkService],
  exports: [FriendLinkService],
})
export class FriendLinkModule {}

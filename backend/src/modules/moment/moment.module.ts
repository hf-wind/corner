import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { NotificationModule } from '../notification/notification.module';
import { MomentController } from './moment.controller';
import { MomentService } from './moment.service';
import { MomentCommentController } from './moment-comment.controller';
import { MomentCommentService } from './moment-comment.service';

@Module({
  imports: [AiModule, NotificationModule],
  controllers: [MomentController, MomentCommentController],
  providers: [MomentService, MomentCommentService],
  exports: [MomentService, MomentCommentService],
})
export class MomentModule {}

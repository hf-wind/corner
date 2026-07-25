import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [EmailModule, NotificationModule],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}

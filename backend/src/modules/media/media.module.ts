import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [MulterModule.register({ dest: './uploads' })],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}

import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MulterModule } from '@nestjs/platform-express';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [MulterModule.register({ dest: './uploads' }), SettingsModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}

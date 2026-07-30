import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MulterModule } from '@nestjs/platform-express';
import { SettingsModule } from '../settings/settings.module';
import { BullModule } from '@nestjs/bull';
import { MediaMetadataProcessor } from './media-metadata.processor';
import { MediaMetadataService } from './media-metadata.service';

@Module({
  imports: [
    MulterModule.register({ dest: './uploads' }),
    SettingsModule,
    BullModule.registerQueue({ name: 'media-metadata' }),
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaMetadataService, MediaMetadataProcessor],
  exports: [MediaService, MediaMetadataService],
})
export class MediaModule {}

import { Module } from '@nestjs/common';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [MusicController],
  providers: [MusicService],
  exports: [MusicService],
})
export class MusicModule {}

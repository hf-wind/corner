import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiNativeService } from './ai-native.service';
import { SettingsModule } from '../settings/settings.module';
import { MediaModule } from '../media/media.module';
import { MusicModule } from '../music/music.module';

@Module({
  imports: [SettingsModule, MediaModule, MusicModule],
  controllers: [AiController],
  providers: [AiService, AiNativeService],
  exports: [AiService, AiNativeService],
})
export class AiModule {}

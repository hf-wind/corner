import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { RssController } from './rss.controller';
import { RssService } from './rss.service';

@Module({
  imports: [SettingsModule],
  controllers: [RssController],
  providers: [RssService],
})
export class RssModule {}

import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { RedisModule } from '../../common/redis/redis.module';
import { ChangelogController } from './changelog.controller';
import { ChangelogService } from './changelog.service';
import { BaiduTranslationService } from './baidu-translation.service';

@Module({
  imports: [SettingsModule, RedisModule],
  controllers: [ChangelogController],
  providers: [ChangelogService, BaiduTranslationService],
})
export class ChangelogModule {}

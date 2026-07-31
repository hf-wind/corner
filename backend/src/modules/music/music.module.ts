import { Module } from '@nestjs/common';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';
import { SettingsModule } from '../settings/settings.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [SettingsModule, RedisModule],
  controllers: [MusicController],
  providers: [MusicService],
  exports: [MusicService],
})
export class MusicModule {}

import { Module } from '@nestjs/common';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';
import { SettingsModule } from '../settings/settings.module';
import { RedisModule } from '../../common/redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [SettingsModule, RedisModule, PrismaModule],
  controllers: [MusicController],
  providers: [MusicService],
  exports: [MusicService],
})
export class MusicModule {}

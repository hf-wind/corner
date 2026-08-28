import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { SettingsModule } from '../settings/settings.module';
import { CircleController } from './circle.controller';
import { CircleService } from './circle.service';

@Module({
  imports: [SettingsModule, RedisModule],
  controllers: [CircleController],
  providers: [CircleService],
})
export class CircleModule {}

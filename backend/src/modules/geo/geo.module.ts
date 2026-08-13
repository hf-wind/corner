import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { GeoService } from './geo.service';

@Module({
  imports: [RedisModule],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}

import { Module } from '@nestjs/common';
import { VisitorController } from './visitor.controller';
import { VisitorService } from './visitor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { RedisModule } from '../../common/redis/redis.module';
import { NotificationModule } from '../notification/notification.module';
import { GeoModule } from '../geo/geo.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    RedisModule,
    NotificationModule,
    GeoModule,
    AuthModule,
  ],
  controllers: [VisitorController],
  providers: [VisitorService],
  exports: [VisitorService],
})
export class VisitorModule {}

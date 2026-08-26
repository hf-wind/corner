import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { CircleController } from './circle.controller';
import { CircleService } from './circle.service';

@Module({
  imports: [SettingsModule],
  controllers: [CircleController],
  providers: [CircleService],
})
export class CircleModule {}

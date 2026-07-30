import { Module } from '@nestjs/common';
import { MomentModule } from '../moment/moment.module';
import { PlaceController } from './place.controller';
import { PlaceService } from './place.service';

@Module({
  imports: [MomentModule],
  controllers: [PlaceController],
  providers: [PlaceService],
  exports: [PlaceService],
})
export class PlaceModule {}

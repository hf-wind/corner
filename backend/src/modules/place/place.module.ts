import { Module } from '@nestjs/common';
import { MomentModule } from '../moment/moment.module';
import { PlaceController } from './place.controller';
import { PlaceService } from './place.service';
import { MemoryGraphModule } from '../memory-graph/memory-graph.module';

@Module({
  imports: [MomentModule, MemoryGraphModule],
  controllers: [PlaceController],
  providers: [PlaceService],
  exports: [PlaceService],
})
export class PlaceModule {}

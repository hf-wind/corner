import { Module } from '@nestjs/common';
import { MemoryGraphModule } from '../memory-graph/memory-graph.module';
import { JourneyController, StoryRouteController } from './journey.controller';
import { JourneyService } from './journey.service';
import { JourneyFeatureGuard } from './journey-feature.guard';

@Module({
  imports: [MemoryGraphModule],
  controllers: [JourneyController, StoryRouteController],
  providers: [JourneyService, JourneyFeatureGuard],
  exports: [JourneyService],
})
export class JourneyModule {}

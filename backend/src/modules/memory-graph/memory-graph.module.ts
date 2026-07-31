import { Module } from '@nestjs/common';
import {
  MemoryGraphController,
  MemoryRelationAdminController,
} from './memory-graph.controller';
import { MemoryGraphFeatureGuard } from './memory-graph-feature.guard';
import { MemoryGraphService } from './memory-graph.service';
import { AiModule } from '../ai/ai.module';
import { MemoryNarrativeAiService } from './memory-narrative-ai.service';

@Module({
  imports: [AiModule],
  controllers: [MemoryGraphController, MemoryRelationAdminController],
  providers: [
    MemoryGraphService,
    MemoryGraphFeatureGuard,
    MemoryNarrativeAiService,
  ],
  exports: [MemoryGraphService],
})
export class MemoryGraphModule {}

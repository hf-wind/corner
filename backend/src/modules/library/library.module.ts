import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { AiModule } from '../ai/ai.module';
import { MemoryGraphModule } from '../memory-graph/memory-graph.module';

@Module({
  imports: [AiModule, MemoryGraphModule],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}

import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { MemoryGraphModule } from '../memory-graph/memory-graph.module';
import { MediaModule } from '../media/media.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [MemoryGraphModule, MediaModule, AiModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}

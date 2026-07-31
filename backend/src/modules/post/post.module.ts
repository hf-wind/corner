import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { MemoryGraphModule } from '../memory-graph/memory-graph.module';

@Module({
  imports: [MemoryGraphModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}

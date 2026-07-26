import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}

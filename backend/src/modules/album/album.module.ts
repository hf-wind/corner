import { Module } from '@nestjs/common';
import { AlbumController } from './album.controller';
import { AlbumService } from './album.service';
import { AlbumFeatureGuard } from './album-feature.guard';

@Module({
  controllers: [AlbumController],
  providers: [AlbumService, AlbumFeatureGuard],
  exports: [AlbumService],
})
export class AlbumModule {}

import { Module } from '@nestjs/common';
import { AlbumModule } from '../album/album.module';
import { MomentModule } from '../moment/moment.module';
import { MapFeatureGuard } from './map-feature.guard';
import { MemoryMapController } from './memory-map.controller';
import { MemoryMapService } from './memory-map.service';

@Module({
  imports: [MomentModule, AlbumModule],
  controllers: [MemoryMapController],
  providers: [MemoryMapService, MapFeatureGuard],
})
export class MemoryMapModule {}

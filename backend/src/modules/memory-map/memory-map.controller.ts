import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MemoryMapQueryDto } from './dto/memory-map-query.dto';
import { MapFeatureGuard } from './map-feature.guard';
import { MemoryMapService } from './memory-map.service';

@Controller('memories')
@UseGuards(MapFeatureGuard)
export class MemoryMapController {
  constructor(private readonly memories: MemoryMapService) {}

  @Get('map')
  findMap(@Query() query: MemoryMapQueryDto) {
    return this.memories.findMap(query);
  }

  @Get('places/:slug')
  findPlace(@Param('slug') slug: string) {
    return this.memories.findPlace(slug);
  }
}

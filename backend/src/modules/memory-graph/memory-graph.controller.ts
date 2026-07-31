import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateMemoryRelationDto } from './dto/create-memory-relation.dto';
import { MemoryGraphQueryDto } from './dto/memory-graph-query.dto';
import { UpdateMemoryRelationDto } from './dto/update-memory-relation.dto';
import {
  GenerateNarrationDto,
  RecommendStoryDto,
  SuggestMemoryRelationsDto,
} from './dto/memory-ai.dto';
import { MemoryGraphFeatureGuard } from './memory-graph-feature.guard';
import { MemoryGraphService } from './memory-graph.service';
import { MemoryNarrativeAiService } from './memory-narrative-ai.service';

type MemoryRelationAdminQuery = Parameters<
  MemoryGraphService['adminRelations']
>[0];

@Controller('memories')
export class MemoryGraphController {
  constructor(private graphService: MemoryGraphService) {}

  @Get('graph')
  @UseGuards(MemoryGraphFeatureGuard)
  graph(@Query() query: MemoryGraphQueryDto) {
    return this.graphService.graph(query);
  }

  @Get('graph/neighbors/:id')
  @UseGuards(MemoryGraphFeatureGuard)
  neighbors(@Param('id') id: string) {
    return this.graphService.neighbors(id);
  }
}

@Controller('memory-relations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class MemoryRelationAdminController {
  constructor(
    private graphService: MemoryGraphService,
    private narrativeAi: MemoryNarrativeAiService,
  ) {}

  @Get()
  findAll(@Query() query: MemoryRelationAdminQuery) {
    return this.graphService.adminRelations(query);
  }

  @Get('graph')
  graph(@Query() query: MemoryGraphQueryDto) {
    return this.graphService.graph(query);
  }

  @Get('nodes')
  nodes(@Query('search') search?: string) {
    return this.graphService.searchNodes(search);
  }

  @Get('health')
  health() {
    return this.graphService.health();
  }

  @Post('rebuild')
  rebuild() {
    return this.graphService.rebuild();
  }

  @Post('ai/suggest')
  suggest(@Body() dto: SuggestMemoryRelationsDto) {
    return this.narrativeAi.suggestRelations(dto.sourceId);
  }

  @Post('ai/story')
  recommendStory(@Body() dto: RecommendStoryDto) {
    return this.narrativeAi.recommendStory(dto);
  }

  @Post('ai/narrations')
  narrations(@Body() dto: GenerateNarrationDto) {
    return this.narrativeAi.generateNarrations(dto);
  }

  @Post()
  create(@Body() dto: CreateMemoryRelationDto) {
    return this.graphService.createRelation(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMemoryRelationDto) {
    return this.graphService.updateRelation(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.graphService.removeRelation(id);
  }
}

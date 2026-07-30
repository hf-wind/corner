import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AiService } from './ai.service';
import { SummarizeDto } from './dto/summarize.dto';
import { ChatDto } from './dto/chat.dto';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { PreviewKnowledgeDto } from './dto/preview-knowledge.dto';
import { GenerateArticleDto } from './dto/generate-article.dto';
import { PolishMomentDto } from './dto/polish-moment.dto';
import { CreateAiModelConfigDto } from './dto/create-ai-model-config.dto';
import { UpdateAiModelConfigDto } from './dto/update-ai-model-config.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Get('pet/meta')
  petMeta() {
    return this.ai.getPetMeta();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('summarize')
  summarize(@Body() dto: SummarizeDto) {
    return this.ai.summarize(dto.title || '', dto.content || '');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('generate-article')
  generateArticle(@Body() dto: GenerateArticleDto, @Req() req: Request) {
    const userId = (req.user as any)?.id;
    return this.ai.generateArticle(dto.outline, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('polish-moment')
  polishMoment(@Body() dto: PolishMomentDto) {
    return this.ai.polishMomentWithConfig(dto.inspiration);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('wallpapers')
  wallpapers(@Query('page') page?: string, @Query('rows') rows?: string) {
    return this.ai.listWallpapers(
      page ? Number(page) : 1,
      rows ? Number(rows) : 9,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('chat')
  chat(@Body() dto: ChatDto, @Req() req: Request) {
    const userId = (req.user as any).id;
    return this.ai.petChat(userId, dto.message, dto.article);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('chat/stream')
  async chatStream(
    @Body() dto: ChatDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req.user as any).id;
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const writeEvent = (event: string, data: unknown) => {
      if (!res.writableEnded && !res.destroyed) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    try {
      const result = await this.ai.petChatStream(
        userId,
        dto.message,
        dto.article,
        (token) => writeEvent('token', token),
      );
      writeEvent('done', result);
    } catch {
      writeEvent('error', { message: 'AI 回复暂时不可用' });
    } finally {
      if (!res.writableEnded && !res.destroyed) res.end();
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('chat/history')
  history(@Req() req: Request, @Query('limit') limit?: string) {
    const userId = (req.user as any).id;
    return this.ai.getHistory(userId, limit ? Number(limit) : 30);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('chat/history')
  clearMyHistory(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.ai.clearHistory(userId);
  }

  @Get('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getConfig() {
    const config = await this.ai.getConfig();
    const { ai_api_key: _apiKey, ...safeConfig } = config;
    return {
      config: safeConfig,
      defaults: this.ai.getDefaults(),
      apiConfigured: await this.ai.isConfigured(),
    };
  }

  @Put('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateConfig(@Body() dto: UpdateAiConfigDto) {
    const config = await this.ai.updateConfig(dto.config || {});
    const { ai_api_key: _apiKey, ...safeConfig } = config;
    return {
      config: safeConfig,
      defaults: this.ai.getDefaults(),
      apiConfigured: await this.ai.isConfigured(),
    };
  }

  @Post('admin/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  testConnection(@Body() body?: { modelConfigId?: string }) {
    return this.ai.testConnection(body?.modelConfigId);
  }

  @Get('admin/models')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listModels() {
    return this.ai.listModelConfigs();
  }

  @Post('admin/models')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createModel(@Body() dto: CreateAiModelConfigDto) {
    return this.ai.createModelConfig(dto as unknown as Record<string, unknown>);
  }

  @Put('admin/models/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateModel(@Param('id') id: string, @Body() dto: UpdateAiModelConfigDto) {
    return this.ai.updateModelConfig(id, dto as unknown as Record<string, unknown>);
  }

  @Delete('admin/models/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removeModel(@Param('id') id: string) {
    return this.ai.removeModelConfig(id);
  }

  @Post('admin/models/:id/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  testModel(@Param('id') id: string) {
    return this.ai.testConnection(id);
  }

  @Post('admin/knowledge/preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  previewKnowledge(@Body() dto: PreviewKnowledgeDto) {
    return this.ai.previewKnowledge(dto.query || '');
  }

  @Get('admin/knowledge/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getKnowledgeList() {
    return this.ai.getKnowledgeList();
  }

  @Get('admin/conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listConversations(@Query('q') q?: string) {
    return this.ai.listConversations(q);
  }

  @Get('admin/conversations/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getConversation(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ai.getConversation(
      userId,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 100,
    );
  }

  @Delete('admin/conversations/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  clearConversation(@Param('userId') userId: string) {
    return this.ai.clearHistory(userId);
  }
}

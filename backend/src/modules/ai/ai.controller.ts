import {
  BadRequestException,
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
import type { Request, Response } from 'express';
import { AiService, type AiChatActor } from './ai.service';
import { AiNativeService } from './ai-native.service';
import {
  AiEventDto,
  AiExploreDto,
  AiNarrativeDto,
  AiPrivateQueryDto,
  AiWriteTransformDto,
} from './dto/ai-native.dto';
import { SummarizeDto } from './dto/summarize.dto';
import { ChatDto } from './dto/chat.dto';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { PreviewKnowledgeDto } from './dto/preview-knowledge.dto';
import { GenerateArticleDto } from './dto/generate-article.dto';
import { PolishMomentDto } from './dto/polish-moment.dto';
import { CreateAiModelConfigDto } from './dto/create-ai-model-config.dto';
import { UpdateAiModelConfigDto } from './dto/update-ai-model-config.dto';
import { TestAiConnectionDto } from './dto/test-ai-connection.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';

type AiRequest = Request & { user?: { id?: string } };

@Controller('ai')
export class AiController {
  constructor(
    private ai: AiService,
    private aiNative: AiNativeService,
  ) {}

  private chatActor(req: AiRequest): AiChatActor {
    const userId = req.user?.id;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (userId) return { userId, ip };

    const guestId = String(req.headers['x-ai-guest-id'] || '').trim();
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(guestId)) {
      throw new BadRequestException('游客会话标识无效，请刷新页面后重试');
    }
    return { guestId, ip };
  }

  @Get('pet/meta')
  petMeta() {
    return this.ai.getPetMeta();
  }

  @UseGuards(OptionalJwtAuthGuard)
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
  polishMoment(@Body() dto: PolishMomentDto, @Req() req: Request) {
    return this.ai.polishMomentWithConfig(
      dto.inspiration,
      (req.user as any)?.id,
    );
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

  @UseGuards(OptionalJwtAuthGuard)
  @Post('chat')
  async chat(@Body() dto: ChatDto, @Req() req: Request) {
    const actor = this.chatActor(req);
    const result = await this.ai.petChat(actor, dto.message, dto.article);
    const recommendations = this.shouldRecommend(dto.message)
      ? await this.aiNative.search(
          dto.message,
          this.recommendationTypes(dto.article?.type, dto.message),
          2,
        )
      : [];
    await this.aiNative
      .track(
        actor,
        {
          scene: dto.article?.scene || dto.article?.type || 'home',
          action: 'chat',
          contentType: dto.article?.type,
          sourceId: dto.article?.sourceId,
          metadata: { query: dto.message.slice(0, 160) },
        },
        {
          sourceCount: recommendations.length,
          inputChars: dto.message.length,
          outputChars: String(result.reply || '').length,
          inputTokens: Math.ceil(dto.message.length / 2),
          outputTokens: Math.ceil(String(result.reply || '').length / 2),
          fallback: result.source !== 'ai',
        },
      )
      .catch(() => undefined);
    return { ...result, recommendations };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('chat/stream')
  async chatStream(
    @Body() dto: ChatDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const actor = this.chatActor(req);
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

    let streamOutput = '';
    try {
      const result = await this.ai.petChatStream(
        actor,
        dto.message,
        dto.article,
        (token) => {
          streamOutput += token;
          writeEvent('token', token);
        },
      );
      const recommendations = this.shouldRecommend(dto.message)
        ? await this.aiNative.search(
            dto.message,
            this.recommendationTypes(dto.article?.type, dto.message),
            2,
          )
        : [];
      await this.aiNative
        .track(
          actor,
          {
            scene: dto.article?.scene || dto.article?.type || 'home',
            action: 'chat',
            contentType: dto.article?.type,
            sourceId: dto.article?.sourceId,
            metadata: { query: dto.message.slice(0, 160) },
          },
          {
            sourceCount: recommendations.length,
            inputChars: dto.message.length,
            outputChars: streamOutput.length,
            inputTokens: Math.ceil(dto.message.length / 2),
            outputTokens: Math.ceil(streamOutput.length / 2),
            fallback: result.source !== 'ai',
          },
        )
        .catch(() => undefined);
      writeEvent('done', { ...result, recommendations });
    } catch (error) {
      writeEvent('error', {
        message: error instanceof Error ? error.message : 'AI 回复暂时不可用',
      });
    } finally {
      if (!res.writableEnded && !res.destroyed) res.end();
    }
  }

  private recommendationTypes(type?: string, query = '') {
    if (/文章|随笔|post|article/i.test(query)) return ['post'];
    if (/相册|相簿|照片|摄影|album|photo/i.test(query))
      return ['album', 'photo'];
    if (/书影|书籍|读书|电影|影视|book|film|movie/i.test(query))
      return ['library'];
    const byScene: Record<string, string[]> = {
      post: ['post'],
      library: ['library'],
      album: ['album', 'photo'],
      photo: ['photo', 'album'],
      moment: ['moment'],
      place: ['place'],
      journey: ['journey'],
      story: ['story'],
    };
    return byScene[String(type || '')] || [];
  }

  private shouldRecommend(query: string) {
    return /(推荐|找一|找个|看看|探索|类似|下一篇|哪本|哪部|相册|书影|歌|音乐|内容)/u.test(
      query,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('chat/history')
  history(@Req() req: Request, @Query('limit') limit?: string) {
    return this.ai.getHistory(this.chatActor(req), limit ? Number(limit) : 30);
  }

  @Get('search')
  search(@Query('q') query = '', @Query('limit') limit?: string) {
    return this.aiNative.search(
      String(query || ''),
      [],
      limit ? Number(limit) : 12,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Delete('chat/history')
  clearMyHistory(@Req() req: Request) {
    return this.ai.clearHistory(this.chatActor(req));
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
  testConnection(@Body() dto: TestAiConnectionDto) {
    return this.ai.testConnection(dto?.modelConfigId);
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
    return this.ai.updateModelConfig(
      id,
      dto as unknown as Record<string, unknown>,
    );
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
    return this.ai.previewKnowledge(dto.query || '', {
      ai_knowledge_enabled: dto.enabled,
      ai_knowledge_catalog_limit: dto.catalogLimit,
      ai_knowledge_top_k: dto.topK,
      ai_knowledge_snippet_len: dto.snippetLen,
    });
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
  listConversations(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ai.listConversations(
      q,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 10,
    );
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
    return this.ai.clearConversation(userId);
  }
  @UseGuards(OptionalJwtAuthGuard)
  @Post('explore')
  async explore(@Body() dto: AiExploreDto, @Req() req: Request) {
    const actor = this.chatActor(req);
    const result = await this.aiNative.explore(dto.query, dto.types, dto.limit);
    await this.aiNative
      .track(
        actor,
        { scene: 'home', action: 'recommend', metadata: { query: dto.query } },
        { sourceCount: result.cards.length },
      )
      .catch(() => undefined);
    return result;
  }

  @Get('content/:type/:slug/insight')
  insight(@Param('type') type: string, @Param('slug') slug: string) {
    return this.aiNative.insight(type, slug);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('personalized')
  personalized(@Req() req: Request, @Query('limit') limit?: string) {
    return this.aiNative.personalized(
      this.chatActor(req),
      limit ? Number(limit) : 6,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('events')
  event(@Body() dto: AiEventDto, @Req() req: Request) {
    return this.aiNative.track(this.chatActor(req), dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/index/rebuild')
  rebuildIndex() {
    return this.aiNative.syncIndex();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/analytics')
  analytics() {
    return this.aiNative.analytics();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/usage')
  usage(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.aiNative.usageAnalytics(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 10,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('write/transform')
  transform(@Body() dto: AiWriteTransformDto, @Req() req: Request) {
    return this.aiNative.transform((req.user as any).id, dto.text, dto.action);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/style/rebuild')
  rebuildStyle(@Req() req: Request) {
    return this.aiNative.rebuildStyle((req.user as any).id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/style')
  styleStatus(@Req() req: Request) {
    return this.ai.getSiteStyleStatus((req.user as any).id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/narratives')
  narrative(@Body() dto: AiNarrativeDto, @Req() req: Request) {
    return this.aiNative.narrative((req.user as any).id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/private-query')
  privateQuery(@Body() dto: AiPrivateQueryDto, @Req() req: Request) {
    return this.aiNative.privateQuery((req.user as any).id, dto.query);
  }
}

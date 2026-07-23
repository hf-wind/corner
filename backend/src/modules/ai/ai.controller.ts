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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AiService } from './ai.service';
import { SummarizeDto } from './dto/summarize.dto';
import { ChatDto } from './dto/chat.dto';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { PreviewKnowledgeDto } from './dto/preview-knowledge.dto';

@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Get('pet/meta')
  petMeta() {
    return this.ai.getPetMeta();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('summarize')
  summarize(@Body() dto: SummarizeDto) {
    return this.ai.summarize(dto.title || '', dto.content || '');
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('chat')
  chat(@Body() dto: ChatDto, @Req() req: Request) {
    const userId = (req.user as any).id;
    return this.ai.petChat(userId, dto.message);
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

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/config')
  getConfig() {
    return this.ai.getConfig().then(async (config) => ({
      config,
      defaults: this.ai.getDefaults(),
      apiConfigured: this.ai.isConfigured(),
    }));
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('admin/config')
  updateConfig(@Body() dto: UpdateAiConfigDto) {
    return this.ai.updateConfig(dto.config || {}).then(async (config) => ({
      config,
      defaults: this.ai.getDefaults(),
      apiConfigured: this.ai.isConfigured(),
    }));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('admin/knowledge/preview')
  previewKnowledge(@Body() dto: PreviewKnowledgeDto) {
    return this.ai.previewKnowledge(dto.query || '');
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/conversations')
  listConversations(@Query('q') q?: string) {
    return this.ai.listConversations(q);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/conversations/:userId')
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

  @UseGuards(AuthGuard('jwt'))
  @Delete('admin/conversations/:userId')
  clearConversation(@Param('userId') userId: string) {
    return this.ai.clearHistory(userId);
  }
}

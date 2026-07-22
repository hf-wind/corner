import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AiService } from './ai.service';
import { SummarizeDto } from './dto/summarize.dto';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

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
  history(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.ai.getHistory(userId);
  }
}
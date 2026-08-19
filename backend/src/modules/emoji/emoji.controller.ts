import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { EmojiService } from './emoji.service';
import { CreateEmojiPackDto } from './dto/create-emoji-pack.dto';
import { UpdateEmojiPackDto } from './dto/update-emoji-pack.dto';
import { CreateEmojiItemDto } from './dto/create-emoji-item.dto';
import { UpdateEmojiItemDto } from './dto/update-emoji-item.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('emoji-packs')
export class EmojiController {
  constructor(private emoji: EmojiService) {}

  @Get('asset')
  async asset(@Query('url') url: string, @Res() res: Response) {
    if (!url) throw new BadRequestException('缺少表情资源地址');
    let remote: URL;
    try {
      remote = new URL(url);
    } catch {
      throw new BadRequestException('表情资源地址无效');
    }
    const allowedHosts = new Set(['koishi.js.org', 'cdn.jsdelivr.net']);
    if (
      remote.protocol !== 'https:' ||
      !allowedHosts.has(remote.hostname.toLowerCase())
    ) {
      throw new BadRequestException('不支持的表情资源地址');
    }
    try {
      const response = await fetch(remote, {
        headers: {
          'User-Agent': 'CornerEmojiProxy/1.0',
          Referer: `https://${remote.hostname}/`,
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`upstream ${response.status}`);
      const contentType = response.headers.get('content-type') || 'image/gif';
      if (!contentType.toLowerCase().startsWith('image/'))
        throw new Error('upstream content is not an image');
      const data = Buffer.from(await response.arrayBuffer());
      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Cache-Control',
        'public, max-age=86400, stale-while-revalidate=604800',
      );
      res.send(data);
    } catch (error) {
      throw new ServiceUnavailableException(
        `表情资源暂时不可用: ${error instanceof Error ? error.message : 'upstream error'}`,
      );
    }
  }

  @Get()
  getPacks() {
    return this.emoji.getPacks(false);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('all')
  getAllPacks() {
    return this.emoji.getPacks(true);
  }

  @Get(':id/items')
  getPackItems(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.emoji.getPackItems(
      id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 48,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  createPack(@Body() dto: CreateEmojiPackDto) {
    return this.emoji.createPack(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put(':id')
  updatePack(@Param('id') id: string, @Body() dto: UpdateEmojiPackDto) {
    return this.emoji.updatePack(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  deletePack(@Param('id') id: string) {
    return this.emoji.deletePack(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('items')
  addItem(@Body() dto: CreateEmojiItemDto) {
    return this.emoji.addItem(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateEmojiItemDto) {
    return this.emoji.updateItem(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.emoji.deleteItem(id);
  }
}

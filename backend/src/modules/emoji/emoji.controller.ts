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
import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { AuthGuard } from '@nestjs/passport';
import { EmojiService } from './emoji.service';
import { CreateEmojiPackDto } from './dto/create-emoji-pack.dto';
import { UpdateEmojiPackDto } from './dto/update-emoji-pack.dto';
import { CreateEmojiItemDto } from './dto/create-emoji-item.dto';
import { UpdateEmojiItemDto } from './dto/update-emoji-item.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { normalizeEmojiSource } from '../../common/utils/emoji-source';

@Controller('emoji-packs')
export class EmojiController {
  constructor(private emoji: EmojiService) {}

  @Get('asset')
  asset(@Query('url') url: string, @Res() res: Response) {
    if (!url) throw new BadRequestException('缺少表情资源地址');
    const local = normalizeEmojiSource(url);
    if (!local.startsWith('/uploads/emoji/qq/'))
      throw new BadRequestException('不支持的旧表情资源地址');
    const file = resolve(process.cwd(), local.replace(/^\/+/, ''));
    const root = resolve(process.cwd(), 'uploads', 'emoji', 'qq');
    const relativePath = relative(root, file);
    if (
      !relativePath ||
      relativePath.startsWith('..') ||
      isAbsolute(relativePath) ||
      !existsSync(file)
    )
      throw new ServiceUnavailableException('本地表情资源不存在');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(file);
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
    @Query('keyword') keyword?: string,
  ) {
    return this.emoji.getPackItems(
      id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 48,
      keyword,
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

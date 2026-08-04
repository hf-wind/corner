import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
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

  @Get()
  getPacks() {
    return this.emoji.getPacks(false, 48);
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
    return this.emoji.getPackItems(id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 48);
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

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmojiService } from './emoji.service';
import { CreateEmojiPackDto } from './dto/create-emoji-pack.dto';
import { UpdateEmojiPackDto } from './dto/update-emoji-pack.dto';
import { CreateEmojiItemDto } from './dto/create-emoji-item.dto';

@Controller('emoji-packs')
export class EmojiController {
  constructor(private emoji: EmojiService) {}

  @Get()
  getPacks() {
    return this.emoji.getPacks(false);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('all')
  getAllPacks() {
    return this.emoji.getPacks(true);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  createPack(@Body() dto: CreateEmojiPackDto) {
    return this.emoji.createPack(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  updatePack(@Param('id') id: string, @Body() dto: UpdateEmojiPackDto) {
    return this.emoji.updatePack(id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  deletePack(@Param('id') id: string) {
    return this.emoji.deletePack(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('items')
  addItem(@Body() dto: CreateEmojiItemDto) {
    return this.emoji.addItem(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: Partial<CreateEmojiItemDto>) {
    return this.emoji.updateItem(id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.emoji.deleteItem(id);
  }
}

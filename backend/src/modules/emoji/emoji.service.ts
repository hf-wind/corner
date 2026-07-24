import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmojiPackDto } from './dto/create-emoji-pack.dto';
import { UpdateEmojiPackDto } from './dto/update-emoji-pack.dto';
import { CreateEmojiItemDto } from './dto/create-emoji-item.dto';

@Injectable()
export class EmojiService {
  constructor(private prisma: PrismaService) {}

  async getPacks(includeDisabled = false) {
    return this.prisma.emojiPack.findMany({
      where: includeDisabled ? {} : { enabled: true },
      include: {
        items: { orderBy: { sort: 'asc' } },
      },
      orderBy: { sort: 'asc' },
    });
  }

  async getPack(id: string) {
    const pack = await this.prisma.emojiPack.findUnique({
      where: { id },
      include: { items: { orderBy: { sort: 'asc' } } },
    });
    if (!pack) throw new NotFoundException('Emoji pack not found');
    return pack;
  }

  async createPack(dto: CreateEmojiPackDto) {
    return this.prisma.emojiPack.create({ data: dto });
  }

  async updatePack(id: string, dto: UpdateEmojiPackDto) {
    await this.getPack(id);
    return this.prisma.emojiPack.update({ where: { id }, data: dto });
  }

  async deletePack(id: string) {
    await this.getPack(id);
    await this.prisma.emojiPack.delete({ where: { id } });
  }

  async addItem(dto: CreateEmojiItemDto) {
    await this.getPack(dto.packId);
    return this.prisma.emojiItem.create({ data: dto });
  }

  async updateItem(id: string, dto: Partial<CreateEmojiItemDto>) {
    const item = await this.prisma.emojiItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Emoji item not found');
    return this.prisma.emojiItem.update({ where: { id }, data: dto });
  }

  async deleteItem(id: string) {
    const item = await this.prisma.emojiItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Emoji item not found');
    await this.prisma.emojiItem.delete({ where: { id } });
  }
}

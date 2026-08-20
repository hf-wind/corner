import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmojiPackDto } from './dto/create-emoji-pack.dto';
import { UpdateEmojiPackDto } from './dto/update-emoji-pack.dto';
import { CreateEmojiItemDto } from './dto/create-emoji-item.dto';
import { UpdateEmojiItemDto } from './dto/update-emoji-item.dto';

@Injectable()
export class EmojiService {
  constructor(private prisma: PrismaService) {}

  async getPacks(includeDisabled = false) {
    const packs = await this.prisma.emojiPack.findMany({
      where: includeDisabled ? {} : { enabled: true },
      select: {
        id: true,
        name: true,
        type: true,
        enabled: true,
        sort: true,
        compressAnimated: true,
        _count: { select: { items: true } },
      },
      orderBy: { sort: 'asc' },
    });
    return packs;
  }

  async getPackItems(id: string, page = 1, limit = 48, keyword?: string) {
    await this.getPack(id);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const where = {
      packId: id,
      ...(keyword?.trim()
        ? {
            OR: [
              { label: { contains: keyword.trim(), mode: 'insensitive' as const } },
              { char: { contains: keyword.trim(), mode: 'insensitive' as const } },
              { imageUrl: { contains: keyword.trim(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.emojiItem.findMany({
        where,
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.emojiItem.count({ where }),
    ]);
    return {
      items: items.map((item) => this.presentItem(item)),
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getPack(id: string) {
    const pack = await this.prisma.emojiPack.findUnique({
      where: { id },
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

  async updateItem(id: string, dto: UpdateEmojiItemDto) {
    const item = await this.prisma.emojiItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Emoji item not found');
    return this.prisma.emojiItem.update({ where: { id }, data: dto });
  }

  private presentItem<T extends { imageUrl: string | null }>(item: T) {
    return item;
  }

  async deleteItem(id: string) {
    const item = await this.prisma.emojiItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Emoji item not found');
    await this.prisma.emojiItem.delete({ where: { id } });
  }
}

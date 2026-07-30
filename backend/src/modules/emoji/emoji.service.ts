import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmojiPackDto } from './dto/create-emoji-pack.dto';
import { UpdateEmojiPackDto } from './dto/update-emoji-pack.dto';
import { CreateEmojiItemDto } from './dto/create-emoji-item.dto';
import { UpdateEmojiItemDto } from './dto/update-emoji-item.dto';

const ASSET_HOSTS = new Set(['cdn.jsdelivr.net', 'koishi.js.org']);
const ASSET_ROOT = join(process.cwd(), 'uploads', 'emoji-cache');

@Injectable()
export class EmojiService {
  constructor(private prisma: PrismaService) {}

  async getPacks(includeDisabled = false, itemLimit?: number) {
    const packs = await this.prisma.emojiPack.findMany({
      where: includeDisabled ? {} : { enabled: true },
      include: {
        _count: { select: { items: true } },
        items: {
          orderBy: { sort: 'asc' },
          ...(itemLimit ? { take: itemLimit } : {}),
        },
      },
      orderBy: { sort: 'asc' },
    });
    return packs.map((pack) => ({ ...pack, items: pack.items.map((item) => this.presentItem(item)) }));
  }

  async getPackItems(id: string, page = 1, limit = 48) {
    await this.getPack(id);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [items, total] = await Promise.all([
      this.prisma.emojiItem.findMany({
        where: { packId: id },
        orderBy: { sort: 'asc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.emojiItem.count({ where: { packId: id } }),
    ]);
    return { items: items.map((item) => this.presentItem(item)), total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
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

  async updateItem(id: string, dto: UpdateEmojiItemDto) {
    const item = await this.prisma.emojiItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Emoji item not found');
    return this.prisma.emojiItem.update({ where: { id }, data: dto });
  }

  async cacheRemoteAsset(rawUrl: string) {
    let url: URL;
    try {
      url = new URL(String(rawUrl || ''));
    } catch {
      throw new BadRequestException('无效的表情资源地址');
    }
    if (url.protocol !== 'https:' || !ASSET_HOSTS.has(url.hostname.toLowerCase())) {
      throw new BadRequestException('不允许代理该表情资源');
    }

    const key = createHash('sha256').update(url.toString()).digest('hex');
    mkdirSync(ASSET_ROOT, { recursive: true });
    for (const extension of ['png', 'gif', 'webp', 'svg']) {
      const cached = join(ASSET_ROOT, `${key}.${extension}`);
      if (existsSync(cached)) return { path: cached, mimeType: this.mimeForExtension(extension) };
    }

    let remote: globalThis.Response;
    try {
      remote = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'CornerEmojiCache/1.0', Accept: 'image/*' },
      });
    } catch {
      throw new BadRequestException('表情资源加载失败');
    }
    if (!remote.ok) throw new BadRequestException(`表情资源加载失败 (${remote.status})`);
    const mimeType = (remote.headers.get('content-type') || '').split(';')[0].toLowerCase();
    const extension = this.extensionForMime(mimeType);
    if (!extension) throw new BadRequestException('远程地址不是支持的图片');
    const buffer = Buffer.from(await remote.arrayBuffer());
    if (!buffer.length || buffer.length > 2 * 1024 * 1024) throw new BadRequestException('表情资源大小无效');
    const path = join(ASSET_ROOT, `${key}.${extension}`);
    writeFileSync(path, buffer);
    return { path, mimeType };
  }

  private presentItem<T extends { imageUrl: string | null }>(item: T) {
    return {
      ...item,
      imageUrl: item.imageUrl && this.isProxyable(item.imageUrl)
        ? `/api/emoji-packs/asset?url=${encodeURIComponent(item.imageUrl)}`
        : item.imageUrl,
    };
  }

  private isProxyable(rawUrl: string) {
    try {
      const url = new URL(rawUrl);
      return url.protocol === 'https:' && ASSET_HOSTS.has(url.hostname.toLowerCase());
    } catch {
      return false;
    }
  }

  private extensionForMime(mimeType: string) {
    return ({ 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' } as Record<string, string>)[mimeType];
  }

  private mimeForExtension(extension: string) {
    return ({ png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' } as Record<string, string>)[extension];
  }

  async deleteItem(id: string) {
    const item = await this.prisma.emojiItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Emoji item not found');
    await this.prisma.emojiItem.delete({ where: { id } });
  }
}

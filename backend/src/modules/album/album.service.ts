import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildPublicLocation } from '../../common/location/public-location';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import type { PublicMapMemory } from '../memory-map/memory-map.types';

const albumInclude = {
  coverMedia: true,
  place: true,
  author: { select: { id: true, username: true, avatar: true } },
  items: {
    orderBy: { sort: 'asc' as const },
    include: {
      media: { include: { metadata: { include: { confirmedPlace: true } } } },
      place: true,
      moment: { select: { id: true, slug: true, title: true, status: true } },
    },
  },
} satisfies Prisma.AlbumInclude;

const albumListInclude = {
  coverMedia: true,
  place: true,
  author: { select: { id: true, username: true, avatar: true } },
  items: { orderBy: { sort: 'asc' as const }, take: 1, include: { media: true } },
  _count: { select: { items: true } },
} satisfies Prisma.AlbumInclude;

@Injectable()
export class AlbumService {
  constructor(private prisma: PrismaService) {}

  private pagination(page?: string, limit?: string) {
    return {
      page: Math.max(1, Number(page) || 1),
      limit: Math.max(1, Math.min(100, Number(limit) || 12)),
    };
  }

  async findPublic(query: { page?: string; limit?: string; place?: string; year?: string }) {
    const { page, limit } = this.pagination(query.page, query.limit);
    const where: Prisma.AlbumWhereInput = { status: 'published' };
    if (query.place) where.place = { slug: query.place };
    const year = Number(query.year);
    if (year >= 1900 && year <= 3000) {
      where.happenedAt = { gte: new Date(`${year}-01-01T00:00:00.000Z`), lt: new Date(`${year + 1}-01-01T00:00:00.000Z`) };
    }
    const [rows, total] = await Promise.all([
      this.prisma.album.findMany({ where, include: albumListInclude, orderBy: [{ happenedAt: 'desc' }, { publishedAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.album.count({ where }),
    ]);
    return { items: rows.map((row) => this.formatPublic(row, false)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findPublishedBySlug(slug: string) {
    const album = await this.prisma.album.findFirst({ where: { slug, status: 'published' }, include: albumInclude });
    if (!album) throw new NotFoundException('Album not found');
    return this.formatPublic(album, true);
  }

  async findPublicMapMemories(): Promise<PublicMapMemory[]> {
    const rows = await this.prisma.album.findMany({
      where: { status: 'published' },
      include: albumInclude,
      orderBy: [{ happenedAt: 'desc' }, { publishedAt: 'desc' }],
      take: 2000,
    });
    const memories: PublicMapMemory[] = [];
    for (const row of rows) {
      const album = this.formatPublic(row, true);
      if (this.hasMapCoordinate(album.publicLocation)) {
        memories.push({
          id: `album:${album.id}`,
          type: 'album',
          title: album.title,
          excerpt: album.description,
          occurredAt: album.happenedAt || album.publishedAt,
          href: `/albums/${album.slug}`,
          thumbnail: album.cover?.path,
          publicLocation: album.publicLocation,
        });
      }
      for (const item of album.items || []) {
        if (!this.hasMapCoordinate(item.publicLocation)) continue;
        memories.push({
          id: `photo:${item.id}`,
          type: 'photo',
          title: item.caption || album.title,
          excerpt: item.caption,
          occurredAt: item.happenedAt || album.happenedAt || album.publishedAt,
          href: `/albums/${album.slug}?photo=${encodeURIComponent(item.id)}`,
          thumbnail: item.media.path,
          publicLocation: item.publicLocation,
        });
      }
    }
    return memories;
  }

  async findAdmin(query: { page?: string; limit?: string; status?: string; search?: string }) {
    const { page, limit } = this.pagination(query.page, query.limit);
    const where: Prisma.AlbumWhereInput = {};
    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.search) where.OR = [{ title: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }];
    const [items, total] = await Promise.all([
      this.prisma.album.findMany({ where, include: { coverMedia: true, place: true, _count: { select: { items: true } } }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.album.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAdminOne(id: string) {
    const album = await this.prisma.album.findUnique({ where: { id }, include: albumInclude });
    if (!album) throw new NotFoundException('Album not found');
    return album;
  }

  async create(dto: CreateAlbumDto, authorId: string) {
    await this.validate(dto);
    return this.prisma.album.create({
      data: {
        title: dto.title.trim(),
        slug: dto.slug.trim(),
        description: dto.description?.trim() || null,
        coverMediaId: dto.coverMediaId || null,
        authorId,
        happenedAt: dto.happenedAt ? new Date(dto.happenedAt) : null,
        placeId: dto.placeId || null,
        locationVisibility: dto.locationVisibility || 'private',
        locationPrecision: dto.locationPrecision || 'place',
        locationExactConfirmedAt: dto.locationExactConfirmedAt ? new Date(dto.locationExactConfirmedAt) : null,
        items: { create: this.itemData(dto.items || []) },
      },
      include: albumInclude,
    });
  }

  async update(id: string, dto: UpdateAlbumDto) {
    const existing = await this.prisma.album.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Album not found');
    await this.validate(dto, id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.albumItem.deleteMany({ where: { albumId: id } });
      }
      return tx.album.update({
        where: { id },
        data: {
          ...this.albumData(dto),
          ...(dto.items ? { items: { create: this.itemData(dto.items) } } : {}),
        },
        include: albumInclude,
      });
    });
  }

  async publish(id: string) {
    const album = await this.prisma.album.findUnique({ where: { id }, include: { _count: { select: { items: true } } } });
    if (!album) throw new NotFoundException('Album not found');
    if (!album._count.items) throw new BadRequestException('相册至少需要一张照片');
    return this.prisma.album.update({ where: { id }, data: { status: 'published', publishedAt: album.publishedAt || new Date() }, include: albumInclude });
  }

  async unpublish(id: string) {
    return this.prisma.album.update({ where: { id }, data: { status: 'draft' }, include: albumInclude });
  }

  async makePrivate(id: string) {
    return this.prisma.album.update({ where: { id }, data: { status: 'private' }, include: albumInclude });
  }

  async remove(id: string) {
    const album = await this.prisma.album.findUnique({ where: { id }, select: { id: true } });
    if (!album) throw new NotFoundException('Album not found');
    await this.prisma.album.delete({ where: { id } });
  }

  private albumData(dto: UpdateAlbumDto) {
    return {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.slug !== undefined ? { slug: dto.slug.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      ...(dto.coverMediaId !== undefined ? { coverMediaId: dto.coverMediaId || null } : {}),
      ...(dto.happenedAt !== undefined ? { happenedAt: dto.happenedAt ? new Date(dto.happenedAt) : null } : {}),
      ...(dto.placeId !== undefined ? { placeId: dto.placeId || null } : {}),
      ...(dto.locationVisibility !== undefined ? { locationVisibility: dto.locationVisibility } : {}),
      ...(dto.locationPrecision !== undefined ? { locationPrecision: dto.locationPrecision } : {}),
      ...(dto.locationExactConfirmedAt !== undefined ? { locationExactConfirmedAt: dto.locationExactConfirmedAt ? new Date(dto.locationExactConfirmedAt) : null } : {}),
    };
  }

  private itemData(items: NonNullable<CreateAlbumDto['items']>) {
    return [...items].sort((a, b) => a.sort - b.sort).map((item, index) => ({
      mediaId: item.mediaId,
      sort: index,
      caption: item.caption?.trim() || null,
      happenedAt: item.happenedAt ? new Date(item.happenedAt) : null,
      placeId: item.placeId || null,
      momentId: item.momentId || null,
      locationVisibility: item.locationVisibility || 'private',
      locationPrecision: item.locationPrecision || 'place',
      locationSource: item.locationSource || null,
      locationExactConfirmedAt: item.locationExactConfirmedAt ? new Date(item.locationExactConfirmedAt) : null,
    }));
  }

  private async validate(dto: UpdateAlbumDto, currentId?: string) {
    if (dto.slug) {
      const duplicate = await this.prisma.album.findFirst({ where: { slug: dto.slug.trim(), ...(currentId ? { id: { not: currentId } } : {}) }, select: { id: true } });
      if (duplicate) throw new BadRequestException('相册 slug 已存在');
    }
    const mediaIds = [...new Set([...(dto.items || []).map((item) => item.mediaId), ...(dto.coverMediaId ? [dto.coverMediaId] : [])])];
    if (mediaIds.length) {
      const count = await this.prisma.media.count({ where: { id: { in: mediaIds }, mimeType: { startsWith: 'image/' } } });
      if (count !== mediaIds.length) throw new BadRequestException('相册只能使用有效图片');
    }
    const itemIds = (dto.items || []).map((item) => item.mediaId);
    if (new Set(itemIds).size !== itemIds.length) throw new BadRequestException('同一张图片不能重复加入相册');
    const placeIds = [...new Set([...(dto.placeId ? [dto.placeId] : []), ...(dto.items || []).map((item) => item.placeId).filter(Boolean) as string[]])];
    if (placeIds.length && await this.prisma.place.count({ where: { id: { in: placeIds } } }) !== placeIds.length) throw new BadRequestException('地点不存在');
    const momentIds = [...new Set((dto.items || []).map((item) => item.momentId).filter(Boolean) as string[])];
    if (momentIds.length && await this.prisma.moment.count({ where: { id: { in: momentIds } } }) !== momentIds.length) throw new BadRequestException('瞬间不存在');
  }

  private formatPublic(album: any, includeItems: boolean) {
    const publicLocation = buildPublicLocation({
      place: album.place,
      visibility: album.locationVisibility,
      precision: album.locationPrecision,
      exactConfirmedAt: album.locationExactConfirmedAt,
    });
    const items = includeItems ? album.items.map((item: any) => {
      const place = item.place || item.media.metadata?.confirmedPlace || null;
      const happenedAt = item.happenedAt || item.media.metadata?.confirmedCapturedAt || null;
      return {
        id: item.id,
        sort: item.sort,
        caption: item.caption,
        happenedAt,
        media: { id: item.media.id, path: item.media.path, width: item.media.metadata?.width, height: item.media.metadata?.height },
        publicLocation: buildPublicLocation({
          place,
          visibility: item.locationVisibility,
          precision: item.locationPrecision,
          exactConfirmedAt: item.locationExactConfirmedAt,
        }),
        moment: item.moment?.status === 'published' ? { slug: item.moment.slug, title: item.moment.title } : null,
      };
    }) : undefined;
    return {
      id: album.id,
      title: album.title,
      slug: album.slug,
      description: album.description,
      happenedAt: album.happenedAt,
      publishedAt: album.publishedAt,
      cover: album.coverMedia ? { id: album.coverMedia.id, path: album.coverMedia.path } : album.items[0]?.media ? { id: album.items[0].media.id, path: album.items[0].media.path } : null,
      publicLocation,
      itemCount: album._count?.items ?? album.items.length,
      author: album.author,
      ...(includeItems ? { items } : {}),
    };
  }

  private hasMapCoordinate(location: unknown): location is NonNullable<ReturnType<typeof buildPublicLocation>> {
    if (!location || typeof location !== 'object') return false;
    const value = location as { latitude?: unknown; longitude?: unknown };
    return Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude));
  }
}

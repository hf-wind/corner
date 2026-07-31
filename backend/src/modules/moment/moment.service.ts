import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMomentDto } from './dto/create-moment.dto';
import { UpdateMomentDto } from './dto/update-moment.dto';
import { MomentQueryDto } from './dto/moment-query.dto';
import { NotificationService } from '../notification/notification.service';
import { contentPreview } from '../../common/utils/content-preview';
import { toGcj02 } from '../../common/location/coordinates';
import {
  buildPublicLocation,
  type LocationPrecision,
  type LocationSource,
  type LocationVisibility,
  type PlaceSnapshot,
} from '../../common/location/public-location';
import type { PublicMapMemory } from '../memory-map/memory-map.types';

type PublishedMomentSnapshot = {
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  happenedAt: string | null;
  place: PlaceSnapshot | null;
  locationVisibility: LocationVisibility;
  locationPrecision: LocationPrecision;
  locationSource: LocationSource | null;
  locationExactConfirmedAt: string | null;
};

const momentAuthorSelect = { id: true, username: true, avatar: true } satisfies Prisma.UserSelect;

@Injectable()
export class MomentService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  private buildListSelect(currentUserId?: string): Prisma.MomentSelect {
    return {
      id: true,
      title: true,
      slug: true,
      content: true,
      excerpt: true,
      authorId: true,
      status: true,
      viewCount: true,
      likeCount: true,
      needsPublish: true,
      publishedSnapshot: true,
      placeId: true,
      happenedAt: true,
      locationVisibility: true,
      locationPrecision: true,
      locationSource: true,
      locationExactConfirmedAt: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      author: { select: momentAuthorSelect },
      place: true,
      _count: { select: { comments: true } },
      ...(currentUserId
        ? {
            likes: {
              where: { userId: currentUserId },
              select: { id: true },
            },
          }
        : {}),
    };
  }

  private buildInclude(currentUserId?: string): Prisma.MomentInclude {
    return {
      author: { select: momentAuthorSelect },
      place: true,
      _count: { select: { comments: true } },
      ...(currentUserId
        ? {
            likes: {
              where: { userId: currentUserId },
              select: { id: true },
            },
          }
        : {}),
    };
  }

  private isAdminListQuery(query: MomentQueryDto) {
    return (
      (query.status !== undefined && query.status !== null && String(query.status).length > 0) ||
      query.needsPublish === true
    );
  }

  async findAll(query: MomentQueryDto, currentUserId?: string, isAdmin = false) {
    const { sort, search, status } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const adminView = isAdmin && this.isAdminListQuery(query);
    const where: Prisma.MomentWhereInput = {};

    if (!isAdmin) {
      where.status = 'published';
    } else if (status === 'all') {
      /* no status filter */
    } else if (status) {
      where.status = status;
    } else {
      where.status = 'published';
    }

    if (isAdmin && query.needsPublish === true) {
      where.needsPublish = true;
    }

    if (search && adminView) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.MomentOrderByWithRelationInput =
      sort === 'popular'
        ? { viewCount: 'desc' }
        : sort === 'oldest'
          ? { publishedAt: 'asc' }
          : { publishedAt: 'desc' };

    const select = this.buildListSelect(currentUserId);
    if (!adminView) {
      const rows = await this.prisma.moment.findMany({ where, select, orderBy, take: 1000 });
      const filtered = rows
        .map((item) => this.formatPublic(item))
        .filter((item) => this.matchesPublicQuery(item, query));
      const items = filtered.slice((page - 1) * limit, page * limit);
      return {
        items,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.moment.findMany({
        where,
        select,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.moment.count({ where }),
    ]);

    return {
      items: items.map((item) => this.format(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBySlug(slug: string, currentUserId?: string) {
    const moment = await this.findPublishedByAnySlug(slug, currentUserId);
    if (!moment) throw new NotFoundException('Moment not found');

    await this.prisma.moment.update({
      where: { id: moment.id },
      data: { viewCount: { increment: 1 } },
    });

    return this.formatPublic({ ...moment, viewCount: moment.viewCount + 1 });
  }

  async preview(slug: string, currentUserId?: string) {
    const moment = await this.prisma.moment.findUnique({
      where: { slug },
      include: this.buildInclude(currentUserId),
    });
    if (!moment) throw new NotFoundException('Moment not found');
    return this.format(moment);
  }

  async create(dto: CreateMomentDto, authorId: string) {
    const slug = await this.uniqueSlug(dto.slug);
    const location = await this.prepareLocation(dto);
    const moment = await this.prisma.moment.create({
      data: {
        title: dto.title,
        slug,
        content: dto.content,
        excerpt: dto.excerpt || null,
        authorId,
        status: 'draft',
        needsPublish: true,
        publishedSnapshot: Prisma.DbNull,
        ...location,
      },
      include: this.buildInclude(),
    });
    return this.format(moment);
  }

  async update(slug: string, dto: UpdateMomentDto) {
    const existing = await this.prisma.moment.findUnique({ where: { slug }, include: { place: true } });
    if (!existing) throw new NotFoundException('Moment not found');

    let snapshot = this.readSnapshot(existing.publishedSnapshot);
    if (existing.status === 'published' && !snapshot) {
      snapshot = this.buildSnapshotFromMoment(existing);
    }

    const data = {
      title: dto.title,
      slug: dto.slug,
      content: dto.content,
      excerpt: dto.excerpt,
    };
    if (data.slug) {
      data.slug = await this.uniqueSlug(data.slug, existing.id);
    }

    const location = await this.prepareLocation(dto, existing);

    const next = {
      title: data.title ?? existing.title,
      slug: data.slug ?? existing.slug,
      content: data.content ?? existing.content,
      excerpt: data.excerpt !== undefined ? data.excerpt : existing.excerpt,
      happenedAt: location.happenedAt !== undefined ? location.happenedAt : existing.happenedAt,
      place: location.placeId !== undefined
        ? await this.findPlaceSnapshot(location.placeId)
        : this.placeSnapshot(existing.place),
      locationVisibility: location.locationVisibility ?? existing.locationVisibility,
      locationPrecision: location.locationPrecision ?? existing.locationPrecision,
      locationSource: location.locationSource !== undefined ? location.locationSource : existing.locationSource,
      locationExactConfirmedAt: location.locationExactConfirmedAt !== undefined
        ? location.locationExactConfirmedAt
        : existing.locationExactConfirmedAt,
    };
    const needsPublish = !snapshot || !this.snapshotEquals(snapshot, next);

    const moment = await this.prisma.moment.update({
      where: { slug },
      data: {
        ...data,
        ...location,
        needsPublish,
        publishedSnapshot: snapshot ? (snapshot as unknown as Prisma.InputJsonValue) : undefined,
      },
      include: this.buildInclude(),
    });
    return this.format(moment);
  }

  async publish(slug: string) {
    const existing = await this.prisma.moment.findUnique({ where: { slug }, include: { place: true } });
    if (!existing) throw new NotFoundException('Moment not found');

    const snapshot = this.buildSnapshotFromMoment(existing);
    const moment = await this.prisma.moment.update({
      where: { slug },
      data: {
        status: 'published',
        needsPublish: false,
        publishedSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        publishedAt: existing.publishedAt ?? new Date(),
      },
      include: this.buildInclude(),
    });
    return this.format(moment);
  }

  async toggleLike(slug: string, userId: string) {
    const moment = await this.findPublishedByAnySlug(slug);
    if (!moment) throw new NotFoundException('Moment not found');

    const existing = await this.prisma.momentLike.findUnique({
      where: { userId_momentId: { userId, momentId: moment.id } },
    });

    if (existing) {
      await this.prisma.momentLike.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.momentLike.create({ data: { userId, momentId: moment.id } });
      if (moment.authorId && moment.authorId !== userId) {
        const liker = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });
        await this.notificationService.create(moment.authorId, {
          type: 'like',
          title: '你的瞬间收到了赞',
          content: `瞬间：「${moment.title}」\n点赞人：${liker?.username || '匿名用户'}\n瞬间内容：${contentPreview(moment.excerpt || moment.content)}`,
          link: `/moments?focus=${encodeURIComponent(moment.slug || moment.id)}`,
        });
      }
    }

    const likeCount = await this.prisma.momentLike.count({ where: { momentId: moment.id } });
    await this.prisma.moment.update({
      where: { id: moment.id },
      data: { likeCount },
    });

    return {
      liked: !existing,
      likeCount,
    };
  }

  async remove(slug: string) {
    const existing = await this.prisma.moment.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Moment not found');
    await this.prisma.moment.delete({ where: { slug } });
  }

  async findPublicPlaces(query: { search?: string; city?: string; page?: number; limit?: number }) {
    const rows = await this.prisma.moment.findMany({
      where: { status: 'published' },
      select: this.buildListSelect(),
      orderBy: { publishedAt: 'desc' },
      take: 1000,
    });
    const grouped = new Map<string, { id: string; slug: string; name: string; city?: string; province?: string; country?: string; momentCount: number }>();
    for (const row of rows) {
      const location = this.formatPublic(row).publicLocation;
      if (!location?.slug) continue;
      const current = grouped.get(location.slug);
      if (current) current.momentCount += 1;
      else grouped.set(location.slug, {
        id: location.slug,
        slug: location.slug,
        name: location.name,
        city: location.city,
        province: location.province,
        country: location.country,
        momentCount: 1,
      });
    }
    const keyword = String(query.search || '').trim().toLocaleLowerCase();
    const city = String(query.city || '').trim().toLocaleLowerCase();
    const filtered = [...grouped.values()].filter((place) => {
      const haystack = `${place.name} ${place.city || ''} ${place.province || ''}`.toLocaleLowerCase();
      return (!keyword || haystack.includes(keyword)) && (!city || place.city?.toLocaleLowerCase() === city);
    });
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return {
      items: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  async findPublicMapMemories(): Promise<PublicMapMemory[]> {
    const rows = await this.prisma.moment.findMany({
      where: { status: 'published' },
      select: this.buildListSelect(),
      orderBy: { publishedAt: 'desc' },
      take: 5000,
    });
    return rows.flatMap((row) => {
      const moment = this.formatPublic(row);
      if (!this.hasMapCoordinate(moment.publicLocation)) return [];
      return [{
        id: `moment:${moment.id}`,
        type: 'moment' as const,
        title: moment.title,
        excerpt: moment.excerpt,
        thumbnail: firstMomentImage(moment.content),
        occurredAt: moment.happenedAt || moment.publishedAt,
        href: `/moments?focus=${encodeURIComponent(moment.slug)}`,
        publicLocation: moment.publicLocation,
      }];
    });
  }

  private async findPublishedByAnySlug(slug: string, currentUserId?: string) {
    const include = this.buildInclude(currentUserId);
    const byWork = await this.prisma.moment.findFirst({
      where: { slug, status: 'published' },
      include,
    });
    if (byWork) {
      const snapshot = this.readSnapshot(byWork.publishedSnapshot);
      if (!snapshot || snapshot.slug === slug || byWork.slug === slug) return byWork;
    }

    const candidates = await this.prisma.moment.findMany({
      where: { status: 'published', publishedSnapshot: { not: Prisma.DbNull } },
      include,
      take: 500,
    });
    return (
      candidates.find((item) => {
        const snapshot = this.readSnapshot(item.publishedSnapshot);
        return snapshot?.slug === slug;
      }) || null
    );
  }

  private normalizeSlug(raw?: string) {
    const base = String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    return base || `m-${Date.now().toString(36)}`;
  }

  private async uniqueSlug(raw?: string, excludeId?: string) {
    const base = this.normalizeSlug(raw);
    let slug = base;
    let n = 2;
    while (true) {
      const existing = await this.prisma.moment.findUnique({ where: { slug } });
      if (!existing || (excludeId && existing.id === excludeId)) return slug;
      slug = `${base.slice(0, 70)}-${n}`;
      n += 1;
      if (n > 50) {
        return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      }
    }
  }

  private readSnapshot(raw: unknown): PublishedMomentSnapshot | null {
    if (!raw || typeof raw !== 'object') return null;
    const snapshot = raw as Record<string, unknown>;
    if (!snapshot.title || !snapshot.slug) return null;
    return {
      title: String(snapshot.title),
      slug: String(snapshot.slug),
      content: String(snapshot.content ?? ''),
      excerpt: snapshot.excerpt == null ? null : String(snapshot.excerpt),
      happenedAt: snapshot.happenedAt ? String(snapshot.happenedAt) : null,
      place: this.placeSnapshot(snapshot.place),
      locationVisibility: this.visibility(snapshot.locationVisibility),
      locationPrecision: this.precision(snapshot.locationPrecision),
      locationSource: this.source(snapshot.locationSource),
      locationExactConfirmedAt: snapshot.locationExactConfirmedAt
        ? String(snapshot.locationExactConfirmedAt)
        : null,
    };
  }

  private buildSnapshotFromMoment(moment: {
    title: string;
    slug: string;
    content: string;
    excerpt: string | null;
    happenedAt?: Date | string | null;
    place?: unknown;
    locationVisibility?: string;
    locationPrecision?: string;
    locationSource?: string | null;
    locationExactConfirmedAt?: Date | string | null;
  }): PublishedMomentSnapshot {
    return {
      title: moment.title,
      slug: moment.slug,
      content: moment.content,
      excerpt: moment.excerpt,
      happenedAt: moment.happenedAt ? new Date(moment.happenedAt).toISOString() : null,
      place: this.placeSnapshot(moment.place),
      locationVisibility: this.visibility(moment.locationVisibility),
      locationPrecision: this.precision(moment.locationPrecision),
      locationSource: this.source(moment.locationSource),
      locationExactConfirmedAt: moment.locationExactConfirmedAt
        ? new Date(moment.locationExactConfirmedAt).toISOString()
        : null,
    };
  }

  private snapshotEquals(
    a: PublishedMomentSnapshot,
    b: {
      title: string;
      slug: string;
      content: string;
      excerpt?: string | null;
      happenedAt?: Date | string | null;
      place?: unknown;
      locationVisibility?: string;
      locationPrecision?: string;
      locationSource?: string | null;
      locationExactConfirmedAt?: Date | string | null;
    },
  ) {
    const norm = (value: unknown) => String(value ?? '').trim();
    const normalizeTime = (value: Date | string | null | undefined) => {
      if (!value) return '';
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? norm(value) : date.toISOString();
    };
    return (
      norm(a.title) === norm(b.title) &&
      norm(a.slug) === norm(b.slug) &&
      norm(a.content) === norm(b.content) &&
      norm(a.excerpt) === norm(b.excerpt) &&
      normalizeTime(a.happenedAt) === normalizeTime(b.happenedAt) &&
      JSON.stringify(a.place) === JSON.stringify(this.placeSnapshot(b.place)) &&
      a.locationVisibility === this.visibility(b.locationVisibility) &&
      a.locationPrecision === this.precision(b.locationPrecision) &&
      norm(a.locationSource) === norm(this.source(b.locationSource)) &&
      normalizeTime(a.locationExactConfirmedAt) === normalizeTime(b.locationExactConfirmedAt)
    );
  }

  private format(moment: any) {
    const place = this.placeSnapshot(moment.place);
    return {
      ...moment,
      place: place ? { ...place, mapLocation: toGcj02(place.longitude, place.latitude) } : null,
      liked: moment.likes?.length > 0,
      commentCount: moment._count?.comments ?? 0,
      needsPublish: moment.needsPublish ?? true,
    };
  }

  private formatPublic(moment: any) {
    const snapshot = this.readSnapshot(moment.publishedSnapshot) || this.buildSnapshotFromMoment(moment);
    const base = this.format(moment);
    const {
      publishedSnapshot: _snapshot,
      needsPublish: _needsPublish,
      placeId: _placeId,
      place: _place,
      locationVisibility: _visibility,
      locationPrecision: _precision,
      locationSource: _source,
      locationExactConfirmedAt: _confirmed,
      ...rest
    } = base;

    return {
      ...rest,
      title: snapshot.title,
      slug: snapshot.slug,
      content: snapshot.content,
      excerpt: snapshot.excerpt,
      happenedAt: snapshot.happenedAt,
      publicLocation: buildPublicLocation({
        place: snapshot.place,
        visibility: snapshot.locationVisibility,
        precision: snapshot.locationPrecision,
        exactConfirmedAt: snapshot.locationExactConfirmedAt,
      }),
    };
  }

  private async prepareLocation(
    dto: CreateMomentDto | UpdateMomentDto,
    existing?: {
      placeId: string | null;
      happenedAt: Date | null;
      locationVisibility: string;
      locationPrecision: string;
      locationSource: string | null;
      locationExactConfirmedAt: Date | null;
    },
  ) {
    const placeId = dto.placeId !== undefined ? dto.placeId : existing?.placeId;
    const visibility = this.visibility(dto.locationVisibility ?? existing?.locationVisibility);
    const precision = this.precision(dto.locationPrecision ?? existing?.locationPrecision);
    if (placeId) await this.findPlaceSnapshot(placeId);
    if (!placeId && visibility !== 'private') {
      throw new BadRequestException('公开位置前必须先选择地点');
    }
    if (visibility === 'public' && precision !== 'exact') {
      throw new BadRequestException('公开策略仅支持精确位置；降低精度请使用模糊公开');
    }
    if (visibility === 'blurred' && precision === 'exact') {
      throw new BadRequestException('模糊公开不能使用精确坐标');
    }

    const exactChanged = Boolean(existing) && (
      placeId !== existing?.placeId ||
      visibility !== existing?.locationVisibility ||
      precision !== existing?.locationPrecision
    );
    let exactConfirmedAt: Date | null | undefined;
    if (visibility === 'public' && precision === 'exact') {
      if (dto.confirmExactLocation) exactConfirmedAt = new Date();
      else if (!existing || exactChanged || !existing.locationExactConfirmedAt) {
        throw new BadRequestException('精确公开位置需要二次确认');
      }
    } else if (existing || dto.locationVisibility !== undefined || dto.locationPrecision !== undefined) {
      exactConfirmedAt = null;
    }

    return {
      ...(dto.placeId !== undefined || !existing ? { placeId: dto.placeId ?? null } : {}),
      ...(dto.happenedAt !== undefined || !existing
        ? { happenedAt: dto.happenedAt ? new Date(dto.happenedAt) : null }
        : {}),
      ...(dto.locationVisibility !== undefined || !existing ? { locationVisibility: visibility } : {}),
      ...(dto.locationPrecision !== undefined || !existing ? { locationPrecision: precision } : {}),
      ...(dto.locationSource !== undefined || !existing
        ? { locationSource: placeId ? dto.locationSource ?? existing?.locationSource ?? 'manual' : null }
        : {}),
      ...(exactConfirmedAt !== undefined ? { locationExactConfirmedAt: exactConfirmedAt } : {}),
    };
  }

  private async findPlaceSnapshot(placeId?: string | null) {
    if (!placeId) return null;
    const place = await this.prisma.place.findUnique({ where: { id: placeId } });
    if (!place) throw new BadRequestException('所选地点不存在');
    return this.placeSnapshot(place);
  }

  private placeSnapshot(raw: unknown): PlaceSnapshot | null {
    if (!raw || typeof raw !== 'object') return null;
    const place = raw as Record<string, unknown>;
    if (!place.id || !place.name || !place.slug) return null;
    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
      id: String(place.id),
      name: String(place.name),
      slug: String(place.slug),
      address: place.address == null ? null : String(place.address),
      city: place.city == null ? null : String(place.city),
      province: place.province == null ? null : String(place.province),
      country: place.country == null ? null : String(place.country),
      latitude,
      longitude,
      type: String(place.type || 'poi'),
    };
  }

  private visibility(value: unknown): LocationVisibility {
    return value === 'public' || value === 'blurred' ? value : 'private';
  }

  private precision(value: unknown): LocationPrecision {
    return value === 'exact' || value === 'city' || value === 'province' ? value : 'place';
  }

  private source(value: unknown): LocationSource | null {
    return value === 'exif' || value === 'map' || value === 'imported' || value === 'manual'
      ? value
      : null;
  }

  private matchesPublicQuery(moment: any, query: MomentQueryDto) {
    if (query.search) {
      const keyword = query.search.toLocaleLowerCase();
      const content = `${moment.title} ${moment.excerpt || ''} ${moment.content || ''}`.toLocaleLowerCase();
      if (!content.includes(keyword)) return false;
    }
    if (query.place && moment.publicLocation?.slug !== query.place) return false;
    if (query.from || query.to) {
      const happenedAt = moment.happenedAt ? new Date(moment.happenedAt).getTime() : Number.NaN;
      if (!Number.isFinite(happenedAt)) return false;
      if (query.from && happenedAt < new Date(query.from).getTime()) return false;
      if (query.to && happenedAt > new Date(query.to).getTime()) return false;
    }
    return true;
  }

  private hasMapCoordinate(location: unknown): location is NonNullable<ReturnType<typeof buildPublicLocation>> {
    if (!location || typeof location !== 'object') return false;
    const value = location as { latitude?: unknown; longitude?: unknown };
    return Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude));
  }
}

function firstMomentImage(content?: string | null) {
  return String(content || '').match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1]?.trim() || null;
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMomentDto } from './dto/create-moment.dto';
import { UpdateMomentDto } from './dto/update-moment.dto';
import { MomentQueryDto } from './dto/moment-query.dto';

type PublishedMomentSnapshot = {
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
};

const momentAuthorSelect = { id: true, username: true, avatar: true } satisfies Prisma.UserSelect;

@Injectable()
export class MomentService {
  constructor(private prisma: PrismaService) {}

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
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      author: { select: momentAuthorSelect },
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

  async findAll(query: MomentQueryDto, currentUserId?: string) {
    const { sort, search, status } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const adminView = this.isAdminListQuery(query);
    const where: Prisma.MomentWhereInput = {};

    if (status === 'all') {
      /* no status filter */
    } else if (status) {
      where.status = status;
    } else {
      where.status = 'published';
    }

    if (query.needsPublish === true) {
      where.needsPublish = true;
    }

    if (search) {
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
      items: items.map((item) => (adminView ? this.format(item) : this.formatPublic(item))),
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
      },
      include: this.buildInclude(),
    });
    return this.format(moment);
  }

  async update(slug: string, dto: UpdateMomentDto) {
    const existing = await this.prisma.moment.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Moment not found');

    let snapshot = this.readSnapshot(existing.publishedSnapshot);
    if (existing.status === 'published' && !snapshot) {
      snapshot = this.buildSnapshotFromMoment(existing);
    }

    const data = { ...dto };
    if (data.slug) {
      data.slug = await this.uniqueSlug(data.slug, existing.id);
    }

    const next = {
      title: data.title ?? existing.title,
      slug: data.slug ?? existing.slug,
      content: data.content ?? existing.content,
      excerpt: data.excerpt !== undefined ? data.excerpt : existing.excerpt,
    };
    const needsPublish = !snapshot || !this.snapshotEquals(snapshot, next);

    const moment = await this.prisma.moment.update({
      where: { slug },
      data: {
        ...data,
        needsPublish,
        publishedSnapshot: snapshot ? (snapshot as unknown as Prisma.InputJsonValue) : undefined,
      },
      include: this.buildInclude(),
    });
    return this.format(moment);
  }

  async publish(slug: string) {
    const existing = await this.prisma.moment.findUnique({ where: { slug } });
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
    };
  }

  private buildSnapshotFromMoment(moment: {
    title: string;
    slug: string;
    content: string;
    excerpt: string | null;
  }): PublishedMomentSnapshot {
    return {
      title: moment.title,
      slug: moment.slug,
      content: moment.content,
      excerpt: moment.excerpt,
    };
  }

  private snapshotEquals(
    a: PublishedMomentSnapshot,
    b: { title: string; slug: string; content: string; excerpt?: string | null },
  ) {
    const norm = (value: unknown) => String(value ?? '').trim();
    return (
      norm(a.title) === norm(b.title) &&
      norm(a.slug) === norm(b.slug) &&
      norm(a.content) === norm(b.content) &&
      norm(a.excerpt) === norm(b.excerpt)
    );
  }

  private format(moment: any) {
    return {
      ...moment,
      liked: moment.likes?.length > 0,
      commentCount: moment._count?.comments ?? 0,
      needsPublish: moment.needsPublish ?? true,
    };
  }

  private formatPublic(moment: any) {
    const snapshot = this.readSnapshot(moment.publishedSnapshot);
    const base = this.format(moment);
    const { publishedSnapshot: _snapshot, needsPublish: _needsPublish, ...rest } = base;

    if (!snapshot) return rest;

    return {
      ...rest,
      title: snapshot.title,
      slug: snapshot.slug,
      content: snapshot.content,
      excerpt: snapshot.excerpt,
    };
  }
}

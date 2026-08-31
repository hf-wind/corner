import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MemoryGraphService } from '../memory-graph/memory-graph.service';
import { AiNativeService } from '../ai/ai-native.service';
import { MediaService } from '../media/media.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { createHash } from 'node:crypto';
import {
  buildPublicLocation,
  type LocationPrecision,
  type LocationSource,
  type LocationVisibility,
  type PlaceSnapshot,
} from '../../common/location/public-location';
import { prepareSpacetime } from '../../common/location/spacetime';

type PublishedPostSnapshot = {
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  featured: boolean;
  occurredAt: string | null;
  place: PlaceSnapshot | null;
  locationVisibility: LocationVisibility;
  locationPrecision: LocationPrecision;
  locationSource: LocationSource | null;
  locationExactConfirmedAt: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    color?: string | null;
  } | null;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    color?: string | null;
  }>;
};

type VisitContext = {
  ip?: string;
  userAgent?: string;
};

const postInclude = {
  author: { select: { id: true, username: true, avatar: true } },
  category: {
    select: { id: true, name: true, slug: true, icon: true, color: true },
  },
  tags: {
    include: {
      tag: {
        select: { id: true, name: true, slug: true, icon: true, color: true },
      },
    },
  },
} satisfies Prisma.PostInclude;

const postAdminSelect = {
  id: true,
  title: true,
  slug: true,
  content: true,
  excerpt: true,
  coverImage: true,
  authorId: true,
  categoryId: true,
  status: true,
  viewCount: true,
  likeCount: true,
  featured: true,
  needsPublish: true,
  publishedSnapshot: true,
  scheduledAt: true,
  occurredAt: true,
  placeId: true,
  locationVisibility: true,
  locationPrecision: true,
  locationSource: true,
  locationExactConfirmedAt: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: postInclude.author,
  category: postInclude.category,
  place: true,
  tags: postInclude.tags,
  _count: { select: { comments: true } },
} satisfies Prisma.PostSelect;

const postPublicSelect = {
  ...postAdminSelect,
  _count: { select: { comments: { where: { status: 'approved' } } } },
} satisfies Prisma.PostSelect;

@Injectable()
export class PostService implements OnModuleInit, OnModuleDestroy {
  private scheduleTimer?: ReturnType<typeof setInterval>;

  constructor(
    private prisma: PrismaService,
    private media: MediaService,
    private memoryGraph?: MemoryGraphService,
    private aiNative?: AiNativeService,
  ) {}

  onModuleInit() {
    void this.publishScheduledPosts();
    this.scheduleTimer = setInterval(
      () => void this.publishScheduledPosts(),
      30_000,
    );
    this.scheduleTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.scheduleTimer) clearInterval(this.scheduleTimer);
  }

  private isAdminListQuery(query: PostQueryDto) {
    return (
      (query.status !== undefined &&
        query.status !== null &&
        String(query.status).length > 0) ||
      query.needsPublish === true
    );
  }

  async findAll(query: PostQueryDto) {
    return this.isAdminListQuery(query)
      ? this.findAdminList(query)
      : this.findPublicList(query);
  }

  async findBySlug(slug: string, visit: VisitContext = {}) {
    const post = await this.findPublishedByAnySlug(slug);
    if (!post) throw new NotFoundException('Post not found');

    const counted = await this.recordUniqueView(post.id, visit);
    return this.formatPublic({
      ...post,
      viewCount: post.viewCount + (counted ? 1 : 0),
    });
  }

  private async recordUniqueView(postId: string, visit: VisitContext) {
    const userAgent = String(visit.userAgent || '').slice(0, 500);
    if (
      /bot|crawler|spider|slurp|preview|headless|lighthouse|uptime|monitor/i.test(
        userAgent,
      )
    ) {
      return false;
    }

    const fingerprint = `${String(visit.ip || 'unknown')}|${userAgent || 'unknown'}`;
    const ipHash = createHash('sha256').update(fingerprint).digest('hex');
    const visitDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const salt =
      process.env.VIEW_COUNT_SALT ||
      process.env.JWT_SECRET ||
      'corner-view-count';
    const visitKey = createHash('sha256')
      .update(`${postId}|${visitDay}|${ipHash}|${salt}`)
      .digest('hex');

    try {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.visitStat.create({
          data: { postId, visitKey, ipHash },
        });
        await transaction.post.update({
          where: { id: postId },
          data: { viewCount: { increment: 1 } },
        });
      });
      return true;
    } catch (error: any) {
      if (error?.code === 'P2002') return false;
      throw error;
    }
  }

  async preview(slug: string) {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      select: postAdminSelect,
    });
    if (!post) throw new NotFoundException('Post not found');
    return this.format(post);
  }

  async findAdjacent(slug: string) {
    const post = await this.findPublishedByAnySlug(slug);
    if (!post) throw new NotFoundException('Post not found');

    const [prevRecord, nextRecord] = await Promise.all([
      this.prisma.post.findFirst({
        where: {
          status: 'published',
          publishedAt: { lt: post.publishedAt ?? undefined },
        },
        select: postPublicSelect,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.post.findFirst({
        where: {
          status: 'published',
          publishedAt: { gt: post.publishedAt ?? undefined },
        },
        select: postPublicSelect,
        orderBy: { publishedAt: 'asc' },
      }),
    ]);

    const toAdjacent = (item: any) => {
      if (!item) return null;
      const formatted = this.formatPublic(item);
      return {
        slug: formatted.slug,
        title: formatted.title,
        publishedAt: formatted.publishedAt,
      };
    };

    return {
      prev: toAdjacent(prevRecord),
      next: toAdjacent(nextRecord),
    };
  }

  async findFeatured() {
    const items = await this.prisma.post.findMany({
      where: { status: 'published' },
      select: postPublicSelect,
      orderBy: { publishedAt: 'desc' },
    });

    return items
      .map((post) => this.formatPublic(post))
      .filter((post) => post.featured)
      .slice(0, 6);
  }

  async create(dto: CreatePostDto, authorId: string) {
    const {
      tagIds,
      status: _status,
      placeId: _placeId,
      occurredAt: _occurredAt,
      locationVisibility: _visibility,
      locationPrecision: _precision,
      locationSource: _source,
      confirmExactLocation: _confirmExact,
      ...data
    } = dto;
    const slug = await this.uniqueSlug(data.slug);
    const spacetime = await this.prepareContentSpacetime(dto);

    const created = await this.prisma.$transaction(async (tx) => {
      const record = await tx.post.create({
        data: {
          ...data,
          ...spacetime,
          slug,
          authorId,
          status: 'draft',
          needsPublish: true,
          publishedSnapshot: Prisma.DbNull,
          tags: tagIds?.length
            ? { create: tagIds.map((tagId) => ({ tagId })) }
            : undefined,
        },
        select: postAdminSelect,
      });
      return record;
    });

    if (this.styleChangeSize('', created.content) > 20) {
      void this.aiNative?.scheduleStyleRebuild(created.authorId);
    }
    return this.format(created);
  }

  async update(slug: string, dto: UpdatePostDto) {
    const existing = await this.prisma.post.findUnique({
      where: { slug },
      select: postAdminSelect,
    });
    if (!existing) throw new NotFoundException('Post not found');

    const {
      tagIds,
      status: _status,
      placeId: _placeId,
      occurredAt: _occurredAt,
      locationVisibility: _visibility,
      locationPrecision: _precision,
      locationSource: _source,
      confirmExactLocation: _confirmExact,
      ...data
    } = dto;
    const spacetime = await this.prepareContentSpacetime(dto, existing);
    const nextSlug = data.slug
      ? await this.uniqueSlug(data.slug, existing.id)
      : undefined;
    const currentSnapshot =
      this.readSnapshot(existing.publishedSnapshot) ||
      (existing.status === 'published'
        ? this.buildSnapshotFromPost(existing)
        : null);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (tagIds) {
        await tx.postTag.deleteMany({ where: { postId: existing.id } });
      }

      const record = await tx.post.update({
        where: { id: existing.id },
        data: {
          ...data,
          ...spacetime,
          ...(nextSlug ? { slug: nextSlug } : {}),
          tags: tagIds
            ? { create: tagIds.map((tagId) => ({ tagId })) }
            : undefined,
        },
        select: postAdminSelect,
      });

      const nextSnapshot = this.buildSnapshotFromPost(record);
      const needsPublish = currentSnapshot
        ? !this.snapshotEquals(currentSnapshot, nextSnapshot)
        : true;
      const publishedSnapshot = currentSnapshot;

      const saved = await tx.post.update({
        where: { id: existing.id },
        data: {
          needsPublish,
          publishedSnapshot: publishedSnapshot
            ? (publishedSnapshot as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
        },
        select: postAdminSelect,
      });
      return saved;
    });

    this.memoryGraph?.scheduleRebuild();
    if (this.styleChangeSize(existing.content, updated.content) > 20) {
      void this.aiNative?.scheduleStyleRebuild(updated.authorId);
    }
    return this.format(updated);
  }

  private styleChangeSize(previous: string, next: string) {
    const before = String(previous || '');
    const after = String(next || '');
    if (before === after) return 0;
    let prefix = 0;
    while (
      prefix < before.length &&
      prefix < after.length &&
      before[prefix] === after[prefix]
    ) {
      prefix += 1;
    }
    let suffix = 0;
    while (
      suffix < before.length - prefix &&
      suffix < after.length - prefix &&
      before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
    ) {
      suffix += 1;
    }
    return before.length - prefix - suffix + (after.length - prefix - suffix);
  }

  async listVersions(slug: string) {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    const items = await this.prisma.postVersion.findMany({
      where: { postId: post.id },
      orderBy: { version: 'desc' },
      include: { createdBy: { select: { id: true, username: true } } },
    });
    return items.map((item) => {
      const snapshot = this.readSnapshot(item.snapshot);
      return {
        id: item.id,
        version: item.version,
        source: item.source,
        createdAt: item.createdAt,
        createdBy: item.createdBy,
        title: snapshot?.title || '',
        excerpt: snapshot?.excerpt || '',
        content: snapshot?.content || '',
        coverImage: snapshot?.coverImage || '',
        contentLength: snapshot?.content?.length || 0,
      };
    });
  }

  async restoreVersion(slug: string, versionId: string, actorId?: string) {
    const existing = await this.prisma.post.findUnique({
      where: { slug },
      select: postAdminSelect,
    });
    if (!existing) throw new NotFoundException('Post not found');
    const version = await this.prisma.postVersion.findFirst({
      where: { id: versionId, postId: existing.id },
    });
    const snapshot = this.readSnapshot(version?.snapshot);
    if (!version || !snapshot) throw new NotFoundException('Version not found');

    const restoredSlug = await this.uniqueSlug(snapshot.slug, existing.id);
    const restored = await this.prisma.$transaction(async (tx) => {
      const currentSnapshot = this.buildSnapshotFromPost(existing);
      const needsPreservePublish =
        existing.needsPublish || existing.status !== 'published';
      if (needsPreservePublish) {
        // Publish the current draft first so restoring an old version never discards it.
        await this.createVersion(tx, existing, actorId, 'draft-preserve');
        await tx.post.update({
          where: { id: existing.id },
          data: {
            status: 'published',
            needsPublish: false,
            publishedSnapshot:
              currentSnapshot as unknown as Prisma.InputJsonValue,
            publishedAt: existing.publishedAt ?? new Date(),
          },
        });
      }
      const [category, place, tags] = await Promise.all([
        snapshot.category?.id
          ? tx.category.findUnique({
              where: { id: snapshot.category.id },
              select: { id: true },
            })
          : null,
        (snapshot.place as any)?.id
          ? tx.place.findUnique({
              where: { id: (snapshot.place as any).id },
              select: { id: true },
            })
          : null,
        snapshot.tags.length
          ? tx.tag.findMany({
              where: { id: { in: snapshot.tags.map((tag) => tag.id) } },
              select: { id: true },
            })
          : [],
      ]);
      await tx.postTag.deleteMany({ where: { postId: existing.id } });
      const record = await tx.post.update({
        where: { id: existing.id },
        data: {
          title: snapshot.title,
          slug: restoredSlug,
          content: snapshot.content,
          excerpt: snapshot.excerpt,
          coverImage: snapshot.coverImage,
          featured: snapshot.featured,
          occurredAt: snapshot.occurredAt
            ? new Date(snapshot.occurredAt)
            : null,
          categoryId: category?.id || null,
          placeId: place?.id || null,
          locationVisibility: snapshot.locationVisibility,
          locationPrecision: snapshot.locationPrecision,
          locationSource: snapshot.locationSource,
          locationExactConfirmedAt: snapshot.locationExactConfirmedAt
            ? new Date(snapshot.locationExactConfirmedAt)
            : null,
          status: 'draft',
          needsPublish: true,
          publishedSnapshot:
            currentSnapshot as unknown as Prisma.InputJsonValue,
          tags: tags.length
            ? { create: tags.map((tag) => ({ tagId: tag.id })) }
            : undefined,
        },
        select: postAdminSelect,
      });
      return record;
    });

    this.memoryGraph?.scheduleRebuild();
    return this.format(restored);
  }

  private async createVersion(
    tx: Prisma.TransactionClient,
    post: any,
    createdById: string | undefined,
    source: 'publish' | 'draft-preserve',
  ) {
    const latest = await tx.postVersion.findFirst({
      where: { postId: post.id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    await tx.postVersion.create({
      data: {
        postId: post.id,
        version: (latest?.version || 0) + 1,
        snapshot: this.buildSnapshotFromPost(
          post,
        ) as unknown as Prisma.InputJsonValue,
        source,
        createdById: createdById || null,
      },
    });
  }

  async publish(slug: string, actorId?: string) {
    const existing = await this.prisma.post.findUnique({
      where: { slug },
      select: postAdminSelect,
    });
    if (!existing) throw new NotFoundException('Post not found');

    const snapshot = this.buildSnapshotFromPost(existing);
    const post = await this.prisma.$transaction(async (tx) => {
      const record = await tx.post.update({
        where: { id: existing.id },
        data: {
          status: 'published',
          needsPublish: false,
          publishedSnapshot: snapshot,
          publishedAt: existing.publishedAt ?? new Date(),
          scheduledAt: null,
        },
        select: postAdminSelect,
      });
      await this.createVersion(tx, record, actorId, 'publish');
      return record;
    });

    this.memoryGraph?.scheduleRebuild();
    this.aiNative?.schedulePrecompute('post', post.id);
    void this.aiNative?.scheduleStyleRebuild(post.authorId);
    return this.format(post);
  }

  async schedule(slug: string, scheduledAt: string) {
    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      throw new BadRequestException('定时发布时间必须晚于当前时间');
    }
    const existing = await this.prisma.post.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Post not found');
    const post = await this.prisma.post.update({
      where: { id: existing.id },
      data: { scheduledAt: date },
      select: postAdminSelect,
    });
    return this.format(post);
  }

  async cancelSchedule(slug: string) {
    const existing = await this.prisma.post.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Post not found');
    const post = await this.prisma.post.update({
      where: { id: existing.id },
      data: { scheduledAt: null },
      select: postAdminSelect,
    });
    return this.format(post);
  }

  async makePrivate(slug: string) {
    const existing = await this.prisma.post.findUnique({
      where: { slug },
      select: { id: true, authorId: true },
    });
    if (!existing) throw new NotFoundException('Post not found');
    const post = await this.prisma.post.update({
      where: { id: existing.id },
      data: { status: 'private', scheduledAt: null },
      select: postAdminSelect,
    });
    this.memoryGraph?.scheduleRebuild();
    void this.aiNative?.scheduleStyleRebuild(existing.authorId);
    return this.format(post);
  }

  async unpublish(slug: string) {
    const existing = await this.prisma.post.findUnique({
      where: { slug },
      select: { id: true, authorId: true, status: true },
    });
    if (!existing) throw new NotFoundException('Post not found');
    if (existing.status !== 'published') {
      throw new BadRequestException('只有已发布文章可以下架');
    }
    const post = await this.prisma.post.update({
      where: { id: existing.id },
      data: { status: 'unpublished', scheduledAt: null },
      select: postAdminSelect,
    });
    this.memoryGraph?.scheduleRebuild();
    void this.aiNative?.scheduleStyleRebuild(existing.authorId);
    return this.format(post);
  }

  private async publishScheduledPosts() {
    const due = await this.prisma.post
      .findMany({
        where: { scheduledAt: { lte: new Date() } },
        select: { slug: true },
        take: 50,
      })
      .catch(() => []);
    for (const post of due) {
      await this.publish(post.slug).catch(() => undefined);
    }
  }

  async remove(slug: string) {
    const existing = await this.prisma.post.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Post not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.commentLike.deleteMany({
        where: { comment: { postId: existing.id } },
      });
      await tx.comment.deleteMany({ where: { postId: existing.id } });
      await tx.postTag.deleteMany({ where: { postId: existing.id } });
      await tx.visitStat.deleteMany({ where: { postId: existing.id } });
      await tx.emailLog.deleteMany({ where: { postId: existing.id } });
      await tx.post.delete({ where: { id: existing.id } });
    });
    await this.media.removeFolder(`article/${existing.id}`);
    this.memoryGraph?.scheduleRebuild();
  }

  async findArchive() {
    const posts = await this.prisma.post.findMany({
      where: { status: 'published' },
      select: { publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    });

    const years: Record<string, number> = {};
    const months: Record<string, number> = {};

    posts.forEach((post) => {
      if (!post.publishedAt) return;
      const year = post.publishedAt.getFullYear().toString();
      const month = `${year}-${String(post.publishedAt.getMonth() + 1).padStart(2, '0')}`;
      years[year] = (years[year] || 0) + 1;
      months[month] = (months[month] || 0) + 1;
    });

    return { years, months, total: posts.length };
  }

  private async findAdminList(query: PostQueryDto) {
    const { sort, category, tag, search, archive, featured, status } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.PostWhereInput = {};

    if (status === 'all') {
      /* no status filter */
    } else if (status) {
      where.status = status;
    }

    if (query.needsPublish === true) where.needsPublish = true;
    if (category) where.category = { slug: category };
    if (tag) where.tags = { some: { tag: { slug: tag } } };
    if (featured) where.featured = true;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (archive) {
      const year = parseInt(archive, 10);
      if (!Number.isNaN(year)) {
        where.publishedAt = {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        };
      }
    }

    const orderBy: Prisma.PostOrderByWithRelationInput =
      sort === 'popular'
        ? { viewCount: 'desc' }
        : sort === 'oldest'
          ? { publishedAt: 'asc' }
          : { updatedAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        select: postAdminSelect,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      items: items.map((post) => this.format(post)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async findPublicList(query: PostQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const items = await this.prisma.post.findMany({
      where: { status: 'published' },
      select: postPublicSelect,
    });

    let posts = items.map((post) => this.formatPublic(post));

    if (query.category) {
      posts = posts.filter((post) => post.category?.slug === query.category);
    }
    if (query.tag) {
      posts = posts.filter((post) =>
        post.tags?.some((item: any) => item.slug === query.tag),
      );
    }
    if (query.featured) {
      posts = posts.filter((post) => !!post.featured);
    }
    if (query.search) {
      const keyword = query.search.toLowerCase();
      posts = posts.filter((post) =>
        `${post.title || ''} ${post.excerpt || ''}`
          .toLowerCase()
          .includes(keyword),
      );
    }
    if (query.archive) {
      const year = parseInt(query.archive, 10);
      if (!Number.isNaN(year)) {
        posts = posts.filter((post) => {
          const publishedAt = post.publishedAt
            ? new Date(post.publishedAt)
            : null;
          return publishedAt?.getFullYear() === year;
        });
      }
    }

    posts.sort((a, b) => {
      if (query.sort === 'popular')
        return (b.viewCount ?? 0) - (a.viewCount ?? 0);
      const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime();
      return query.sort === 'oldest' ? timeA - timeB : timeB - timeA;
    });

    const total = posts.length;
    const paged = posts.slice((page - 1) * limit, page * limit);

    return {
      items: paged,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async findPublishedByAnySlug(slug: string) {
    const byCurrentSlug = await this.prisma.post.findFirst({
      where: { slug, status: 'published' },
      select: postPublicSelect,
    });
    if (byCurrentSlug) {
      const snapshot = this.readSnapshot(byCurrentSlug.publishedSnapshot);
      if (!snapshot || snapshot.slug === slug || byCurrentSlug.slug === slug)
        return byCurrentSlug;
    }

    const candidates = await this.prisma.post.findMany({
      where: {
        status: 'published',
        publishedSnapshot: { not: Prisma.DbNull },
      },
      select: postPublicSelect,
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
    return base || `p-${Date.now().toString(36)}`;
  }

  private async uniqueSlug(raw?: string, excludeId?: string) {
    const base = this.normalizeSlug(raw);
    let slug = base;
    let n = 2;

    while (true) {
      const existing = await this.prisma.post.findUnique({ where: { slug } });
      if (!existing || (excludeId && existing.id === excludeId)) return slug;
      slug = `${base.slice(0, 70)}-${n}`;
      n += 1;
      if (n > 50) {
        return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      }
    }
  }

  private buildSnapshotFromPost(post: any): PublishedPostSnapshot {
    const tags = (post.tags || [])
      .map((item: any) => item.tag || item)
      .filter(Boolean)
      .map((tag: any) => ({
        id: String(tag.id),
        name: String(tag.name),
        slug: String(tag.slug),
        icon: tag.icon == null ? null : String(tag.icon),
        color: tag.color == null ? null : String(tag.color),
      }))
      .sort((a: any, b: any) => a.slug.localeCompare(b.slug));

    return {
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt ?? null,
      coverImage: post.coverImage ?? null,
      featured: !!post.featured,
      occurredAt: post.occurredAt
        ? new Date(post.occurredAt).toISOString()
        : null,
      place: this.placeSnapshot(post.place),
      locationVisibility: this.visibility(post.locationVisibility),
      locationPrecision: this.precision(post.locationPrecision),
      locationSource: this.source(post.locationSource),
      locationExactConfirmedAt: post.locationExactConfirmedAt
        ? new Date(post.locationExactConfirmedAt).toISOString()
        : null,
      category: post.category
        ? {
            id: String(post.category.id),
            name: String(post.category.name),
            slug: String(post.category.slug),
            icon:
              post.category.icon == null ? null : String(post.category.icon),
            color:
              post.category.color == null ? null : String(post.category.color),
          }
        : null,
      tags,
    };
  }

  private readSnapshot(raw: unknown): PublishedPostSnapshot | null {
    if (!raw || typeof raw !== 'object') return null;
    const snapshot = raw as Record<string, unknown>;
    if (!snapshot.title || !snapshot.slug) return null;

    const tags = Array.isArray(snapshot.tags)
      ? (snapshot.tags
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const tag = item as Record<string, unknown>;
            if (!tag.id || !tag.name || !tag.slug) return null;
            return {
              id: String(tag.id),
              name: String(tag.name),
              slug: String(tag.slug),
              icon: tag.icon == null ? null : String(tag.icon),
              color: tag.color == null ? null : String(tag.color),
            };
          })
          .filter(Boolean) as PublishedPostSnapshot['tags'])
      : [];

    const category =
      snapshot.category && typeof snapshot.category === 'object'
        ? {
            id: String((snapshot.category as Record<string, unknown>).id || ''),
            name: String(
              (snapshot.category as Record<string, unknown>).name || '',
            ),
            slug: String(
              (snapshot.category as Record<string, unknown>).slug || '',
            ),
            icon:
              (snapshot.category as Record<string, unknown>).icon == null
                ? null
                : String((snapshot.category as Record<string, unknown>).icon),
            color:
              (snapshot.category as Record<string, unknown>).color == null
                ? null
                : String((snapshot.category as Record<string, unknown>).color),
          }
        : null;

    return {
      title: String(snapshot.title),
      slug: String(snapshot.slug),
      content: String(snapshot.content ?? ''),
      excerpt: snapshot.excerpt == null ? null : String(snapshot.excerpt),
      coverImage:
        snapshot.coverImage == null ? null : String(snapshot.coverImage),
      featured: !!snapshot.featured,
      occurredAt: snapshot.occurredAt ? String(snapshot.occurredAt) : null,
      place: this.placeSnapshot(snapshot.place),
      locationVisibility: this.visibility(
        String(snapshot.locationVisibility || 'private'),
      ),
      locationPrecision: this.precision(
        String(snapshot.locationPrecision || 'place'),
      ),
      locationSource: this.source(
        snapshot.locationSource == null
          ? null
          : String(snapshot.locationSource),
      ),
      locationExactConfirmedAt: snapshot.locationExactConfirmedAt
        ? String(snapshot.locationExactConfirmedAt)
        : null,
      category:
        category?.id && category.name && category.slug ? category : null,
      tags,
    };
  }

  private snapshotEquals(a: PublishedPostSnapshot, b: PublishedPostSnapshot) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private format(post: any) {
    return {
      ...post,
      tags: post.tags?.map((item: any) => item.tag) ?? [],
      tagIds: post.tags?.map((item: any) => item.tag.id) ?? [],
      needsPublish: post.needsPublish ?? true,
    };
  }

  private formatPublic(post: any) {
    const snapshot = this.readSnapshot(post.publishedSnapshot);
    const base = this.format(post);
    const active = snapshot || this.buildSnapshotFromPost(post);
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

    const liveCategory = base.category;
    const category = active.category
      ? {
          ...active.category,
          icon:
            liveCategory?.id === active.category.id
              ? liveCategory.icon || active.category.icon || null
              : active.category.icon || null,
          color:
            liveCategory?.id === active.category.id
              ? liveCategory.color || active.category.color || null
              : active.category.color || null,
        }
      : null;
    const tags = active.tags.map((tag) => {
      const live = base.tags?.find((item: any) => item.id === tag.id);
      return {
        ...tag,
        icon: live?.icon || tag.icon || null,
        color: live?.color || tag.color || null,
      };
    });

    return {
      ...rest,
      title: active.title,
      slug: active.slug,
      content: active.content,
      excerpt: active.excerpt,
      coverImage: active.coverImage,
      featured: active.featured,
      category,
      tags,
      tagIds: tags.map((tag) => tag.id),
      occurredAt: active.occurredAt,
      publicLocation: buildPublicLocation({
        place: active.place,
        visibility: active.locationVisibility,
        precision: active.locationPrecision,
        exactConfirmedAt: active.locationExactConfirmedAt,
      }),
    };
  }

  private async prepareContentSpacetime(
    dto: CreatePostDto | UpdatePostDto,
    existing?: any,
  ) {
    return prepareSpacetime(dto, existing, async (placeId) => {
      const place = await this.prisma.place.findUnique({
        where: { id: placeId },
        select: { id: true },
      });
      if (!place) throw new BadRequestException('所选地点不存在');
    });
  }

  private placeSnapshot(raw: unknown): PlaceSnapshot | null {
    if (!raw || typeof raw !== 'object') return null;
    const place = raw as Record<string, unknown>;
    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    if (
      !place.id ||
      !place.name ||
      !place.slug ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    )
      return null;
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

  private visibility(value?: string | null): LocationVisibility {
    return value === 'public' || value === 'blurred' ? value : 'private';
  }

  private precision(value?: string | null): LocationPrecision {
    return value === 'exact' || value === 'city' || value === 'province'
      ? value
      : 'place';
  }

  private source(value?: string | null): LocationSource | null {
    return value === 'manual' ||
      value === 'exif' ||
      value === 'map' ||
      value === 'imported'
      ? value
      : null;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';

type PublishedPostSnapshot = {
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  featured: boolean;
  category: { id: string; name: string; slug: string } | null;
  tags: Array<{ id: string; name: string; slug: string }>;
};

const postInclude = {
  author: { select: { id: true, username: true, avatar: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
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
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: postInclude.author,
  category: postInclude.category,
  tags: postInclude.tags,
  _count: { select: { comments: true } },
} satisfies Prisma.PostSelect;

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  private isAdminListQuery(query: PostQueryDto) {
    return (
      (query.status !== undefined && query.status !== null && String(query.status).length > 0) ||
      query.needsPublish === true
    );
  }

  async findAll(query: PostQueryDto) {
    return this.isAdminListQuery(query) ? this.findAdminList(query) : this.findPublicList(query);
  }

  async findBySlug(slug: string) {
    const post = await this.findPublishedByAnySlug(slug);
    if (!post) throw new NotFoundException('Post not found');

    await this.prisma.post.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });

    return this.formatPublic({ ...post, viewCount: post.viewCount + 1 });
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
        select: postAdminSelect,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.post.findFirst({
        where: {
          status: 'published',
          publishedAt: { gt: post.publishedAt ?? undefined },
        },
        select: postAdminSelect,
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
      select: postAdminSelect,
      orderBy: { publishedAt: 'desc' },
    });

    return items
      .map((post) => this.formatPublic(post))
      .filter((post) => post.featured)
      .slice(0, 6);
  }

  async create(dto: CreatePostDto, authorId: string) {
    const { tagIds, status, ...data } = dto;
    const slug = await this.uniqueSlug(data.slug);
    const publishNow = status === 'published';

    const created = await this.prisma.post.create({
      data: {
        ...data,
        slug,
        authorId,
        status: publishNow ? 'published' : 'draft',
        publishedAt: publishNow ? new Date() : undefined,
        needsPublish: !publishNow,
        publishedSnapshot: publishNow ? undefined : Prisma.DbNull,
        tags: tagIds?.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      select: postAdminSelect,
    });

    if (!publishNow) return this.format(created);

    const snapshot = this.buildSnapshotFromPost(created);
    const published = await this.prisma.post.update({
      where: { id: created.id },
      data: {
        needsPublish: false,
        publishedSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
      select: postAdminSelect,
    });

    return this.format(published);
  }

  async update(slug: string, dto: UpdatePostDto) {
    const existing = await this.prisma.post.findUnique({
      where: { slug },
      select: postAdminSelect,
    });
    if (!existing) throw new NotFoundException('Post not found');

    const { tagIds, status, ...data } = dto;
    const nextSlug = data.slug ? await this.uniqueSlug(data.slug, existing.id) : undefined;
    const currentSnapshot =
      this.readSnapshot(existing.publishedSnapshot) ||
      (existing.status === 'published' ? this.buildSnapshotFromPost(existing) : null);
    const publishNow = status === 'published';

    const updated = await this.prisma.$transaction(async (tx) => {
      if (tagIds) {
        await tx.postTag.deleteMany({ where: { postId: existing.id } });
      }

      const record = await tx.post.update({
        where: { id: existing.id },
        data: {
          ...data,
          ...(nextSlug ? { slug: nextSlug } : {}),
          ...(status ? { status } : {}),
          ...(publishNow && !existing.publishedAt ? { publishedAt: new Date() } : {}),
          tags: tagIds ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
        },
        select: postAdminSelect,
      });

      const nextSnapshot = this.buildSnapshotFromPost(record);
      const needsPublish = publishNow
        ? false
        : record.status === 'published'
          ? !currentSnapshot || !this.snapshotEquals(currentSnapshot, nextSnapshot)
          : true;
      const publishedSnapshot = publishNow
        ? nextSnapshot
        : currentSnapshot;

      return tx.post.update({
        where: { id: existing.id },
        data: {
          needsPublish,
          publishedSnapshot: publishedSnapshot
            ? (publishedSnapshot as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
        },
        select: postAdminSelect,
      });
    });

    return this.format(updated);
  }

  async publish(slug: string) {
    const existing = await this.prisma.post.findUnique({
      where: { slug },
      select: postAdminSelect,
    });
    if (!existing) throw new NotFoundException('Post not found');

    const snapshot = this.buildSnapshotFromPost(existing);
    const post = await this.prisma.post.update({
      where: { id: existing.id },
      data: {
        status: 'published',
        needsPublish: false,
        publishedSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        publishedAt: existing.publishedAt ?? new Date(),
      },
      select: postAdminSelect,
    });

    return this.format(post);
  }

  async remove(slug: string) {
    const existing = await this.prisma.post.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Post not found');
    await this.prisma.post.delete({ where: { id: existing.id } });
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
      select: postAdminSelect,
    });

    let posts = items.map((post) => this.formatPublic(post));

    if (query.category) {
      posts = posts.filter((post) => post.category?.slug === query.category);
    }
    if (query.tag) {
      posts = posts.filter((post) => post.tags?.some((item: any) => item.slug === query.tag));
    }
    if (query.featured) {
      posts = posts.filter((post) => !!post.featured);
    }
    if (query.search) {
      const keyword = query.search.toLowerCase();
      posts = posts.filter((post) =>
        `${post.title || ''} ${post.excerpt || ''}`.toLowerCase().includes(keyword),
      );
    }
    if (query.archive) {
      const year = parseInt(query.archive, 10);
      if (!Number.isNaN(year)) {
        posts = posts.filter((post) => {
          const publishedAt = post.publishedAt ? new Date(post.publishedAt) : null;
          return publishedAt?.getFullYear() === year;
        });
      }
    }

    posts.sort((a, b) => {
      if (query.sort === 'popular') return (b.viewCount ?? 0) - (a.viewCount ?? 0);
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
      select: postAdminSelect,
    });
    if (byCurrentSlug) {
      const snapshot = this.readSnapshot(byCurrentSlug.publishedSnapshot);
      if (!snapshot || snapshot.slug === slug || byCurrentSlug.slug === slug) return byCurrentSlug;
    }

    const candidates = await this.prisma.post.findMany({
      where: {
        status: 'published',
        publishedSnapshot: { not: Prisma.DbNull },
      },
      select: postAdminSelect,
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
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug));

    return {
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt ?? null,
      coverImage: post.coverImage ?? null,
      featured: !!post.featured,
      category: post.category
        ? {
            id: String(post.category.id),
            name: String(post.category.name),
            slug: String(post.category.slug),
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
      ? snapshot.tags
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const tag = item as Record<string, unknown>;
            if (!tag.id || !tag.name || !tag.slug) return null;
            return {
              id: String(tag.id),
              name: String(tag.name),
              slug: String(tag.slug),
            };
          })
          .filter(Boolean) as PublishedPostSnapshot['tags']
      : [];

    const category =
      snapshot.category && typeof snapshot.category === 'object'
        ? {
            id: String((snapshot.category as Record<string, unknown>).id || ''),
            name: String((snapshot.category as Record<string, unknown>).name || ''),
            slug: String((snapshot.category as Record<string, unknown>).slug || ''),
          }
        : null;

    return {
      title: String(snapshot.title),
      slug: String(snapshot.slug),
      content: String(snapshot.content ?? ''),
      excerpt: snapshot.excerpt == null ? null : String(snapshot.excerpt),
      coverImage: snapshot.coverImage == null ? null : String(snapshot.coverImage),
      featured: !!snapshot.featured,
      category: category?.id && category.name && category.slug ? category : null,
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
    const { publishedSnapshot: _snapshot, needsPublish: _needsPublish, ...rest } = base;

    if (!snapshot) return rest;

    return {
      ...rest,
      title: snapshot.title,
      slug: snapshot.slug,
      content: snapshot.content,
      excerpt: snapshot.excerpt,
      coverImage: snapshot.coverImage,
      featured: snapshot.featured,
      category: snapshot.category,
      tags: snapshot.tags,
      tagIds: snapshot.tags.map((tag) => tag.id),
    };
  }
}

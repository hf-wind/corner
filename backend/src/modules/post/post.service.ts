import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { Prisma } from '@prisma/client';

const postInclude = {
  author: { select: { id: true, username: true, avatar: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
};

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PostQueryDto) {
    const { sort, category, tag, search, archive, featured, status } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.PostWhereInput = {};

    if (status === 'all') { /* no status filter */ }
    else if (status) where.status = status;
    else where.status = 'published';

    if (category) where.category = { slug: category };
    if (tag) where.tags = { some: { tag: { slug: tag } } };
    if (featured) where.featured = true;
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
    ];
    if (archive) {
      const year = parseInt(archive);
      if (!isNaN(year)) {
        where.publishedAt = {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        };
      }
    }

    const orderBy: Prisma.PostOrderByWithRelationInput =
      sort === 'popular' ? { viewCount: 'desc' } : { publishedAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: postInclude,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      items: items.map(this.format),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      include: postInclude,
    });
    if (!post) throw new NotFoundException('Post not found');

    await this.prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });

    return this.format(post);
  }

  async findAdjacent(slug: string) {
    const post = await this.prisma.post.findUnique({ where: { slug }, select: { publishedAt: true, id: true } });
    if (!post) throw new NotFoundException('Post not found');

    const [prev, next] = await Promise.all([
      this.prisma.post.findFirst({
        where: { publishedAt: { lt: post.publishedAt ?? undefined }, status: 'published' },
        orderBy: { publishedAt: 'desc' },
        select: { slug: true, title: true },
      }),
      this.prisma.post.findFirst({
        where: { publishedAt: { gt: post.publishedAt ?? undefined }, status: 'published' },
        orderBy: { publishedAt: 'asc' },
        select: { slug: true, title: true },
      }),
    ]);

    return { prev, next };
  }

  async findFeatured() {
    const items = await this.prisma.post.findMany({
      where: { featured: true, status: 'published' },
      include: postInclude,
      orderBy: { publishedAt: 'desc' },
      take: 6,
    });
    return items.map(this.format);
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
    let slug = this.normalizeSlug(raw);
    let n = 2;
    while (true) {
      const existing = await this.prisma.post.findUnique({ where: { slug } });
      if (!existing || (excludeId && existing.id === excludeId)) return slug;
      slug = `${this.normalizeSlug(raw).slice(0, 70)}-${n}`;
      n += 1;
      if (n > 50) {
        slug = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        return slug;
      }
    }
  }

  async create(dto: CreatePostDto, authorId: string) {
    const { tagIds, ...data } = dto;
    const slug = await this.uniqueSlug(data.slug);

    const post = await this.prisma.post.create({
      data: {
        ...data,
        slug,
        authorId,
        publishedAt: data.status === 'published' ? new Date() : undefined,
        tags: tagIds?.length
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: postInclude,
    });
    return this.format(post);
  }

  async update(slug: string, dto: UpdatePostDto) {
    const existing = await this.prisma.post.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Post not found');

    const { tagIds, ...data } = dto;
    if (data.slug) {
      data.slug = await this.uniqueSlug(data.slug, existing.id);
    }

    if (tagIds) {
      await this.prisma.postTag.deleteMany({ where: { postId: existing.id } });
    }

    const post = await this.prisma.post.update({
      where: { slug },
      data: {
        ...data,
        publishedAt: data.status === 'published' && !existing.publishedAt ? new Date() : undefined,
        tags: tagIds
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: postInclude,
    });
    return this.format(post);
  }

  async remove(slug: string) {
    const existing = await this.prisma.post.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Post not found');
    await this.prisma.post.delete({ where: { slug } });
  }

  async findArchive() {
    const posts = await this.prisma.post.findMany({
      where: { status: 'published' },
      select: { publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    });

    const years: Record<string, number> = {};
    const months: Record<string, number> = {};
    posts.forEach((p) => {
      if (!p.publishedAt) return;
      const y = p.publishedAt.getFullYear().toString();
      const m = `${y}-${String(p.publishedAt.getMonth() + 1).padStart(2, '0')}`;
      years[y] = (years[y] || 0) + 1;
      months[m] = (months[m] || 0) + 1;
    });

    return { years, months, total: posts.length };
  }

  private format(post: any) {
    return {
      ...post,
      tags: post.tags?.map((pt: any) => pt.tag) ?? [],
      tagIds: post.tags?.map((pt: any) => pt.tag.id) ?? [],
    };
  }
}

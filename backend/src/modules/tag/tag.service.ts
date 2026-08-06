import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

const postSelect = {
  id: true, title: true, slug: true, excerpt: true,
  coverImage: true, status: true, featured: true,
  publishedAt: true, createdAt: true, viewCount: true,
  category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true, icon: true, color: true } } } },
};

@Injectable()
export class TagService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.tag.findMany({
      include: { _count: { select: { posts: { where: { post: { status: 'published' } } } } } },
      orderBy: { name: 'asc' },
    });
    return items.map((t) => ({ ...t, postCount: t._count.posts }));
  }

  async findBySlug(slug: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { slug },
      include: { _count: { select: { posts: { where: { post: { status: 'published' } } } } } },
    });
    if (!tag) throw new NotFoundException('Tag not found');
    return { ...tag, postCount: tag._count.posts };
  }

  async findPosts(slug: string, page = 1, limit = 20) {
    const tag = await this.prisma.tag.findUnique({ where: { slug } });
    if (!tag) throw new NotFoundException('Tag not found');
    const where = { status: 'published' as const, tags: { some: { tagId: tag.id } } };
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        select: postSelect,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);
    return {
      items: items.map((p: any) => ({ ...p, tags: p.tags?.map((pt: any) => pt.tag) ?? [] })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    };
  }

  async assignPosts(slug: string, postIds: string[]) {
    const tag = await this.prisma.tag.findUnique({ where: { slug } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.prisma.postTag.deleteMany({ where: { tagId: tag.id } });
    if (postIds.length) {
      const data = postIds.map((postId) => ({ postId, tagId: tag.id }));
      await this.prisma.postTag.createMany({ data, skipDuplicates: true });
    }
  }

  async create(dto: CreateTagDto) {
    return this.prisma.tag.create({ data: dto });
  }

  async update(slug: string, dto: UpdateTagDto) {
    const existing = await this.prisma.tag.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Tag not found');
    return this.prisma.tag.update({ where: { slug }, data: dto });
  }

  async remove(slug: string) {
    const existing = await this.prisma.tag.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Tag not found');
    await this.prisma.tag.delete({ where: { slug } });
  }
}

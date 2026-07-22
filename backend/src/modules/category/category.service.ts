import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const postSelect = {
  id: true, title: true, slug: true, excerpt: true,
  coverImage: true, status: true, featured: true,
  publishedAt: true, createdAt: true, viewCount: true,
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
};

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.category.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { name: 'asc' },
    });
    return items.map((c) => ({ ...c, postCount: c._count.posts }));
  }

  async findBySlug(slug: string) {
    const cat = await this.prisma.category.findUnique({
      where: { slug },
      include: { _count: { select: { posts: true } } },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return { ...cat, postCount: cat._count.posts };
  }

  async findPosts(slug: string, page = 1, limit = 20) {
    const cat = await this.prisma.category.findUnique({ where: { slug } });
    if (!cat) throw new NotFoundException('Category not found');
    const where = { categoryId: cat.id };
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
    const cat = await this.prisma.category.findUnique({ where: { slug } });
    if (!cat) throw new NotFoundException('Category not found');
    await this.prisma.post.updateMany({
      where: { categoryId: cat.id },
      data: { categoryId: null },
    });
    if (postIds.length) {
      await this.prisma.post.updateMany({
        where: { id: { in: postIds } },
        data: { categoryId: cat.id },
      });
    }
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(slug: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Category not found');
    return this.prisma.category.update({ where: { slug }, data: dto });
  }

  async remove(slug: string) {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Category not found');
    await this.prisma.category.delete({ where: { slug } });
  }
}

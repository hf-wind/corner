import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async findByPost(postId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId, status: 'approved', parentId: null },
      include: {
        replies: {
          where: { status: 'approved' },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return comments;
  }

  async findAll(query: { page?: number; limit?: number; status?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: any = {};
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: { post: { select: { title: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({ where: { id: dto.postId } });
    if (!post) throw new NotFoundException('Post not found');

    return this.prisma.comment.create({
      data: {
        postId: dto.postId,
        authorName: dto.authorName ?? 'Anonymous',
        authorEmail: dto.authorEmail,
        content: dto.content,
        parentId: dto.parentId,
        status: 'approved',
      },
    });
  }

  async approve(id: string) {
    return this.prisma.comment.update({ where: { id }, data: { status: 'approved' } });
  }

  async reject(id: string, reason?: string) {
    return this.prisma.comment.update({
      where: { id },
      data: { status: 'rejected', rejectReason: reason || null },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.comment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Comment not found');
    await this.prisma.comment.delete({ where: { id } });
  }
}

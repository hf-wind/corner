import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async findByPost(
    postId: string,
    currentUserId?: string,
    page = 1,
    limit = 10,
    replyLimit = 3,
  ) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { postId, status: 'approved', parentId: null },
        skip,
        take: limit,
        include: {
          _count: { select: { likes: true, replies: true } },
          user: { select: { avatar: true } },
          ...(currentUserId
            ? {
                likes: {
                  where: { userId: currentUserId },
                  select: { id: true },
                },
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.comment.count({
        where: { postId, status: 'approved', parentId: null },
      }),
    ]);

    // load replies separately with limit
    const topIds = comments.map((c) => c.id);
    const repliesMap = new Map<string, any[]>();

    if (topIds.length > 0) {
      const rawReplies = await this.prisma.comment.findMany({
        where: { parentId: { in: topIds }, status: 'approved' },
        orderBy: { createdAt: 'asc' },
        include: {
          parent: { select: { authorName: true } },
          _count: { select: { likes: true } },
          user: { select: { avatar: true } },
          ...(currentUserId
            ? {
                likes: {
                  where: { userId: currentUserId },
                  select: { id: true },
                },
              }
            : {}),
        },
      });

      for (const r of rawReplies) {
        const pid = r.parentId!;
        if (!repliesMap.has(pid)) repliesMap.set(pid, []);
        repliesMap.get(pid)!.push(r);
      }
    }

    const items = comments.map((c) => {
      const allReplies = repliesMap.get(c.id) || [];
      const replyTotal = (c as any)._count?.replies ?? allReplies.length;
      const shown = allReplies.slice(0, replyLimit);

      return {
        id: c.id,
        postId: c.postId,
        authorName: c.authorName,
        authorAvatar: c.user?.avatar ?? null,
        content: c.content,
        parentId: c.parentId,
        createdAt: c.createdAt,
        likesCount: c._count?.likes ?? 0,
        liked: (c as any).likes?.length > 0,
        replyCount: replyTotal,
        replies: shown.map((r: any) => ({
          id: r.id,
          authorName: r.authorName,
          authorAvatar: r.user?.avatar ?? null,
          content: r.content,
          parentId: r.parentId,
          createdAt: r.createdAt,
          parent: r.parent ? { authorName: r.parent.authorName } : null,
          likesCount: r._count?.likes ?? 0,
          liked: r.likes?.length > 0,
        })),
      };
    });

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findReplies(
    commentId: string,
    currentUserId?: string,
    page = 1,
    limit = 3,
  ) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { parentId: commentId, status: 'approved' },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          parent: { select: { authorName: true } },
          _count: { select: { likes: true } },
          user: { select: { avatar: true } },
          ...(currentUserId
            ? {
                likes: {
                  where: { userId: currentUserId },
                  select: { id: true },
                },
              }
            : {}),
        },
      }),
      this.prisma.comment.count({
        where: { parentId: commentId, status: 'approved' },
      }),
    ]);

    return {
      items: items.map((r: any) => ({
        id: r.id,
        authorName: r.authorName,
        authorAvatar: r.user?.avatar ?? null,
        content: r.content,
        parentId: r.parentId,
        createdAt: r.createdAt,
        parent: r.parent ? { authorName: r.parent.authorName } : null,
        likesCount: r._count?.likes ?? 0,
        liked: r.likes?.length > 0,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAll(query: { page?: number; limit?: number; status?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: any = {};
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          post: { select: { title: true, slug: true } },
          user: { select: { username: true, email: true, avatar: true } },
          parent: { select: { authorName: true, content: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(dto: CreateCommentDto, userId: string, userName: string) {
    const post = await this.prisma.post.findUnique({ where: { id: dto.postId } });
    if (!post) throw new NotFoundException('Post not found');

    let resolvedParentId = dto.parentId;
    if (resolvedParentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: resolvedParentId } });
      if (!parent) throw new NotFoundException('Parent comment not found');
      if (parent.parentId) {
        resolvedParentId = parent.parentId;
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId: dto.postId,
        userId,
        authorName: userName,
        content: dto.content,
        parentId: resolvedParentId,
        status: 'approved',
      },
      include: {
        parent: { select: { authorName: true } },
        user: { select: { avatar: true } },
      },
    });

    return comment;
  }

  async toggleLike(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const existing = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      await this.prisma.commentLike.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.commentLike.create({ data: { userId, commentId } });
    }

    const count = await this.prisma.commentLike.count({ where: { commentId } });
    return { liked: !existing, likesCount: count };
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

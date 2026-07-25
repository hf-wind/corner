import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationService: NotificationService,
  ) {}

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
    let parentComment = null;

    if (resolvedParentId) {
      parentComment = await this.prisma.comment.findUnique({ where: { id: resolvedParentId } });
      if (!parentComment) throw new NotFoundException('Parent comment not found');
      if (parentComment.parentId) {
        resolvedParentId = parentComment.parentId;
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

    this.sendCommentNotification(post, comment, parentComment, userId).catch((err) => {
      console.error('发送评论通知失败:', err);
    });

    return comment;
  }

  private async sendCommentNotification(
    post: any,
    comment: any,
    parentComment: any | null,
    currentUserId: string,
  ) {
    try {
      const postAuthor = await this.prisma.user.findUnique({
        where: { id: post.authorId },
        select: { id: true, username: true, email: true },
      });

      if (!postAuthor || postAuthor.id === currentUserId) return;

      if (parentComment && parentComment.userId) {
        const parentAuthor = await this.prisma.user.findUnique({
          where: { id: parentComment.userId },
          select: { id: true, username: true, email: true },
        });

        if (parentAuthor && parentAuthor.id !== currentUserId) {
          await this.notificationService.create(parentAuthor.id, {
            type: 'reply',
            title: '新回复通知',
            content: `${comment.authorName || '匿名用户'} 回复了你在《${post.title}》的评论`,
            link: `/article/${post.slug || post.id}`,
          });
          if (parentAuthor.email) {
            await this.emailService.sendReplyNotification({
              to: parentAuthor.email,
              toName: parentAuthor.username,
              senderName: comment.authorName || '匿名用户',
              postTitle: post.title,
              postId: post.id,
              content: comment.content,
            });
          }
        }
      } else {
        await this.notificationService.create(postAuthor.id, {
          type: 'comment',
          title: '新评论通知',
          content: `${comment.authorName || '匿名用户'} 评论了你的文章《${post.title}》`,
          link: `/article/${post.slug || post.id}`,
        });
        if (postAuthor.email) {
          await this.emailService.sendCommentNotification({
            to: postAuthor.email,
            toName: postAuthor.username,
            senderName: comment.authorName || '匿名用户',
            postTitle: post.title,
            postId: post.id,
            content: comment.content,
          });
        }
      }
    } catch (error) {
      console.error('发送评论通知失败:', error);
    }
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

      this.sendLikeNotification(comment, userId).catch((err) => {
        console.error('发送点赞通知失败:', err);
      });
    }

    const count = await this.prisma.commentLike.count({ where: { commentId } });
    return { liked: !existing, likesCount: count };
  }

  private async sendLikeNotification(comment: any, currentUserId: string) {
    try {
      if (!comment.userId || comment.userId === currentUserId) return;

      const commentAuthor = await this.prisma.user.findUnique({
        where: { id: comment.userId },
        select: { id: true, username: true, email: true },
      });

      if (!commentAuthor) return;

      const liker = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { username: true },
      });

      const post = await this.prisma.post.findUnique({
        where: { id: comment.postId },
        select: { id: true, title: true, slug: true },
      });

      if (!post) return;

      await this.notificationService.create(commentAuthor.id, {
        type: 'like',
        title: '点赞通知',
        content: `${liker?.username || '匿名用户'} 赞了你在《${post.title}》的评论`,
        link: `/article/${post.slug || post.id}`,
      });

      if (commentAuthor.email) {
        await this.emailService.sendLikeNotification({
          to: commentAuthor.email,
          toName: commentAuthor.username,
          senderName: liker?.username || '匿名用户',
          postTitle: post.title,
          postId: post.id,
        });
      }
    } catch (error) {
      console.error('发送点赞通知失败:', error);
    }
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

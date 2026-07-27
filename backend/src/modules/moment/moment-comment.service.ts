import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { AiService } from '../ai/ai.service';
import { CreateMomentCommentDto } from './dto/create-moment-comment.dto';

@Injectable()
export class MomentCommentService {
  private readonly logger = new Logger(MomentCommentService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private aiService: AiService,
  ) {}

  async findByMoment(
    momentId: string,
    currentUserId?: string,
    page = 1,
    limit = 10,
    replyLimit = 3,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      momentId,
      parentId: null,
      OR: [
        { status: 'approved' },
        ...(currentUserId ? [{ status: 'pending', userId: currentUserId }] : []),
      ],
    };
    const visibleReplyWhere: any = {
      OR: [
        { status: 'approved' },
        ...(currentUserId ? [{ status: 'pending', userId: currentUserId }] : []),
      ],
    };

    const [comments, total] = await Promise.all([
      this.prisma.momentComment.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              likes: true,
              replies: { where: visibleReplyWhere },
            },
          },
          user: { select: { avatar: true } },
          replies: {
            where: visibleReplyWhere,
            orderBy: { createdAt: 'asc' },
            take: replyLimit,
            include: {
              parent: { select: { authorName: true } },
              _count: { select: { likes: true } },
              user: { select: { avatar: true } },
              ...(currentUserId
                ? { likes: { where: { userId: currentUserId }, select: { id: true } } }
                : {}),
            },
          },
          ...(currentUserId
            ? { likes: { where: { userId: currentUserId }, select: { id: true } } }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.momentComment.count({ where }),
    ]);

    return {
      items: comments.map((comment) => ({
        id: comment.id,
        momentId: comment.momentId,
        authorName: comment.authorName,
        authorAvatar: comment.user?.avatar ?? null,
        content: comment.content,
        parentId: comment.parentId,
        status: comment.status,
        createdAt: comment.createdAt,
        likesCount: comment._count?.likes ?? 0,
        liked: (comment as any).likes?.length > 0,
        replyCount: comment._count?.replies ?? 0,
        replies: ((comment as any).replies || []).map((reply: any) => ({
          id: reply.id,
          authorName: reply.authorName,
          authorAvatar: reply.user?.avatar ?? null,
          content: reply.content,
          parentId: reply.parentId,
          replyToName: reply.replyToName ?? reply.parent?.authorName ?? null,
          status: reply.status,
          createdAt: reply.createdAt,
          parent: reply.parent ? { authorName: reply.parent.authorName } : null,
          likesCount: reply._count?.likes ?? 0,
          liked: reply.likes?.length > 0,
        })),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findReplies(commentId: string, currentUserId?: string, page = 1, limit = 3) {
    const skip = (page - 1) * limit;
    const where: any = {
      parentId: commentId,
      OR: [
        { status: 'approved' },
        ...(currentUserId ? [{ status: 'pending', userId: currentUserId }] : []),
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.momentComment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          parent: { select: { authorName: true } },
          _count: { select: { likes: true } },
          user: { select: { avatar: true } },
          ...(currentUserId
            ? { likes: { where: { userId: currentUserId }, select: { id: true } } }
            : {}),
        },
      }),
      this.prisma.momentComment.count({ where }),
    ]);

    return {
      items: items.map((reply: any) => ({
        id: reply.id,
        authorName: reply.authorName,
        authorAvatar: reply.user?.avatar ?? null,
        content: reply.content,
        parentId: reply.parentId,
        replyToName: reply.replyToName ?? reply.parent?.authorName ?? null,
        status: reply.status,
        createdAt: reply.createdAt,
        parent: reply.parent ? { authorName: reply.parent.authorName } : null,
        likesCount: reply._count?.likes ?? 0,
        liked: reply.likes?.length > 0,
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
      this.prisma.momentComment.findMany({
        where,
        include: {
          moment: { select: { title: true, slug: true } },
          user: { select: { username: true, email: true, avatar: true } },
          parent: { select: { authorName: true, content: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.momentComment.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(dto: CreateMomentCommentDto, userId: string, userName: string) {
    const moment = await this.prisma.moment.findUnique({ where: { id: dto.momentId } });
    if (!moment) throw new NotFoundException('Moment not found');

    let resolvedParentId = dto.parentId;
    let parentComment = null;

    if (resolvedParentId) {
      parentComment = await this.prisma.momentComment.findUnique({ where: { id: resolvedParentId } });
      if (!parentComment) throw new NotFoundException('Parent comment not found');
      if (parentComment.parentId) resolvedParentId = parentComment.parentId;
    }

    const comment = await this.prisma.momentComment.create({
      data: {
        momentId: dto.momentId,
        userId,
        authorName: userName,
        content: dto.content,
        parentId: resolvedParentId,
        replyToName: parentComment?.authorName ?? null,
        status: 'pending',
      },
      include: {
        parent: { select: { authorName: true } },
        user: { select: { avatar: true } },
      },
    });

    this.moderateAndNotify(comment, moment, parentComment, userId, userName).catch((error) => {
      this.logger.error('Moment comment moderation failed', error);
    });

    return comment;
  }

  private async moderateAndNotify(
    comment: any,
    moment: any,
    parentComment: any | null,
    currentUserId: string,
    userName: string,
  ) {
    try {
      const review = await this.aiService.moderateComment(comment.content, moment.title);

      await this.prisma.momentComment.update({
        where: { id: comment.id },
        data: {
          aiReview: review.reason,
          aiReviewResult: review.approved ? 'approved' : 'rejected',
          status: review.approved ? 'approved' : 'rejected',
          rejectReason: review.approved ? null : review.reason,
        },
      });

      if (review.approved) {
        await this.sendCommentNotification(moment, { ...comment, status: 'approved' }, parentComment, currentUserId);
        if (comment.userId) {
          await this.notificationService.create(comment.userId, {
            type: 'system',
            title: '瞬间评论已通过',
            content: `你在「${moment.title}」下的评论已通过审核并展示出来了。`,
            link: `/moments/${moment.slug || moment.id}`,
          });
        }
      } else if (comment.userId) {
        await this.notificationService.create(comment.userId, {
          type: 'system',
          title: '瞬间评论未通过',
          content: `你在「${moment.title}」下的评论未通过审核：${review.reason}`,
          link: `/moments/${moment.slug || moment.id}`,
        });
      }

      if (!review.approved) {
        const admins = await this.prisma.user.findMany({
          where: { role: 'admin' },
          select: { id: true },
        });
        for (const admin of admins) {
          await this.notificationService.create(admin.id, {
            type: 'comment',
            title: '瞬间评论被拦截',
            content: `${userName} 在「${moment.title}」下的评论被 AI 拦截：${review.reason}`,
            link: '/admin/comments',
          });
        }
      }
    } catch (error) {
      this.logger.error('Moment comment moderation pipeline failed', error);
      await this.prisma.momentComment.update({
        where: { id: comment.id },
        data: { status: 'approved', aiReview: 'AI 审核异常，自动通过' },
      });
    }
  }

  private async sendCommentNotification(
    moment: any,
    comment: any,
    parentComment: any | null,
    currentUserId: string,
  ) {
    if (parentComment && parentComment.userId && parentComment.userId !== currentUserId) {
      await this.notificationService.create(parentComment.userId, {
        type: 'reply',
        title: '有人回复了你的瞬间评论',
        content: `${comment.authorName || '匿名用户'} 回复了你在「${moment.title}」下的评论。`,
        link: `/moments/${moment.slug || moment.id}`,
      });
      return;
    }

    if (moment.authorId && moment.authorId !== currentUserId) {
      await this.notificationService.create(moment.authorId, {
        type: 'comment',
        title: '有人评论了你的瞬间',
        content: `${comment.authorName || '匿名用户'} 在「${moment.title}」下留言了。`,
        link: `/moments/${moment.slug || moment.id}`,
      });
    }
  }

  async toggleLike(commentId: string, userId: string) {
    const comment = await this.prisma.momentComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const existing = await this.prisma.momentCommentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      await this.prisma.momentCommentLike.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.momentCommentLike.create({ data: { userId, commentId } });
      this.sendLikeNotification(comment, userId).catch((error) => {
        this.logger.error('Moment comment like notification failed', error);
      });
    }

    const count = await this.prisma.momentCommentLike.count({ where: { commentId } });
    return { liked: !existing, likesCount: count };
  }

  private async sendLikeNotification(comment: any, currentUserId: string) {
    if (!comment.userId || comment.userId === currentUserId) return;

    const liker = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { username: true },
    });
    const moment = await this.prisma.moment.findUnique({
      where: { id: comment.momentId },
      select: { id: true, title: true, slug: true },
    });
    if (!moment) return;

    await this.notificationService.create(comment.userId, {
      type: 'like',
      title: '你的瞬间评论收到了赞',
      content: `${liker?.username || '匿名用户'} 赞了你在「${moment.title}」下的评论。`,
      link: `/moments/${moment.slug || moment.id}`,
    });
  }

  async approve(id: string) {
    const existing = await this.prisma.momentComment.findUnique({
      where: { id },
      include: { moment: { select: { title: true, slug: true } } },
    });
    if (!existing) throw new NotFoundException('Comment not found');

    const comment = await this.prisma.momentComment.update({
      where: { id },
      data: {
        status: 'approved',
        aiReviewResult: 'approved',
        aiReview: existing.aiReview || '管理员人工审核通过',
        rejectReason: null,
      },
    });

    if (existing.status !== 'approved' && existing.userId) {
      await this.notificationService.create(existing.userId, {
        type: 'system',
        title: '瞬间评论已通过',
        content: `你在「${existing.moment.title}」下的评论已通过审核。`,
        link: `/moments/${existing.moment.slug || existing.momentId}`,
      });
    }

    return comment;
  }

  async reject(id: string, reason?: string) {
    const existing = await this.prisma.momentComment.findUnique({
      where: { id },
      include: { moment: { select: { title: true, slug: true } } },
    });
    if (!existing) throw new NotFoundException('Comment not found');

    const comment = await this.prisma.momentComment.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectReason: reason || null,
        aiReviewResult: 'rejected',
        aiReview: reason || existing.aiReview || '管理员人工审核未通过',
      },
    });

    if (existing.status !== 'rejected' && existing.userId) {
      await this.notificationService.create(existing.userId, {
        type: 'system',
        title: '瞬间评论未通过',
        content: `你在「${existing.moment.title}」下的评论未通过审核${reason ? `：${reason}` : ''}`,
        link: `/moments/${existing.moment.slug || existing.momentId}`,
      });
    }

    return comment;
  }

  async remove(id: string) {
    const existing = await this.prisma.momentComment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Comment not found');
    await this.prisma.momentComment.delete({ where: { id } });
  }

  async findStatus(id: string, userId: string) {
    const comment = await this.prisma.momentComment.findUnique({
      where: { id },
      select: { id: true, status: true, aiReview: true, aiReviewResult: true, userId: true },
    });
    if (!comment || comment.userId !== userId) return null;
    return comment;
  }
}

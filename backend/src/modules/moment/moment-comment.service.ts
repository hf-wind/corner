import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { EmailService } from '../email/email.service';
import { AiService } from '../ai/ai.service';
import { CreateMomentCommentDto } from './dto/create-moment-comment.dto';
import { contentPreview } from '../../common/utils/content-preview';

@Injectable()
export class MomentCommentService {
  private readonly logger = new Logger(MomentCommentService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationService: NotificationService,
    private aiService: AiService,
  ) {}

  async findByMoment(
    momentId: string,
    currentUserId?: string,
    page = 1,
    limit = 5,
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
        userId: comment.userId,
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
          userId: reply.userId,
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
        userId: reply.userId,
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
      if (parentComment.momentId !== dto.momentId) {
        throw new BadRequestException('Parent comment does not belong to this moment');
      }
      if (parentComment.userId === userId || (!parentComment.userId && parentComment.authorName === userName)) {
        throw new ForbiddenException('You cannot reply to your own comment');
      }
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
    let approved = true;
    let reason = 'AI 审核异常，自动通过';
    try {
      const review = await this.aiService.moderateComment(comment.content, moment.title);
      approved = review.approved;
      reason = review.reason;

      await this.prisma.momentComment.update({
        where: { id: comment.id },
        data: {
          aiReview: review.reason,
          aiReviewResult: review.approved ? 'approved' : 'rejected',
          status: review.approved ? 'approved' : 'rejected',
          rejectReason: review.approved ? null : review.reason,
        },
      });
    } catch (error) {
      this.logger.error('Moment comment moderation pipeline failed', error);
      approved = true;
      await this.prisma.momentComment.update({
        where: { id: comment.id },
        data: { status: 'approved', aiReviewResult: 'approved', aiReview: reason, rejectReason: null },
      });
    }

    const adminEmails = await this.notifyAdminsOfModeration(moment, comment, userName, approved, reason);
    if (approved) {
      await this.sendCommentNotification(moment, { ...comment, status: 'approved' }, parentComment, currentUserId, adminEmails);
      if (comment.userId) {
        await this.notificationService.create(comment.userId, {
          type: 'system',
          title: '瞬间评论已通过',
          content: `瞬间：「${moment.title}」\n你的评论：${contentPreview(comment.content)}\n审核结果：已通过并展示`,
          link: `/moments?focus=${encodeURIComponent(moment.slug || moment.id)}`,
        });
      }
    } else if (comment.userId) {
      await this.notificationService.create(comment.userId, {
        type: 'system',
        title: '瞬间评论未通过',
        content: `瞬间：「${moment.title}」\n你的评论：${contentPreview(comment.content)}\n审核结果：未通过\n原因：${reason}`,
        link: `/moments?focus=${encodeURIComponent(moment.slug || moment.id)}`,
      });
    }
  }

  private async notifyAdminsOfModeration(
    moment: any,
    comment: any,
    userName: string,
    approved: boolean,
    reason: string,
  ): Promise<Set<string>> {
    const adminEmails = new Set<string>();
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'admin', isActive: true },
        select: { id: true, username: true, email: true },
      });
      await Promise.allSettled(admins.map(async (admin) => {
        if (!approved) {
          await this.notificationService.create(admin.id, {
            type: 'comment',
            title: '瞬间评论被拦截',
            content: `瞬间：「${moment.title}」\n评论人：${userName}\n评论内容：${contentPreview(comment.content)}\n拦截原因：${reason}`,
            link: '/admin/comments',
          }).catch((error) => {
            this.logger.error(`发送管理员瞬间评论站内通知失败: ${admin.id}`, error);
          });
        }
        if (!admin.email) return;
        adminEmails.add(admin.email.toLowerCase());
        await this.emailService.sendCommentModerationNotification({
          to: admin.email,
          toName: admin.username,
          authorName: userName,
          sourceType: '瞬间',
          sourceTitle: moment.title,
          sourceId: moment.id,
          content: comment.content,
          approved,
          reason: approved ? undefined : reason,
          link: '/admin/comments',
        });
      }));
    } catch (error) {
      this.logger.error('发送管理员瞬间评论审核通知失败:', error);
    }
    return adminEmails;
  }

  private async sendCommentNotification(
    moment: any,
    comment: any,
    parentComment: any | null,
    currentUserId: string,
    excludedEmails = new Set<string>(),
  ) {
    if (parentComment && parentComment.userId && parentComment.userId !== currentUserId) {
      const parentAuthor = await this.prisma.user.findUnique({
        where: { id: parentComment.userId },
        select: { username: true, email: true },
      });
      await this.notificationService.create(parentComment.userId, {
        type: 'reply',
        title: '有人回复了你的瞬间评论',
        content: `瞬间：「${moment.title}」\n回复人：${comment.authorName || '匿名用户'}\n你的评论：${contentPreview(parentComment.content)}\n回复内容：${contentPreview(comment.content)}`,
        link: `/moments?focus=${encodeURIComponent(moment.slug || moment.id)}`,
      });
      if (parentAuthor?.email && !excludedEmails.has(parentAuthor.email.toLowerCase())) {
        await this.emailService.sendReplyNotification({
          to: parentAuthor.email,
          toName: parentAuthor.username,
          senderName: comment.authorName || '匿名用户',
          postTitle: moment.title,
          postId: moment.id,
          content: comment.content,
          link: `/moments?focus=${encodeURIComponent(moment.slug || moment.id)}`,
        });
      }
      return;
    }

    if (moment.authorId && moment.authorId !== currentUserId) {
      const momentAuthor = await this.prisma.user.findUnique({
        where: { id: moment.authorId },
        select: { username: true, email: true },
      });
      await this.notificationService.create(moment.authorId, {
        type: 'comment',
        title: '有人评论了你的瞬间',
        content: `瞬间：「${moment.title}」\n评论人：${comment.authorName || '匿名用户'}\n评论内容：${contentPreview(comment.content)}`,
        link: `/moments?focus=${encodeURIComponent(moment.slug || moment.id)}`,
      });
      if (momentAuthor?.email && !excludedEmails.has(momentAuthor.email.toLowerCase())) {
        await this.emailService.sendCommentNotification({
          to: momentAuthor.email,
          toName: momentAuthor.username,
          senderName: comment.authorName || '匿名用户',
          postTitle: moment.title,
          postId: moment.id,
          content: comment.content,
          sourceType: '瞬间',
          link: `/moments?focus=${encodeURIComponent(moment.slug || moment.id)}`,
        });
      }
    }
  }

  async toggleLike(commentId: string, userId: string) {
    const comment = await this.prisma.momentComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId === userId) throw new ForbiddenException('You cannot like your own comment');

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
      content: `瞬间：「${moment.title}」\n点赞人：${liker?.username || '匿名用户'}\n被点赞的评论：${contentPreview(comment.content)}`,
      link: `/moments?focus=${encodeURIComponent(moment.slug || moment.id)}`,
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
        content: `瞬间：「${existing.moment.title}」\n你的评论：${contentPreview(existing.content)}\n审核结果：已通过并展示`,
        link: `/moments?focus=${encodeURIComponent(existing.moment.slug || existing.momentId)}`,
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
        content: `瞬间：「${existing.moment.title}」\n你的评论：${contentPreview(existing.content)}\n审核结果：未通过${reason ? `\n原因：${reason}` : ''}`,
        link: `/moments?focus=${encodeURIComponent(existing.moment.slug || existing.momentId)}`,
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

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { contentPreview } from '../../common/utils/content-preview';
import { checkContentNonsense } from '../../common/content-filter/content-filter';
import { AiService } from '../ai/ai.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationService: NotificationService,
    private aiService: AiService,
  ) {}

  private async shouldNotifyRegularUser(userId?: string | null) {
    if (!userId) return false;
    const findUnique = (this.prisma.user as any)?.findUnique;
    if (typeof findUnique !== 'function') return true;
    const user = await findUnique.call(this.prisma.user, {
      where: { id: userId },
      select: { role: true },
    });
    return user?.role !== 'admin';
  }

  async findByPost(
    postId: string,
    currentUserId?: string,
    page = 1,
    limit = 10,
    replyLimit = 3,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      postId,
      parentId: null,
      OR: [
        { status: 'approved' },
        ...(currentUserId
          ? [{ status: 'pending', userId: currentUserId }]
          : []),
      ],
    };
    const visibleReplyWhere: any = {
      OR: [
        { status: 'approved' },
        ...(currentUserId
          ? [{ status: 'pending', userId: currentUserId }]
          : []),
      ],
    };

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
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
                ? {
                    likes: {
                      where: { userId: currentUserId },
                      select: { id: true },
                    },
                  }
                : {}),
            },
          },
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
      this.prisma.comment.count({ where }),
    ]);

    const items = comments.map((c) => {
      const shown = (c as any).replies || [];

      return {
        id: c.id,
        userId: c.userId,
        postId: c.postId,
        authorName: c.authorName,
        authorAvatar: c.user?.avatar ?? null,
        content: c.content,
        parentId: c.parentId,
        status: c.status,
        createdAt: c.createdAt,
        likesCount: c._count?.likes ?? 0,
        liked: (c as any).likes?.length > 0,
        replyCount: c._count?.replies ?? 0,
        replies: shown.map((r: any) => ({
          id: r.id,
          userId: r.userId,
          authorName: r.authorName,
          authorAvatar: r.user?.avatar ?? null,
          content: r.content,
          parentId: r.parentId,
          replyToName: r.replyToName ?? r.parent?.authorName ?? null,
          status: r.status,
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

    const where: any = {
      parentId: commentId,
      OR: [
        { status: 'approved' },
        ...(currentUserId
          ? [{ status: 'pending', userId: currentUserId }]
          : []),
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
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
      this.prisma.comment.count({ where }),
    ]);

    return {
      items: items.map((r: any) => ({
        id: r.id,
        userId: r.userId,
        authorName: r.authorName,
        authorAvatar: r.user?.avatar ?? null,
        content: r.content,
        parentId: r.parentId,
        replyToName: r.replyToName ?? r.parent?.authorName ?? null,
        status: r.status,
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

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    keyword?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        { content: { contains: keyword, mode: 'insensitive' } },
        { authorName: { contains: keyword, mode: 'insensitive' } },
        { user: { username: { contains: keyword, mode: 'insensitive' } } },
        { user: { email: { contains: keyword, mode: 'insensitive' } } },
        { post: { title: { contains: keyword, mode: 'insensitive' } } },
      ];
    }

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
    const post = await this.prisma.post.findUnique({
      where: { id: dto.postId },
    });
    if (!post) throw new NotFoundException('Post not found');

    let resolvedParentId = dto.parentId;
    let parentComment = null;

    if (resolvedParentId) {
      parentComment = await this.prisma.comment.findUnique({
        where: { id: resolvedParentId },
      });
      if (!parentComment)
        throw new NotFoundException('Parent comment not found');
      if (parentComment.postId !== dto.postId) {
        throw new BadRequestException(
          'Parent comment does not belong to this post',
        );
      }
      if (
        parentComment.userId === userId ||
        (!parentComment.userId && parentComment.authorName === userName)
      ) {
        throw new ForbiddenException('You cannot reply to your own comment');
      }
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
        replyToName: parentComment?.authorName ?? null,
        status: 'pending',
      },
      include: {
        parent: { select: { authorName: true } },
        user: { select: { avatar: true } },
      },
    });

    this.moderateAndNotify(
      comment,
      post,
      parentComment,
      userId,
      userName,
    ).catch((err) => {
      this.logger.error('AI 审核流程异常:', err);
    });

    return comment;
  }

  private async moderateAndNotify(
    comment: any,
    post: any,
    parentComment: any | null,
    currentUserId: string,
    userName: string,
  ) {
    this.logger.log(`开始审核评论: ${comment.id}`);
    const notifyAuthor = await this.shouldNotifyRegularUser(comment.userId);
    let approved = true;
    let reason = 'AI 审核异常，自动通过';
    const nonsenseReason = checkContentNonsense(comment.content);
    if (nonsenseReason) {
      await this.prisma.comment.update({
        where: { id: comment.id },
        data: {
          aiReview: nonsenseReason,
          aiReviewResult: 'rejected',
          status: 'rejected',
          rejectReason: nonsenseReason,
        },
      });
      await this.notifyAdminsOfModeration(
        post,
        comment,
        userName,
        false,
        nonsenseReason,
      );
      if (notifyAuthor) {
        await this.notificationService.create(comment.userId, {
          type: 'system',
          title: '评论审核未通过',
          content: `文章：《${post.title}》\n你的评论：${contentPreview(comment.content)}\n审核结果：未通过\n原因：${nonsenseReason}`,
          link: `/article/${post.slug || post.id}?reviewComment=${comment.id}&review=rejected`,
        });
      }
      return;
    }
    try {
      const review = await this.aiService.moderateComment(
        comment.content,
        post.title,
      );
      this.logger.log(`AI 审核结果: ${JSON.stringify(review)}`);
      approved = review.approved;
      reason = review.reason;

      await this.prisma.comment.update({
        where: { id: comment.id },
        data: {
          aiReview: review.reason,
          aiReviewResult: review.approved ? 'approved' : 'rejected',
          status: review.approved ? 'approved' : 'rejected',
          rejectReason: review.approved ? null : review.reason,
        },
      });
      this.logger.log(
        `评论 ${comment.id} 状态已更新为: ${review.approved ? 'approved' : 'rejected'}`,
      );
    } catch (error) {
      this.logger.error('AI 审核流程异常:', error);
      approved = true;
      await this.prisma.comment.update({
        where: { id: comment.id },
        data: {
          status: 'approved',
          aiReviewResult: 'approved',
          aiReview: reason,
          rejectReason: null,
        },
      });
    }

    const adminEmails = await this.notifyAdminsOfModeration(
      post,
      comment,
      userName,
      approved,
      reason,
    );
    if (approved) {
      await this.sendCommentNotification(
        post,
        { ...comment, status: 'approved' },
        parentComment,
        currentUserId,
        adminEmails,
      );
      if (notifyAuthor) {
        await this.notificationService.create(comment.userId, {
          type: 'system',
          title: '评论审核通过',
          content: `文章：《${post.title}》\n你的评论：${contentPreview(comment.content)}\n审核结果：已通过并发布`,
          link: `/article/${post.slug || post.id}?reviewComment=${comment.id}&review=approved`,
        });
      }
    } else if (notifyAuthor) {
      await this.notificationService.create(comment.userId, {
        type: 'system',
        title: '评论审核未通过',
        content: `文章：《${post.title}》\n你的评论：${contentPreview(comment.content)}\n审核结果：未通过\n原因：${reason}`,
        link: `/article/${post.slug || post.id}?reviewComment=${comment.id}&review=rejected`,
      });
    }
  }

  private async notifyAdminsOfModeration(
    post: any,
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
      await Promise.allSettled(
        admins.map(async (admin) => {
          if (admin.id === comment.userId) return;
          if (!approved) {
            await this.notificationService
              .create(admin.id, {
                type: 'comment',
                title: '评论审核未通过',
                content: `文章：《${post.title}》\n评论人：${userName}\n评论内容：${contentPreview(comment.content)}\n拦截原因：${reason}`,
                link: '/admin/comments',
              })
              .catch((error) => {
                this.logger.error(`发送管理员站内通知失败: ${admin.id}`, error);
              });
          }
          if (!admin.email) return;
          adminEmails.add(admin.email.toLowerCase());
          await this.emailService.sendCommentModerationNotification({
            to: admin.email,
            toName: admin.username,
            authorName: userName,
            sourceType: '文章',
            sourceTitle: post.title,
            sourceId: post.id,
            content: comment.content,
            approved,
            reason: approved ? undefined : reason,
            link: '/admin/comments',
          });
        }),
      );
    } catch (error) {
      this.logger.error('发送管理员评论审核通知失败:', error);
    }
    return adminEmails;
  }

  private async sendCommentNotification(
    post: any,
    comment: any,
    parentComment: any | null,
    currentUserId: string,
    excludedEmails = new Set<string>(),
  ) {
    try {
      const postAuthor = await this.prisma.user.findUnique({
        where: { id: post.authorId },
        select: { id: true, username: true, email: true },
      });

      if (parentComment && parentComment.userId) {
        const parentAuthor = await this.prisma.user.findUnique({
          where: { id: parentComment.userId },
          select: { id: true, username: true, email: true },
        });

        if (parentAuthor && parentAuthor.id !== currentUserId) {
          await this.notificationService.create(parentAuthor.id, {
            type: 'reply',
            title: '新回复通知',
            content: `文章：《${post.title}》\n回复人：${comment.authorName || '匿名用户'}\n你的评论：${contentPreview(parentComment.content)}\n回复内容：${contentPreview(comment.content)}`,
            link: `/article/${post.slug || post.id}`,
          });
          if (
            parentAuthor.email &&
            !excludedEmails.has(parentAuthor.email.toLowerCase())
          ) {
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
      } else if (postAuthor && postAuthor.id !== currentUserId) {
        await this.notificationService.create(postAuthor.id, {
          type: 'comment',
          title: '新评论通知',
          content: `文章：《${post.title}》\n评论人：${comment.authorName || '匿名用户'}\n评论内容：${contentPreview(comment.content)}`,
          link: `/article/${post.slug || post.id}`,
        });
        if (
          postAuthor.email &&
          !excludedEmails.has(postAuthor.email.toLowerCase())
        ) {
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
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId === userId)
      throw new ForbiddenException('You cannot like your own comment');

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
        content: `文章：《${post.title}》\n点赞人：${liker?.username || '匿名用户'}\n被点赞的评论：${contentPreview(comment.content)}`,
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
    const existing = await this.prisma.comment.findUnique({
      where: { id },
      include: { post: { select: { title: true, slug: true } } },
    });
    if (!existing) throw new NotFoundException('Comment not found');

    const comment = await this.prisma.comment.update({
      where: { id },
      data: {
        status: 'approved',
        aiReviewResult: 'approved',
        aiReview: existing.aiReview || '管理员人工审核通过',
        rejectReason: null,
      },
    });

    if (
      existing.status !== 'approved' &&
      (await this.shouldNotifyRegularUser(existing.userId))
    ) {
      await this.notificationService.create(existing.userId!, {
        type: 'system',
        title: '评论审核通过',
        content: `文章：《${existing.post.title}》\n你的评论：${contentPreview(existing.content)}\n审核结果：已通过并发布`,
        link: `/article/${existing.post.slug || existing.postId}?reviewComment=${existing.id}&review=approved`,
      });
    }

    return comment;
  }

  async reject(id: string, reason?: string) {
    const existing = await this.prisma.comment.findUnique({
      where: { id },
      include: { post: { select: { title: true, slug: true } } },
    });
    if (!existing) throw new NotFoundException('Comment not found');

    const comment = await this.prisma.comment.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectReason: reason || null,
        aiReviewResult: 'rejected',
        aiReview: reason || existing.aiReview || '管理员人工审核未通过',
      },
    });

    if (
      existing.status !== 'rejected' &&
      (await this.shouldNotifyRegularUser(existing.userId))
    ) {
      await this.notificationService.create(existing.userId!, {
        type: 'system',
        title: '评论审核未通过',
        content: `文章：《${existing.post.title}》\n你的评论：${contentPreview(existing.content)}\n审核结果：未通过${reason ? `\n原因：${reason}` : ''}`,
        link: `/article/${existing.post.slug || existing.postId}?reviewComment=${existing.id}&review=rejected`,
      });
    }

    return comment;
  }

  async remove(id: string) {
    const existing = await this.prisma.comment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Comment not found');
    await this.prisma.comment.delete({ where: { id } });
  }

  async findStatus(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        aiReview: true,
        aiReviewResult: true,
        userId: true,
      },
    });
    if (!comment || comment.userId !== userId) return null;
    return comment;
  }
}

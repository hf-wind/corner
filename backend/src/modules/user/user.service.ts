import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { GitHubUser } from '../auth/types/github-user.type';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAdminUsers(query: AdminUserQueryDto) {
    const where: any = {};
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (query.role && query.role !== 'all') where.role = query.role;
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'disabled') where.isActive = false;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          bio: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { posts: true, comments: true, moments: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async adminUpdate(actorId: string, userId: string, dto: AdminUpdateUserDto) {
    if (dto.role === undefined && dto.isActive === undefined) {
      throw new BadRequestException('没有需要更新的用户字段');
    }
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');

    const removesAdminAccess =
      target.role === 'admin' &&
      (dto.role === 'user' || dto.isActive === false);
    if (actorId === userId && removesAdminAccess) {
      throw new BadRequestException('不能禁用或降级当前登录的管理员');
    }
    if (removesAdminAccess) {
      const activeAdmins = await this.prisma.user.count({
        where: { role: 'admin', isActive: true },
      });
      if (activeAdmins <= 1)
        throw new BadRequestException('至少需要保留一个启用的管理员');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { posts: true, comments: true, moments: true } },
      },
    });
  }

  async adminDelete(actorId: string, userId: string) {
    if (actorId === userId) {
      throw new BadRequestException('不能删除当前登录的管理员账号');
    }

    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');
    if (target.role === 'admin' && target.isActive) {
      const activeAdmins = await this.prisma.user.count({
        where: { role: 'admin', isActive: true },
      });
      if (activeAdmins <= 1) {
        throw new BadRequestException('至少需要保留一个启用的管理员');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // 创作内容继续保留，并明确转交给执行删除操作的管理员。
      await Promise.all([
        tx.post.updateMany({ where: { authorId: userId }, data: { authorId: actorId } }),
        tx.moment.updateMany({ where: { authorId: userId }, data: { authorId: actorId } }),
        tx.album.updateMany({ where: { authorId: userId }, data: { authorId: actorId } }),
        tx.journey.updateMany({ where: { authorId: userId }, data: { authorId: actorId } }),
        tx.storyRoute.updateMany({ where: { authorId: userId }, data: { authorId: actorId } }),
        tx.media.updateMany({ where: { uploadedBy: userId }, data: { uploadedBy: null } }),
        tx.comment.updateMany({ where: { userId }, data: { userId: null } }),
        tx.momentComment.updateMany({ where: { userId }, data: { userId: null } }),
        tx.visitorMessage.updateMany({ where: { userId }, data: { userId: null } }),
        tx.emailLog.updateMany({ where: { userId }, data: { userId: null } }),
        tx.aiInteraction.updateMany({ where: { userId }, data: { userId: null } }),
        tx.aiNarrative.updateMany({ where: { createdBy: userId }, data: { createdBy: null } }),
        tx.visitorProfile.updateMany({ where: { userId }, data: { userId: null } }),
        tx.visitorBottleCatch.updateMany({ where: { catcherUserId: userId }, data: { catcherUserId: null } }),
      ]);

      await Promise.all([
        tx.commentLike.deleteMany({ where: { userId } }),
        tx.momentCommentLike.deleteMany({ where: { userId } }),
        tx.momentLike.deleteMany({ where: { userId } }),
        tx.notification.deleteMany({ where: { userId } }),
        tx.aiAuthorStyleProfile.deleteMany({ where: { userId } }),
      ]);

      await tx.user.delete({ where: { id: userId } });
    });

    return { success: true };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, isActive: true },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(
    id: string,
    data: { avatar?: string; bio?: string; username?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const safeData = {
      ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
      ...(data.username !== undefined
        ? { username: data.username.trim() }
        : {}),
    };
    return this.prisma.user.update({
      where: { id },
      data: safeData,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
      },
    });
  }

  async findOrCreateGitHubUser(githubUser: GitHubUser) {
    const providerId = String(githubUser.id || '').trim();
    const email = String(githubUser.email || '').trim().toLowerCase();
    if (!providerId || !email) {
      throw new BadRequestException('GitHub 未提供有效的账号标识或邮箱');
    }

    const linkedUser = await this.prisma.user.findUnique({
      where: { githubId: providerId },
    });
    if (linkedUser) {
      if (!linkedUser.isActive) throw new UnauthorizedException('账号已被禁用');
      return { user: linkedUser, action: 'existing_github' as const };
    }

    const emailUser = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (emailUser) {
      if (!emailUser.isActive) throw new UnauthorizedException('账号已被禁用');
      if (emailUser.githubId && emailUser.githubId !== providerId) {
        throw new BadRequestException('该系统账号已绑定其他 GitHub 账号');
      }
      const user = await this.prisma.user.update({
        where: { id: emailUser.id },
        data: {
          githubId: providerId,
          githubUsername: githubUser.username?.trim() || null,
          githubAvatar: githubUser.avatar?.trim() || null,
        },
      });
      return { user, action: 'linked_existing' as const };
    }

    // 没有同邮箱账号时创建新用户。
    const baseUsername = githubUser.username?.trim() || email.split('@')[0];
    {
      const username = await this.generateUsername(baseUsername);
      const randomPassword = Math.random().toString(36).substring(2);
      const passwordHash = await bcrypt.hash(randomPassword, 12);
      const user = await this.prisma.user.create({
        data: {
          email,
          username,
          githubId: providerId,
          githubUsername: githubUser.username?.trim() || null,
          githubAvatar: githubUser.avatar?.trim() || null,
          passwordHash,
          avatar: githubUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          role: 'user'
        }
      });
      return { user, action: 'created' as const };
    }
  }

  private async generateUsername(base: string): Promise<string> {
    let candidate = base.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
    if (!candidate) candidate = 'user';

    const exists = await this.prisma.user.findUnique({
      where: { username: candidate },
    });
    if (!exists) return candidate;

    for (let i = 0; i < 10; i++) {
      const suffix = Math.random().toString(36).substring(2, 5);
      const testUsername = `${candidate}_${suffix}`;
      const taken = await this.prisma.user.findUnique({
        where: { username: testUsername },
      });
      if (!taken) return testUsername;
    }

    return `${candidate}_${Date.now().toString(36)}`;
  }
}

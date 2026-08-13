import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

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
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationSseService } from './notification-sse.service';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private sse: NotificationSseService,
  ) {}

  async create(userId: string, data: { type: string; title: string; content?: string; link?: string }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        content: data.content,
        link: data.link,
      },
    });

    this.sse.emit(userId, {
      type: 'notification',
      data: {
        id: notification.id,
        title: notification.title,
        type: notification.type,
        content: notification.content,
        link: notification.link,
        read: notification.read,
        createdAt: notification.createdAt,
      },
    });

    const { count } = await this.getUnreadCount(userId);
    this.sse.emit(userId, { type: 'unread-count', data: { count } });

    return notification;
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markAsRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    const { count } = await this.getUnreadCount(userId);
    this.sse.emit(userId, { type: 'unread-count', data: { count } });
    return result;
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    this.sse.emit(userId, { type: 'unread-count', data: { count: 0 } });
    return result;
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId },
      select: { read: true },
    });
    const result = await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
    if (existing && !existing.read) {
      const { count } = await this.getUnreadCount(userId);
      this.sse.emit(userId, { type: 'unread-count', data: { count } });
    }
    return result;
  }
}

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  it('paginates all notifications with a matching count condition', async () => {
    const prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([{ id: 'notification-1' }]),
        count: jest.fn().mockResolvedValue(41),
      },
    } as any;
    const service = new NotificationService(prisma, { emit: jest.fn() } as any);

    await expect(service.findAll('user-1', 2, 20)).resolves.toEqual({
      items: [{ id: 'notification-1' }],
      total: 41,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      skip: 20,
      take: 20,
    });
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });

  it('applies the unread condition to both items and total', async () => {
    const prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([{ id: 'notification-2' }]),
        count: jest.fn().mockResolvedValue(1),
      },
    } as any;
    const service = new NotificationService(prisma, { emit: jest.fn() } as any);

    const result = await service.findAll('user-1', 1, 20, true);

    expect(result.total).toBe(1);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', read: false } }),
    );
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', read: false },
    });
  });
});

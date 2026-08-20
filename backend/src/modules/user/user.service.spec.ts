import { BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';

describe('UserService admin management', () => {
  function serviceWith(prismaOverrides: Record<string, unknown> = {}) {
    const updateMany = () => ({ updateMany: jest.fn() });
    const deleteMany = () => ({ deleteMany: jest.fn() });
    const prisma = {
      user: {
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        ...prismaOverrides,
      },
      post: updateMany(),
      moment: updateMany(),
      album: updateMany(),
      journey: updateMany(),
      storyRoute: updateMany(),
      media: updateMany(),
      comment: updateMany(),
      momentComment: updateMany(),
      visitorMessage: updateMany(),
      emailLog: updateMany(),
      aiInteraction: updateMany(),
      aiNarrative: updateMany(),
      visitorProfile: updateMany(),
      visitorBottleCatch: updateMany(),
      commentLike: deleteMany(),
      momentCommentLike: deleteMany(),
      momentLike: deleteMany(),
      notification: deleteMany(),
      aiAuthorStyleProfile: deleteMany(),
    } as any;
    prisma.$transaction = jest.fn((callback: (tx: any) => unknown) => callback(prisma));
    return { service: new UserService(prisma), prisma };
  }

  it('prevents the current admin from disabling themselves', async () => {
    const { service, prisma } = serviceWith();
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
      isActive: true,
    });
    await expect(
      service.adminUpdate('admin-1', 'admin-1', { isActive: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('keeps at least one active administrator', async () => {
    const { service, prisma } = serviceWith();
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-2',
      role: 'admin',
      isActive: true,
    });
    prisma.user.count.mockResolvedValue(1);
    await expect(
      service.adminUpdate('admin-1', 'admin-2', { role: 'user' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates a regular user through an explicit field allowlist', async () => {
    const { service, prisma } = serviceWith();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'user',
      isActive: true,
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      isActive: true,
    });
    await service.adminUpdate('admin-1', 'user-1', { role: 'admin' });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: 'admin' } }),
    );
  });

  it('prevents the current admin from deleting themselves', async () => {
    const { service, prisma } = serviceWith();
    await expect(service.adminDelete('admin-1', 'admin-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps the last active administrator when deleting accounts', async () => {
    const { service, prisma } = serviceWith();
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-2',
      role: 'admin',
      isActive: true,
    });
    prisma.user.count.mockResolvedValue(1);
    await expect(service.adminDelete('admin-1', 'admin-2')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('transfers authored content and deletes the target account', async () => {
    const { service, prisma } = serviceWith();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'user',
      isActive: true,
    });

    await expect(service.adminDelete('admin-1', 'user-1')).resolves.toEqual({ success: true });
    expect(prisma.post.updateMany).toHaveBeenCalledWith({
      where: { authorId: 'user-1' },
      data: { authorId: 'admin-1' },
    });
    expect(prisma.comment.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { userId: null },
    });
    expect(prisma.commentLike.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });
});

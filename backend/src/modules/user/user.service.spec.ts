import { BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';

describe('UserService admin management', () => {
  function serviceWith(prismaOverrides: Record<string, unknown> = {}) {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        ...prismaOverrides,
      },
    } as any;
    return { service: new UserService(prisma), prisma };
  }

  it('prevents the current admin from disabling themselves', async () => {
    const { service, prisma } = serviceWith();
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'admin', isActive: true });
    await expect(service.adminUpdate('admin-1', 'admin-1', { isActive: false }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('keeps at least one active administrator', async () => {
    const { service, prisma } = serviceWith();
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-2', role: 'admin', isActive: true });
    prisma.user.count.mockResolvedValue(1);
    await expect(service.adminUpdate('admin-1', 'admin-2', { role: 'user' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates a regular user through an explicit field allowlist', async () => {
    const { service, prisma } = serviceWith();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'user', isActive: true });
    prisma.user.update.mockResolvedValue({ id: 'user-1', role: 'admin', isActive: true });
    await service.adminUpdate('admin-1', 'user-1', { role: 'admin' });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { role: 'admin' } }));
  });
});

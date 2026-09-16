import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService email-code authentication', () => {
  const makeService = () => {
    const prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    const jwt = { sign: jest.fn().mockReturnValue('signed-token') };
    const emailService = {
      sendVerificationCode: jest.fn().mockResolvedValue({ success: true }),
      verifyCode: jest.fn().mockResolvedValue(true),
    };
    const service = new AuthService(
      prisma as any,
      jwt as any,
      emailService as any,
      {} as any,
    );
    return { service, prisma, jwt, emailService };
  };

  it('sends a login code even when the email has no account yet', async () => {
    const { service, prisma, emailService } = makeService();
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.sendVerificationCode(' NEW@Example.com ', 'login'),
    ).resolves.toEqual({ success: true });
    expect(emailService.sendVerificationCode).toHaveBeenCalledWith(
      'new@example.com',
      'login',
    );
  });

  it('creates an account after a valid code for a new email', async () => {
    const { service, prisma, emailService } = makeService();
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }: any) => ({
      id: 'user-1',
      ...data,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await service.login({
      email: 'new@example.com',
      code: '123456',
    });

    expect(emailService.verifyCode).toHaveBeenCalledWith(
      'new@example.com',
      '123456',
      'login',
    );
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'new@example.com',
        username: 'new',
        role: 'user',
        passwordHash: expect.any(String),
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        access_token: 'signed-token',
        account_status: 'created',
      }),
    );
  });

  it('does not create an account when the code is invalid', async () => {
    const { service, prisma, emailService } = makeService();
    prisma.user.findFirst.mockResolvedValue(null);
    emailService.verifyCode.mockResolvedValue(false);

    await expect(
      service.login({ email: 'new@example.com', code: '000000' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { VisitorService } from './visitor.service';

function hashOf(id: string): string {
  const { createHash } = require('node:crypto');
  return createHash('sha256').update(id).digest('hex');
}

describe('VisitorService', () => {
  const actor = { userId: 'user-1', username: '阿风' };
  const req = { headers: { 'x-visitor-id': 'guest-1' }, ip: '203.0.113.9' } as never;
  const redis = {
    client: {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    },
  } as any;
  const ai = {
    moderateComment: jest.fn().mockResolvedValue({ approved: true, reason: null }),
  } as any;
  const notifications = { create: jest.fn().mockResolvedValue({}) } as any;

  afterEach(() => {
    jest.restoreAllMocks();
    notifications.create.mockClear();
  });

  function makeService(prisma: any) {
    return new VisitorService(prisma, redis, ai, notifications);
  }

  describe('createMessageEntry — 双通道', () => {
    it('登录通道：无需访客档案即可留言，写入 userId 与 username 快照', async () => {
      const create = jest.fn().mockResolvedValue({ id: 'm1' });
      const prisma = {
        visitorProfile: { findUnique: jest.fn() },
        visitorMessage: { create },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      const result = await service.createMessageEntry(req, actor, null, '你好，时光');

      expect(prisma.visitorProfile.findUnique).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'message',
          nickname: '阿风',
          userId: 'user-1',
          visitorIdHash: null,
          status: 'approved',
        }),
      });
      expect(result.record.id).toBe('m1');
    });

    it('登录通道：审核通过后发送审核结果通知', async () => {
      const prisma = {
        visitorProfile: { findUnique: jest.fn() },
        visitorMessage: { create: jest.fn().mockResolvedValue({ id: 'm3' }) },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await service.createMessageEntry(req, actor, null, '通过了审核的留言');

      expect(notifications.create).toHaveBeenCalledWith('user-1', {
        type: 'guestbook',
        title: '你的留言已通过审核',
        content: '通过了审核的留言',
        link: '/guestbook',
      });
    });

    it('登录通道：审核拒绝时通知携带原因', async () => {
      ai.moderateComment.mockResolvedValueOnce({ approved: false, reason: '疑似广告内容' });
      const prisma = {
        visitorProfile: { findUnique: jest.fn() },
        visitorMessage: { create: jest.fn().mockResolvedValue({ id: 'm4' }) },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await service.createMessageEntry(req, actor, null, '带广告的话');

      expect(notifications.create).toHaveBeenCalledWith('user-1', {
        type: 'guestbook',
        title: '你的留言未通过审核',
        content: '疑似广告内容',
        link: '/guestbook',
      });
    });

    it('访客通道：不发送审核通知（仅访客提示）', async () => {
      const prisma = {
        visitorProfile: {
          findUnique: jest.fn().mockResolvedValue({ nickname: '旅人甲', visitorIdHash: 'h', isBanned: false }),
          update: jest.fn().mockResolvedValue({}),
        },
        visitorMessage: { create: jest.fn().mockResolvedValue({ id: 'm5' }) },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await service.createMessageEntry(req, null, hashOf('guest-1'), '访客留言');

      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('访客通道：未起名（无名旅人）时拒绝留言', async () => {
      const prisma = {
        visitorProfile: {
          findUnique: jest.fn().mockResolvedValue({ nickname: '无名旅人', isBanned: false }),
        },
        visitorMessage: { create: jest.fn() },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await expect(
        service.createMessageEntry(req, null, hashOf('guest-1'), '你好'),
      ).rejects.toThrow('请先给自己起一个名字');
      expect(prisma.visitorMessage.create).not.toHaveBeenCalled();
    });

    it('访客通道：被封禁时拒绝留言', async () => {
      const prisma = {
        visitorProfile: {
          findUnique: jest.fn().mockResolvedValue({ nickname: '阿风', isBanned: true }),
        },
        visitorMessage: { create: jest.fn() },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await expect(
        service.createMessageEntry(req, null, hashOf('guest-1'), '你好'),
      ).rejects.toThrow('该访客已被封禁');
    });

    it('登录通道：无需 x-visitor-id（visitorIdHash 为 null）也能留言', async () => {
      const create = jest.fn().mockResolvedValue({ id: 'm2' });
      const prisma = {
        visitorProfile: { findUnique: jest.fn() },
        visitorMessage: { create },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await service.createMessageEntry(req, actor, null, '没有访客标识也能留言');

      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({ visitorIdHash: null, userId: 'user-1' }),
      });
    });
  });

  describe('fishBottle — 捞瓶邮箱回退', () => {
    it('瓶主为登录用户时，优先从 User 表取邮箱', async () => {
      const bottle = {
        id: 'b1',
        type: 'bottle',
        status: 'approved',
        content: '写给未来的一封信',
        nickname: '阿风',
        visitorIdHash: null,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        aiReview: null,
        aiReviewResult: null,
        rejectReason: null,
        caughtByIdHash: null,
        caughtAt: null,
      };
      const prisma = {
        visitorProfile: { findUnique: jest.fn() },
        visitorMessage: {
          count: jest.fn().mockResolvedValue(1),
          findMany: jest.fn().mockResolvedValue([bottle]),
          update: jest.fn().mockResolvedValue(bottle),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({ email: 'feng@corner.ink' }),
          findMany: jest.fn(),
        },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      const result = await service.fishBottle(req, actor, null);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { email: true },
      });
      expect(result.bottle.contactEmail).toBe('feng@corner.ink');
    });

    it('瓶主为访客时，从 visitorProfile 取邮箱', async () => {
      const bottle = {
        id: 'b2',
        type: 'bottle',
        status: 'approved',
        content: '海边的信',
        nickname: '旅人甲',
        visitorIdHash: hashOf('guest-2'),
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        aiReview: null,
        aiReviewResult: null,
        rejectReason: null,
        caughtByIdHash: null,
        caughtAt: null,
      };
      const prisma = {
        visitorProfile: {
          findUnique: jest.fn().mockResolvedValue({ email: 'guest@example.com' }),
        },
        visitorMessage: {
          count: jest.fn().mockResolvedValue(1),
          findMany: jest.fn().mockResolvedValue([bottle]),
          update: jest.fn().mockResolvedValue(bottle),
        },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      const result = await service.fishBottle(req, null, hashOf('guest-1'));

      expect(result.bottle.contactEmail).toBe('guest@example.com');
    });

    it('登录用户捞瓶时不会捞到自己投的瓶子（按 userId 排除）', async () => {
      const prisma = {
        visitorProfile: { findUnique: jest.fn() },
        visitorMessage: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await expect(service.fishBottle(req, actor, null)).rejects.toThrow('海面还很平静');
      expect(prisma.visitorMessage.count).toHaveBeenCalledWith({
        where: { type: 'bottle', status: 'approved', NOT: [{ userId: 'user-1' }] },
      });
    });

    it('访客既未登录也无访客标识时拒绝捞瓶', async () => {
      const prisma = {
        visitorProfile: { findUnique: jest.fn() },
        visitorMessage: { count: jest.fn(), findMany: jest.fn(), update: jest.fn() },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await expect(service.fishBottle(req, null, null)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('identify — 改名防御', () => {
    it('已登记昵称的访客不能改名', async () => {
      const prisma = {
        visitorProfile: {
          findUnique: jest.fn().mockResolvedValue({ nickname: '阿风' }),
          upsert: jest.fn(),
        },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await expect(service.identify(req, hashOf('guest-1'), '新名字')).rejects.toThrow(
        '已登记的名字不能修改',
      );
      expect(prisma.visitorProfile.upsert).not.toHaveBeenCalled();
    });

    it('未登记（无名旅人）可登记名字', async () => {
      const profile = { nickname: '阿风', email: null, isBanned: false };
      const prisma = {
        visitorProfile: {
          findUnique: jest.fn().mockResolvedValue({ nickname: '无名旅人' }),
          upsert: jest.fn().mockResolvedValue(profile),
        },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      const result = await service.identify(req, hashOf('guest-1'), '阿风', 'a@b.com');

      expect(prisma.visitorProfile.upsert).toHaveBeenCalled();
      expect(result.nickname).toBe('阿风');
    });
  });
});

import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { VisitorService } from './visitor.service';

function hashOf(id: string): string {
  const { createHash } = require('node:crypto');
  return createHash('sha256').update(id).digest('hex');
}

describe('VisitorService', () => {
  const actor = { userId: 'user-1', username: '阿风' };
  const req = {
    headers: { 'x-visitor-id': 'guest-1' },
    ip: '203.0.113.9',
  } as never;
  const redis = {
    client: {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    },
  } as any;
  const ai = {
    moderateComment: jest
      .fn()
      .mockResolvedValue({ approved: true, reason: null }),
    moderateStrict: jest
      .fn()
      .mockResolvedValue({ approved: true, reason: null }),
  } as any;
  const notifications = { create: jest.fn().mockResolvedValue({}) } as any;

  afterEach(() => {
    jest.restoreAllMocks();
    notifications.create.mockClear();
    ai.moderateComment.mockClear();
    ai.moderateStrict.mockClear();
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

      const result = await service.createMessageEntry(
        req,
        actor,
        null,
        '你好，时光',
      );

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
      ai.moderateStrict.mockResolvedValueOnce({
        approved: false,
        reason: '疑似广告内容',
      });
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

    it('登录通道：审核转人工时发送准确通知', async () => {
      ai.moderateStrict.mockResolvedValueOnce({
        approved: false,
        reason: 'AI 审核暂不可用，已转人工审核',
        pending: true,
      });
      const prisma = {
        visitorProfile: { findUnique: jest.fn() },
        visitorMessage: { create: jest.fn().mockResolvedValue({ id: 'm-pending' }) },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await service.createMessageEntry(req, actor, null, '等待人工审核的留言');

      expect(notifications.create).toHaveBeenCalledWith('user-1', {
        type: 'guestbook',
        title: '你的留言已转人工审核',
        content: 'AI 审核暂不可用，已转人工审核',
        link: '/guestbook',
      });
    });

    it('访客通道：不发送审核通知（仅访客提示）', async () => {
      const prisma = {
        visitorProfile: {
          findUnique: jest.fn().mockResolvedValue({
            nickname: '旅人甲',
            visitorIdHash: 'h',
            isBanned: false,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        visitorMessage: { create: jest.fn().mockResolvedValue({ id: 'm5' }) },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await service.createMessageEntry(
        req,
        null,
        hashOf('guest-1'),
        '访客留言',
      );

      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('访客通道：未起名（无名旅人）时拒绝留言', async () => {
      const prisma = {
        visitorProfile: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ nickname: '无名旅人', isBanned: false }),
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
          findUnique: jest
            .fn()
            .mockResolvedValue({ nickname: '阿风', isBanned: true }),
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

      await service.createMessageEntry(
        req,
        actor,
        null,
        '没有访客标识也能留言',
      );

      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          visitorIdHash: null,
          userId: 'user-1',
        }),
      });
    });
  });

  describe('fishBottle — 按 id 捞瓶', () => {
    const baseBottle = {
      id: 'b1',
      type: 'bottle',
      status: 'approved',
      content: '写给未来的一封信',
      nickname: '阿风',
      visitorIdHash: null,
      userId: 'user-1',
      chainId: 'chain-1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      aiReview: null,
      aiReviewResult: null,
      rejectReason: null,
      caughtByIdHash: null,
      caughtAt: null,
    };
    const chainRow = {
      id: 'b1',
      nickname: '阿风',
      content: '写给未来的一封信',
      createdAt: new Date(),
    };
    function makePrisma(overrides: Record<string, any> = {}) {
      return {
        visitorProfile: { findUnique: jest.fn() },
        visitorMessage: {
          findUnique: jest.fn().mockResolvedValue(baseBottle),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest.fn().mockResolvedValue([chainRow]),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({ email: 'feng@corner.ink' }),
          findMany: jest.fn(),
        },
        visitorAchievement: {
          findMany: jest.fn().mockResolvedValue([]),
          createMany: jest.fn(),
        },
        visitorVisit: { findMany: jest.fn() },
        ...overrides,
      } as any;
    }

    it('登录用户捞起他人瓶子：返回完整信链与 canReply', async () => {
      const prisma = makePrisma({
        visitorMessage: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...baseBottle, userId: 'user-2' }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest.fn().mockResolvedValue([chainRow]),
        },
      });
      const service = makeService(prisma);

      const result = await service.fishBottle(req, actor, null, 'b1');

      expect(prisma.visitorMessage.updateMany).toHaveBeenCalledWith({
        where: { id: 'b1', status: 'approved' },
        data: expect.objectContaining({
          status: 'caught',
          caughtAt: expect.any(Date),
        }),
      });
      expect(result.bottle.chain).toEqual([chainRow]);
      expect(result.bottle.contactEmail).toBe('feng@corner.ink');
      expect(result.bottle.canReply).toBe(true);
    });

    it('瓶主为访客时从 visitorProfile 取邮箱', async () => {
      const prisma = makePrisma({
        visitorMessage: {
          findUnique: jest.fn().mockResolvedValue({
            ...baseBottle,
            userId: null,
            visitorIdHash: hashOf('guest-2'),
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest.fn().mockResolvedValue([chainRow]),
        },
        visitorProfile: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ email: 'guest@example.com' }),
        },
      });
      const service = makeService(prisma);

      const result = await service.fishBottle(
        req,
        null,
        hashOf('guest-1'),
        'b1',
      );

      expect(prisma.visitorProfile.findUnique).toHaveBeenCalledWith({
        where: { visitorIdHash: hashOf('guest-2') },
        select: { email: true },
      });
      expect(result.bottle.contactEmail).toBe('guest@example.com');
      expect(result.bottle.canReply).toBe(false);
    });

    it('登录用户不能捞自己投的瓶子', async () => {
      const prisma = makePrisma();
      const service = makeService(prisma);

      await expect(
        service.fishBottle(
          req,
          { userId: 'user-1', username: '阿风' },
          null,
          'b1',
        ),
      ).rejects.toThrow('不能捞起自己投的瓶子');
      expect(prisma.visitorMessage.updateMany).not.toHaveBeenCalled();
    });

    it('瓶子已被捞走时拒绝（并发保护）', async () => {
      const prisma = makePrisma({
        visitorMessage: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...baseBottle, status: 'caught' }),
          updateMany: jest.fn(),
          findMany: jest.fn(),
        },
      });
      const service = makeService(prisma);

      await expect(service.fishBottle(req, actor, null, 'b1')).rejects.toThrow(
        '这只瓶子已经被别人捞走了',
      );
    });

    it('竞态：updateMany 返回 count 0 时拒绝', async () => {
      const visitorProfileFindUnique = jest.fn();
      const prisma = makePrisma({
        visitorMessage: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'b1',
            type: 'bottle',
            status: 'approved',
            userId: 'user-2',
            visitorIdHash: 'h-owner',
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findMany: jest.fn(),
        },
        visitorProfile: { findUnique: visitorProfileFindUnique },
      });
      const service = makeService(prisma);

      await expect(service.fishBottle(req, actor, null, 'b1')).rejects.toThrow(
        '已经被别人捞走了',
      );
      expect(prisma.visitorMessage.findMany).not.toHaveBeenCalled();
      expect(visitorProfileFindUnique).not.toHaveBeenCalled();
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('捞起后通知瓶主（登录用户）', async () => {
      const prisma = makePrisma({
        visitorMessage: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...baseBottle, userId: 'user-2' }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest.fn().mockResolvedValue([chainRow]),
        },
      });
      const service = makeService(prisma);

      await service.fishBottle(req, actor, null, 'b1');

      expect(notifications.create).toHaveBeenCalledWith('user-2', {
        type: 'guestbook',
        title: '你的漂流瓶被捞起了',
        content: expect.any(String),
        link: '/guestbook',
      });
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

      await expect(
        service.identify(req, hashOf('guest-1'), '新名字'),
      ).rejects.toThrow('已登记的名字不能修改');
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
        visitorAchievement: {
          findMany: jest.fn().mockResolvedValue([]),
          createMany: jest.fn(),
        },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      const result = await service.identify(
        req,
        hashOf('guest-1'),
        '阿风',
        'a@b.com',
      );

      expect(prisma.visitorProfile.upsert).toHaveBeenCalled();
      expect(result.nickname).toBe('阿风');
    });
  });

  describe('throwBottle — 接力链', () => {
    const caughtParent = {
      id: 'b1',
      type: 'bottle',
      status: 'caught',
      content: '第一封信',
      nickname: '阿风',
      visitorIdHash: null,
      userId: 'user-1',
      chainId: 'chain-1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      aiReview: null,
      aiReviewResult: null,
      rejectReason: null,
      caughtByIdHash: null,
      caughtAt: null,
    };

    it('接力：校验父瓶为 caught 且继承 chainId', async () => {
      const create = jest.fn().mockResolvedValue({ id: 'm-relay' });
      const prisma = {
        visitorMessage: {
          findUnique: jest.fn().mockResolvedValue(caughtParent),
          count: jest.fn().mockResolvedValue(2),
          create,
          update: jest.fn(),
        },
        visitorProfile: { findUnique: jest.fn() },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: {
          findMany: jest.fn().mockResolvedValue([]),
          createMany: jest.fn(),
        },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await service.throwBottle(req, actor, null, '接力的话', 'b1');

      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'bottle',
          chainId: 'chain-1',
          parentId: 'b1',
        }),
      });
      expect(prisma.visitorMessage.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'bottle' }),
        }),
      );
      expect(prisma.visitorMessage.update).not.toHaveBeenCalled();
    });

    it('接力：父瓶必须是被捞起状态', async () => {
      const prisma = {
        visitorMessage: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...caughtParent, status: 'approved' }),
          count: jest.fn(),
          create: jest.fn(),
        },
        visitorProfile: { findUnique: jest.fn() },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await expect(
        service.throwBottle(req, actor, null, '话', 'b1'),
      ).rejects.toThrow('只能接力一只刚捞起的瓶子');
    });

    it('接力：信链超过 10 段时拒绝', async () => {
      const prisma = {
        visitorMessage: {
          findUnique: jest.fn().mockResolvedValue(caughtParent),
          count: jest.fn().mockResolvedValue(10),
          create: jest.fn(),
        },
        visitorProfile: { findUnique: jest.fn() },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await expect(
        service.throwBottle(req, actor, null, '话', 'b1'),
      ).rejects.toThrow('这封信已经漂了太久');
    });

    it('首投：无 parentId 时链字段为 null，且补写自身 id 为 chainId', async () => {
      const create = jest.fn().mockResolvedValue({ id: 'm-first' });
      const update = jest
        .fn()
        .mockResolvedValue({ id: 'm-first', chainId: 'm-first' });
      const prisma = {
        visitorMessage: {
          findUnique: jest.fn(),
          count: jest.fn(),
          create,
          update,
        },
        visitorProfile: { findUnique: jest.fn() },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: {
          findMany: jest.fn().mockResolvedValue([]),
          createMany: jest.fn(),
        },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      await service.throwBottle(req, actor, null, '第一封信');

      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'bottle',
          chainId: null,
          parentId: null,
        }),
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: 'm-first' },
        data: { chainId: 'm-first' },
      });
    });
  });

  describe('replyBottle — 站内回复', () => {
    const caughtBottle = {
      id: 'b1',
      type: 'bottle',
      status: 'caught',
      content: '第一封信',
      nickname: '阿风',
      visitorIdHash: null,
      userId: 'user-2',
      chainId: 'chain-1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      aiReview: null,
      aiReviewResult: null,
      rejectReason: null,
      caughtByIdHash: null,
      caughtAt: null,
    };

    it('访客回复被拒绝', async () => {
      const prisma = { visitorMessage: { findUnique: jest.fn() } } as any;
      const service = makeService(prisma);

      await expect(
        service.replyBottle(req, null, hashOf('guest-1'), 'b1', '你好'),
      ).rejects.toThrow('请先登录后再回复漂流瓶主人');
    });

    it('登录用户回复：创建 reply 记录并通知瓶主', async () => {
      const create = jest.fn().mockResolvedValue({ id: 'r1' });
      const prisma = {
        visitorMessage: {
          findUnique: jest.fn().mockResolvedValue(caughtBottle),
          create,
        },
        visitorProfile: { findUnique: jest.fn() },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      const result = await service.replyBottle(
        req,
        actor,
        null,
        'b1',
        '我也在海边',
      );

      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'reply',
          parentId: 'b1',
          chainId: 'chain-1',
          userId: 'user-1',
        }),
      });
      expect(notifications.create).toHaveBeenCalledWith('user-2', {
        type: 'guestbook',
        title: '有人回复了你的漂流瓶',
        content: expect.stringContaining('我也在海边'),
        link: '/guestbook',
      });
      expect(result.ok).toBe(true);
    });

    it('不能回复自己投的瓶子', async () => {
      const prisma = {
        visitorMessage: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...caughtBottle, userId: 'user-1' }),
          create: jest.fn(),
        },
      } as any;
      const service = makeService(prisma);

      await expect(
        service.replyBottle(req, actor, null, 'b1', '你好'),
      ).rejects.toThrow('不能回复自己投的瓶子');
    });
  });

  describe('peekBottles — 盲盒密封', () => {
    it('只返回链尾瓶且不含 content', async () => {
      const candidates = [
        { id: 'b1', parentId: null, chainId: 'chain-1', nickname: '阿风' },
        { id: 'b2', parentId: 'b1', chainId: 'chain-1', nickname: '旅人甲' },
        { id: 'b3', parentId: null, chainId: 'chain-3', nickname: '阿花' },
      ];
      const prisma = {
        visitorMessage: {
          findMany: jest.fn().mockResolvedValueOnce(candidates),
          groupBy: jest.fn().mockResolvedValue([
            { chainId: 'chain-1', _count: { _all: 2 } },
            { chainId: 'chain-3', _count: { _all: 1 } },
          ]),
        },
        visitorProfile: { findUnique: jest.fn() },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      const result = await service.peekBottles(8, null, null);

      const ids = result.map((b) => b.id);
      expect(ids).toEqual(['b2', 'b3']);
      expect(result[0]).toMatchObject({
        nicknameFirstChar: '旅',
        chainLength: 2,
      });
      expect(result[0]).not.toHaveProperty('content');
      expect(prisma.visitorMessage.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'bottle' }),
        }),
      );
    });

    it('排除自己：excludeVisitorHash/excludeUserId 透传', async () => {
      const candidates = [
        { id: 'b1', parentId: null, chainId: 'chain-1', nickname: '阿风' },
        { id: 'b2', parentId: 'b1', chainId: 'chain-1', nickname: '旅人甲' },
        { id: 'b3', parentId: null, chainId: 'chain-3', nickname: '阿花' },
      ];
      const prisma = {
        visitorMessage: {
          findMany: jest.fn().mockResolvedValueOnce(candidates),
          groupBy: jest.fn().mockResolvedValue([
            { chainId: 'chain-1', _count: { _all: 2 } },
            { chainId: 'chain-3', _count: { _all: 1 } },
          ]),
        },
        visitorProfile: { findUnique: jest.fn() },
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
        visitorVisit: { findMany: jest.fn() },
      } as any;
      const service = makeService(prisma);

      const result = await service.peekBottles(8, 'h-visitor', 'user-1');

      expect(prisma.visitorMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ NOT: expect.anything() }),
        }),
      );
      expect(result.map((b) => b.id)).toEqual(['b2', 'b3']);
    });
  });

  describe('listMessages — 身份字段', () => {
    it('返回 userId / visitorIdHash / user.avatar 供前端识别身份', async () => {
      const findMany = jest.fn().mockResolvedValue([
        {
          id: 'm1',
          content: '你好',
          nickname: '张三',
          createdAt: new Date('2026-08-01'),
          userId: 'u1',
          visitorIdHash: 'h1',
          user: {
            id: 'u1',
            username: '张三',
            avatar: '/uploads/avatar/a.webp',
          },
        },
        {
          id: 'm2',
          content: '再见',
          nickname: '李四',
          createdAt: new Date('2026-08-02'),
          userId: null,
          visitorIdHash: 'h2',
          user: null,
        },
      ]);
      const count = jest.fn().mockResolvedValue(2);
      const prisma = {
        visitorMessage: { findMany, count },
      } as any;
      const service = makeService(prisma);

      const result = await service.listMessages('message', 1);

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            userId: true,
            visitorIdHash: true,
            user: expect.objectContaining({
              select: expect.objectContaining({ avatar: true }),
            }),
          }),
        }),
      );
      expect(result.items[0]).toMatchObject({
        userId: 'u1',
        visitorIdHash: 'h1',
        user: { avatar: '/uploads/avatar/a.webp' },
      });
      expect(result.items[1]).toMatchObject({
        userId: null,
        visitorIdHash: 'h2',
        user: null,
      });
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('bottle 分页参数透传', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const count = jest.fn().mockResolvedValue(30);
      const prisma = {
        visitorMessage: { findMany, count },
      } as any;
      const service = makeService(prisma);

      const result = await service.listMessages('bottle', 2, 10);

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'bottle',
            status: 'approved',
          }),
          skip: 10,
          take: 10,
        }),
      );
      expect(result).toMatchObject({ page: 2, pageSize: 10, hasMore: true });
    });
  });

  describe('审核约束 — 前置规则引擎', () => {
    const prisma = {
      visitorProfile: { findUnique: jest.fn(), update: jest.fn() },
      visitorMessage: { create: jest.fn().mockResolvedValue({ id: 'm-x' }) },
      user: { findUnique: jest.fn(), findMany: jest.fn() },
      visitorAchievement: { findMany: jest.fn(), createMany: jest.fn() },
      visitorVisit: { findMany: jest.fn() },
    } as any;
    const make = () => new VisitorService(prisma, redis, ai, notifications);

    it('单字符「1」直接拒绝且不调用 AI', async () => {
      prisma.visitorProfile.findUnique.mockResolvedValue({
        nickname: '旅人甲',
        visitorIdHash: 'h',
        isBanned: false,
      });
      const service = make();
      const result = await service.createMessageEntry(
        req,
        null,
        hashOf('guest-1'),
        '1',
      );
      expect(ai.moderateStrict).not.toHaveBeenCalled();
      expect(prisma.visitorMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'rejected',
          aiReviewResult: 'rejected',
        }),
      });
      expect(result.review.approved).toBe(false);
    });

    it('纯数字「11111」直接拒绝', async () => {
      prisma.visitorProfile.findUnique.mockResolvedValue({
        nickname: '旅人甲',
        visitorIdHash: 'h',
        isBanned: false,
      });
      const service = make();
      const result = await service.createMessageEntry(
        req,
        null,
        hashOf('guest-1'),
        '11111',
      );
      expect(ai.moderateStrict).not.toHaveBeenCalled();
      expect(result.review.approved).toBe(false);
    });

    it('重复字符「啊啊啊啊」直接拒绝', async () => {
      prisma.visitorProfile.findUnique.mockResolvedValue({
        nickname: '旅人甲',
        visitorIdHash: 'h',
        isBanned: false,
      });
      const service = make();
      const result = await service.createMessageEntry(
        req,
        null,
        hashOf('guest-1'),
        '啊啊啊啊',
      );
      expect(result.review.approved).toBe(false);
    });

    it('正常内容「你好呀」走 AI 审核', async () => {
      prisma.visitorProfile.findUnique.mockResolvedValue({
        nickname: '旅人甲',
        visitorIdHash: 'h',
        isBanned: false,
      });
      const service = make();
      await service.createMessageEntry(req, null, hashOf('guest-1'), '你好呀');
      expect(ai.moderateStrict).toHaveBeenCalled();
    });

    it('AI 返回 pending（审核不可用）时落库 pending 状态', async () => {
      prisma.visitorProfile.findUnique.mockResolvedValue({
        nickname: '旅人甲',
        visitorIdHash: 'h',
        isBanned: false,
      });
      ai.moderateStrict.mockResolvedValueOnce({
        approved: false,
        reason: 'AI 审核暂不可用',
        pending: true,
      });
      const service = make();
      const result = await service.createMessageEntry(
        req,
        null,
        hashOf('guest-1'),
        '这条等人工审核',
      );
      expect(prisma.visitorMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'pending',
          aiReviewResult: 'pending',
        }),
      });
      expect(result.review.pending).toBe(true);
    });

    it('登录通道：单字符「1」同样直接拒绝（一视同仁）', async () => {
      const service = make();
      const result = await service.createMessageEntry(req, actor, null, '1');
      expect(ai.moderateStrict).not.toHaveBeenCalled();
      expect(prisma.visitorMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'rejected',
          aiReviewResult: 'rejected',
        }),
      });
      expect(result.review.approved).toBe(false);
    });
  });

  describe('trackVisit — 登录绑定与地区', () => {
    it('绑定登录用户并在新访问创建后异步补写地区', async () => {
      const visitorIdHash = hashOf('guest-1');
      const visitUpdate = jest.fn().mockResolvedValue({});
      const prisma = {
        visitorProfile: {
          findFirst: jest.fn().mockResolvedValue(null),
          upsert: jest.fn().mockResolvedValue({ isBanned: false }),
          update: jest.fn().mockResolvedValue({}),
          findUnique: jest.fn().mockResolvedValue({ nickname: '旅人', visitCount: 1 }),
        },
        visitorVisit: {
          create: jest.fn().mockResolvedValue({ id: 'visit-1' }),
          update: visitUpdate,
          findMany: jest.fn().mockResolvedValue([]),
        },
        visitorAchievement: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn() },
        visitorMessage: { count: jest.fn().mockResolvedValue(0) },
      } as any;
      const redisTx = {
        client: {
          sadd: jest.fn().mockResolvedValue(1),
          expire: jest.fn().mockResolvedValue(1),
          set: jest.fn().mockResolvedValue('1'),
        },
      } as any;
      const geo = {
        locate: jest.fn().mockResolvedValue({
          country: '中国',
          regionName: '浙江省',
          city: '杭州市',
          label: '浙江 · 杭州',
        }),
      } as any;
      const service = new VisitorService(prisma, redisTx, ai, notifications, geo);

      const result = await service.trackVisit(req, visitorIdHash, { pageType: 'home' }, 'user-9');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(prisma.visitorProfile.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { visitorIdHash },
        update: expect.objectContaining({ userId: 'user-9' }),
        create: expect.objectContaining({ userId: 'user-9' }),
      }));
      expect(result.userBound).toBe('user-9');
      expect(visitUpdate).toHaveBeenCalledWith({
        where: { id: 'visit-1' },
        data: { region: '浙江 · 杭州' },
      });
    });
  });

  describe('后台管理 — 身份与详情', () => {
    it('adminMessages 返回漂流瓶捞起者', async () => {
      const prisma = {
        visitorMessage: {
          findMany: jest.fn().mockResolvedValue([{ id: 'm1', userId: null, caughtByIdHash: 'h2' }]),
          count: jest.fn().mockResolvedValue(1),
        },
        visitorProfile: {
          findMany: jest.fn().mockResolvedValue([{ visitorIdHash: 'h2', nickname: '拾光者' }]),
        },
      } as any;
      const result = await makeService(prisma).adminMessages({});
      expect(result.items[0].catcher).toEqual({ nickname: '拾光者' });
    });

    it('adminProfiles 按登录用户筛选并返回账号、身份和地区', async () => {
      const now = new Date('2026-08-13T00:00:00Z');
      const prisma = {
        visitorProfile: {
          findMany: jest.fn().mockResolvedValue([{
            id: 'p1', visitorIdHash: 'h1', nickname: '阿风', userId: 'u1',
            isBanned: false, firstSeenAt: now, lastSeenAt: now, visitCount: 1,
          }]),
          count: jest.fn().mockResolvedValue(1),
        },
        visitorMessage: { groupBy: jest.fn().mockResolvedValue([]) },
        visitorAchievement: { groupBy: jest.fn().mockResolvedValue([]) },
        visitorVisit: {
          findMany: jest.fn().mockResolvedValue([{ visitorIdHash: 'h1', region: '浙江 · 杭州' }]),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([{ id: 'u1', username: 'afeng', email: 'a@b.c' }]),
        },
      } as any;

      const result = await makeService(prisma).adminProfiles({ type: 'user' });

      expect(prisma.visitorProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ userId: { not: null } }),
      }));
      expect(result.items[0]).toMatchObject({
        userId: 'u1', identity: 'user', account: { username: 'afeng' }, region: '浙江 · 杭州',
      });
    });

    it('登录用户已被封禁时拒绝提交', async () => {
      const prisma = {
        user: { findUnique: jest.fn().mockResolvedValue({ isActive: false }) },
        visitorProfile: { findUnique: jest.fn() },
      } as any;
      await expect(makeService(prisma).createMessageEntry(req, actor, null, '这是一条正常留言'))
        .rejects.toThrow('该账号已被封禁');
    });
  });
});

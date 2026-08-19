import { BadRequestException } from '@nestjs/common';
import { AiService, type AiChatActor } from './ai.service';
import { AI_DEFAULTS } from './ai-defaults';

describe('AiService chat usage controls', () => {
  function createService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      post: { findMany: jest.fn().mockResolvedValue([]) },
      chatMessage: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      chatDailyQuota: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const settings = {
      findAll: jest.fn().mockResolvedValue({
        ...AI_DEFAULTS,
        ai_api_key: 'test-key',
        ai_model: 'test-model',
        ...overrides,
      }),
    };
    const pipeline = {
      rpush: jest.fn(),
      ltrim: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    };
    const redis = {
      client: {
        eval: jest.fn().mockResolvedValue([1, 1, 12, 0]),
        pipeline: jest.fn(() => pipeline),
        lrange: jest.fn().mockResolvedValue([]),
        del: jest.fn().mockResolvedValue(1),
      },
    };
    const service = new AiService(
      prisma as any,
      settings as any,
      {} as any,
      redis as any,
    );
    jest.spyOn(service as any, 'canUseModel').mockResolvedValue(true);
    jest.spyOn(service, 'buildKnowledgeContext').mockResolvedValue('知识库');
    return { service, prisma, redis, pipeline };
  }

  const guest: AiChatActor = {
    guestId: 'guest-session-1234567890',
    ip: '203.0.113.10',
  };

  it('allows guest chat with the guest output cap and returns remaining quota', async () => {
    const { service, prisma, redis } = createService();
    const onToken = jest.fn();
    const chatStream = jest
      .spyOn(service, 'chatStream')
      .mockImplementation((_messages, options, emit) => {
        emit('游客回复');
        return Promise.resolve('游客回复');
      });

    const result = await service.petChatStream(
      guest,
      '推荐一篇文章',
      undefined,
      onToken,
    );

    expect(redis.client.eval).toHaveBeenCalledWith(
      expect.any(String),
      2,
      expect.stringContaining('corner:ai:quota:guest:'),
      expect.stringContaining('corner:ai:quota:guest-ip:'),
      expect.any(String),
      '12',
      '48',
    );
    expect(chatStream.mock.calls[0][1]).toMatchObject({ maxTokens: 256 });
    expect(onToken).toHaveBeenCalledWith('游客回复');
    expect(result).toMatchObject({
      source: 'ai',
      usage: { audience: 'guest', limit: 12, remaining: 11 },
    });
    expect(prisma.chatMessage.create).toHaveBeenCalledTimes(2);
    expect(prisma.chatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: undefined,
        guestIdHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
  });

  it('blocks a guest before calling the model when daily quota is exhausted', async () => {
    const { service, redis } = createService();
    redis.client.eval.mockResolvedValue([0, 12, 12, 1]);
    const chatStream = jest.spyOn(service, 'chatStream');
    const onToken = jest.fn();

    const result = await service.petChatStream(
      guest,
      '继续推荐',
      undefined,
      onToken,
    );

    expect(chatStream).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      source: 'quota',
      usage: { audience: 'guest', remaining: 0 },
    });
    expect(onToken).toHaveBeenCalledTimes(1);
  });

  it('rejects oversized input before consuming quota or calling the model', async () => {
    const { service, redis } = createService({ ai_chat_input_max_chars: 100 });
    const chat = jest.spyOn(service, 'chat');

    await expect(
      service.petChat(guest, '超'.repeat(101)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(redis.client.eval).not.toHaveBeenCalled();
    expect(chat).not.toHaveBeenCalled();
  });

  it('uses the registered user quota and output cap', async () => {
    const { service, prisma, redis } = createService({
      ai_daily_quota: 40,
      ai_chat_max_tokens: 512,
    });
    prisma.user.findUnique.mockResolvedValue({ username: '读者' });
    redis.client.eval.mockResolvedValue([1, 1, 40, 0]);
    const chat = jest.spyOn(service, 'chat').mockResolvedValue('登录回复');
    const actor: AiChatActor = { userId: 'user-1', ip: '203.0.113.10' };

    const result = await service.petChat(actor, '最近更新了什么？');

    expect(redis.client.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expect.stringContaining('corner:ai:quota:user:user-1:'),
      expect.any(String),
      '40',
    );
    expect(chat.mock.calls[0][1]).toMatchObject({ maxTokens: 512 });
    expect(prisma.chatDailyQuota.upsert).toHaveBeenCalled();
    expect(result).toMatchObject({
      source: 'ai',
      usage: { audience: 'user', limit: 40, remaining: 39 },
    });
  });
});

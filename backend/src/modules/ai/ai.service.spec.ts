import { AiService } from './ai.service';
import { AI_DEFAULTS } from './ai-defaults';

describe('AiService model configuration compatibility', () => {
  const missingTableError = Object.assign(
    new Error('The table public.ai_model_configs does not exist'),
    { code: 'P2021' },
  );

  function createService() {
    const prisma = {
      aiModelConfig: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      category: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tag: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const settings = {
      findAll: jest.fn().mockResolvedValue({
        ai_enabled: true,
        ai_provider: 'deepseek',
        ai_api_key: 'legacy-api-key',
        ai_base_url: 'https://api.deepseek.com',
        ai_model: 'deepseek-chat',
      }),
    };
    const service = new AiService(
      prisma as any,
      settings as any,
      {} as any,
      {} as any,
    );
    return { service, prisma };
  }

  it('falls back to legacy settings when the model table is missing', async () => {
    const { service, prisma } = createService();
    prisma.aiModelConfig.findFirst.mockRejectedValue(missingTableError);

    await expect(service.isConfigured()).resolves.toBe(true);
  });

  it('returns an empty model list when the model table is missing', async () => {
    const { service, prisma } = createService();
    prisma.aiModelConfig.findMany.mockRejectedValue(missingTableError);

    await expect(service.listModelConfigs()).resolves.toEqual([]);
  });

  it('does not hide unrelated database failures', async () => {
    const { service, prisma } = createService();
    const databaseError = Object.assign(new Error('database unavailable'), {
      code: 'P1001',
    });
    prisma.aiModelConfig.findMany.mockRejectedValue(databaseError);

    await expect(service.listModelConfigs()).rejects.toBe(databaseError);
  });

  it('creates AI taxonomy records with complete visual metadata', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue(null);
    prisma.category.findUnique.mockResolvedValue(null);
    prisma.category.create.mockImplementation(({ data }: any) => ({
      id: 'category-id',
      ...data,
    }));
    prisma.tag.findFirst.mockResolvedValue(null);
    prisma.tag.findUnique.mockResolvedValue(null);
    prisma.tag.create.mockImplementation(({ data }: any) => ({
      id: `tag-${data.slug}`,
      ...data,
    }));

    const category = await (service as any).ensureCategoryByName({
      name: '科幻电影',
      icon: 'ph:video-camera-bold',
      color: '#7C3AED',
    });
    const tags = await (service as any).ensureTagsByNames([
      { name: '引力', icon: 'ph:flask-bold', color: '#2563EB' },
      { name: '时间', icon: 'invalid-icon', color: 'invalid-color' },
    ]);

    expect(category).toEqual(
      expect.objectContaining({
        icon: 'ph:video-camera-bold',
        color: '#7c3aed',
      }),
    );
    expect(tags).toHaveLength(2);
    expect(tags[0]).toEqual(
      expect.objectContaining({
        icon: 'ph:flask-bold',
        color: '#2563eb',
      }),
    );
    expect(tags[1].icon).toBe('ph:tag-bold');
    expect(tags[1].color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('fills missing visuals on existing taxonomy records', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue({
      id: 'category-id',
      name: '技术',
      slug: 'technology',
      icon: null,
      color: null,
    });
    prisma.category.update.mockImplementation(({ data }: any) => ({
      id: 'category-id',
      name: '技术',
      slug: 'technology',
      ...data,
    }));

    const category = await (service as any).ensureCategoryByName('技术');

    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'category-id' },
      data: {
        icon: 'ph:code-bold',
        color: expect.stringMatching(/^#[0-9a-f]{6}$/),
      },
    });
    expect(category.icon).toBe('ph:code-bold');
  });

  it('accepts the complete AI metadata format in article generation', async () => {
    const { service, prisma } = createService();
    jest.spyOn(service, 'getConfig').mockResolvedValue({
      ...AI_DEFAULTS,
      ai_enabled: true,
      ai_article_enabled: true,
    });
    jest.spyOn(service as any, 'canUseModel').mockResolvedValue(true);
    jest
      .spyOn(service, 'chat')
      .mockResolvedValueOnce(
        JSON.stringify({ title: '星际穿越', content: '一篇科幻电影文章' }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          slug: 'interstellar',
          category: {
            name: '科幻电影',
            icon: 'ph:video-camera-bold',
            color: '#7c3aed',
          },
          tags: [
            { name: '电影', icon: 'ph:video-camera-bold', color: '#2563eb' },
            { name: '科幻', icon: 'ph:rocket-launch-bold', color: '#059669' },
          ],
        }),
      );
    jest.spyOn(service, 'summarize').mockResolvedValue({
      excerpt: '摘要',
      source: 'ai',
    });
    jest.spyOn(service, 'pickAndImportCover').mockResolvedValue('/cover.webp');
    jest.spyOn(service as any, 'ensureCategoryByName').mockResolvedValue({
      id: 'category-id',
      name: '科幻电影',
    });
    jest.spyOn(service as any, 'ensureTagsByNames').mockResolvedValue([
      { id: 'tag-1', name: '电影' },
      { id: 'tag-2', name: '科幻' },
    ]);
    prisma.category.findMany.mockResolvedValue([]);
    prisma.tag.findMany.mockResolvedValue([]);

    const result = await service.generateArticle('写一篇星际穿越观后感');

    expect((service as any).ensureCategoryByName).toHaveBeenCalledWith({
      name: '科幻电影',
      icon: 'ph:video-camera-bold',
      color: '#7c3aed',
    });
    expect((service as any).ensureTagsByNames).toHaveBeenCalledWith([
      { name: '电影', icon: 'ph:video-camera-bold', color: '#2563eb' },
      { name: '科幻', icon: 'ph:rocket-launch-bold', color: '#059669' },
    ]);
    expect(result).toEqual(
      expect.objectContaining({
        categoryId: 'category-id',
        tagIds: ['tag-1', 'tag-2'],
      }),
    );
  });

  it('gives the model complete existing taxonomy records and rejects essay as a default', async () => {
    const { service, prisma } = createService();
    jest.spyOn(service, 'getConfig').mockResolvedValue({
      ...AI_DEFAULTS,
      ai_enabled: true,
      ai_article_enabled: true,
    });
    jest.spyOn(service as any, 'canUseModel').mockResolvedValue(true);
    const chat = jest
      .spyOn(service, 'chat')
      .mockResolvedValueOnce(
        JSON.stringify({
          title: 'NestJS 事务实践',
          content: '事务与外键约束详解',
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          slug: 'nestjs-transactions',
          category: { name: '技术', icon: 'ph:code-bold', color: '#2563eb' },
          tags: [{ name: 'NestJS', icon: 'ph:code-bold', color: '#059669' }],
        }),
      );
    jest
      .spyOn(service, 'summarize')
      .mockResolvedValue({ excerpt: '摘要', source: 'ai' });
    jest.spyOn(service, 'pickAndImportCover').mockResolvedValue('');
    jest
      .spyOn(service as any, 'ensureCategoryByName')
      .mockResolvedValue({ id: 'category-tech', name: '技术' });
    jest
      .spyOn(service as any, 'ensureTagsByNames')
      .mockResolvedValue([{ id: 'tag-nest', name: 'NestJS' }]);
    prisma.category.findMany.mockResolvedValue([
      { id: 'category-essay', name: '随笔', slug: 'essay' },
      { id: 'category-tech', name: '技术', slug: 'technology' },
    ]);
    prisma.tag.findMany.mockResolvedValue([
      { id: 'tag-nest', name: 'NestJS', slug: 'nestjs' },
    ]);

    await service.generateArticle('写一篇 NestJS 事务文章');

    const metaMessages = chat.mock.calls[1][0] as Array<{
      role: string;
      content: string;
    }>;
    expect(metaMessages[0].content).toContain('“随笔”不是默认分类');
    expect(metaMessages[1].content).toContain('"id":"category-tech"');
    expect(metaMessages[1].content).toContain('"slug":"nestjs"');
  });

  describe('moderateStrict — 留言/漂流瓶严格审核', () => {
    it('AI 未启用时返回 pending', async () => {
      const { service } = createService();
      (service as any).getConfig = jest
        .fn()
        .mockResolvedValue({ ai_comment_moderation_enabled: false });
      const r = await service.moderateStrict('你好');
      expect(r.pending).toBe(true);
    });

    it('AI 返回格式异常时 pending 而非放行', async () => {
      const { service } = createService();
      (service as any).getConfig = jest.fn().mockResolvedValue({
        ai_comment_moderation_enabled: true,
        ai_moderate_model_config_id: 'm',
        ai_moderate_model: 'm',
        ai_moderate_temperature: 0.1,
        ai_moderate_max_tokens: 200,
        ai_moderate_prompt: 'x',
      });
      (service as any).canUseModel = jest.fn().mockResolvedValue(true);
      (service as any).chat = jest.fn().mockResolvedValue('不是JSON');
      const r = await service.moderateStrict('你好');
      expect(r.pending).toBe(true);
      expect(r.approved).toBe(false);
    });

    it('AI 正常判定通过时不带 pending', async () => {
      const { service } = createService();
      (service as any).getConfig = jest.fn().mockResolvedValue({
        ai_comment_moderation_enabled: true,
        ai_moderate_model_config_id: 'm',
        ai_moderate_model: 'm',
        ai_moderate_temperature: 0.1,
        ai_moderate_max_tokens: 200,
        ai_moderate_prompt: 'x',
      });
      (service as any).canUseModel = jest.fn().mockResolvedValue(true);
      (service as any).chat = jest
        .fn()
        .mockResolvedValue('{"approved": true, "reason": "正常交流"}');
      const r = await service.moderateStrict('你好');
      expect(r.approved).toBe(true);
      expect(r.pending).toBeUndefined();
    });
  });
});

import { AiService } from './ai.service';

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
    const service = new AiService(prisma as any, settings as any, {} as any);
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
    const databaseError = Object.assign(new Error('database unavailable'), { code: 'P1001' });
    prisma.aiModelConfig.findMany.mockRejectedValue(databaseError);

    await expect(service.listModelConfigs()).rejects.toBe(databaseError);
  });
});

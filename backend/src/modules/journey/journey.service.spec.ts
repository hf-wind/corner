import type { MemoryGraphService } from '../memory-graph/memory-graph.service';
import type { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from './journey.service';

describe('JourneyService public privacy', () => {
  it('does not expose private stop coordinates', async () => {
    const findFirst = jest.fn<() => Promise<unknown>>().mockResolvedValue({
      id: 'journey-1',
      title: '测试旅行',
      slug: 'test',
      description: null,
      coverImage: null,
      happenedAt: null,
      endedAt: null,
      stops: [
        {
          id: 'stop-1',
          sort: 0,
          title: '第一站',
          narration: null,
          occurredAt: null,
          locationVisibility: 'private',
          locationPrecision: 'exact',
          locationExactConfirmedAt: null,
          place: {
            id: 'place-1',
            name: '私人住宅',
            slug: 'home',
            longitude: 120,
            latitude: 30,
            city: '绍兴',
          },
        },
      ],
    });
    const service = new JourneyService(
      { journey: { findFirst } } as unknown as PrismaService,
      {} as MemoryGraphService,
    );

    const result = await service.findPublicJourney('test');

    expect(result.stops[0].publicLocation).toBeNull();
    expect(JSON.stringify(result)).not.toContain('120');
    expect(JSON.stringify(result)).not.toContain('私人住宅');
  });
});

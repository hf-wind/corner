import { BadRequestException } from '@nestjs/common';
import { MemoryMapService } from './memory-map.service';

describe('MemoryMapService', () => {
  const redis = {
    cacheVersion: jest.fn().mockResolvedValue('1'),
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns only public map records inside the requested viewport', async () => {
    const moments = {
      findPublicMapMemories: jest.fn().mockResolvedValue([
        {
          id: 'moment:one',
          type: 'moment',
          title: '杭州',
          href: '/moments?focus=one',
          occurredAt: '2026-01-02T00:00:00.000Z',
          publicLocation: {
            name: '西湖',
            slug: 'west-lake',
            longitude: 120.15,
            latitude: 30.25,
            precision: 'exact',
          },
        },
      ]),
    };
    const albums = { findPublicMapMemories: jest.fn().mockResolvedValue([]) };
    const service = new MemoryMapService(
      moments as any,
      albums as any,
      redis as any,
    );

    const result = await service.findMap({
      west: 119,
      south: 29,
      east: 122,
      north: 32,
      zoom: 15,
      types: 'moment',
      year: 2026,
    });

    expect(result.totalMemories).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.recentMemories).toHaveLength(1);
    expect(result.places).toEqual([{ slug: 'west-lake', name: '西湖' }]);
    expect(result.items[0]).toMatchObject({
      kind: 'memory',
      type: 'moment',
      placeName: '西湖',
      precision: 'exact',
    });
    expect(result.items[0]).not.toHaveProperty('publicLocation');
  });

  it('clusters nearby records at low zoom and reports type counts', async () => {
    const shared = {
      longitude: 120.15,
      latitude: 30.25,
      precision: 'place' as const,
      name: '西湖',
      slug: 'west-lake',
    };
    const moments = {
      findPublicMapMemories: jest.fn().mockResolvedValue([
        {
          id: 'moment:one',
          type: 'moment',
          title: '一',
          href: '/one',
          publicLocation: shared,
        },
        {
          id: 'moment:two',
          type: 'moment',
          title: '二',
          href: '/two',
          publicLocation: { ...shared, longitude: 120.151 },
        },
      ]),
    };
    const albums = {
      findPublicMapMemories: jest.fn().mockResolvedValue([
        {
          id: 'album:one',
          type: 'album',
          title: '册',
          href: '/album',
          publicLocation: shared,
        },
      ]),
    };
    const service = new MemoryMapService(
      moments as any,
      albums as any,
      redis as any,
    );

    const result = await service.findMap({
      west: 119,
      south: 29,
      east: 122,
      north: 32,
      zoom: 6,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      kind: 'cluster',
      count: 3,
      types: { moment: 2, album: 1, photo: 0 },
    });
    expect(result.recentMemories).toHaveLength(3);
    expect(result.recentMemories.every((item) => item.kind === 'memory')).toBe(
      true,
    );
  });

  it('rejects invalid latitude bounds', async () => {
    const service = new MemoryMapService({} as any, {} as any, redis as any);
    await expect(
      service.findMap({ west: 119, south: 32, east: 122, north: 29, zoom: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

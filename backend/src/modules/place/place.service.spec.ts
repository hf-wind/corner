import { PlaceService } from './place.service';

describe('PlaceService resolve', () => {
  const input = {
    name: 'West Lake viewpoint',
    address: 'Hangzhou West Lake',
    city: 'Hangzhou',
    province: 'Zhejiang',
    country: 'China',
    longitude: 120.1551,
    latitude: 30.2741,
    coordinateSystem: 'wgs84' as const,
    type: 'poi' as const,
  };

  it('reuses a place within 100 meters and fills missing region data', async () => {
    const existing = {
      id: 'place-1',
      name: 'West Lake',
      slug: 'west-lake',
      address: null,
      city: null,
      province: null,
      country: null,
      longitude: 120.155,
      latitude: 30.274,
      type: 'poi',
      coverMediaId: null,
      _count: { moments: 2 },
    };
    const updated = {
      ...existing,
      address: input.address,
      city: input.city,
      province: input.province,
      country: input.country,
    };
    const prisma = {
      place: {
        findMany: jest.fn().mockResolvedValue([existing]),
        update: jest.fn().mockResolvedValue(updated),
        create: jest.fn(),
      },
    } as any;
    const memoryGraph = { scheduleRebuild: jest.fn() } as any;
    const service = new PlaceService(prisma, memoryGraph);

    const result = await service.resolve(input);

    expect(prisma.place.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: {
        address: input.address,
        city: input.city,
        province: input.province,
        country: input.country,
      },
      include: { _count: { select: { moments: true } } },
    });
    expect(prisma.place.create).not.toHaveBeenCalled();
    expect(memoryGraph.scheduleRebuild).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: existing.id, momentCount: 2 });
  });

  it('creates and schedules the graph rebuild when no place matches', async () => {
    const created = {
      id: 'place-2',
      name: input.name,
      slug: 'west-lake-viewpoint',
      address: input.address,
      city: input.city,
      province: input.province,
      country: input.country,
      longitude: input.longitude,
      latitude: input.latitude,
      type: input.type,
      coverMediaId: null,
      _count: { moments: 0 },
    };
    const prisma = {
      place: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      },
    } as any;
    const memoryGraph = { scheduleRebuild: jest.fn() } as any;
    const service = new PlaceService(prisma, memoryGraph);

    const result = await service.resolve(input);

    expect(prisma.place.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: input.name,
        slug: 'west-lake-viewpoint',
        longitude: input.longitude,
        latitude: input.latitude,
      }),
      include: { _count: { select: { moments: true } } },
    });
    expect(memoryGraph.scheduleRebuild).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ id: created.id, momentCount: 0 });
  });
});

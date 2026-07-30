import { MomentService } from './moment.service';

describe('MomentService public location boundaries', () => {
  const publishedMoment = {
    id: 'moment-id',
    title: '工作稿标题',
    slug: 'working-slug',
    content: '工作稿正文',
    excerpt: null,
    authorId: 'author-id',
    status: 'published',
    viewCount: 0,
    likeCount: 0,
    needsPublish: true,
    publishedSnapshot: {
      title: '已发布标题',
      slug: 'published-slug',
      content: '已发布正文',
      excerpt: null,
      happenedAt: '2026-07-01T08:00:00.000Z',
      place: {
        id: '9ff36ed1-cf10-43e8-9c67-17967a676202',
        name: '私人住所',
        slug: 'private-home',
        address: '精确门牌',
        city: '绍兴市',
        province: '浙江省',
        country: '中国',
        latitude: 30,
        longitude: 120.5,
        type: 'poi',
      },
      locationVisibility: 'private',
      locationPrecision: 'place',
      locationSource: 'manual',
      locationExactConfirmedAt: null,
    },
    placeId: '9ff36ed1-cf10-43e8-9c67-17967a676202',
    happenedAt: new Date('2026-07-02T08:00:00.000Z'),
    locationVisibility: 'public',
    locationPrecision: 'exact',
    locationSource: 'map',
    locationExactConfirmedAt: new Date(),
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { id: 'author-id', username: 'admin', avatar: null },
    place: {
      id: '9ff36ed1-cf10-43e8-9c67-17967a676202', name: '工作稿地点', slug: 'working-place',
      address: '工作稿地址', city: '绍兴市', province: '浙江省', country: '中国',
      latitude: 30.1, longitude: 120.6, type: 'poi',
    },
    _count: { comments: 0 },
    likes: [],
  };

  function createService() {
    const prisma = {
      moment: {
        findMany: jest.fn().mockResolvedValue([publishedMoment]),
        count: jest.fn().mockResolvedValue(1),
      },
    } as any;
    return { service: new MomentService(prisma, {} as any), prisma };
  }

  it('ignores an unauthenticated admin-style status query', async () => {
    const { service, prisma } = createService();
    const result = await service.findAll({ status: 'all' }, undefined, false);
    expect(prisma.moment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'published' },
    }));
    expect(result.items).toHaveLength(1);
  });

  it('uses the published snapshot and removes every private place clue', async () => {
    const { service } = createService();
    const result = await service.findAll({}, undefined, false);
    expect(result.items[0]).toMatchObject({
      title: '已发布标题',
      slug: 'published-slug',
      happenedAt: '2026-07-01T08:00:00.000Z',
      publicLocation: null,
    });
    expect(result.items[0]).not.toHaveProperty('place');
    expect(result.items[0]).not.toHaveProperty('placeId');
    expect(JSON.stringify(result.items[0])).not.toContain('精确门牌');
    expect(JSON.stringify(result.items[0])).not.toContain('工作稿地点');
  });

  it('marks a published moment for republish when happened time differs from its snapshot', async () => {
    const prisma = {
      moment: {
        findUnique: jest.fn().mockResolvedValue(publishedMoment),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...publishedMoment, ...data })),
      },
      place: {
        findUnique: jest.fn().mockResolvedValue(publishedMoment.place),
      },
    } as any;
    const service = new MomentService(prisma, {} as any);
    const result = await service.update(publishedMoment.slug, {});
    expect(result.needsPublish).toBe(true);
    expect(prisma.moment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ needsPublish: true }),
    }));
  });
});

import type { RedisService } from '../../common/redis/redis.service';
import type { PrismaService } from '../prisma/prisma.service';
import { MemoryGraphService } from './memory-graph.service';

type UpsertArgs = { create: { id: string } };
type RelationFindManyArgs = {
  where?: { hidden?: boolean; status?: string };
};

describe('MemoryGraphService', () => {
  const post = {
    id: 'p1',
    title: '绍兴文章',
    slug: 'shaoxing-post',
    content: '正文',
    excerpt: '摘要',
    coverImage: null,
    status: 'published',
    publishedAt: new Date('2026-01-02T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    publishedSnapshot: {
      title: '绍兴文章',
      slug: 'shaoxing-post',
      content: '正文',
      excerpt: '摘要',
      tags: [{ id: 'tag-1', name: '绍兴', slug: 'shaoxing' }],
    },
    tags: [],
  };
  const moment = {
    id: 'm1',
    title: '私密地点瞬间',
    slug: 'private-moment',
    content: '内容',
    excerpt: null,
    status: 'published',
    happenedAt: new Date('2026-01-03T00:00:00Z'),
    publishedAt: new Date('2026-01-03T00:00:00Z'),
    locationVisibility: 'private',
    locationPrecision: 'exact',
    placeId: 'secret-place',
    place: {
      id: 'secret-place',
      name: '住宅',
      slug: 'home',
      latitude: 30,
      longitude: 120,
    },
    publishedSnapshot: {
      title: '私密地点瞬间',
      slug: 'private-moment',
      content: '内容',
      locationVisibility: 'private',
      locationPrecision: 'exact',
      place: { id: 'secret-place', name: '住宅', slug: 'home' },
    },
  };

  function setup() {
    const createdNodeIds: string[] = [];
    const createdRelationIds: string[] = [];
    const memoryNodeResults: unknown[][] = [];
    const memoryRelationResults: unknown[][] = [];
    const relationFindManyCalls: RelationFindManyArgs[] = [];
    const prismaDelegates = {
      post: { findMany: () => Promise.resolve([post]) },
      moment: { findMany: () => Promise.resolve([moment]) },
      album: { findMany: () => Promise.resolve([]) },
      libraryItem: { findMany: () => Promise.resolve([]) },
      journey: {
        findMany: () =>
          Promise.resolve([
            {
              id: 'j1',
              title: '私密停靠旅行',
              slug: 'private-journey',
              description: null,
              coverImage: null,
              happenedAt: new Date('2026-01-04T00:00:00Z'),
              endedAt: null,
              publishedAt: new Date('2026-01-04T00:00:00Z'),
              stops: [
                {
                  id: 's1',
                  sort: 0,
                  title: '第一站',
                  placeId: 'secret-place',
                  locationVisibility: 'private',
                  place: moment.place,
                },
              ],
            },
          ]),
      },
      storyRoute: { findMany: () => Promise.resolve([]) },
      memoryNode: {
        deleteMany: () => Promise.resolve({ count: 0 }),
        upsert: (args: UpsertArgs) => {
          createdNodeIds.push(args.create.id);
          return Promise.resolve({});
        },
        findMany: () => Promise.resolve(memoryNodeResults.shift() ?? []),
      },
      memoryRelation: {
        deleteMany: () => Promise.resolve({ count: 0 }),
        upsert: (args: UpsertArgs) => {
          createdRelationIds.push(args.create.id);
          return Promise.resolve({});
        },
        findMany: (args: RelationFindManyArgs) => {
          relationFindManyCalls.push(args);
          return Promise.resolve(memoryRelationResults.shift() ?? []);
        },
      },
    };
    const transaction = (
      callback: (tx: typeof prismaDelegates) => Promise<unknown>,
    ) => callback(prismaDelegates);
    const prisma = {
      ...prismaDelegates,
      $transaction: transaction,
    };
    const redis = {
      invalidateHttpCache: jest.fn().mockResolvedValue(undefined),
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
    };
    return {
      createdNodeIds,
      createdRelationIds,
      memoryNodeResults,
      memoryRelationResults,
      relationFindManyCalls,
      service: new MemoryGraphService(
        prisma as unknown as PrismaService,
        redis as unknown as RedisService,
      ),
    };
  }

  it('rebuilds idempotently with stable IDs and excludes private place nodes', async () => {
    const { service, createdNodeIds, createdRelationIds } = setup();
    const first = await service.rebuild();
    const second = await service.rebuild();

    expect(first).toEqual(second);
    expect(first.nodes).toBe(3);
    expect(createdNodeIds).toEqual([
      'post:p1',
      'moment:m1',
      'journey:j1',
      'post:p1',
      'moment:m1',
      'journey:j1',
    ]);
    expect(createdNodeIds).not.toContain('place:secret-place');
    expect(createdRelationIds.slice(0, 2)).toEqual(
      createdRelationIds.slice(2, 4),
    );
  });

  it('returns only active visible relations and a stable coordinate version', async () => {
    const {
      service,
      memoryNodeResults,
      memoryRelationResults,
      relationFindManyCalls,
    } = setup();
    memoryNodeResults.push(
      [{ id: 'post:p1', contentHash: 'hash' }],
      [{ id: 'post:p1', type: 'post', title: '绍兴文章', coordinateSeed: 42 }],
    );
    memoryRelationResults.push([{ id: 'edge', weight: 0.8 }], []);

    const result = await service.graph({ limit: 10 });
    expect(result.coordinateVersion).toBe(1);
    expect(result.nodes[0]).toMatchObject({
      id: 'post:p1',
      coordinateSeed: 42,
    });
    expect(relationFindManyCalls[1].where).toMatchObject({
      hidden: false,
      status: 'active',
    });
  });
});

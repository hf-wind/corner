import { PostService } from './post.service';

describe('PostService view counting', () => {
  const post = {
    id: 'post-id',
    title: 'Post',
    slug: 'post',
    content: '',
    excerpt: null,
    coverImage: null,
    authorId: 'author-id',
    categoryId: null,
    status: 'published',
    viewCount: 7,
    likeCount: 0,
    featured: false,
    needsPublish: false,
    publishedSnapshot: null,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { id: 'author-id', username: 'admin', avatar: null },
    category: null,
    tags: [],
    _count: { comments: 0 },
  };

  function createService(visitCreate: jest.Mock) {
    const prisma = {
      post: {
        findFirst: jest.fn().mockResolvedValue(post),
        update: jest.fn().mockResolvedValue(undefined),
      },
      visitStat: { create: visitCreate },
    } as any;
    prisma.$transaction = jest.fn((callback: (client: any) => unknown) =>
      callback(prisma),
    );
    return { service: new PostService(prisma), prisma };
  }

  it('increments only after a new daily visitor record is created', async () => {
    const { service, prisma } = createService(
      jest.fn().mockResolvedValue({ id: 'visit-id' }),
    );
    const result = await service.findBySlug('post', {
      ip: '203.0.113.2',
      userAgent: 'Mozilla/5.0',
    });
    expect(result.viewCount).toBe(8);
    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });
  });

  it('does not increment a duplicate daily visit', async () => {
    const duplicate = Object.assign(new Error('duplicate'), { code: 'P2002' });
    const { service, prisma } = createService(
      jest.fn().mockRejectedValue(duplicate),
    );
    const result = await service.findBySlug('post', {
      ip: '203.0.113.2',
      userAgent: 'Mozilla/5.0',
    });
    expect(result.viewCount).toBe(7);
    expect(prisma.post.update).not.toHaveBeenCalled();
  });

  it('does not count crawlers', async () => {
    const { service, prisma } = createService(jest.fn());
    const result = await service.findBySlug('post', {
      ip: '203.0.113.2',
      userAgent: 'Googlebot/2.1',
    });
    expect(result.viewCount).toBe(7);
    expect(prisma.visitStat.create).not.toHaveBeenCalled();
  });
});

describe('PostService article cleanup', () => {
  it('removes every post-owned record in one transaction before deleting the post', async () => {
    const tx = {
      commentLike: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      comment: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      postTag: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
      visitStat: { deleteMany: jest.fn().mockResolvedValue({ count: 4 }) },
      emailLog: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      post: { delete: jest.fn().mockResolvedValue({ id: 'post-id' }) },
    };
    const prisma = {
      post: { findUnique: jest.fn().mockResolvedValue({ id: 'post-id' }) },
      $transaction: jest.fn((callback: (client: any) => unknown) =>
        callback(tx),
      ),
    } as any;
    const media = {
      removeFolder: jest.fn().mockResolvedValue(undefined),
    } as any;
    const memoryGraph = { scheduleRebuild: jest.fn() } as any;
    const service = new PostService(prisma, media, memoryGraph);

    await service.remove('post');

    expect(tx.commentLike.deleteMany).toHaveBeenCalledWith({
      where: { comment: { postId: 'post-id' } },
    });
    expect(tx.comment.deleteMany).toHaveBeenCalledWith({
      where: { postId: 'post-id' },
    });
    expect(tx.postTag.deleteMany).toHaveBeenCalledWith({
      where: { postId: 'post-id' },
    });
    expect(tx.visitStat.deleteMany).toHaveBeenCalledWith({
      where: { postId: 'post-id' },
    });
    expect(tx.emailLog.deleteMany).toHaveBeenCalledWith({
      where: { postId: 'post-id' },
    });
    expect(tx.post.delete).toHaveBeenCalledWith({ where: { id: 'post-id' } });
    expect(media.removeFolder).toHaveBeenCalledWith('article/post-id');
    expect(memoryGraph.scheduleRebuild).toHaveBeenCalledTimes(1);
  });

  it('counts only approved comments in public article queries', async () => {
    const prisma = {
      post: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn() },
    } as any;
    const service = new PostService(prisma);

    await service.findAll({});

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          _count: { select: { comments: { where: { status: 'approved' } } } },
        }),
      }),
    );
  });
});

describe('PostService published versions', () => {
  const publishable = {
    id: 'post-id',
    title: 'Draft title',
    slug: 'draft-title',
    content: 'draft content',
    excerpt: null,
    coverImage: null,
    authorId: 'author-id',
    categoryId: null,
    status: 'draft',
    viewCount: 0,
    likeCount: 0,
    featured: false,
    needsPublish: true,
    publishedSnapshot: null,
    scheduledAt: null,
    occurredAt: null,
    placeId: null,
    locationVisibility: 'private',
    locationPrecision: 'place',
    locationSource: null,
    locationExactConfirmedAt: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { id: 'author-id', username: 'admin', avatar: null },
    category: null,
    place: null,
    tags: [],
    _count: { comments: 0 },
  };

  it('creates exactly one snapshot when publishing', async () => {
    const published = {
      ...publishable,
      status: 'published',
      needsPublish: false,
      publishedAt: new Date(),
    };
    const tx = {
      post: { update: jest.fn().mockResolvedValue(published) },
      postVersion: {
        findFirst: jest.fn().mockResolvedValue({ version: 2 }),
        create: jest.fn().mockResolvedValue({ id: 'version-id' }),
      },
    };
    const prisma = {
      post: { findUnique: jest.fn().mockResolvedValue(publishable) },
      $transaction: jest.fn((callback: (client: any) => unknown) =>
        callback(tx),
      ),
    } as any;
    const service = new PostService(prisma);

    await service.publish('draft-title', 'admin-id');

    expect(tx.postVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        postId: 'post-id',
        version: 3,
        source: 'publish',
        createdById: 'admin-id',
      }),
    });
    expect(tx.postVersion.create).toHaveBeenCalledTimes(1);
  });

  it('does not create a snapshot when only saving a draft', async () => {
    const prisma = {
      post: {
        findUnique: jest.fn().mockResolvedValue(publishable),
        update: jest.fn().mockResolvedValue(publishable),
      },
      postTag: { deleteMany: jest.fn() },
      $transaction: jest.fn((callback: (client: any) => unknown) =>
        callback({
          post: { update: jest.fn().mockResolvedValue(publishable) },
          postTag: { deleteMany: jest.fn() },
        }),
      ),
      postVersion: { create: jest.fn() },
    } as any;
    const service = new PostService(prisma);

    await service.update('draft-title', { title: 'Saved draft' });

    expect(prisma.postVersion.create).not.toHaveBeenCalled();
  });
});

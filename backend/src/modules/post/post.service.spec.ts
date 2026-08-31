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

describe('PostService publication visibility', () => {
  it('marks a published article as unpublished and refreshes derived content', async () => {
    const unpublished = {
      id: 'post-id',
      slug: 'post',
      title: 'Post',
      content: 'content',
      excerpt: null,
      coverImage: null,
      authorId: 'author-id',
      categoryId: null,
      status: 'unpublished',
      viewCount: 0,
      likeCount: 0,
      featured: false,
      needsPublish: false,
      publishedSnapshot: null,
      scheduledAt: null,
      occurredAt: null,
      placeId: null,
      locationVisibility: 'private',
      locationPrecision: 'place',
      locationSource: null,
      locationExactConfirmedAt: null,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { id: 'author-id', username: 'admin', avatar: null },
      category: null,
      place: null,
      tags: [],
      _count: { comments: 0 },
    };
    const prisma = {
      post: {
        findUnique: jest.fn().mockResolvedValue({
          id: unpublished.id,
          authorId: unpublished.authorId,
          status: 'published',
        }),
        update: jest.fn().mockResolvedValue(unpublished),
      },
    } as any;
    const memoryGraph = { scheduleRebuild: jest.fn() } as any;
    const aiNative = { scheduleStyleRebuild: jest.fn() } as any;
    const service = new PostService(
      prisma,
      undefined,
      memoryGraph,
      aiNative,
    );

    const result = await service.unpublish(unpublished.slug);

    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: unpublished.id },
      data: { status: 'unpublished', scheduledAt: null },
      select: expect.any(Object),
    });
    expect(result.status).toBe('unpublished');
    expect(memoryGraph.scheduleRebuild).toHaveBeenCalledTimes(1);
    expect(aiNative.scheduleStyleRebuild).toHaveBeenCalledWith('author-id');
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

  it('schedules a style refresh when a new article contains more than 20 characters', async () => {
    const created = {
      ...publishable,
      content: '这是一段超过二十个字并且应该触发文风画像更新的新增文章正文。',
    };
    const tx = { post: { create: jest.fn().mockResolvedValue(created) } };
    const prisma = {
      post: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback: (client: any) => unknown) =>
        callback(tx),
      ),
    } as any;
    const aiNative = { scheduleStyleRebuild: jest.fn() } as any;
    const service = new PostService(
      prisma,
      undefined,
      undefined,
      aiNative,
    );

    await service.create(
      {
        title: created.title,
        slug: created.slug,
        content: created.content,
      },
      created.authorId,
    );

    expect(aiNative.scheduleStyleRebuild).toHaveBeenCalledWith(
      created.authorId,
    );
  });

  it('schedules a style refresh only when an edit changes more than 20 characters', async () => {
    const content = `${publishable.content}${'新增文字'.repeat(6)}`;
    const updated = { ...publishable, content };
    const tx = {
      post: {
        update: jest
          .fn()
          .mockResolvedValueOnce(updated)
          .mockResolvedValueOnce(updated),
      },
      postTag: { deleteMany: jest.fn() },
    };
    const prisma = {
      post: { findUnique: jest.fn().mockResolvedValue(publishable) },
      $transaction: jest.fn((callback: (client: any) => unknown) =>
        callback(tx),
      ),
    } as any;
    const aiNative = { scheduleStyleRebuild: jest.fn() } as any;
    const service = new PostService(
      prisma,
      undefined,
      undefined,
      aiNative,
    );

    await service.update(publishable.slug, { content });

    expect(aiNative.scheduleStyleRebuild).toHaveBeenCalledWith(
      publishable.authorId,
    );
  });

  it('does not refresh the style profile when an article edit changes 20 characters or fewer', async () => {
    const content = `${publishable.content}不超过二十字`;
    const updated = { ...publishable, content };
    const tx = {
      post: {
        update: jest
          .fn()
          .mockResolvedValueOnce(updated)
          .mockResolvedValueOnce(updated),
      },
      postTag: { deleteMany: jest.fn() },
    };
    const prisma = {
      post: { findUnique: jest.fn().mockResolvedValue(publishable) },
      $transaction: jest.fn((callback: (client: any) => unknown) =>
        callback(tx),
      ),
    } as any;
    const aiNative = { scheduleStyleRebuild: jest.fn() } as any;
    const service = new PostService(
      prisma,
      undefined,
      undefined,
      aiNative,
    );

    await service.update(publishable.slug, { content });

    expect(aiNative.scheduleStyleRebuild).not.toHaveBeenCalled();
  });

  it('publishes and preserves the current draft before restoring an old version', async () => {
    const existing = { ...publishable, status: 'published', needsPublish: true };
    const restoredSnapshot = {
      title: 'Old title',
      slug: 'old-title',
      content: 'old content',
      excerpt: 'old excerpt',
      coverImage: null,
      featured: false,
      occurredAt: null,
      place: null,
      locationVisibility: 'private',
      locationPrecision: 'place',
      locationSource: null,
      locationExactConfirmedAt: null,
      category: null,
      tags: [],
    };
    const restored = {
      ...existing,
      title: restoredSnapshot.title,
      slug: restoredSnapshot.slug,
      content: restoredSnapshot.content,
      status: 'draft',
      needsPublish: true,
    };
    const tx = {
      post: {
        update: jest
          .fn()
          .mockResolvedValueOnce({ ...existing, needsPublish: false })
          .mockResolvedValueOnce(restored),
      },
      postVersion: {
        findFirst: jest.fn().mockResolvedValue({ version: 3 }),
        create: jest.fn().mockResolvedValue({ id: 'preserved-version' }),
      },
      category: { findUnique: jest.fn() },
      place: { findUnique: jest.fn() },
      tag: { findMany: jest.fn().mockResolvedValue([]) },
      postTag: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const prisma = {
      post: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce(null),
      },
      postVersion: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'version-id',
          postId: existing.id,
          snapshot: restoredSnapshot,
        }),
      },
      $transaction: jest.fn((callback: (client: any) => unknown) =>
        callback(tx),
      ),
    } as any;
    const service = new PostService(prisma);

    const result = await service.restoreVersion(
      existing.slug,
      'version-id',
      'admin-id',
    );

    expect(tx.postVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        postId: existing.id,
        source: 'draft-preserve',
        createdById: 'admin-id',
      }),
    });
    expect(tx.post.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: existing.id },
        data: expect.objectContaining({ status: 'published', needsPublish: false }),
      }),
    );
    expect(tx.post.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: existing.id },
        data: expect.objectContaining({
          title: 'Old title',
          status: 'draft',
          needsPublish: true,
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ title: 'Old title' }));
  });
});

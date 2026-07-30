import { PostService } from './post.service';

describe('PostService view counting', () => {
  const post = {
    id: 'post-id', title: 'Post', slug: 'post', content: '', excerpt: null,
    coverImage: null, authorId: 'author-id', categoryId: null, status: 'published',
    viewCount: 7, likeCount: 0, featured: false, needsPublish: false,
    publishedSnapshot: null, publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    author: { id: 'author-id', username: 'admin', avatar: null }, category: null, tags: [],
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
    prisma.$transaction = jest.fn((callback: (client: any) => unknown) => callback(prisma));
    return { service: new PostService(prisma), prisma };
  }

  it('increments only after a new daily visitor record is created', async () => {
    const { service, prisma } = createService(jest.fn().mockResolvedValue({ id: 'visit-id' }));
    const result = await service.findBySlug('post', { ip: '203.0.113.2', userAgent: 'Mozilla/5.0' });
    expect(result.viewCount).toBe(8);
    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: post.id }, data: { viewCount: { increment: 1 } },
    });
  });

  it('does not increment a duplicate daily visit', async () => {
    const duplicate = Object.assign(new Error('duplicate'), { code: 'P2002' });
    const { service, prisma } = createService(jest.fn().mockRejectedValue(duplicate));
    const result = await service.findBySlug('post', { ip: '203.0.113.2', userAgent: 'Mozilla/5.0' });
    expect(result.viewCount).toBe(7);
    expect(prisma.post.update).not.toHaveBeenCalled();
  });

  it('does not count crawlers', async () => {
    const { service, prisma } = createService(jest.fn());
    const result = await service.findBySlug('post', { ip: '203.0.113.2', userAgent: 'Googlebot/2.1' });
    expect(result.viewCount).toBe(7);
    expect(prisma.visitStat.create).not.toHaveBeenCalled();
  });
});

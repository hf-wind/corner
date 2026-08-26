import { RssService } from './rss.service';

describe('RssService', () => {
  it('renders published posts and moments as a root RSS feed', async () => {
    const prisma = {
      post: {
        findMany: jest.fn().mockResolvedValue([
          {
            title: '工作标题',
            slug: 'draft-slug',
            excerpt: null,
            content: '草稿',
            coverImage: '/uploads/cover.webp',
            author: { username: 'huifeng' },
            category: { name: '技术' },
            tags: [{ tag: { name: 'Cloudflare' } }],
            publishedSnapshot: {
              title: '公开标题',
              slug: 'public-slug',
              excerpt: '公开摘要',
              content: '公开正文',
            },
            publishedAt: new Date('2026-07-30T00:00:00Z'),
            updatedAt: new Date('2026-07-30T00:00:00Z'),
          },
        ]),
      },
      moment: {
        findMany: jest.fn().mockResolvedValue([
          {
            title: '瞬间 & 风',
            slug: 'moment-1',
            excerpt: '今天很好',
            content: '',
            author: { username: 'huifeng' },
            publishedSnapshot: null,
            publishedAt: new Date('2026-07-29T00:00:00Z'),
            updatedAt: new Date('2026-07-29T00:00:00Z'),
          },
        ]),
      },
    } as any;
    const settings = {
      get: jest.fn((key: string) =>
        Promise.resolve(
          (
            {
              site_title: '风隅随笔',
              site_description: '听风',
              site_url: 'https://corner.ink/',
            } as any
          )[key],
        ),
      ),
    } as any;
    const xml = await new RssService(prisma, settings).render();

    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<title><![CDATA[公开标题]]></title>');
    expect(xml).toContain('https://corner.ink/article/public-slug');
    expect(xml).toContain('<title><![CDATA[瞬间 & 风]]></title>');
    expect(xml).toContain('href="https://corner.ink/rss.xml"');
    expect(xml).toContain(
      'xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    );
    expect(xml).toContain('<dc:creator><![CDATA[huifeng]]></dc:creator>');
    expect(xml).toContain('<category><![CDATA[技术]]></category>');
    expect(xml).toContain('url="https://corner.ink/uploads/cover.webp"');
    expect(xml).toContain(
      '<content:encoded><![CDATA[<p>公开摘要</p>]]></content:encoded>',
    );
    expect(xml.split('\n').length).toBeGreaterThan(20);
  });
});

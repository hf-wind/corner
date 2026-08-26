import { CircleService } from './circle.service';

function settingsWithFriends(friends: Record<string, unknown>[]) {
  return {
    get: jest.fn((key: string) => {
      if (key === 'friends') return Promise.resolve(friends);
      if (key === 'circle_config') {
        return Promise.resolve({ maxItems: 36, cacheTtl: 600 });
      }
      return Promise.resolve(null);
    }),
    set: jest.fn(),
  } as any;
}

describe('CircleService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('aggregates RSS items from configured friends and reuses the cache', async () => {
    const settings = settingsWithFriends([
      {
        name: '朋友站点',
        url: 'https://friend.example',
        rssUrl: 'https://93.184.216.34/feed.xml',
        enabled: true,
      },
    ]);
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        `<?xml version="1.0"?><rss><channel><item>
          <title><![CDATA[一篇新文章]]></title>
          <link>https://friend.example/posts/1</link>
          <guid>post-1</guid>
          <pubDate>Tue, 25 Aug 2026 08:00:00 GMT</pubDate>
          <description><![CDATA[<p>文章摘要</p><img src="/cover.webp" />]]></description>
          <category>随笔</category>
        </item></channel></rss>`,
        {
          status: 200,
          headers: { 'content-type': 'application/rss+xml' },
        },
      ),
    );
    const service = new CircleService(settings);

    const first = await service.getFeed();
    const second = await service.getFeed();

    expect(first.items).toHaveLength(1);
    expect(first.items[0]).toMatchObject({
      title: '一篇新文章',
      summary: '文章摘要',
      url: 'https://friend.example/posts/1',
      image: 'https://friend.example/cover.webp',
      categories: ['随笔'],
    });
    expect(second.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('blocks private RSS targets before making a request', async () => {
    const settings = settingsWithFriends([
      {
        name: '本地地址',
        url: 'https://friend.example',
        rssUrl: 'http://127.0.0.1:3000/rss.xml',
      },
    ]);
    const fetchMock = jest.spyOn(global, 'fetch');
    const service = new CircleService(settings);
    jest.spyOn((service as any).logger, 'warn').mockImplementation();

    const result = await service.getFeed();

    expect(result.items).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates every redirect and refuses a redirect into a private network', async () => {
    const settings = settingsWithFriends([
      {
        name: '跳转站点',
        url: 'https://friend.example',
        rssUrl: 'https://93.184.216.34/feed.xml',
      },
    ]);
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data' },
      }),
    );
    const service = new CircleService(settings);
    jest.spyOn((service as any).logger, 'warn').mockImplementation();

    const result = await service.getFeed();

    expect(result.items).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a feed whose declared response size exceeds the limit', async () => {
    const settings = settingsWithFriends([
      {
        name: '超大订阅',
        url: 'https://friend.example',
        rssUrl: 'https://93.184.216.34/feed.xml',
      },
    ]);
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('<rss />', {
        status: 200,
        headers: { 'content-length': '2000001' },
      }),
    );
    const service = new CircleService(settings);

    const result = await service.getFeed();

    expect(result.items).toEqual([]);
  });
});

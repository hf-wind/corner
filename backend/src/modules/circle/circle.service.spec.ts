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

  it('refreshes RSS after a friend with a new feed is added', async () => {
    const friends = [
      { name: '旧来源', url: 'https://old.example', rssUrl: 'https://93.184.216.34/old.xml' },
    ];
    const settings = settingsWithFriends(friends);
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('<rss><channel><item><title>旧文章</title><link>https://old.example/1</link></item></channel></rss>', { status: 200 }))
      .mockResolvedValueOnce(new Response('<rss><channel><item><title>旧文章</title><link>https://old.example/1</link></item></channel></rss>', { status: 200 }))
      .mockResolvedValueOnce(new Response('<rss><channel><item><title>新文章</title><link>https://new.example/1</link></item></channel></rss>', { status: 200 }));
    const service = new CircleService(settings);

    await service.getFeed();
    friends.push({ name: '新来源', url: 'https://new.example', rssUrl: 'https://93.184.216.35/new.xml' });
    const refreshed = await service.getFeed();

    expect(refreshed.items.map((item) => item.title).sort()).toEqual(['新文章', '旧文章']);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('prefers explicit circle subscriptions over the legacy friends setting', async () => {
    const settings = settingsWithFriends([]);
    settings.get.mockImplementation((key: string) => {
      if (key === 'circle_config') {
        return Promise.resolve({
          maxItems: 36,
          cacheTtl: 600,
          subscriptions: [{ name: '阮一峰', url: 'https://www.ruanyifeng.com/blog', rssUrl: 'https://93.184.216.34/atom.xml', enabled: true }],
        });
      }
      return Promise.resolve(null);
    });
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('<feed><entry><title>科技爱好者周刊</title><link href="https://www.ruanyifeng.com/blog/1"/><updated>Tue, 25 Aug 2026 08:00:00 GMT</updated></entry></feed>', { status: 200 }),
    );
    const service = new CircleService(settings);
    const result = await service.getFeed();
    expect(result.items[0]).toMatchObject({ title: '科技爱好者周刊', source: { name: '阮一峰' } });
    expect(settings.get).toHaveBeenCalledWith('circle_config');
    expect(settings.get).toHaveBeenCalledWith('friends');
  });

  it('adds newly linked RSS sources without overriding explicit subscriptions', async () => {
    const settings = settingsWithFriends([
      {
        name: '新友链',
        url: 'https://new.example',
        rssUrl: 'https://new.example/rss.xml',
      },
      {
        name: '手工订阅的友链',
        url: 'https://friend.example',
        rssUrl: 'https://friend.example/rss.xml',
      },
    ]);
    settings.get.mockImplementation((key: string) => {
      if (key === 'friends') return Promise.resolve([
        {
          name: '新友链',
          url: 'https://new.example',
          rssUrl: 'https://new.example/rss.xml',
        },
        {
          name: '手工订阅的友链',
          url: 'https://friend.example',
          rssUrl: 'https://friend.example/rss.xml',
        },
      ]);
      if (key === 'circle_config') {
        return Promise.resolve({
          subscriptions: [
            {
              name: '自定义名称',
              url: 'https://friend.example',
              rssUrl: 'https://friend.example/rss.xml',
            },
          ],
        });
      }
      return Promise.resolve(null);
    });
    const service = new CircleService(settings);
    const config = await service.getConfig();

    expect(config.subscriptions).toHaveLength(2);
    expect(config.subscriptions.map((item) => item.name)).toEqual([
      '自定义名称',
      '新友链',
    ]);
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

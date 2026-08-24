import { HttpCacheInterceptor } from './http-cache.interceptor';

describe('HttpCacheInterceptor cache boundaries', () => {
  const interceptor = new HttpCacheInterceptor({} as never);
  const isCacheable = (request: Record<string, unknown>) =>
    (interceptor as any).isCacheable({
      headers: {},
      query: {},
      ...request,
    });

  it('keeps anonymous public JSON GETs cacheable', () => {
    expect(isCacheable({ path: '/posts?page=1' })).toBe(true);
  });

  it.each([
    ['/visitor/new-id', {}],
    ['/visitor/me', { 'x-visitor-id': 'visitor-12345678' }],
    ['/visitor/bottles/quota', { 'x-visitor-id': 'visitor-12345678' }],
    ['/ai/chat/history', { 'x-ai-guest-id': 'guest-1234567890123456' }],
    ['/ai/personalized', { 'x-ai-guest-id': 'guest-1234567890123456' }],
    ['/music/proxy', {}],
    ['/emoji-packs/asset', {}],
    ['/stories/demo/share-cover.png', {}],
  ])('bypasses %s', (path, headers) => {
    expect(isCacheable({ path, headers })).toBe(false);
  });

  it('bypasses authenticated and cookie-bearing requests', () => {
    expect(
      isCacheable({
        path: '/posts',
        headers: { authorization: 'Bearer token' },
      }),
    ).toBe(false);
    expect(isCacheable({ path: '/posts', headers: { cookie: 'session=1' } })).toBe(
      false,
    );
  });
});

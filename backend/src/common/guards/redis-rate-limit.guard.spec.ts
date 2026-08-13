import { ExecutionContext, HttpException } from '@nestjs/common';
import { RedisRateLimitGuard } from './redis-rate-limit.guard';

function contextFor(
  path: string,
  method = 'GET',
  body: Record<string, unknown> = {},
) {
  const headers: Record<string, string> = {};
  const request = {
    path,
    method,
    body,
    query: {},
    ip: '203.0.113.10',
    socket: {},
  };
  const response = {
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
  };
  return {
    context: {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ExecutionContext,
    headers,
  };
}

describe('RedisRateLimitGuard', () => {
  it('applies both IP and email limits to login', async () => {
    const evalMock = jest.fn().mockResolvedValue([1, 600]);
    const redis = { client: { eval: evalMock } } as any;
    const guard = new RedisRateLimitGuard(redis);
    const { context, headers } = contextFor('/api/auth/login', 'POST', {
      email: 'User@Example.com',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(evalMock).toHaveBeenCalledTimes(3);
    expect(headers['RateLimit-Remaining']).toBe('7');
  });

  it('returns 429 with Retry-After after a limit is exceeded', async () => {
    const redis = {
      client: { eval: jest.fn().mockResolvedValue([241, 42]) },
    } as any;
    const guard = new RedisRateLimitGuard(redis);
    const { context, headers } = contextFor('/api/posts');

    await expect(
      guard.canActivate(context),
    ).rejects.toMatchObject<HttpException>({ status: 429 });
    expect(headers['Retry-After']).toBe('42');
  });

  it('limits friend-link removal verification by IP and email', async () => {
    const evalMock = jest.fn().mockResolvedValue([1, 600]);
    const redis = { client: { eval: evalMock } } as any;
    const guard = new RedisRateLimitGuard(redis);
    const { context, headers } = contextFor(
      '/api/friend-link/remove/verify',
      'POST',
      {
        email: 'owner@example.com',
      },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(evalMock).toHaveBeenCalledTimes(3);
    expect(headers['RateLimit-Limit']).toBe('8');
  });

  it('does not block requests when Redis is temporarily unavailable', async () => {
    const redis = {
      client: { eval: jest.fn().mockRejectedValue(new Error('offline')) },
    } as any;
    const guard = new RedisRateLimitGuard(redis);
    const { context } = contextFor('/api/posts');
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});

import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { TurnstileService } from './turnstile.service';

describe('TurnstileService', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('skips verification outside production', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.TURNSTILE_ENABLED;
    global.fetch = jest.fn() as any;
    await expect(new TurnstileService().verify(undefined, '127.0.0.1')).resolves.toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('skips verification when explicitly disabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TURNSTILE_ENABLED = 'false';
    global.fetch = jest.fn() as any;
    await expect(new TurnstileService().verify(undefined, '127.0.0.1')).resolves.toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('can be enabled explicitly outside production', async () => {
    process.env.NODE_ENV = 'development';
    process.env.TURNSTILE_ENABLED = 'true';
    delete process.env.TURNSTILE_SECRET_KEY;
    await expect(new TurnstileService().verify('token')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails closed when the production secret is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.TURNSTILE_SECRET_KEY;
    await expect(new TurnstileService().verify('token')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('accepts a successful response for the configured hostname', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    process.env.TURNSTILE_HOSTNAME = 'corner.ink';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, hostname: 'corner.ink' }),
    }) as any;
    await expect(new TurnstileService().verify('token', '203.0.113.1')).resolves.toBeUndefined();
  });

  it('rejects an invalid token or hostname', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    process.env.TURNSTILE_HOSTNAME = 'corner.ink';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, hostname: 'example.com', 'error-codes': ['invalid-input-response'] }),
    }) as any;
    await expect(new TurnstileService().verify('bad-token')).rejects.toBeInstanceOf(BadRequestException);
  });
});

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASS || undefined,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      retryStrategy: (attempt) => Math.min(attempt * 200, 3000),
    });
    this.client.on('error', (error) =>
      this.logger.error(`Redis connection error: ${error.message}`),
    );
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      await this.client.del(key);
      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    const jitter = Math.floor(
      Math.random() * Math.max(2, Math.floor(ttlSeconds * 0.1)),
    );
    await this.client.set(
      key,
      JSON.stringify(value),
      'EX',
      ttlSeconds + jitter,
    );
  }

  async cacheVersion(): Promise<string> {
    const key = 'corner:http-cache:version';
    const version = await this.client.get(key);
    if (version) return version;
    await this.client.set(key, '1', 'NX');
    return (await this.client.get(key)) || '1';
  }

  async invalidateHttpCache(): Promise<void> {
    await this.client.incr('corner:http-cache:version');
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => this.client.disconnect());
  }
}

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;
  private available = true;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASS || undefined,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      retryStrategy: (attempt) => Math.min(attempt * 200, 3000),
    });
    this.client.on('error', (error) => { this.available = false; this.logger.warn(`Redis unavailable: ${error.message}`); });
    this.client.on('ready', () => { this.available = true; });
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.available) return null;
    let raw: string | null;
    try { raw = await this.client.get(key); } catch { this.available = false; return null; }
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      await this.client.del(key).catch(() => undefined);
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
    if (!this.available) return;
    try { await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds + jitter); } catch { this.available = false; }
  }

  async cacheVersion(): Promise<string> {
    if (!this.available) return '1';
    const key = 'corner:http-cache:version';
    try {
      const version = await this.client.get(key);
      if (version) return version;
      await this.client.set(key, '1', 'NX');
      return (await this.client.get(key)) || '1';
    } catch {
      this.available = false;
      return '1';
    }
  }

  async invalidateHttpCache(): Promise<void> {
    if (!this.available) return;
    try { await this.client.incr('corner:http-cache:version'); } catch { this.available = false; }
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => this.client.disconnect());
  }
}

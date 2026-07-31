import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

type WeatherSnapshot = {
  temperature: number;
  feelsLike: number;
  condition: string;
  icon: string;
  city: string;
  humidity: number;
  windDirection: string;
  windScale: string;
  observedAt: string;
  updatedAt: string;
  stale?: boolean;
};

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly cacheKey = 'corner:weather:shaoxing:now';
  private readonly staleCacheKey = `${this.cacheKey}:stale`;
  private memoryCache: WeatherSnapshot | null = null;
  private memoryExpiresAt = 0;

  constructor(private readonly redis: RedisService) {}

  async getWeather(): Promise<WeatherSnapshot> {
    if (this.memoryCache && Date.now() < this.memoryExpiresAt) return this.memoryCache;

    const cached = await this.withCacheDeadline(
      this.redis.getJson<WeatherSnapshot>(this.cacheKey),
      null,
    );
    if (cached) {
      this.remember(cached);
      return cached;
    }

    try {
      const snapshot = await this.fetchQWeather();
      this.remember(snapshot);
      await this.withCacheDeadline(Promise.all([
        this.redis.setJson(this.cacheKey, snapshot, 15 * 60),
        this.redis.setJson(this.staleCacheKey, snapshot, 24 * 60 * 60),
      ]), undefined);
      return snapshot;
    } catch (error) {
      this.logger.warn(`和风天气请求失败: ${(error as Error).message}`);
      const stale = await this.withCacheDeadline(
        this.redis.getJson<WeatherSnapshot>(this.staleCacheKey),
        null,
      );
      if (stale) return { ...stale, stale: true };
      if (this.memoryCache) return { ...this.memoryCache, stale: true };
      throw new ServiceUnavailableException('天气暂时躲进云后了');
    }
  }

  private remember(snapshot: WeatherSnapshot) {
    this.memoryCache = snapshot;
    this.memoryExpiresAt = Date.now() + 5 * 60 * 1000;
  }

  private async withCacheDeadline<T>(operation: Promise<T>, fallback: T): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve(fallback), 600);
        }),
      ]);
    } catch (error) {
      this.logger.warn(`天气缓存暂不可用: ${(error as Error).message}`);
      return fallback;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async fetchQWeather(): Promise<WeatherSnapshot> {
    const apiKey = String(process.env.QWEATHER_KEY || process.env.QWETHER_KEY || process.env.WEATHER_API_KEY || '').trim();
    const host = String(process.env.QWEATHER_HOST || process.env.QWETHER_HOST || 'devapi.qweather.com')
      .trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const location = String(process.env.QWEATHER_LOCATION || '101210501').trim();
    if (!apiKey) throw new Error('QWEATHER_KEY 未配置');

    const response = await fetch(`https://${host}/v7/weather/now?location=${encodeURIComponent(location)}&lang=zh`, {
      headers: { 'X-QW-Api-Key': apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`QWeather HTTP ${response.status}`);
    const payload = await response.json() as { code?: string; updateTime?: string; now?: Record<string, string> };
    if (payload.code !== '200' || !payload.now) throw new Error(`QWeather code ${payload.code || 'unknown'}`);
    const now = payload.now;
    return {
      temperature: Number(now.temp),
      feelsLike: Number(now.feelsLike),
      condition: now.text || '未知',
      icon: now.icon || '999',
      city: '绍兴',
      humidity: Number(now.humidity),
      windDirection: now.windDir || '微风',
      windScale: now.windScale || '0',
      observedAt: now.obsTime || payload.updateTime || new Date().toISOString(),
      updatedAt: payload.updateTime || new Date().toISOString(),
    };
  }
}

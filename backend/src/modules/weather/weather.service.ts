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
      const snapshot = await this.fetchOpenMeteo();
      this.remember(snapshot);
      await this.withCacheDeadline(Promise.all([
        this.redis.setJson(this.cacheKey, snapshot, 15 * 60),
        this.redis.setJson(this.staleCacheKey, snapshot, 24 * 60 * 60),
      ]), undefined);
      return snapshot;
    } catch (error) {
      this.logger.warn(`Open-Meteo 请求失败: ${(error as Error).message}`);
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

  private async fetchOpenMeteo(): Promise<WeatherSnapshot> {
    const latitude = String(process.env.WEATHER_LATITUDE || '30.0024').trim();
    const longitude = String(process.env.WEATHER_LONGITUDE || '120.5781').trim();
    const city = String(process.env.WEATHER_CITY || '绍兴').trim();
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${encodeURIComponent(latitude)}` +
      `&longitude=${encodeURIComponent(longitude)}` +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m' +
      '&timezone=auto&forecast_days=1';

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
    const payload = (await response.json()) as {
      current?: Record<string, number | string>;
      current_units?: Record<string, string>;
    };
    const now = payload.current;
    if (!now || now.weather_code === undefined) {
      throw new Error('Open-Meteo 返回数据不完整');
    }
    const code = Number(now.weather_code);
    const windKmh = Number(now.wind_speed_10m) || 0;
    return {
      temperature: Math.round(Number(now.temperature_2m)),
      feelsLike: Math.round(Number(now.apparent_temperature)),
      condition: wmoCondition(code),
      icon: String(code),
      city,
      humidity: Math.round(Number(now.relative_humidity_2m)),
      windDirection: windDirectionLabel(Number(now.wind_direction_10m)),
      windScale: beaufortScale(windKmh),
      observedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

const WMO_CONDITIONS: Record<number, string> = {
  0: '晴',
  1: '基本晴',
  2: '多云',
  3: '阴',
  45: '雾',
  48: '冻雾',
  51: '毛毛雨',
  53: '毛毛雨',
  55: '浓毛毛雨',
  56: '冻毛毛雨',
  57: '冻毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  66: '冻雨',
  67: '冻雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '米雪',
  80: '小阵雨',
  81: '阵雨',
  82: '强阵雨',
  85: '小阵雪',
  86: '强阵雪',
  95: '雷阵雨',
  96: '雷阵雨伴冰雹',
  99: '强雷暴',
};

function wmoCondition(code: number): string {
  return WMO_CONDITIONS[code] ?? '天气多变';
}

function windDirectionLabel(degrees: number): string {
  const sectors = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];
  const index = Math.round(((degrees % 360) + 360) % 360 / 45) % 8;
  return sectors[index];
}

function beaufortScale(kmh: number): string {
  const table = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  let level = 0;
  for (let i = 0; i < table.length; i++) {
    if (kmh >= table[i]) level = i + 1;
  }
  return `${level}级`;
}

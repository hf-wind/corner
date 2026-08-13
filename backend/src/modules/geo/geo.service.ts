import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

export type GeoInfo = {
  country: string;
  regionName: string;
  city: string;
  label: string;
} | null;

const GEO_CACHE_TTL = 7 * 24 * 3600;
const GEO_RATE_LIMIT_PER_MINUTE = 30;
const NEGATIVE_CACHE_MARKER = 'null' as const;

function isPrivateIp(ip: string): boolean {
  if (
    !ip ||
    ip === '::1' ||
    ip.startsWith('fc00:') ||
    ip.startsWith('fd00:') ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('169.254.')
  ) {
    return true;
  }
  if (ip.startsWith('172.')) {
    const second = Number.parseInt(ip.split('.')[1] || '', 10);
    if (second >= 16 && second <= 31) return true;
  }
  return /^0\./.test(ip) || /^\./.test(ip) || ip === 'localhost';
}

const ADMIN_SUFFIXES = [
  '自治区',
  '特别行政区',
  '自治州',
  '省',
  '市',
  '县',
  '地区',
  '盟',
];

function stripAdminSuffix(name: string): string {
  for (const suffix of ADMIN_SUFFIXES) {
    if (name.endsWith(suffix) && name.length > suffix.length) {
      return name.slice(0, -suffix.length);
    }
  }
  return name;
}

function buildLabel(country: string, regionName: string, city: string): string {
  const parts = [regionName, city]
    .map(stripAdminSuffix)
    .filter((p) => p && p !== country);
  return parts.length ? parts.join(' · ') : country;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  constructor(private readonly redis: RedisService) {}

  async locate(ip: string): Promise<GeoInfo> {
    if (isPrivateIp(ip)) return null;
    const cacheKey = `corner:geo:ip:${ip}`;

    try {
      const cached = await this.redis.getJson<GeoInfo | 'null'>(cacheKey);
      if (cached === NEGATIVE_CACHE_MARKER) return null;
      if (cached && typeof cached !== 'string') return cached;
    } catch (e) {
      this.logger.warn(`geo 缓存读取失败: ${(e as Error).message}`);
    }

    const windowKey = `corner:geo:limit:${Math.floor(Date.now() / 60000)}`;
    try {
      const used = await this.redis.client.incr(windowKey);
      if (used === 1) await this.redis.client.expire(windowKey, 90);
      if (used > GEO_RATE_LIMIT_PER_MINUTE) return null;
    } catch (e) {
      this.logger.warn(`geo 限速失败: ${(e as Error).message}`);
    }

    try {
      const res = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?lang=zh-CN`,
        { signal: AbortSignal.timeout(3000) },
      );
      if (!res.ok) return this.negative(cacheKey);
      const data = (await res.json()) as {
        status?: string;
        country?: string;
        regionName?: string;
        city?: string;
      };
      if (data.status !== 'success') return this.negative(cacheKey);
      const info: GeoInfo = {
        country: data.country || '',
        regionName: data.regionName || '',
        city: data.city || '',
        label: buildLabel(
          data.country || '',
          data.regionName || '',
          data.city || '',
        ),
      };
      await this.redis
        .setJson(cacheKey, info, GEO_CACHE_TTL)
        .catch(() => undefined);
      return info;
    } catch (e) {
      this.logger.warn(`geo 定位失败 ${ip}: ${(e as Error).message}`);
      return null;
    }
  }

  private async negative(cacheKey: string): Promise<null> {
    await this.redis
      .setJson(cacheKey, NEGATIVE_CACHE_MARKER, GEO_CACHE_TTL)
      .catch(() => undefined);
    return null;
  }
}

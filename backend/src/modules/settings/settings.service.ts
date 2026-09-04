import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.setting.findMany();
    const result: Record<string, any> = {};
    for (const s of items) result[s.key] = s.value;
    return result;
  }

  async get(key: string) {
    const s = await this.prisma.setting.findUnique({ where: { key } });
    return s ? s.value : null;
  }

  async getMany(keys: string[]) {
    const settings = await this.prisma.setting.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
    });
    return settings.reduce<Record<string, any>>((result, item) => {
      result[item.key] = item.value;
      return result;
    }, {});
  }

  async health() {
    const settings = await this.findAll();
    const env = (key: string) => Boolean(process.env[key]?.trim());
    const checks = [
      { key: 'site_title', label: '站点标题', configured: Boolean(String(settings.site_title || '').trim()), required: true, source: '站点设置' },
      { key: 'site_description', label: '站点描述', configured: Boolean(String(settings.site_description || '').trim()), required: true, source: '站点设置' },
      { key: 'site_url', label: '站点地址', configured: Boolean(String(settings.site_url || '').trim()), required: true, source: '站点设置' },
      { key: 'database', label: '数据库连接', configured: env('DATABASE_URL'), required: true, source: '服务端环境' },
      { key: 'redis', label: 'Redis 缓存', configured: env('REDIS_URL') || (env('REDIS_HOST') && env('REDIS_PASS')), required: true, source: '服务端环境' },
      { key: 'turnstile_secret', label: 'Turnstile 服务端密钥', configured: env('TURNSTILE_SECRET_KEY'), required: process.env.NODE_ENV === 'production', source: '服务端环境' },
      { key: 'turnstile_site', label: 'Turnstile 站点密钥', configured: env('TURNSTILE_SITE_KEY') || env('VITE_TURNSTILE_SITE_KEY'), required: process.env.NODE_ENV === 'production', source: '构建环境' },
      { key: 'deepseek', label: 'DeepSeek API', configured: env('DEEPSEEK_API_KEY'), required: false, source: '服务端环境' },
      { key: 'weather', label: '天气服务', configured: true, required: false, source: 'Open-Meteo（免密钥）' },
      { key: 'map', label: '时光地图', configured: process.env.FEATURE_MAP_ENABLED !== 'false', required: false, source: '功能开关' },
    ];
    return {
      checks,
      configuredCount: checks.filter((item) => item.configured).length,
      requiredMissing: checks.filter((item) => item.required && !item.configured).length,
      checkedAt: new Date().toISOString(),
    };
  }

  async set(key: string, value: any) {
    const normalized = key === 'constellation_config'
      ? this.normalizeConstellationConfig(value)
      : value;
    return this.prisma.setting.upsert({
      where: { key },
      update: { value: normalized },
      create: { key, value: normalized },
    });
  }

  private normalizeConstellationConfig(input: unknown) {
    const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
    const text = (value: unknown, max: number, fallback = '') => {
      const result = String(value ?? fallback).trim();
      return result.slice(0, max);
    };
    const knowledge = (value: unknown) => Array.from(new Set(
      (Array.isArray(value) ? value : [])
        .map((item) => text(item, 2000))
        .filter(Boolean),
    )).slice(0, 1000);
    const number = (value: unknown, min: number, max: number, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
    };
    const solarPlanets = (Array.isArray(source.solarPlanets) ? source.solarPlanets : [])
      .map((item) => item && typeof item === 'object' ? item as Record<string, unknown> : null)
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        id: text(item.id, 40),
        name: text(item.name, 80),
        catalog: text(item.catalog, 120),
        status: text(item.status, 120),
        description: text(item.description, 240),
        distance: text(item.distance, 48),
        period: text(item.period, 48),
        temperature: text(item.temperature, 64),
        feature: text(item.feature, 120),
        knowledge: knowledge(item.knowledge),
      }))
      .filter((item) => item.id);
    const specialBodies = (Array.isArray(source.specialBodies) ? source.specialBodies : [])
      .map((item) => item && typeof item === 'object' ? item as Record<string, unknown> : null)
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        id: text(item.id, 40),
        title: text(item.title, 80),
        status: text(item.status, 120),
        description: text(item.description, 240),
        knowledge: knowledge(item.knowledge),
      }))
      .filter((item) => item.id);
    return {
      nonContentStarCount: Math.round(number(source.nonContentStarCount, 200, 8000, 2400)),
      ringGap: number(source.ringGap, 12, 100, 34),
      movementSpeed: number(source.movementSpeed, 0.2, 3, 1),
      solarSystemPlanetCount: Math.round(number(source.solarSystemPlanetCount, 1, 7, 7)),
      solarOrbitScale: number(source.solarOrbitScale, 0.6, 1.8, 1),
      solarPlanets,
      specialBodies,
    };
  }
}

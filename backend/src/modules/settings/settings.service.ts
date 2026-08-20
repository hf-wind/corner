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
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

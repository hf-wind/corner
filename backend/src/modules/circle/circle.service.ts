import { Injectable, Logger } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { SettingsService } from '../settings/settings.service';

const MAX_FEED_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const FEED_CONCURRENCY = 6;

export type CircleConfig = {
  enabled: boolean;
  title: string;
  subtitle: string;
  coverMode: 'random' | 'fixed';
  coverUrl: string;
  covers: string[];
  maxItems: number;
  cacheTtl: number;
};

type CircleItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: { name: string; url: string; avatar: string };
  image?: string;
  categories: string[];
};

@Injectable()
export class CircleService {
  private readonly logger = new Logger(CircleService.name);
  private cache: { expires: number; items: CircleItem[] } | null = null;

  constructor(private readonly settings: SettingsService) {}

  async getConfig(): Promise<CircleConfig> {
    const raw = await this.settings.get('circle_config');
    const value = this.objectValue(raw);
    const covers = Array.isArray(value.covers)
      ? value.covers.map((cover) => this.stringValue(cover)).filter(Boolean)
      : [];
    return {
      enabled: value.enabled !== false,
      title: this.stringValue(value.title) || '朋友圈',
      subtitle: this.stringValue(value.subtitle) || '和朋友们分享新鲜事',
      coverMode: value.coverMode === 'fixed' ? 'fixed' : 'random',
      coverUrl: this.stringValue(value.coverUrl),
      covers,
      maxItems: Math.min(80, Math.max(8, Number(value.maxItems) || 36)),
      cacheTtl: Math.min(3600, Math.max(60, Number(value.cacheTtl) || 600)),
    };
  }

  async updateConfig(input: Partial<CircleConfig>) {
    const current = await this.getConfig();
    const covers = Array.isArray(input.covers)
      ? input.covers.map((cover) => this.stringValue(cover)).filter(Boolean)
      : this.stringValue(input.covers)
          .split(/\r?\n|,/)
          .map((cover) => cover.trim())
          .filter(Boolean);
    const next: CircleConfig = {
      enabled:
        input.enabled === undefined ? current.enabled : Boolean(input.enabled),
      title: this.stringValue(input.title) || current.title,
      subtitle: this.stringValue(input.subtitle) || current.subtitle,
      coverMode:
        input.coverMode === 'fixed'
          ? 'fixed'
          : input.coverMode === 'random'
            ? 'random'
            : current.coverMode,
      coverUrl: this.stringValue(input.coverUrl),
      covers: Array.from(new Set(covers)).slice(0, 20),
      maxItems: Math.min(
        80,
        Math.max(8, Number(input.maxItems) || current.maxItems),
      ),
      cacheTtl: Math.min(
        3600,
        Math.max(60, Number(input.cacheTtl) || current.cacheTtl),
      ),
    };
    await this.settings.set('circle_config', next);
    this.cache = null;
    return next;
  }

  async getFeed() {
    const config = await this.getConfig();
    if (!config.enabled) return { enabled: false, config, items: [] };
    if (this.cache && this.cache.expires > Date.now()) {
      return {
        enabled: true,
        config,
        items: this.withCover(this.cache.items, config),
      };
    }
    const rawFriends = await this.settings.get('friends');
    const friends = Array.isArray(rawFriends)
      ? rawFriends
          .map((friend) => this.objectValue(friend))
          .filter(
            (friend) =>
              friend.enabled !== false &&
              this.stringValue(friend.rssUrl || friend.siteRssUrl),
          )
          .slice(0, 24)
      : [];
    const results: CircleItem[][] = [];
    for (let index = 0; index < friends.length; index += FEED_CONCURRENCY) {
      results.push(
        ...(await Promise.all(
          friends
            .slice(index, index + FEED_CONCURRENCY)
            .map((friend) => this.fetchFriendFeed(friend)),
        )),
      );
    }
    const items = results
      .flat()
      .sort(
        (left, right) =>
          Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
      )
      .slice(0, config.maxItems);
    this.cache = { expires: Date.now() + config.cacheTtl * 1000, items };
    return { enabled: true, config, items: this.withCover(items, config) };
  }

  private async fetchFriendFeed(
    friend: Record<string, unknown>,
  ): Promise<CircleItem[]> {
    const rssUrl = this.stringValue(friend.rssUrl || friend.siteRssUrl);
    const configuredSiteUrl = this.stringValue(friend.url || friend.siteUrl);
    const siteUrl = this.absoluteUrl(configuredSiteUrl, rssUrl) || rssUrl;
    const source = {
      name:
        this.stringValue(friend.name || friend.siteName) ||
        this.hostName(siteUrl),
      url: siteUrl,
      avatar: this.stringValue(friend.avatar || friend.siteAvatar)
        ? this.absoluteUrl(
            this.stringValue(friend.avatar || friend.siteAvatar),
            siteUrl,
          )
        : '',
    };
    try {
      const xml = await this.fetchXml(rssUrl);
      if (!xml) return [];
      const entries = [
        ...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi),
      ];
      return entries.slice(0, 12).map((match, index) => {
        const block = match[0];
        const title = this.xmlText(block, 'title') || '未命名文章';
        const url =
          this.xmlText(block, 'link') ||
          this.xmlAttr(block, 'link', 'href') ||
          siteUrl;
        const description =
          this.xmlText(block, 'description') ||
          this.xmlText(block, 'summary') ||
          this.xmlText(block, 'content:encoded') ||
          this.xmlText(block, 'content');
        const image = this.extractImage(block, description, url);
        const published =
          this.xmlText(block, 'pubDate') ||
          this.xmlText(block, 'published') ||
          this.xmlText(block, 'updated');
        return {
          id: `${source.url}:${this.xmlText(block, 'guid') || this.xmlText(block, 'id') || url || index}`,
          title: this.cleanText(title).slice(0, 180),
          summary: this.cleanText(description).slice(0, 360),
          url: this.absoluteUrl(url, siteUrl) || siteUrl,
          publishedAt: Number.isNaN(Date.parse(published))
            ? new Date().toISOString()
            : new Date(published).toISOString(),
          source,
          image,
          categories: this.xmlTexts(block, 'category')
            .map((item) => this.cleanText(item))
            .filter(Boolean)
            .slice(0, 4),
        };
      });
    } catch (error) {
      this.logger.warn(
        `朋友圈 RSS 读取失败 ${rssUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  private async fetchXml(value: string) {
    let current = await this.safeFeedUrl(value);
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const response = await fetch(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(7000),
        headers: {
          Accept:
            'application/rss+xml, application/atom+xml, application/xml, text/xml',
          'User-Agent': 'CornerCircle/1.0',
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location || redirect === MAX_REDIRECTS) return '';
        current = await this.safeFeedUrl(new URL(location, current).toString());
        continue;
      }
      if (!response.ok) return '';
      const declaredSize = Number(response.headers.get('content-length') || 0);
      if (declaredSize > MAX_FEED_BYTES) return '';
      return this.readLimitedText(response, MAX_FEED_BYTES);
    }
    return '';
  }

  private async readLimitedText(response: Response, limit: number) {
    if (!response.body) return '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error('RSS 响应超过 2MB 限制');
      }
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  }

  private async safeFeedUrl(value: string) {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      throw new Error('RSS 地址必须是公开的 HTTP/HTTPS 地址');
    }
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      throw new Error('RSS 地址不允许访问本机或私有网络');
    }
    const addresses = isIP(host)
      ? [host]
      : (await lookup(host, { all: true, verbatim: true })).map(
          (entry) => entry.address,
        );
    if (!addresses.length || addresses.some((address) => !this.isPublicIp(address))) {
      throw new Error('RSS 地址解析到了非公开网络');
    }
    return url;
  }

  private isPublicIp(value: string): boolean {
    const normalized = value.toLowerCase();
    if (isIP(normalized) === 4) {
      const [a, b, c] = normalized.split('.').map(Number);
      return !(
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 0) ||
        (a === 192 && b === 168) ||
        (a === 198 && (b === 18 || b === 19)) ||
        (a === 198 && b === 51 && c === 100) ||
        (a === 203 && b === 0 && c === 113) ||
        a >= 224
      );
    }
    if (isIP(normalized) !== 6) return false;
    const mappedDotted = normalized.match(
      /^::ffff:(\d+\.\d+\.\d+\.\d+)$/,
    )?.[1];
    if (mappedDotted) return this.isPublicIp(mappedDotted);
    const mappedHex = normalized.match(/^::ffff:([\da-f]{1,4}):([\da-f]{1,4})$/);
    if (mappedHex) {
      const high = Number.parseInt(mappedHex[1], 16);
      const low = Number.parseInt(mappedHex[2], 16);
      return this.isPublicIp(
        `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`,
      );
    }
    return !(
      normalized === '::' ||
      normalized === '::1' ||
      /^f[cd]/.test(normalized) ||
      /^fe[89ab]/.test(normalized) ||
      /^ff/.test(normalized) ||
      /^2001:db8/.test(normalized)
    );
  }

  private withCover(items: CircleItem[], config: CircleConfig) {
    const cover =
      config.coverMode === 'fixed'
        ? config.coverUrl || config.covers[0]
        : config.covers[Math.floor(Math.random() * config.covers.length)];
    return items.map((item) => ({ ...item, cover: cover || undefined }));
  }
  private xmlText(block: string, tag: string) {
    const match = block.match(
      new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'),
    );
    return match
      ? this.decode(
          match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim(),
        )
      : '';
  }
  private xmlTexts(block: string, tag: string) {
    return [
      ...block.matchAll(
        new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi'),
      ),
    ].map((item) => this.decode(item[1]));
  }
  private xmlAttr(block: string, tag: string, attr: string) {
    return (
      block.match(
        new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["']`, 'i'),
      )?.[1] || ''
    );
  }
  private extractImage(block: string, description: string, base: string) {
    const value =
      this.xmlAttr(block, 'enclosure', 'url') ||
      this.xmlAttr(block, 'media:content', 'url') ||
      description.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ||
      '';
    return value ? this.absoluteUrl(value, base) : undefined;
  }
  private absoluteUrl(value: string, base: string) {
    try {
      const url = new URL(this.decode(value), base);
      return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
    } catch {
      return '';
    }
  }
  private hostName(value: string) {
    try {
      return new URL(value).hostname;
    } catch {
      return '朋友站点';
    }
  }
  private cleanText(value: string) {
    return this.decode(value)
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  private decode(value: string) {
    const entities: Record<string, string> = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
      nbsp: ' ',
    };
    return value.replace(
      /&(amp|lt|gt|quot|apos|nbsp);/gi,
      (whole, name: string) => entities[name.toLowerCase()] || whole,
    );
  }
  private stringValue(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }
  private objectValue(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  }
}

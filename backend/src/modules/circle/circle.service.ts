import { Injectable, Logger } from '@nestjs/common';
import { Optional } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import Parser from 'rss-parser';
import sanitizeHtml from 'sanitize-html';
import { SettingsService } from '../settings/settings.service';
import { RedisService } from '../../common/redis/redis.service';

const MAX_FEED_BYTES = 2_000_000;
const MAX_ITEM_CONTENT_CHARS = 20_000;
const MAX_REDIRECTS = 3;
const FEED_CONCURRENCY = 6;
const DEFAULT_SUBSCRIPTIONS: CircleSubscription[] = [
  {
    name: 'IT之家',
    url: 'https://www.ithome.com/',
    rssUrl: 'https://www.ithome.com/rss/',
    avatar: '',
    section: 'tech',
    enabled: true,
    kind: 'subscription',
    origin: 'default',
  },
];

export type CircleConfig = {
  enabled: boolean;
  title: string;
  subtitle: string;
  covers: string[];
  subscriptions: CircleSubscription[];
  subscriptionsConfigured: boolean;
  subscriptionExclusions: string[];
  cacheTtl: number;
};

export type CircleSubscription = {
  name: string;
  url: string;
  rssUrl: string;
  avatar: string;
  section?: string;
  kind?: 'subscription' | 'friend';
  origin?: 'default' | 'manual';
  enabled: boolean;
};

type CircleConfigInput = Partial<Omit<CircleConfig, 'subscriptions' | 'subscriptionExclusions'>> & {
  subscriptions?: Array<Partial<CircleSubscription>>;
};

type CircleItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
    avatar: string;
    rssUrl: string;
    section?: string;
    kind?: 'subscription' | 'friend';
  };
  image?: string;
  categories: string[];
  author?: string;
  content?: string;
  contentHtml?: string;
  contentFormat?: 'html' | 'text';
  parserRule?: 'rss-content-encoded' | 'rss-description-html' | 'atom-content-html' | 'text-summary';
  enclosure?: string;
  comments?: string;
};

type FeedQuery = { page?: number; limit?: number; refresh?: boolean };
type FeedCache = { items: CircleItem[]; fetchedAt: string };
type FeedSourceCache = { xml: string; etag?: string; lastModified?: string };

@Injectable()
export class CircleService {
  private readonly logger = new Logger(CircleService.name);
  private readonly feedParser = new Parser<Record<string, unknown>, Record<string, any>>({
    customFields: {
      item: [
        ['content:encoded', 'contentEncoded'],
        ['description', 'descriptionHtml'],
      ],
    },
  });
  private cache: {
    expires: number;
    fingerprint: string;
    items: CircleItem[];
  } | null = null;

  constructor(
    private readonly settings: SettingsService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async getConfig(): Promise<CircleConfig> {
    const [raw, rawFriends] = await Promise.all([this.settings.get('circle_config'), this.settings.get('friends')]);
    const value = this.objectValue(raw);
    const covers = Array.isArray(value.covers) ? value.covers.map((cover) => this.stringValue(cover)).filter(Boolean) : [];
    const subscriptionsConfigured = Array.isArray(value.subscriptions);
    const subscriptionExclusions = Array.isArray(value.subscriptionExclusions) ? value.subscriptionExclusions.map((item: unknown) => this.subscriptionKey(this.stringValue(item))).filter(Boolean) : [];
    const configuredSubscriptions: CircleSubscription[] =
      subscriptionsConfigured
        ? (value.subscriptions
            .map((item: unknown) => this.subscriptionValue(item))
            .filter(Boolean)
            .filter((item: CircleSubscription) => item.kind !== 'friend') as CircleSubscription[])
        : [];
    const friendSubscriptions = Array.isArray(rawFriends)
      ? (rawFriends
          .map((item: unknown) => {
            const value = this.subscriptionValue(item);
            return value ? { ...value, kind: 'friend' as const } : null;
          })
          .filter(Boolean) as CircleSubscription[])
      : [];
    // Keep explicit edits as the source of truth for matching RSS URLs, while
    // continuously bringing newly-added RSS links into the list.
    const defaultSubscriptions = process.env.NODE_ENV === 'test' ? [] : DEFAULT_SUBSCRIPTIONS;
    const subscriptions = this.mergeSubscriptions(
      this.mergeSubscriptions(
        configuredSubscriptions,
        defaultSubscriptions,
        subscriptionExclusions,
      ),
      friendSubscriptions,
      subscriptionExclusions,
      true,
    );
    const config: CircleConfig = {
      enabled: value.enabled !== false,
      title: this.stringValue(value.title) && this.stringValue(value.title) !== '朋友圈' ? this.stringValue(value.title) : '风讯角',
      subtitle: this.stringValue(value.subtitle) || '从不同的角落，收拢值得读完的文字。',
      covers,
      subscriptions,
      subscriptionsConfigured,
      subscriptionExclusions,
      cacheTtl: Math.min(3600, Math.max(60, Number(value.cacheTtl) || 600)),
    };
    return config;
  }

  async updateConfig(input: CircleConfigInput) {
    const current = await this.getConfig();
    const covers = Array.isArray(input.covers)
      ? input.covers.map((cover) => this.stringValue(cover)).filter(Boolean)
      : this.stringValue(input.covers)
          .split(/\r?\n|,/)
          .map((cover) => cover.trim())
          .filter(Boolean);
    const submittedSubscriptions = input.subscriptions === undefined ? undefined : input.subscriptions.map((item) => this.subscriptionValue(item)).filter((item): item is CircleSubscription => Boolean(item));
    const subscriptions =
      submittedSubscriptions === undefined
        ? current.subscriptions.filter((item) => item.kind !== 'friend')
        : submittedSubscriptions.filter((item) => item.kind !== 'friend');
    const exclusions = new Set(current.subscriptionExclusions);
    if (input.subscriptions !== undefined) {
      const defaultKeys = DEFAULT_SUBSCRIPTIONS.map((item) => this.subscriptionKey(item.rssUrl));
      const currentKeys = new Set(current.subscriptions.map((item) => this.subscriptionKey(item.rssUrl)));
      const nextKeys = new Set(subscriptions.map((item) => this.subscriptionKey(item.rssUrl)));
      for (const key of defaultKeys) {
        if (currentKeys.has(key) && !nextKeys.has(key)) exclusions.add(key);
      }
      for (const key of nextKeys) exclusions.delete(key);
      for (const friend of submittedSubscriptions || []) {
        if (friend.kind !== 'friend') continue;
        const key = this.subscriptionKey(friend.rssUrl);
        if (friend.enabled === false) exclusions.add(key);
        else exclusions.delete(key);
      }
    }
    const next: CircleConfig = {
      enabled: input.enabled === undefined ? current.enabled : Boolean(input.enabled),
      title: this.stringValue(input.title) || current.title,
      subtitle: this.stringValue(input.subtitle) || current.subtitle,
      covers: Array.from(new Set(covers)).slice(0, 20),
      subscriptionsConfigured: true,
      subscriptions,
      subscriptionExclusions: Array.from(exclusions),
      cacheTtl: Math.min(3600, Math.max(60, Number(input.cacheTtl) || current.cacheTtl)),
    };
    await this.settings.set('circle_config', next);
    this.cache = null;
    return next;
  }

  async getFeed(query: FeedQuery = {}) {
    const config = await this.getConfig();
    if (!config.enabled) return { enabled: false, config, items: [] };
    const fingerprint = this.subscriptionFingerprint(config.subscriptions);
    const page = Math.max(1, Math.floor(Number(query.page) || 1));
    const limit = Math.min(50, Math.max(1, Math.floor(Number(query.limit) || 20)));
    const cacheKey = `corner:circle:feed:v2:${createHash('sha1').update(fingerprint).digest('hex')}`;
    let cached: FeedCache | null = null;
    if (!query.refresh && this.redis) cached = await this.redis.getJson<FeedCache>(cacheKey).catch(() => null);
    if (!query.refresh && cached) {
      return this.pageResult(cached.items, config, page, limit, cached.fetchedAt);
    }
    if (!query.refresh && this.cache && this.cache.expires > Date.now() && this.cache.fingerprint === fingerprint) {
      return this.pageResult(this.cache.items, config, page, limit, new Date().toISOString());
    }
    const friends = Array.isArray(config.subscriptions)
      ? config.subscriptions
          .map((friend) => this.objectValue(friend))
          .filter(
            (friend) =>
              friend.enabled !== false &&
              this.stringValue(friend.rssUrl || friend.siteRssUrl),
          )
      : [];
    const results: { items: CircleItem[]; healthy: boolean; error?: string; rssUrl: string }[] = [];
    for (let index = 0; index < friends.length; index += FEED_CONCURRENCY) {
      const batch = friends.slice(index, index + FEED_CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (friend) => {
          const result = await this.fetchFriendFeed(friend);
          return {
            ...result,
            rssUrl: this.stringValue(friend.rssUrl || friend.siteRssUrl),
          };
        })
      );
      results.push(...batchResults);
    }

    // Keep every item returned by every configured feed. Pagination is applied
    // only in pageResult so slow and prolific sources remain available.
    const items = this.distributeItems(
      results
        .flatMap((r) => r.items)
        .sort(
          (left, right) =>
            Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
        ),
    );
    const fetchedAt = new Date().toISOString();
    this.cache = {
      expires: Date.now() + config.cacheTtl * 1000,
      fingerprint,
      items,
    };
    if (this.redis) await this.redis.setJson(cacheKey, { items, fetchedAt }, config.cacheTtl).catch(() => undefined);
    return this.pageResult(items, config, page, limit, fetchedAt);
  }

  async getItem(id: string) {
    const target = this.stringValue(id);
    if (!target) return null;
    const first = (await this.getFeed({ page: 1, limit: 50 })) as {
      totalPages?: number;
      items?: CircleItem[];
    };
    const pages = Number(first.totalPages) || 1;
    const found = (first.items || []).find((item) => item.id === target);
    if (found) return found;
    for (let page = 2; page <= pages; page += 1) {
      const result = (await this.getFeed({ page, limit: 50 })) as {
        items?: CircleItem[];
      };
      const item = (result.items || []).find((entry) => entry.id === target);
      if (item) return item;
    }
    return null;
  }

  private pageResult(items: CircleItem[], config: CircleConfig, page: number, limit: number, fetchedAt: string) {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const today = new Date().toDateString();
    return {
      enabled: true,
      config,
      items: this.withCover(items.slice((safePage - 1) * limit, safePage * limit), config),
      total,
      page: safePage,
      limit,
      totalPages,
      fetchedAt,
      sourceCount: new Set(items.map((item) => item.source.url)).size,
      todayCount: items.filter((item) => new Date(item.publishedAt).toDateString() === today).length,
    };
  }

  private async fetchFriendFeed(friend: Record<string, unknown>): Promise<{ items: CircleItem[]; healthy: boolean; error?: string }> {
    const rssUrl = this.stringValue(friend.rssUrl || friend.siteRssUrl);
    const configuredSiteUrl = this.stringValue(friend.url || friend.siteUrl);
    const siteUrl = this.absoluteUrl(configuredSiteUrl, rssUrl) || rssUrl;
    let source: CircleItem['source'] = {
      name: this.stringValue(friend.name || friend.siteName) || this.hostName(siteUrl),
      url: siteUrl,
      avatar: this.stringValue(friend.avatar || friend.siteAvatar) ? this.absoluteUrl(this.stringValue(friend.avatar || friend.siteAvatar), siteUrl) : '',
      section: this.stringValue(friend.section),
      kind: friend.kind === 'friend' ? 'friend' : 'subscription',
      rssUrl,
    };
    try {
      let effectiveRssUrl = rssUrl;
      let xml = await this.fetchXml(rssUrl).catch(() => '');
      if (!xml && configuredSiteUrl) {
        const discovered = await this.discoverFeed(configuredSiteUrl, rssUrl);
        if (discovered) {
          effectiveRssUrl = discovered.url;
          xml = discovered.xml;
          source = { ...source, rssUrl: effectiveRssUrl };
          this.logger.log(`风讯角为 ${source.name} 使用备用订阅源 ${effectiveRssUrl}`);
        }
      }
      if (!xml) return { items: [], healthy: true };
      const feed = await this.parseFeed(xml);
      const atomFeed = feed.atom;
      const items = feed.items.map((entry, index) => {
        const title = this.stringValue(entry.title) || '未命名文章';
        const url = this.stringValue(entry.link) || siteUrl;
        const encoded = this.stringValue(entry.contentEncoded);
        const description = this.stringValue(entry.descriptionHtml || entry.content || entry.summary);
        const rawContent = encoded || description;
        const hasHtml = /<([a-z][\w-]*)(?:\s[^>]*)?>/i.test(rawContent);
        const parserRule: CircleItem['parserRule'] = encoded
          ? 'rss-content-encoded'
          : hasHtml
            ? atomFeed
              ? 'atom-content-html'
              : 'rss-description-html'
            : 'text-summary';
        const contentHtml = hasHtml ? this.sanitizeFeedHtml(rawContent, url || siteUrl) : '';
        const image = this.extractImage('', rawContent, url || siteUrl);
        const enclosure = this.stringValue(entry.enclosure?.url);
        const published = this.stringValue(entry.isoDate || entry.pubDate);
        return {
          id: `${source.url}:${this.stringValue(entry.guid || entry.id) || url || index}`,
          title: this.cleanText(title).slice(0, 180),
          summary: this.cleanText(description).slice(0, 360),
          url: this.absoluteUrl(url, siteUrl) || siteUrl,
          publishedAt: Number.isNaN(Date.parse(published)) ? new Date().toISOString() : new Date(published).toISOString(),
          source,
          image,
          categories: (Array.isArray(entry.categories) ? entry.categories : [])
            .map((item: unknown) => this.cleanText(this.stringValue(item)))
            .filter(Boolean)
            .slice(0, 4),
          author: this.cleanText(this.stringValue(entry.creator || entry.author)).slice(0, 120),
          content: hasHtml ? '' : this.cleanText(rawContent).slice(0, MAX_ITEM_CONTENT_CHARS),
          contentHtml: contentHtml.slice(0, MAX_ITEM_CONTENT_CHARS * 4),
          contentFormat: hasHtml ? ('html' as const) : ('text' as const),
          parserRule,
          enclosure: this.absoluteUrl(enclosure, siteUrl) || '',
          comments: this.absoluteUrl(this.stringValue(entry.comments), siteUrl) || '',
        };
      });
      return { items, healthy: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`风讯角 RSS 读取失败 ${rssUrl}: ${errorMessage}`);
      return { items: [], healthy: false, error: errorMessage };
    }
  }

  private sanitizeFeedHtml(value: string, base: string) {
    return sanitizeHtml(value, {
      allowedTags: ['p', 'br', 'h2', 'h3', 'h4', 'blockquote', 'pre', 'code', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sub', 'sup'],
      allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'referrerpolicy'],
      },
      transformTags: {
        a: (_tag, attrs) => ({
          tagName: 'a',
          attribs: {
            ...attrs,
            href: this.absoluteUrl(attrs.href || '', base),
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        }),
        img: (_tag, attrs) => ({
          tagName: 'img',
          attribs: {
            ...attrs,
            src: this.absoluteUrl(attrs.src || '', base),
            loading: 'lazy',
            referrerpolicy: 'no-referrer',
          },
        }),
      },
      allowedSchemes: ['http', 'https'],
    });
  }

  private async parseFeed(xml: string): Promise<{ items: Record<string, any>[]; atom: boolean }> {
    const atom = /<feed\b/i.test(xml);
    try {
      const parsed = await this.feedParser.parseString(xml);
      return { items: parsed.items || [], atom };
    } catch {
      // Some small feeds omit optional channel metadata required by strict parsers.
      const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)];
      return {
        atom,
        items: blocks.map((match) => {
          const block = match[0];
          return {
            title: this.xmlText(block, 'title'),
            link: this.xmlText(block, 'link') || this.xmlAttr(block, 'link', 'href'),
            guid: this.xmlText(block, 'guid') || this.xmlText(block, 'id'),
            isoDate: this.xmlText(block, 'pubDate') || this.xmlText(block, 'published') || this.xmlText(block, 'updated'),
            descriptionHtml: this.xmlText(block, 'description') || this.xmlText(block, 'summary') || this.xmlText(block, 'content'),
            contentEncoded: this.xmlText(block, 'content:encoded'),
            creator: this.xmlText(block, 'dc:creator') || this.xmlText(block, 'author') || this.xmlText(block, 'name'),
            categories: this.xmlTexts(block, 'category'),
            enclosure: {
              url: this.xmlAttr(block, 'enclosure', 'url') || this.xmlAttr(block, 'media:content', 'url'),
            },
            comments: this.xmlText(block, 'comments'),
          };
        }),
      };
    }
  }

  private async fetchXml(value: string) {
    const cacheKey = `corner:circle:rss:${createHash('sha1').update(value).digest('hex')}`;
    const sourceCache = this.redis ? await this.redis.getJson<FeedSourceCache>(cacheKey).catch(() => null) : null;
    try {
      let current = await this.safeFeedUrl(value);
      for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
        const headers: Record<string, string> = {
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          'User-Agent': 'Mozilla/5.0 (compatible; CornerCircle/1.0; +https://corner.ink)',
        };
        if (sourceCache?.etag) headers['If-None-Match'] = sourceCache.etag;
        if (sourceCache?.lastModified) headers['If-Modified-Since'] = sourceCache.lastModified;
        const response = await fetch(current, {
          redirect: 'manual',
          signal: AbortSignal.timeout(7000),
          headers,
        });
        if (response.status === 304 && sourceCache?.xml) {
          this.logger.debug(`RSS 304 未修改，使用缓存: ${value}`);
          return sourceCache.xml;
        }
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location || redirect === MAX_REDIRECTS) {
            this.logger.warn(`RSS 重定向次数超限或缺少 Location: ${value}`);
            return sourceCache?.xml || '';
          }
          this.logger.debug(`RSS 重定向 ${response.status} -> ${location}`);
          current = await this.safeFeedUrl(new URL(location, current).toString());
          continue;
        }
        if (!response.ok) {
          this.logger.warn(`RSS HTTP ${response.status}: ${value}`);
          if (sourceCache?.xml) return sourceCache.xml;
          throw new Error(`RSS HTTP ${response.status}`);
        }
        const declaredSize = Number(response.headers.get('content-length') || 0);
        if (declaredSize > MAX_FEED_BYTES) {
          this.logger.warn(`RSS 内容超过 ${MAX_FEED_BYTES} 字节限制: ${value}`);
          return sourceCache?.xml || '';
        }
        const xml = await this.readLimitedText(response, MAX_FEED_BYTES);
        if (this.redis && xml) {
          await this.redis
            .setJson(
              cacheKey,
              {
                xml,
                etag: response.headers.get('etag') || undefined,
                lastModified: response.headers.get('last-modified') || undefined,
              },
              86400,
            )
            .catch(() => undefined);
        }
        return xml || sourceCache?.xml || '';
      }
    } catch (error) {
      if (sourceCache?.xml) {
        this.logger.warn(`RSS 实时读取失败，使用最近缓存 ${value}: ${error instanceof Error ? error.message : String(error)}`);
        return sourceCache.xml;
      }
      throw error;
    }
    return sourceCache?.xml || '';
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

  private async discoverFeed(siteValue: string, excludedValue: string) {
    const site = await this.safeFeedUrl(siteValue);
    const response = await fetch(site, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; CornerCircle/1.0; +https://corner.ink)',
      },
    });
    if (!response.ok) return null;
    const html = await this.readLimitedText(response, MAX_FEED_BYTES);
    const candidates = [
      ...[...html.matchAll(/<link\b[^>]*>/gi)]
        .map((match) => match[0])
        .filter(
          (tag) =>
            /\brel=["'][^"']*alternate/i.test(tag) &&
            /\btype=["']application\/(?:rss\+xml|atom\+xml)/i.test(tag),
        )
        .map((tag) => tag.match(/\bhref=["']([^"']+)["']/i)?.[1] || ''),
      '/atom.xml',
      '/rss.xml',
      '/feed/',
    ];
    const excluded = this.subscriptionKey(excludedValue);
    const unique = Array.from(
      new Set(
        candidates
          .map((candidate) => this.absoluteUrl(candidate, site.toString()))
          .filter((candidate) => candidate && this.subscriptionKey(candidate) !== excluded),
      ),
    );
    for (const url of unique.slice(0, 8)) {
      const xml = await this.fetchXml(url).catch(() => '');
      if (xml && /<(rss|feed|rdf:RDF)\b/i.test(xml)) return { url, xml };
    }
    return null;
  }

  private async safeFeedUrl(value: string) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('RSS 地址必须是公开的 HTTP/HTTPS 地址');
    }
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
      throw new Error('RSS 地址不允许访问本机或私有网络');
    }
    let addresses: string[];
    try {
      addresses = isIP(host) ? [host] : (await lookup(host, { all: true, verbatim: true })).map((entry) => entry.address);
    } catch (error) {
      this.logger.warn(`RSS DNS 解析失败 ${host}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`RSS 地址 ${host} DNS 解析失败`);
    }
    if (!addresses.length) {
      throw new Error(`RSS 地址 ${host} 未解析到任何 IP`);
    }
    if (addresses.some((address) => !this.isPublicIp(address))) {
      this.logger.warn(`RSS 地址 ${host} 解析到私有网络: ${addresses.join(', ')}`);
      throw new Error('RSS 地址解析到了非公开网络');
    }
    return url;
  }

  private isPublicIp(value: string): boolean {
    const normalized = value.toLowerCase();
    if (isIP(normalized) === 4) {
      const [a, b, c] = normalized.split('.').map(Number);
      return !(a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 0 && c === 0) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113) || a >= 224);
    }
    if (isIP(normalized) !== 6) return false;
    const mappedDotted = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    if (mappedDotted) return this.isPublicIp(mappedDotted);
    const mappedHex = normalized.match(/^::ffff:([\da-f]{1,4}):([\da-f]{1,4})$/);
    if (mappedHex) {
      const high = Number.parseInt(mappedHex[1], 16);
      const low = Number.parseInt(mappedHex[2], 16);
      return this.isPublicIp(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
    return !(normalized === '::' || normalized === '::1' || /^f[cd]/.test(normalized) || /^fe[89ab]/.test(normalized) || /^ff/.test(normalized) || /^2001:db8/.test(normalized));
  }

  private withCover(items: CircleItem[], config: CircleConfig) {
    if (config.covers.length === 0) return items.map((item) => ({ ...item, cover: undefined }));
    if (config.covers.length === 1) return items.map((item) => ({ ...item, cover: config.covers[0] }));
    const start = Math.floor(Math.random() * config.covers.length);
    return items.map((item, index) => ({
      ...item,
      cover: config.covers[(start + index) % config.covers.length],
    }));
  }
  private xmlText(block: string, tag: string) {
    const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return match ? this.decode(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()) : '';
  }
  private xmlTexts(block: string, tag: string) {
    return [...block.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi'))].map((item) => this.decode(item[1]));
  }
  private xmlAttr(block: string, tag: string, attr: string) {
    return block.match(new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["']`, 'i'))?.[1] || '';
  }
  private extractImage(block: string, description: string, base: string) {
    const value = this.xmlAttr(block, 'enclosure', 'url') || this.xmlAttr(block, 'media:content', 'url') || description.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || '';
    return value ? this.absoluteUrl(value, base) : undefined;
  }
  private absoluteUrl(value: string, base: string) {
    if (!value.trim()) return '';
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
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
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
    return value.replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (whole, name: string) => entities[name.toLowerCase()] || whole);
  }
  private stringValue(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }
  private objectValue(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
  }

  private subscriptionValue(value: unknown): CircleSubscription | null {
    const item = this.objectValue(value);
    const rssUrl = this.stringValue(item.rssUrl || item.siteRssUrl);
    if (!rssUrl) return null;
    return {
      name: this.stringValue(item.name || item.siteName) || this.hostName(rssUrl),
      url: this.stringValue(item.url || item.siteUrl) || rssUrl,
      rssUrl,
      avatar: this.stringValue(item.avatar || item.siteAvatar),
      section: this.stringValue(item.section),
      kind: item.kind === 'friend' ? 'friend' : 'subscription',
      origin: item.origin === 'manual' ? 'manual' : item.origin === 'default' ? 'default' : undefined,
      enabled: item.enabled !== false,
    };
  }

  private mergeSubscriptions(configured: CircleSubscription[], fromFriends: CircleSubscription[], exclusions: string[] = [], retainExcluded = false) {
    const result = [...configured];
    const known = new Set(configured.map((item) => this.subscriptionKey(item.rssUrl)));
    const excluded = new Set(exclusions);
    for (const friend of fromFriends) {
      const key = this.subscriptionKey(friend.rssUrl);
      if (known.has(key) || (excluded.has(key) && !retainExcluded)) continue;
      known.add(key);
      result.push(excluded.has(key) ? { ...friend, enabled: false } : friend);
    }
    return result;
  }

  private subscriptionFingerprint(subscriptions: CircleSubscription[]) {
    return subscriptions
      .filter((item) => item.enabled !== false)
      .map((item) => `${this.subscriptionKey(item.rssUrl)}:${item.url}:${item.name}:${item.avatar}:${item.section || ''}:${item.kind || ''}:${item.origin || ''}`)
      .sort()
      .join('|');
  }

  private subscriptionKey(value: string) {
    return value.trim().replace(/\/+$/, '').toLowerCase();
  }

  /** 分层轮询不同来源，确保多页维度下每个来源都有机会出现。 */
  private distributeItems(items: CircleItem[]) {
    // 按来源分组
    const groups = new Map<string, CircleItem[]>();
    for (const item of items) {
      const key = this.subscriptionKey(item.source.rssUrl || item.source.url || item.source.name);
      const group = groups.get(key) || [];
      group.push(item);
      groups.set(key, group);
    }

    // 每组按时间排序（最新在前）
    const queues = Array.from(groups.entries()).map(([key, items]) => ({
      key,
      queue: items.sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt)),
    }));

    // 分层轮询：每轮从每个来源取1条，直到没有更多内容
    const result: CircleItem[] = [];
    let maxRounds = 5; // 最多5轮，确保多页维度均匀
    let round = 0;

    while (round < maxRounds && queues.some(q => q.queue.length > 0)) {
      for (const source of queues) {
        if (source.queue.length > 0) {
          result.push(source.queue.shift() as CircleItem);
        }
      }
      round++;
    }

    // 如果还有剩余内容，按时间填充
    const remaining = queues.flatMap(q => q.queue);
    remaining.sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
    result.push(...remaining);

    return result;
  }
}

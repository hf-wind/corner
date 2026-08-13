import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { MusicFavoriteDto } from './dto/music-favorite.dto';
import {
  MUSIC_DEFAULTS,
  MUSIC_SETTING_KEYS,
  type MusicConfig,
  type MusicPlaylistSource,
} from './music.defaults';

export type MusicTrack = {
  name: string;
  artist: string;
  url: string;
  pic: string;
  lrc?: string;
  key?: string;
};

type CacheEntry = {
  tracks: MusicTrack[];
  fetchedAt: number;
  key: string;
};

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);
  private cache = new Map<string, CacheEntry>();

  constructor(
    private settings: SettingsService,
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  async getConfig(): Promise<MusicConfig & { apiConfigured: boolean }> {
    const all = await this.settings.findAll();
    const cfg = { ...MUSIC_DEFAULTS };

    for (const key of MUSIC_SETTING_KEYS) {
      if (all[key] === undefined || all[key] === null) continue;
      (cfg as any)[key] = this.coerce(key, all[key]);
    }

    if (!Array.isArray(cfg.music_playlists) || !cfg.music_playlists.length) {
      cfg.music_playlists = [
        {
          name: '默认歌单',
          server: cfg.music_server,
          type: cfg.music_type,
          id: cfg.music_id,
          sort: 10,
        },
      ];
    }

    return { ...cfg, apiConfigured: true };
  }

  async updateConfig(partial: Record<string, unknown>) {
    const allowed = new Set<string>(MUSIC_SETTING_KEYS);
    for (const [key, value] of Object.entries(partial)) {
      if (!allowed.has(key)) continue;
      await this.settings.set(
        key,
        this.coerce(key as keyof MusicConfig, value),
      );
    }
    this.cache.clear();
    await this.redis.client
      .incr('corner:music:cache-version')
      .catch(() => undefined);
    return this.getConfig();
  }

  getDefaults() {
    return { ...MUSIC_DEFAULTS };
  }

  async getPublicConfig() {
    const cfg = await this.getConfig();
    return {
      enabled: cfg.music_enabled,
      autoplay: cfg.music_autoplay,
      volume: cfg.music_volume,
      playlists: cfg.music_playlists.map((p, i) => ({
        index: i,
        name: p.name,
        server: p.server,
        type: p.type,
        id: p.id,
        sort: p.sort,
      })),
      active: {
        server: cfg.music_server,
        type: cfg.music_type,
        id: cfg.music_id,
      },
    };
  }

  async getPlaylist(opts?: {
    server?: string;
    type?: string;
    id?: string;
    playlistIndex?: number;
    refresh?: boolean;
    page?: number;
    limit?: number;
  }) {
    const cfg = await this.getConfig();
    if (!cfg.music_enabled) {
      return { enabled: false, tracks: [] as MusicTrack[], source: null };
    }

    let source: MusicPlaylistSource = {
      name: '当前',
      server: opts?.server || cfg.music_server,
      type: opts?.type || cfg.music_type,
      id: opts?.id || cfg.music_id,
      sort: 0,
    };

    if (
      opts?.playlistIndex != null &&
      cfg.music_playlists[opts.playlistIndex]
    ) {
      source = { ...cfg.music_playlists[opts.playlistIndex] };
    }

    const allTracks = await this.fetchTracks(
      source,
      cfg.music_api,
      cfg.music_cache_ttl,
      !!opts?.refresh,
    );
    const page = Math.max(
      1,
      Number.isFinite(opts?.page) ? Math.floor(opts!.page!) : 1,
    );
    const limit = Math.max(
      10,
      Math.min(
        100,
        Number.isFinite(opts?.limit) ? Math.floor(opts!.limit!) : 50,
      ),
    );
    const total = allTracks.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const tracks = allTracks
      .slice((page - 1) * limit, page * limit)
      .map((track) => this.presentTrack(track));
    return {
      enabled: true,
      source,
      tracks,
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
      cached: !opts?.refresh,
    };
  }

  async refreshCache() {
    this.cache.clear();
    await this.redis.client
      .incr('corner:music:cache-version')
      .catch(() => undefined);
    return this.getPlaylist({ refresh: true });
  }

  async getRecommendationCandidates(query: string, limit = 10) {
    const tracks = await this.getRecommendedTracks(query, limit);
    return tracks.map(({ name, artist, playlist }) => ({
      name,
      artist,
      playlist,
    }));
  }

  async listFavorites(userId: string) {
    const favorites = await this.prisma.musicFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      name: '我的收藏',
      tracks: favorites.map((favorite) =>
        this.presentTrack({
          name: favorite.name,
          artist: favorite.artist,
          url: favorite.sourceUrl,
          pic: favorite.picUrl || '',
          lrc: favorite.lrc || undefined,
        }),
      ),
      total: favorites.length,
    };
  }

  async addFavorite(userId: string, dto: MusicFavoriteDto) {
    const sourceUrl = this.extractSignedMediaUrl(dto.url);
    const picUrl = dto.pic ? this.extractSignedMediaUrl(dto.pic, false) : '';
    const trackKey = this.trackKey(sourceUrl);
    const favorite = await this.prisma.musicFavorite.upsert({
      where: { userId_trackKey: { userId, trackKey } },
      create: {
        userId,
        trackKey,
        name: String(dto.name || '')
          .trim()
          .slice(0, 255),
        artist: String(dto.artist || '未知音乐人')
          .trim()
          .slice(0, 255),
        sourceUrl,
        picUrl: picUrl || null,
        lrc: dto.lrc ? String(dto.lrc).slice(0, 200000) : null,
      },
      update: {
        name: String(dto.name || '')
          .trim()
          .slice(0, 255),
        artist: String(dto.artist || '未知音乐人')
          .trim()
          .slice(0, 255),
        picUrl: picUrl || null,
        lrc: dto.lrc ? String(dto.lrc).slice(0, 200000) : null,
      },
    });
    return {
      favorite: true,
      track: this.presentTrack({
        name: favorite.name,
        artist: favorite.artist,
        url: favorite.sourceUrl,
        pic: favorite.picUrl || '',
        lrc: favorite.lrc || undefined,
      }),
    };
  }

  async removeFavorite(userId: string, key: string) {
    const trackKey = String(key || '').trim();
    if (!/^[a-f0-9]{64}$/i.test(trackKey)) {
      throw new BadRequestException('收藏歌曲标识无效');
    }
    await this.prisma.musicFavorite.deleteMany({ where: { userId, trackKey } });
    return { favorite: false, key: trackKey };
  }

  async getRecommendedTracks(query: string, limit = 4) {
    const cfg = await this.getConfig();
    if (!cfg.music_enabled) return [];

    const sources = cfg.music_playlists.slice(0, 8);
    const lists = await Promise.allSettled(
      sources.map((source) =>
        this.fetchTracks(source, cfg.music_api, cfg.music_cache_ttl, false),
      ),
    );
    const unique = new Map<string, MusicTrack & { playlist: string }>();
    lists.forEach((result, sourceIndex) => {
      if (result.status !== 'fulfilled') return;
      for (const track of result.value) {
        const key = `${track.name}\u0000${track.artist}`.toLowerCase();
        if (!unique.has(key)) {
          unique.set(key, { ...track, playlist: sources[sourceIndex].name });
        }
      }
    });

    const terms = this.musicSearchTerms(query);
    const seed = createHash('sha256')
      .update(query || 'music')
      .digest()
      .readUInt32BE(0);
    return [...unique.values()]
      .map((track, index) => ({
        track,
        score: this.scoreTrack(track, terms),
        tie: (index * 2654435761 + seed) >>> 0,
      }))
      .sort((a, b) => b.score - a.score || a.tie - b.tie)
      .slice(0, Math.max(1, Math.min(6, limit)))
      .map(({ track }) => {
        const presented = this.presentTrack(track);
        return {
          name: track.name.slice(0, 80),
          artist: track.artist.slice(0, 80),
          playlist: track.playlist.slice(0, 40),
          url: presented.url,
          pic: presented.pic,
          key: presented.key,
        };
      });
  }

  async proxyMedia(input: {
    url: string;
    expires: string;
    signature: string;
    range?: string;
    signal?: AbortSignal;
  }) {
    const expires = Number(input.expires);
    if (
      !Number.isSafeInteger(expires) ||
      expires < Math.floor(Date.now() / 1000) ||
      expires > Math.floor(Date.now() / 1000) + 172800
    ) {
      throw new UnauthorizedException('媒体链接已失效');
    }
    let target: URL;
    try {
      target = new URL(input.url);
    } catch {
      throw new BadRequestException('媒体地址无效');
    }
    if (!['http:', 'https:'].includes(target.protocol)) {
      throw new BadRequestException('媒体地址无效');
    }
    const expected = this.signMediaUrl(target.toString(), expires);
    const actual = Buffer.from(String(input.signature || ''));
    const wanted = Buffer.from(expected);
    if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) {
      throw new UnauthorizedException('媒体签名无效');
    }

    const headers: Record<string, string> = {
      Accept: '*/*',
      'User-Agent': 'corner-blog-music-proxy/1.0',
    };
    if (input.range) headers.Range = input.range;
    const response = await fetch(target, {
      headers,
      redirect: 'follow',
      signal: input.signal
        ? AbortSignal.any([input.signal, AbortSignal.timeout(20_000)])
        : AbortSignal.timeout(20_000),
    }).catch((error) => {
      throw new ServiceUnavailableException(`媒体加载失败: ${error}`);
    });
    if (!response.ok && response.status !== 206) {
      throw new ServiceUnavailableException(`媒体源返回 ${response.status}`);
    }
    return response;
  }

  private cacheKey(source: MusicPlaylistSource, api: string) {
    return `${api}|${source.server}|${source.type}|${source.id}`;
  }

  private presentTrack(track: MusicTrack): MusicTrack {
    return {
      ...track,
      url: this.createMediaProxyUrl(track.url),
      pic: track.pic ? this.createMediaProxyUrl(track.pic) : '',
      key: this.trackKey(track.url),
    };
  }

  private trackKey(url: string) {
    return createHash('sha256').update(String(url)).digest('hex');
  }

  private extractSignedMediaUrl(raw: string, required = true) {
    let parsed: URL;
    try {
      parsed = new URL(String(raw || ''), 'https://corner.local');
    } catch {
      if (required) throw new BadRequestException('歌曲地址无效');
      return '';
    }
    if (
      !parsed.pathname.endsWith('/api/music/proxy') &&
      !parsed.pathname.endsWith('/music/proxy')
    ) {
      if (required)
        throw new BadRequestException('歌曲地址不是受信任的媒体地址');
      return '';
    }
    const url = parsed.searchParams.get('url') || '';
    const expires = Number(parsed.searchParams.get('expires'));
    const signature = parsed.searchParams.get('signature') || '';
    if (!url || !Number.isSafeInteger(expires) || !signature) {
      if (required) throw new BadRequestException('歌曲地址签名无效');
      return '';
    }
    const now = Math.floor(Date.now() / 1000);
    if (expires < now || expires > now + 172800) {
      if (required) throw new UnauthorizedException('歌曲地址已过期');
      return '';
    }
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      if (required) throw new BadRequestException('歌曲源地址无效');
      return '';
    }
    const expected = this.signMediaUrl(target.toString(), expires);
    const actual = Buffer.from(signature);
    const wanted = Buffer.from(expected);
    if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) {
      if (required) throw new UnauthorizedException('歌曲地址签名无效');
      return '';
    }
    return target.toString();
  }

  private createMediaProxyUrl(url: string) {
    const expires = Math.floor(Date.now() / 1000) + 86400;
    const params = new URLSearchParams({
      url,
      expires: String(expires),
      signature: this.signMediaUrl(url, expires),
    });
    return `/api/music/proxy?${params.toString()}`;
  }

  private signMediaUrl(url: string, expires: number) {
    const secret =
      process.env.MUSIC_PROXY_SECRET ||
      process.env.JWT_SECRET ||
      'corner-dev-music-proxy';
    return createHmac('sha256', secret)
      .update(`${url}|${expires}`)
      .digest('base64url');
  }

  private musicSearchTerms(query: string) {
    const normalized = String(query || '').toLowerCase();
    const terms = normalized
      .split(/[\s,，。！？!?、：:;；/]+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2)
      .filter(
        (term) =>
          !/^(推荐|一首|歌曲|音乐|歌单|听听|想听|给我|帮我|适合|现在)$/.test(
            term,
          ),
      );
    const moods: Array<[RegExp, string[]]> = [
      [/开心|快乐|元气|通勤/, ['快乐', '阳光', '青春', '夏天']],
      [/安静|放松|睡前|阅读|学习/, ['安静', '轻音乐', '纯音乐', '夜', '钢琴']],
      [/难过|伤心|失落|emo/, ['雨', '遗憾', '孤独', '想念']],
      [/浪漫|约会|甜/, ['爱', '浪漫', '心动', '温柔']],
      [/热血|运动|跑步/, ['热血', '燃', '摇滚', '奔跑']],
    ];
    for (const [pattern, additions] of moods) {
      if (pattern.test(normalized)) terms.push(...additions);
    }
    return [...new Set(terms)].slice(0, 12);
  }

  private scoreTrack(
    track: MusicTrack & { playlist: string },
    terms: string[],
  ) {
    if (!terms.length) return 0;
    const name = track.name.toLowerCase();
    const artist = track.artist.toLowerCase();
    const playlist = track.playlist.toLowerCase();
    return terms.reduce((score, term) => {
      if (name.includes(term)) score += 8;
      if (artist.includes(term)) score += 5;
      if (playlist.includes(term)) score += 3;
      return score;
    }, 0);
  }

  private async fetchTracks(
    source: MusicPlaylistSource,
    api: string,
    ttlSec: number,
    force: boolean,
  ): Promise<MusicTrack[]> {
    const key = this.cacheKey(source, api);
    const now = Date.now();
    const hit = this.cache.get(key);
    if (!force && hit && now - hit.fetchedAt < Math.max(60, ttlSec) * 1000) {
      return hit.tracks;
    }
    const cacheVersion =
      (await this.redis.client
        .get('corner:music:cache-version')
        .catch(() => null)) || '1';
    const redisKey = `corner:music:playlist:${cacheVersion}:${createHash('sha256').update(key).digest('hex')}`;
    if (!force) {
      const persistent = await this.redis
        .getJson<CacheEntry>(redisKey)
        .catch(() => null);
      if (persistent?.tracks?.length) {
        this.cache.set(key, persistent);
        return persistent.tracks;
      }
    }

    const base = (api || MUSIC_DEFAULTS.music_api).replace(/\/$/, '');
    const url = `${base}?server=${encodeURIComponent(source.server)}&type=${encodeURIComponent(source.type)}&id=${encodeURIComponent(source.id)}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'corner-blog-music/1.0',
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      if (!res.ok) {
        throw new Error(`meting ${res.status}`);
      }
      const data = await res.json();
      const tracks = this.normalizeTracks(data);
      if (!tracks.length && hit?.tracks?.length) {
        return hit.tracks;
      }
      const entry = { tracks, fetchedAt: now, key };
      this.cache.set(key, entry);
      await this.redis
        .setJson(redisKey, entry, Math.max(60, ttlSec))
        .catch((error: Error) => {
          this.logger.warn(`cache playlist in redis failed: ${error.message}`);
        });
      return tracks;
    } catch (e) {
      this.logger.warn(`fetch playlist failed: ${e}`);
      if (hit?.tracks?.length) return hit.tracks;
      throw new ServiceUnavailableException('歌单拉取失败，请稍后重试');
    }
  }

  private normalizeTracks(data: unknown): MusicTrack[] {
    const list = Array.isArray(data) ? data : (data as any)?.data;
    if (!Array.isArray(list)) return [];

    return list
      .map((item: any) => {
        const name = String(item.name || item.title || item.song || '').trim();
        const artist = String(
          item.artist ||
            item.author ||
            item.ar ||
            (Array.isArray(item.artists) ? item.artists.join(' / ') : '') ||
            '未知歌手',
        ).trim();
        const url = String(item.url || item.src || item.mp3 || '').trim();
        const pic = String(
          item.pic || item.cover || item.picture || item.album?.picUrl || '',
        ).trim();
        const lrc = item.lrc != null ? String(item.lrc) : undefined;
        if (!name || !url) return null;
        return { name, artist, url, pic, lrc };
      })
      .filter(Boolean) as MusicTrack[];
  }

  private coerce(
    key: keyof MusicConfig,
    value: unknown,
  ): MusicConfig[keyof MusicConfig] {
    const def = MUSIC_DEFAULTS[key];
    if (typeof def === 'boolean') {
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === 1 || value === '1') return true;
      if (value === 'false' || value === 0 || value === '0') return false;
      return def;
    }
    if (typeof def === 'number') {
      const n = Number(value);
      return Number.isFinite(n) ? n : def;
    }
    if (Array.isArray(def)) {
      if (Array.isArray(value)) {
        return value
          .map((v: any, index: number) => ({
            name: String(v?.name || '歌单').slice(0, 40),
            server: String(v?.server || 'netease').slice(0, 20),
            type: String(v?.type || 'playlist').slice(0, 20),
            id: String(v?.id || '').slice(0, 64),
            sort: Number.isFinite(Number(v?.sort))
              ? Math.trunc(Number(v.sort))
              : (index + 1) * 10,
            originalIndex: index,
          }))
          .filter((v) => v.id)
          .sort((a, b) => a.sort - b.sort || a.originalIndex - b.originalIndex)
          .map(({ originalIndex: _originalIndex, ...playlist }) => playlist);
      }
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return this.coerce(key, parsed);
          }
        } catch {
          /* keep default */
        }
      }
      return def;
    }
    return value == null ? def : String(value);
  }
}

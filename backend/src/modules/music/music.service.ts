import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
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

  constructor(private settings: SettingsService) {}

  async getConfig(): Promise<MusicConfig & { apiConfigured: boolean }> {
    const all = await this.settings.findAll();
    const cfg = { ...MUSIC_DEFAULTS } as MusicConfig;

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
        },
      ];
    }

    return { ...cfg, apiConfigured: true };
  }

  async updateConfig(partial: Record<string, unknown>) {
    const allowed = new Set<string>(MUSIC_SETTING_KEYS);
    for (const [key, value] of Object.entries(partial)) {
      if (!allowed.has(key)) continue;
      await this.settings.set(key, this.coerce(key as keyof MusicConfig, value));
    }
    this.cache.clear();
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
    };

    if (opts?.playlistIndex != null && cfg.music_playlists[opts.playlistIndex]) {
      source = { ...cfg.music_playlists[opts.playlistIndex] };
    }

    const allTracks = await this.fetchTracks(source, cfg.music_api, cfg.music_cache_ttl, !!opts?.refresh);
    const page = Math.max(1, Number.isFinite(opts?.page) ? Math.floor(opts!.page!) : 1);
    const limit = Math.max(10, Math.min(100, Number.isFinite(opts?.limit) ? Math.floor(opts!.limit!) : 50));
    const total = allTracks.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const tracks = allTracks.slice((page - 1) * limit, page * limit);
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
    return this.getPlaylist({ refresh: true });
  }

  private cacheKey(source: MusicPlaylistSource, api: string) {
    return `${api}|${source.server}|${source.type}|${source.id}`;
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

    const base = (api || MUSIC_DEFAULTS.music_api).replace(/\/$/, '');
    const url = `${base}?server=${encodeURIComponent(source.server)}&type=${encodeURIComponent(source.type)}&id=${encodeURIComponent(source.id)}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'corner-blog-music/1.0' },
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
      this.cache.set(key, { tracks, fetchedAt: now, key });
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
          item.artist || item.author || item.ar || (Array.isArray(item.artists) ? item.artists.join(' / ') : '') || '未知歌手',
        ).trim();
        const url = String(item.url || item.src || item.mp3 || '').trim();
        const pic = String(item.pic || item.cover || item.picture || item.album?.picUrl || '').trim();
        const lrc = item.lrc != null ? String(item.lrc) : undefined;
        if (!name || !url) return null;
        return { name, artist, url, pic, lrc };
      })
      .filter(Boolean) as MusicTrack[];
  }

  private coerce(key: keyof MusicConfig, value: unknown): MusicConfig[keyof MusicConfig] {
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
          .map((v: any) => ({
            name: String(v?.name || '歌单').slice(0, 40),
            server: String(v?.server || 'netease').slice(0, 20),
            type: String(v?.type || 'playlist').slice(0, 20),
            id: String(v?.id || '').slice(0, 64),
          }))
          .filter((v) => v.id) as MusicPlaylistSource[];
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

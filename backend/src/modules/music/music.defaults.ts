export type MusicPlaylistTrack = {
  name: string;
  artist: string;
  url: string;
  pic: string;
  sort?: number;
  lrc?: string;
  mediaId?: string;
};

export type MusicPlaylistSource = {
  name: string;
  server: string;
  type: string;
  id: string;
  sort: number;
  visible?: boolean;
  tracks?: MusicPlaylistTrack[];
};

export type MusicConfig = {
  music_enabled: boolean;
  music_autoplay: boolean;
  music_volume: number;
  music_api: string;
  music_server: string;
  music_type: string;
  music_id: string;
  music_playlists: MusicPlaylistSource[];
  music_cache_ttl: number;
};

export const MUSIC_SETTING_KEYS = [
  'music_enabled',
  'music_autoplay',
  'music_volume',
  'music_api',
  'music_server',
  'music_type',
  'music_id',
  'music_playlists',
  'music_cache_ttl',
] as const;

export const MUSIC_DEFAULTS: MusicConfig = {
  music_enabled: true,
  music_autoplay: false,
  music_volume: 0.55,
  music_api: 'https://api.i-meto.com/meting/api',
  music_server: 'netease',
  music_type: 'playlist',
  music_id: '8043180114',
  music_playlists: [
    {
      name: '默认歌单',
      server: 'netease',
      type: 'playlist',
      id: '8043180114',
      sort: 10,
    },
  ],
  music_cache_ttl: 21600,
};

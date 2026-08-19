import { MusicService } from './music.service';

describe('MusicService playlist ordering', () => {
  it('backfills legacy weights and sorts playlists consistently', async () => {
    const settings = {
      findAll: jest.fn().mockResolvedValue({
        music_playlists: [
          {
            name: '第三',
            server: 'netease',
            type: 'playlist',
            id: '3',
            sort: 30,
          },
          {
            name: '第一',
            server: 'netease',
            type: 'playlist',
            id: '1',
            sort: 10,
          },
          { name: '旧数据', server: 'netease', type: 'playlist', id: 'legacy' },
        ],
      }),
    };
    const redis = { client: { incr: jest.fn() } } as any;
    const service = new MusicService(settings as any, redis, {} as any);

    const config = await service.getConfig();

    expect(config.music_playlists.map((playlist) => playlist.id)).toEqual([
      '1',
      '3',
      'legacy',
    ]);
    expect(config.music_playlists.map((playlist) => playlist.sort)).toEqual([
      10, 30, 30,
    ]);
  });

  it('keeps direct media URLs and exposes proxy fallbacks for AI recommendations', async () => {
    const settings = {
      findAll: jest.fn().mockResolvedValue({
        music_enabled: true,
        music_playlists: [
          {
            name: '本地精选',
            server: 'local',
            type: 'custom',
            id: 'custom',
            tracks: [
              {
                name: '测试歌曲',
                artist: '测试歌手',
                url: 'https://media.example.com/song.mp3',
                pic: 'https://media.example.com/cover.jpg',
              },
            ],
          },
        ],
      }),
    };
    const redis = { client: { incr: jest.fn() } } as any;
    const service = new MusicService(settings as any, redis, {} as any);

    const [track] = await service.getRecommendedTracks('播放测试歌曲', 1);

    expect(track.url).toBe('https://media.example.com/song.mp3');
    expect(track.pic).toBe('https://media.example.com/cover.jpg');
    expect(track.proxyUrl).toContain('/api/music/proxy?');
    expect(track.proxyPic).toContain('/api/music/proxy?');
  });
});

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
    const service = new MusicService(settings as any, redis);

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
});

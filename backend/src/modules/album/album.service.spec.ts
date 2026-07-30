import { AlbumService } from './album.service';

describe('AlbumService public mapping', () => {
  const service = new AlbumService({} as any);

  it('does not expose raw EXIF or private photo location', () => {
    const album = {
      id: 'album-1',
      title: '测试相册',
      slug: 'test-album',
      description: null,
      happenedAt: null,
      publishedAt: new Date('2026-07-31T00:00:00Z'),
      locationVisibility: 'private',
      locationPrecision: 'place',
      locationExactConfirmedAt: null,
      place: null,
      coverMedia: null,
      author: { id: 'user-1', username: 'admin', avatar: null },
      items: [{
        id: 'item-1',
        sort: 0,
        caption: '照片',
        happenedAt: null,
        locationVisibility: 'private',
        locationPrecision: 'exact',
        locationExactConfirmedAt: null,
        place: null,
        moment: null,
        media: {
          id: 'media-1',
          path: '/uploads/album/photo.webp',
          originalPath: '/uploads/album/original/photo.jpg',
          metadata: {
            rawExif: { GPSInfo: { GPSLatitude: [30, 0, 0] } },
            latitude: 30,
            longitude: 120,
            confirmedPlace: { id: 'place-1', name: '私密地点', slug: 'private-place', latitude: 30, longitude: 120, type: 'poi' },
          },
        },
      }],
    };

    const result = (service as any).formatPublic(album, true);
    expect(result.items[0]).toEqual(expect.objectContaining({ publicLocation: null }));
    expect(result.items[0].media).toEqual({ id: 'media-1', path: '/uploads/album/photo.webp', width: undefined, height: undefined });
    expect(JSON.stringify(result)).not.toContain('originalPath');
    expect(JSON.stringify(result)).not.toContain('rawExif');
    expect(JSON.stringify(result)).not.toContain('私密地点');
  });
});

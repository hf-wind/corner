import { buildPublicLocation, type PlaceSnapshot } from './public-location';

const place: PlaceSnapshot = {
  id: '9ff36ed1-cf10-43e8-9c67-17967a676202',
  name: '鲁迅故里',
  slug: 'luxun-native-place',
  address: '浙江省绍兴市越城区鲁迅中路',
  city: '绍兴市',
  province: '浙江省',
  country: '中国',
  latitude: 29.993445,
  longitude: 120.582112,
  type: 'poi',
};

describe('buildPublicLocation', () => {
  it('returns no location clues for a private place', () => {
    expect(
      buildPublicLocation({
        place,
        visibility: 'private',
        precision: 'place',
      }),
    ).toBeNull();
  });

  it('returns stable reduced coordinates for a blurred place', () => {
    const result = buildPublicLocation({
      place,
      visibility: 'blurred',
      precision: 'place',
    });
    expect(result).toMatchObject({
      name: place.name,
      slug: place.slug,
      precision: 'place',
    });
    expect(result?.latitude).not.toBe(place.latitude);
    expect(result?.longitude).not.toBe(place.longitude);
    expect(result).not.toHaveProperty('address');
  });

  it('does not expose exact coordinates without confirmation', () => {
    expect(
      buildPublicLocation({
        place,
        visibility: 'public',
        precision: 'exact',
      }),
    ).toBeNull();
  });

  it('returns exact coordinates only after confirmation', () => {
    expect(
      buildPublicLocation({
        place,
        visibility: 'public',
        precision: 'exact',
        exactConfirmedAt: '2026-07-30T12:00:00.000Z',
      }),
    ).toMatchObject({
      name: place.name,
      slug: place.slug,
      latitude: place.latitude,
      longitude: place.longitude,
      precision: 'exact',
    });
  });
});

import { distanceInMeters, toGcj02, toWgs84 } from './coordinates';

describe('coordinate helpers', () => {
  it('round-trips a Shaoxing coordinate between WGS84 and GCJ-02', () => {
    const source = { longitude: 120.582112, latitude: 29.993445 };
    const gcj = toGcj02(source.longitude, source.latitude);
    const restored = toWgs84(gcj.longitude, gcj.latitude, 'gcj02');
    expect(distanceInMeters(source, restored)).toBeLessThan(5);
  });

  it('keeps WGS84 input unchanged', () => {
    expect(toWgs84(120.5, 30, 'wgs84')).toEqual({ longitude: 120.5, latitude: 30 });
  });
});

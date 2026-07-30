import coordtransform from 'coordtransform';

export type CoordinateSystem = 'wgs84' | 'gcj02';

export function toWgs84(longitude: number, latitude: number, source: CoordinateSystem) {
  if (source === 'wgs84') return { longitude, latitude };
  const [nextLongitude, nextLatitude] = coordtransform.gcj02towgs84(longitude, latitude);
  return { longitude: nextLongitude, latitude: nextLatitude };
}

export function toGcj02(longitude: number, latitude: number) {
  const [nextLongitude, nextLatitude] = coordtransform.wgs84togcj02(longitude, latitude);
  return { longitude: nextLongitude, latitude: nextLatitude };
}

export function distanceInMeters(
  left: { longitude: number; latitude: number },
  right: { longitude: number; latitude: number },
) {
  const earthRadius = 6_371_000;
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(left.latitude)) *
      Math.cos(radians(right.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

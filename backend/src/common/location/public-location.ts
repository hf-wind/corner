export type LocationVisibility = 'public' | 'blurred' | 'private';
export type LocationPrecision = 'exact' | 'place' | 'city' | 'province';
export type LocationSource = 'manual' | 'exif' | 'map' | 'imported';

export type PlaceSnapshot = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  type: string;
};

export type PublicLocation = {
  name: string;
  slug?: string;
  city?: string;
  province?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  precision: LocationPrecision;
};

type LocationInput = {
  place: PlaceSnapshot | null;
  visibility: LocationVisibility;
  precision: LocationPrecision;
  exactConfirmedAt?: string | Date | null;
};

function rounded(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

export function buildPublicLocation(
  input: LocationInput,
): PublicLocation | null {
  const { place, visibility, precision, exactConfirmedAt } = input;
  if (!place || visibility === 'private') return null;

  if (visibility === 'public' && precision === 'exact' && exactConfirmedAt) {
    return {
      name: place.name,
      slug: place.slug,
      city: place.city || undefined,
      province: place.province || undefined,
      country: place.country || undefined,
      latitude: place.latitude,
      longitude: place.longitude,
      precision,
    };
  }

  if (visibility !== 'blurred' || precision === 'exact') return null;

  if (precision === 'city') {
    return {
      name: place.city || place.province || place.country || '位置已模糊',
      city: place.city || undefined,
      province: place.province || undefined,
      country: place.country || undefined,
      latitude: rounded(place.latitude, 1),
      longitude: rounded(place.longitude, 1),
      precision,
    };
  }

  if (precision === 'province') {
    return {
      name: place.province || place.country || '位置已模糊',
      province: place.province || undefined,
      country: place.country || undefined,
      latitude: rounded(place.latitude, 0),
      longitude: rounded(place.longitude, 0),
      precision,
    };
  }

  return {
    name: place.name,
    slug: place.slug,
    city: place.city || undefined,
    province: place.province || undefined,
    country: place.country || undefined,
    latitude: rounded(place.latitude, 2),
    longitude: rounded(place.longitude, 2),
    precision: 'place',
  };
}

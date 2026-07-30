import type { PublicLocation } from '../../common/location/public-location';

export type MapMemoryType = 'moment' | 'album' | 'photo';

export type PublicMapMemory = {
  id: string;
  type: MapMemoryType;
  title: string;
  excerpt?: string | null;
  occurredAt?: string | Date | null;
  href: string;
  thumbnail?: string | null;
  publicLocation: PublicLocation;
};

import { BadRequestException } from '@nestjs/common';
import type {
  LocationPrecision,
  LocationSource,
  LocationVisibility,
} from './public-location';

export type SpacetimeInput = {
  placeId?: string | null;
  occurredAt?: string | null;
  locationVisibility?: LocationVisibility;
  locationPrecision?: LocationPrecision;
  locationSource?: LocationSource | null;
  confirmExactLocation?: boolean;
};

export type ExistingSpacetime = {
  placeId: string | null;
  occurredAt?: Date | null;
  locationVisibility: string;
  locationPrecision: string;
  locationSource: string | null;
  locationExactConfirmedAt: Date | null;
};

export function locationVisibility(value?: string | null): LocationVisibility {
  return value === 'public' || value === 'blurred' ? value : 'private';
}

export function locationPrecision(value?: string | null): LocationPrecision {
  return value === 'exact' || value === 'city' || value === 'province'
    ? value
    : 'place';
}

export function locationSource(value?: string | null): LocationSource | null {
  return value === 'manual' ||
    value === 'exif' ||
    value === 'map' ||
    value === 'imported'
    ? value
    : null;
}

export async function prepareSpacetime(
  dto: SpacetimeInput,
  existing: ExistingSpacetime | undefined,
  assertPlace: (placeId: string) => Promise<void>,
) {
  const placeId = dto.placeId !== undefined ? dto.placeId : existing?.placeId;
  const visibility = locationVisibility(
    dto.locationVisibility ?? existing?.locationVisibility,
  );
  const precision = locationPrecision(
    dto.locationPrecision ?? existing?.locationPrecision,
  );
  if (placeId) await assertPlace(placeId);
  if (!placeId && visibility !== 'private')
    throw new BadRequestException('公开位置前必须先选择地点');
  if (visibility === 'public' && precision !== 'exact')
    throw new BadRequestException('精确公开必须使用精确坐标');
  if (visibility === 'blurred' && precision === 'exact')
    throw new BadRequestException('模糊公开不能使用精确坐标');

  const exactChanged =
    Boolean(existing) &&
    (placeId !== existing?.placeId ||
      visibility !== existing?.locationVisibility ||
      precision !== existing?.locationPrecision);
  let exactConfirmedAt: Date | null | undefined;
  if (visibility === 'public' && precision === 'exact') {
    if (dto.confirmExactLocation) exactConfirmedAt = new Date();
    else if (!existing || exactChanged || !existing.locationExactConfirmedAt) {
      throw new BadRequestException('精确公开位置需要二次确认');
    }
  } else if (
    existing ||
    dto.locationVisibility !== undefined ||
    dto.locationPrecision !== undefined
  ) {
    exactConfirmedAt = null;
  }

  return {
    ...(dto.placeId !== undefined || !existing
      ? { placeId: dto.placeId ?? null }
      : {}),
    ...(dto.occurredAt !== undefined || !existing
      ? { occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : null }
      : {}),
    ...(dto.locationVisibility !== undefined || !existing
      ? { locationVisibility: visibility }
      : {}),
    ...(dto.locationPrecision !== undefined || !existing
      ? { locationPrecision: precision }
      : {}),
    ...(dto.locationSource !== undefined || !existing
      ? {
          locationSource: placeId
            ? (dto.locationSource ?? existing?.locationSource ?? 'manual')
            : null,
        }
      : {}),
    ...(exactConfirmedAt !== undefined
      ? { locationExactConfirmedAt: exactConfirmedAt }
      : {}),
  };
}

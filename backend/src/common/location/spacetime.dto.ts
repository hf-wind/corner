import { IsBoolean, IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class SpacetimeDto {
  @IsOptional() @IsUUID() placeId?: string | null;
  @IsOptional() @IsDateString() occurredAt?: string | null;
  @IsOptional() @IsIn(['public', 'blurred', 'private']) locationVisibility?: 'public' | 'blurred' | 'private';
  @IsOptional() @IsIn(['exact', 'place', 'city', 'province']) locationPrecision?: 'exact' | 'place' | 'city' | 'province';
  @IsOptional() @IsIn(['manual', 'exif', 'map', 'imported']) locationSource?: 'manual' | 'exif' | 'map' | 'imported' | null;
  @IsOptional() @IsBoolean() confirmExactLocation?: boolean;
}

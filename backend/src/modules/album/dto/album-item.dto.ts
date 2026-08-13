import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class AlbumItemDto {
  @IsUUID()
  mediaId: string;

  @IsInt()
  @Min(0)
  sort: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string | null;

  @IsOptional()
  @IsDateString()
  happenedAt?: string | null;

  @IsOptional()
  @IsUUID()
  placeId?: string | null;

  @IsOptional()
  @IsUUID()
  momentId?: string | null;

  @IsOptional()
  @IsIn(['public', 'blurred', 'private'])
  locationVisibility?: 'public' | 'blurred' | 'private';

  @IsOptional()
  @IsIn(['exact', 'place', 'city', 'province'])
  locationPrecision?: 'exact' | 'place' | 'city' | 'province';

  @IsOptional()
  @IsIn(['manual', 'exif', 'map', 'imported'])
  locationSource?: 'manual' | 'exif' | 'map' | 'imported' | null;

  @IsOptional()
  @IsDateString()
  locationExactConfirmedAt?: string | null;
}

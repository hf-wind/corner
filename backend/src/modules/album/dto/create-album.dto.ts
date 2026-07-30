import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { AlbumItemDto } from './album-item.dto';

export class CreateAlbumDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(255)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsUUID()
  coverMediaId?: string | null;

  @IsOptional()
  @IsDateString()
  happenedAt?: string | null;

  @IsOptional()
  @IsUUID()
  placeId?: string | null;

  @IsOptional()
  @IsIn(['public', 'blurred', 'private'])
  locationVisibility?: 'public' | 'blurred' | 'private';

  @IsOptional()
  @IsIn(['exact', 'place', 'city', 'province'])
  locationPrecision?: 'exact' | 'place' | 'city' | 'province';

  @IsOptional()
  @IsDateString()
  locationExactConfirmedAt?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlbumItemDto)
  items?: AlbumItemDto[];
}

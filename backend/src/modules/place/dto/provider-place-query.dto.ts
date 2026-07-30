import { Type } from 'class-transformer';
import { IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ProviderSearchQueryDto {
  @IsString()
  @MaxLength(100)
  keywords: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(25)
  @Type(() => Number)
  limit?: number = 10;
}

export class ProviderReverseQueryDto {
  @IsLongitude()
  @Type(() => Number)
  longitude: number;

  @IsLatitude()
  @Type(() => Number)
  latitude: number;

  @IsOptional()
  @IsIn(['wgs84', 'gcj02'])
  coordinateSystem?: 'wgs84' | 'gcj02' = 'gcj02';
}

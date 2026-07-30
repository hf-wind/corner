import { IsIn, IsLatitude, IsLongitude, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePlaceDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string | null;

  @IsLongitude()
  longitude: number;

  @IsLatitude()
  latitude: number;

  @IsOptional()
  @IsIn(['wgs84', 'gcj02'])
  coordinateSystem?: 'wgs84' | 'gcj02' = 'wgs84';

  @IsOptional()
  @IsIn(['poi', 'city', 'region', 'route-stop'])
  type?: 'poi' | 'city' | 'region' | 'route-stop' = 'poi';

  @IsOptional()
  @IsUUID()
  coverMediaId?: string | null;
}

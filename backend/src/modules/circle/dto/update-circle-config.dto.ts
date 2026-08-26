import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCircleConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @IsOptional()
  @IsIn(['random', 'fixed'])
  coverMode?: 'random' | 'fixed';

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  covers?: string[];

  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(80)
  maxItems?: number;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  cacheTtl?: number;
}

import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsBoolean,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PostQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sort?: 'latest' | 'popular' | 'oldest';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  archive?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  featured?: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  needsPublish?: boolean;
}

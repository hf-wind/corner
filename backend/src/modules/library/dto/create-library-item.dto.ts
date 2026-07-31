import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SpacetimeDto } from '../../../common/location/spacetime.dto';

export class CreateLibraryItemDto extends SpacetimeDto {
  @IsIn(['book', 'film'])
  type: 'book' | 'film';

  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(255)
  slug: string;

  @IsOptional() @IsString() @MaxLength(255) originalTitle?: string;
  @IsOptional() @IsString() coverImage?: string;
  @IsOptional() @IsString() @MaxLength(255) creator?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() reflection?: string;

  @IsOptional() @IsArray() @IsString({ each: true }) highlights?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) quotes?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) genres?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) cast?: string[];

  @IsOptional() @IsIn(['draft', 'published']) publishStatus?: 'draft' | 'published';
  @IsOptional() @IsString() @MaxLength(30) progressStatus?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(10) rating?: number;
  @IsOptional() @IsInt() @Min(1) rank?: number;
  @IsOptional() @IsBoolean() recommended?: boolean;
  @IsOptional() @IsDateString() experienceDate?: string;
  @IsOptional() @IsInt() @Min(1000) @Max(3000) releaseYear?: number;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(100) language?: string;

  @IsOptional() @IsString() @MaxLength(255) director?: string;
  @IsOptional() @IsInt() @Min(1) runtimeMinutes?: number;
  @IsOptional() @IsInt() @Min(1) episodeCount?: number;
  @IsOptional() @IsString() @MaxLength(100) platform?: string;
}

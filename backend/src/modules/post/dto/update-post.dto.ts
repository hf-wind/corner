import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { SpacetimeDto } from '../../../common/location/spacetime.dto';

export class UpdatePostDto extends SpacetimeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}

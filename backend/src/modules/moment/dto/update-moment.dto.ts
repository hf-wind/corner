import { IsOptional, IsString, MaxLength } from 'class-validator';
import { MomentLocationDto } from './moment-location.dto';

export class UpdateMomentDto extends MomentLocationDto {
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
}

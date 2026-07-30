import { IsOptional, IsString, MaxLength } from 'class-validator';
import { MomentLocationDto } from './moment-location.dto';

export class CreateMomentDto extends MomentLocationDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(255)
  slug: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  excerpt?: string;
}

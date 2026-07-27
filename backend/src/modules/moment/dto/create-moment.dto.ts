import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMomentDto {
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

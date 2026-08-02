import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsString()
  @MaxLength(50)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string | null;
}

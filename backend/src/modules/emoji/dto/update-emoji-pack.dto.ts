import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class UpdateEmojiPackDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  compressAnimated?: boolean;
}

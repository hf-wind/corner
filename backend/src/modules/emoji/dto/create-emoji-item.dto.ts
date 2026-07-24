import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateEmojiItemDto {
  @IsString()
  packId: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  char?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  sort?: number;
}

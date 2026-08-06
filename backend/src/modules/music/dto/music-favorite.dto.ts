import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MusicFavoriteDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(255)
  artist!: string;

  @IsString()
  @MaxLength(4096)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  pic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200000)
  lrc?: string;
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveMusicCoverDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  artist?: string;
}

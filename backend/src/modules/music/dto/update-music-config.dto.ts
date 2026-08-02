import { IsObject, IsOptional } from 'class-validator';

export class UpdateMusicConfigDto {
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

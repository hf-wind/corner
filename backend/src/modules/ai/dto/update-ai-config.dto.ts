import { IsObject } from 'class-validator';

export class UpdateAiConfigDto {
  @IsObject()
  config: Record<string, unknown>;
}

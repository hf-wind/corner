import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAiModelConfigDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  provider: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsString()
  baseUrl: string;

  @IsString()
  @MaxLength(150)
  model: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}

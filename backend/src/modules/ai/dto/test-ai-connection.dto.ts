import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TestAiConnectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelConfigId?: string;
}

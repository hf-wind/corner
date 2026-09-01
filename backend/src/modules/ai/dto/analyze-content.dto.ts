import { IsOptional, IsString } from 'class-validator';

export class AnalyzeContentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  content!: string;
}

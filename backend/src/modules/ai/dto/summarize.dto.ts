import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SummarizeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsString()
  content: string;
}

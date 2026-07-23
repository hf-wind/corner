import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PreviewKnowledgeDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  query?: string;
}

import { IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateArticleDto {
  @IsString()
  @MinLength(4)
  @MaxLength(8000)
  outline: string;
}

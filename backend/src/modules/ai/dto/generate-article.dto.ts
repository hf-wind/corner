import { IsString, MinLength } from 'class-validator';

export class GenerateArticleDto {
  @IsString()
  @MinLength(4)
  outline: string;
}

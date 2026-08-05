import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChatArticleDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  sourceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  scene?: string;
}

export class ChatDto {
  @IsString()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChatArticleDto)
  article?: ChatArticleDto;
}

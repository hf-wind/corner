import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SelectConstellationKnowledgeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  planetId: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  knowledge: string[];
}

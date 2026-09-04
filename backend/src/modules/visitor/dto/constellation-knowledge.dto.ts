import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SelectConstellationKnowledgeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  planetId: string;
}

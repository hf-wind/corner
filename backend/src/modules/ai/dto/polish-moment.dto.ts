import { IsString, MinLength } from 'class-validator';

export class PolishMomentDto {
  @IsString()
  @MinLength(2)
  inspiration: string;
}

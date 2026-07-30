import { IsString, MaxLength, MinLength } from 'class-validator';

export class PolishMomentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  inspiration: string;
}

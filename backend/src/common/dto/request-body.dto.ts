import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AssignPostIdsDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  postIds: string[];
}

export class OptionalReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

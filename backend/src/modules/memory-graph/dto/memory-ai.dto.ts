import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SuggestMemoryRelationsDto {
  @IsString() sourceId!: string;
}

export class RecommendStoryDto {
  @IsString() theme!: string;
  @IsOptional() @IsInt() @Min(1) @Max(60) durationMinutes?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) nodeIds?: string[];
}

export class GenerateNarrationDto {
  @IsArray() @IsString({ each: true }) nodeIds!: string[];
  @IsOptional() @IsString() theme?: string;
}

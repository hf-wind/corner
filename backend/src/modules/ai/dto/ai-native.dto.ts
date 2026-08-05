import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AiExploreDto {
  @IsString() @MaxLength(500) query!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) types?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) limit?: number;
}

export class AiEventDto {
  @IsString() @MaxLength(30) scene!: string;
  @IsString() @MaxLength(30) action!: string;
  @IsOptional() @IsString() @MaxLength(30) contentType?: string;
  @IsOptional() @IsString() @MaxLength(180) sourceId?: string;
  @IsOptional() @IsString() @MaxLength(500) href?: string;
  @IsOptional() @IsBoolean() helpful?: boolean;
  @IsOptional() @IsBoolean() continued?: boolean;
  @IsOptional() @IsBoolean() sourceClicked?: boolean;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(86400000)
  durationMs?: number;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class AiWriteTransformDto {
  @IsString() @MaxLength(12000) text!: string;
  @IsIn(['polish', 'expand', 'compress']) action!:
    'polish' | 'expand' | 'compress';
}

export class AiNarrativeDto {
  @IsIn(['weekly', 'monthly', 'yearly', 'route']) kind!:
    'weekly' | 'monthly' | 'yearly' | 'route';
  @IsOptional() @IsString() @MaxLength(200) theme?: string;
  @IsOptional() @IsString() start?: string;
  @IsOptional() @IsString() end?: string;
  @IsOptional() @IsString() @MaxLength(100) place?: string;
}

export class AiPrivateQueryDto {
  @IsString() @MaxLength(500) query!: string;
}

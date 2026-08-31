import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateChangelogConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  @MaxLength(100)
  repositoryOwner?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  @MaxLength(100)
  repositoryName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_./-]+$/)
  @MaxLength(180)
  branch?: string;

  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(86400)
  cacheTtl?: number;

  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(30)
  maxGroups?: number;
}

export class ChangelogManualItemDto {
  @IsString()
  @MaxLength(240)
  text: string;
}

export class UpsertChangelogEntryDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  summary?: string;

  @IsDateString()
  publishedAt: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChangelogManualItemDto)
  items: ChangelogManualItemDto[];
}

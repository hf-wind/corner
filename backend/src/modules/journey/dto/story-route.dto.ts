import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class StoryStepDto {
  @IsOptional() @IsUUID() id?: string;
  @IsOptional() @IsString() nodeId?: string | null;
  @IsOptional() @IsUUID() placeId?: string | null;
  @IsOptional() @IsUUID() photoMediaId?: string | null;
  @IsInt() @Min(0) sort!: number;
  @IsOptional() @IsString() title?: string | null;
  @IsOptional() @IsString() narration?: string | null;
  @IsOptional() @IsString() musicUrl?: string | null;
  @IsOptional() @IsNumber() @Min(0) musicStartSec?: number | null;
  @IsOptional() @IsNumber() @Min(0) musicEndSec?: number | null;
  @IsOptional() @IsInt() @Min(2) @Max(300) durationSec?: number;
  @IsOptional()
  @IsIn(['public', 'blurred', 'private'])
  locationVisibility?: string;
  @IsOptional()
  @IsIn(['exact', 'place', 'city', 'province'])
  locationPrecision?: string;
  @IsOptional() @IsString() locationExactConfirmedAt?: string | null;
}

export class SaveStoryRouteDto {
  @IsString() title!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsIn(['draft', 'published', 'private']) status?: string;
  @IsOptional() @IsString() coverImage?: string | null;
  @IsOptional() @IsUUID() journeyId?: string | null;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoryStepDto)
  steps?: StoryStepDto[];
}

import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class JourneyStopDto {
  @IsOptional() @IsUUID() id?: string;
  @IsOptional() @IsUUID() placeId?: string | null;
  @IsInt() @Min(0) sort!: number;
  @IsString() title!: string;
  @IsOptional() @IsString() narration?: string | null;
  @IsOptional() @IsString() occurredAt?: string | null;
  @IsOptional()
  @IsIn(['public', 'blurred', 'private'])
  locationVisibility?: string;
  @IsOptional()
  @IsIn(['exact', 'place', 'city', 'province'])
  locationPrecision?: string;
  @IsOptional() @IsString() locationExactConfirmedAt?: string | null;
}

export class SaveJourneyDto {
  @IsString() title!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsIn(['draft', 'published', 'private']) status?: string;
  @IsOptional() @IsString() coverImage?: string | null;
  @IsOptional() @IsString() happenedAt?: string | null;
  @IsOptional() @IsString() endedAt?: string | null;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JourneyStopDto)
  stops?: JourneyStopDto[];
}

export class JourneyQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

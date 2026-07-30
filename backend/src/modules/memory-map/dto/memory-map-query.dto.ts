import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class MemoryMapQueryDto {
  @IsNumber() @Min(-180) @Max(180) @Type(() => Number) west!: number;
  @IsNumber() @Min(-90) @Max(90) @Type(() => Number) south!: number;
  @IsNumber() @Min(-180) @Max(180) @Type(() => Number) east!: number;
  @IsNumber() @Min(-90) @Max(90) @Type(() => Number) north!: number;
  @IsNumber() @Min(1) @Max(20) @Type(() => Number) zoom!: number;

  @IsOptional() @IsString() types?: string;
  @IsOptional() @IsInt() @Min(1900) @Max(3000) @Type(() => Number) year?: number;
  @IsOptional() @IsString() place?: string;
}

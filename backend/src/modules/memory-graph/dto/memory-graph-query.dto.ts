import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class MemoryGraphQueryDto {
  @IsOptional() @IsString() types?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1900)
  @Max(2200)
  year?: number;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

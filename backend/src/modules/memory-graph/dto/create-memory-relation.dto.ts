import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateMemoryRelationDto {
  @IsString() sourceId!: string;
  @IsString() targetId!: string;
  @IsString() type!: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1) weight?: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsIn(['manual', 'ai']) origin?: 'manual' | 'ai';
}

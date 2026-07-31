import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateMemoryRelationDto {
  @IsOptional() @IsBoolean() hidden?: boolean;
  @IsOptional() @IsIn(['active', 'candidate', 'rejected']) status?:
    'active' | 'candidate' | 'rejected';
}

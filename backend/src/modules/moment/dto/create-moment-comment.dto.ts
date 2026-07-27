import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMomentCommentDto {
  @IsUUID()
  momentId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

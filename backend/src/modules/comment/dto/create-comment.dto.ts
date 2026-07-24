import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsUUID()
  postId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

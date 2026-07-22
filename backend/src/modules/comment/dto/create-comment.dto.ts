import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  postId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  authorName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  authorEmail?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

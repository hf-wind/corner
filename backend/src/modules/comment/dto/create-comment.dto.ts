import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCommentDto {
  @IsUUID()
  postId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

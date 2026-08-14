import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  VISITOR_BOTTLE_MAX_LENGTH,
  VISITOR_MESSAGE_MAX_LENGTH,
  VISITOR_NICKNAME_MAX_LENGTH,
} from '../visitor.constants';

export class CreateVisitorMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(VISITOR_MESSAGE_MAX_LENGTH)
  content: string;
}

export class CreateVisitorBottleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(VISITOR_BOTTLE_MAX_LENGTH)
  content: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class ReplyVisitorBottleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(VISITOR_BOTTLE_MAX_LENGTH)
  content: string;
}

export class SetVisitorNicknameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(VISITOR_NICKNAME_MAX_LENGTH)
  nickname: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  turnstileToken?: string;
}

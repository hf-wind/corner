import { IsEmail, IsString, MinLength, IsOptional, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}

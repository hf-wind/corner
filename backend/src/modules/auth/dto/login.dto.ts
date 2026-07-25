import { IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MinLength(6)
  code?: string;
}

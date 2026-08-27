import { IsString, IsEmail, IsOptional } from 'class-validator'

export class GitHubLoginDto {
  @IsString()
  id: string

  @IsEmail()
  email: string

  @IsString()
  @IsOptional()
  username?: string

  @IsString()
  @IsOptional()
  avatar?: string
}

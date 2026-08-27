import { IsString, IsEmail, IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

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

export class GitHubLoginRequestDto {
  @ValidateNested()
  @Type(() => GitHubLoginDto)
  githubUser: GitHubLoginDto
}

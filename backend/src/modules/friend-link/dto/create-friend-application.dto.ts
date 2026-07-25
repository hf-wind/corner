import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';

export class CreateFriendApplicationDto {
  @IsString()
  @MaxLength(100)
  siteName: string;

  @IsString()
  siteUrl: string;

  @IsString()
  @IsOptional()
  siteAvatar?: string;

  @IsString()
  @IsOptional()
  siteDescription?: string;

  @IsString()
  @IsOptional()
  siteRssUrl?: string;

  @IsEmail()
  contactEmail: string;

  @IsString()
  friendPageUrl: string;
}

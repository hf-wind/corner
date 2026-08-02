import { IsOptional, IsString, MaxLength } from 'class-validator';

export class InspectSiteDto {
  @IsString()
  @MaxLength(2048)
  url: string;
}

export class UpdateMySiteInfoDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(2048)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  rssUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  contactEmail?: string;
}

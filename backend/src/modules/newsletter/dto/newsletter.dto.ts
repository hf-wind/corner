import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SubscribeDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class NewsletterTokenDto {
  @IsString()
  @Matches(/^[a-f0-9]{16,64}$/i)
  token: string;
}

export class AdminCreateSubscriberDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class UpdateSubscriberStatusDto {
  @IsIn(['pending', 'active', 'unsubscribed'])
  status: string;
}

export class UpdateNewsletterConfigDto {
  @IsOptional()
  @IsIn([true, false])
  enabled?: boolean;

  @IsOptional()
  @IsIn([1, 2, 3, 4, 5, 6, 7])
  day?: number;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'time 需为 HH:mm 格式' })
  time?: string;
}

import { IsEmail, IsString } from 'class-validator';

export class SendRemoveCodeDto {
  @IsEmail()
  email: string;
}

export class VerifyRemoveDto {
  @IsEmail()
  email: string;

  @IsString()
  code: string;
}

import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  IsEmail,
  IsString,
  IsIn,
  MinLength,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { TurnstileService } from './turnstile.service';

class SendCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['register', 'login', 'change_password'])
  type: 'register' | 'login' | 'change_password';

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}

class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  newPassword: string;

  @IsString()
  code: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private turnstile: TurnstileService,
  ) {}

  @Post('send-code')
  async sendCode(@Body() dto: SendCodeDto, @Req() req: any) {
    await this.turnstile.verify(dto.turnstileToken, req.ip);
    return this.auth.sendVerificationCode(dto.email, dto.type);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    await this.turnstile.verify(dto.turnstileToken, req.ip);
    return this.auth.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    await this.turnstile.verify(dto.turnstileToken, req.ip);
    return this.auth.login(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  profile(@Req() req: any) {
    return this.auth.profile(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(
      req.user.id,
      req.user.email,
      dto.newPassword,
      dto.code,
    );
  }
}

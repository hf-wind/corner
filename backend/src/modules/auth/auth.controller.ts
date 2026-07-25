import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { IsEmail, IsString, IsIn, MinLength } from 'class-validator';

class SendCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['register', 'login', 'change_password'])
  type: 'register' | 'login' | 'change_password';
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
  constructor(private auth: AuthService) {}

  @Post('send-code')
  sendCode(@Body() dto: SendCodeDto) {
    return this.auth.sendVerificationCode(dto.email, dto.type);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
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
    return this.auth.changePassword(req.user.id, req.user.email, dto.newPassword, dto.code);
  }
}

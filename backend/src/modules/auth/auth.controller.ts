import { BadRequestException, Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GitHubLoginRequestDto } from './dto/github-login.dto';
import {
  IsEmail,
  IsString,
  IsIn,
  MinLength,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { GeetestService } from './geetest.service';

class SendCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['register', 'login', 'change_password'])
  type: 'register' | 'login' | 'change_password';

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  geetestToken?: string;
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
    private geetest: GeetestService,
  ) {}

  // 极验启用时强制要求前端先完成人机验证，防止跳过校验直接请求
  private async enforceGeetest(token?: string, ip?: string) {
    if (this.geetest.isEnabled() && !token) {
      throw new BadRequestException('请完成人机验证');
    }
    if (token) {
      await this.geetest.verify(token, ip);
    }
  }

  @Post('send-code')
  async sendCode(@Body() dto: SendCodeDto, @Req() req: any) {
    await this.enforceGeetest(dto.geetestToken, req.ip);
    return this.auth.sendVerificationCode(dto.email, dto.type);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    await this.enforceGeetest(dto.geetestToken, req.ip);
    return this.auth.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    if (!dto.code) {
      await this.enforceGeetest(dto.geetestToken, req.ip);
    }
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

  @Post('github')
  async githubLogin(@Body() body: GitHubLoginRequestDto, @Req() req: any) {
    await this.enforceGeetest(body.geetestToken, req.ip);
    return this.auth.githubLogin(body.githubUser);
  }
}

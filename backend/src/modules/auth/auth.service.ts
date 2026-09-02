import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GitHubUser } from './types/github-user.type';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs';

type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  avatar?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private emailService: EmailService,
    private userService: UserService,
  ) {}

  async sendVerificationCode(
    email: string,
    type: 'register' | 'login' | 'change_password',
  ) {
    if (type === 'register') {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) throw new ConflictException('该邮箱已被注册');
    }

    if (type === 'login') {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) throw new BadRequestException('该邮箱未注册');
      if (!user.isActive) throw new BadRequestException('账号已被禁用');
    }

    if (type === 'change_password') {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) throw new BadRequestException('该邮箱未注册');
      if (!user.isActive) throw new BadRequestException('账号已被禁用');
    }

    return this.emailService.sendVerificationCode(email, type);
  }

  async register(dto: RegisterDto) {
    const validCode = await this.emailService.verifyCode(
      dto.email,
      dto.code,
      'register',
    );
    if (!validCode) throw new BadRequestException('验证码无效或已过期');

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already exists');

    const username = await this.generateUsername(dto.email);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        username,
        email: dto.email,
        passwordHash,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        role: 'user',
      },
    });

    return this.token(user);
  }

  async login(dto: LoginDto & { code?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('账号已被禁用');

    if (dto.code) {
      const valid = await this.emailService.verifyCode(
        dto.email,
        dto.code,
        'login',
      );
      if (!valid) throw new BadRequestException('验证码无效或已过期');
    } else if (dto.password) {
      const valid = await bcrypt.compare(dto.password, user.passwordHash);
      if (!valid) throw new UnauthorizedException('Invalid credentials');
    } else {
      throw new BadRequestException('请提供密码或验证码');
    }

    return this.token(user);
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
      },
    });
    return user;
  }

  async changePassword(
    userId: string,
    email: string,
    newPassword: string,
    code: string,
  ) {
    const valid = await this.emailService.verifyCode(
      email,
      code,
      'change_password',
    );
    if (!valid) throw new BadRequestException('验证码无效或已过期');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true, message: '密码修改成功' };
  }

  async githubLogin(githubUser: GitHubUser) {
    const { user, action } = await this.userService.findOrCreateGitHubUser(githubUser);
    if (!user.isActive) throw new UnauthorizedException('账号已被禁用');
    
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role
    });
    
    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatar: user.avatar
      },
      account_status: action,
    };
  }

  private async generateUsername(email: string): Promise<string> {
    let base = email.split('@')[0].replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
    if (!base) base = 'user';

    const exists = await this.prisma.user.findUnique({
      where: { username: base },
    });
    if (!exists) return base;

    for (let i = 0; i < 10; i++) {
      const suffix = Math.random().toString(36).substring(2, 5);
      const candidate = `${base}_${suffix}`;
      const taken = await this.prisma.user.findUnique({
        where: { username: candidate },
      });
      if (!taken) return candidate;
    }

    return `${base}_${Date.now().toString(36)}`;
  }

  private token(user: AuthUser) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwt.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        avatar: user.avatar ?? null,
      },
    };
  }
}

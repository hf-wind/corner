import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
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
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already exists');

    const username = await this.generateUsername(dto.email);

    const passwordHash = await bcrypt.hash(dto.password, 10);
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

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

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

  private async generateUsername(email: string): Promise<string> {
    let base = email.split('@')[0].replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
    if (!base) base = 'user';

    const exists = await this.prisma.user.findUnique({ where: { username: base } });
    if (!exists) return base;

    for (let i = 0; i < 10; i++) {
      const suffix = Math.random().toString(36).substring(2, 5);
      const candidate = `${base}_${suffix}`;
      const taken = await this.prisma.user.findUnique({ where: { username: candidate } });
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

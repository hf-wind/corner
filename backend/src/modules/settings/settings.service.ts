import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.setting.findMany();
    const result: Record<string, any> = {};
    for (const s of items) result[s.key] = s.value;
    return result;
  }

  async get(key: string) {
    const s = await this.prisma.setting.findUnique({ where: { key } });
    return s ? s.value : null;
  }

  async set(key: string, value: any) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const mimeTypeMap: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
};

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 30, type?: string, folder?: string) {
    const where: any = {};
    if (type && type !== 'all' && mimeTypeMap[type]) {
      where.mimeType = { in: mimeTypeMap[type] };
    }
    if (folder !== undefined) {
      where.folder = folder === '' ? null : folder;
    }
    const [items, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.media.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFolders() {
    const result = await this.prisma.media.groupBy({
      by: ['folder'],
      _count: { id: true },
      where: { folder: { not: null } },
    });
    return result.map((r) => r.folder).filter(Boolean);
  }

  async createFolder(name: string) {
    return { name };
  }

  async create(file: any, userId?: string, folder?: string) {
    return this.prisma.media.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: `/uploads/${file.filename}`,
        folder: folder || null,
        uploadedBy: userId,
      },
    });
  }

  async remove(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');
    const filePath = join(process.cwd(), 'uploads', media.filename);
    if (existsSync(filePath)) unlinkSync(filePath);
    await this.prisma.media.delete({ where: { id } });
  }
}

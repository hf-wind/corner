import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { PRESET_FOLDERS, PRESET_FOLDER_KEYS, sanitizeFolder } from './media.constants';

const mimeTypeMap: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
};

const UPLOAD_ROOT = join(process.cwd(), 'uploads');
const CUSTOM_FOLDERS_KEY = 'media_custom_folders';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {
    this.ensurePresetDirs();
  }

  private ensurePresetDirs() {
    for (const key of PRESET_FOLDER_KEYS) {
      this.ensureFolderDirs(key);
    }
  }

  private ensureFolderDirs(folder: string) {
    const base = join(UPLOAD_ROOT, folder);
    const original = join(base, 'original');
    if (!existsSync(base)) mkdirSync(base, { recursive: true });
    if (!existsSync(original)) mkdirSync(original, { recursive: true });
  }

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
    const custom = await this.getCustomFolders();
    const fromDb = await this.prisma.media.groupBy({
      by: ['folder'],
      where: { folder: { not: null } },
    });
    const dbKeys = fromDb.map((r) => r.folder).filter(Boolean) as string[];

    // also scan filesystem top-level dirs
    let fsKeys: string[] = [];
    if (existsSync(UPLOAD_ROOT)) {
      fsKeys = readdirSync(UPLOAD_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory() && d.name !== 'original')
        .map((d) => d.name);
    }

    const allKeys = new Set<string>([
      ...PRESET_FOLDER_KEYS,
      ...custom,
      ...dbKeys,
      ...fsKeys,
    ]);

    return Array.from(allKeys).map((key) => {
      const preset = PRESET_FOLDERS.find((f) => f.key === key);
      return {
        key,
        label: preset?.label || key,
        preset: !!preset,
      };
    });
  }

  private async getCustomFolders(): Promise<string[]> {
    const row = await this.prisma.setting.findUnique({ where: { key: CUSTOM_FOLDERS_KEY } });
    if (!row?.value) return [];
    if (Array.isArray(row.value)) return row.value.map(String);
    return [];
  }

  async createFolder(name: string) {
    const key = sanitizeFolder(name);
    if (PRESET_FOLDER_KEYS.includes(key)) {
      this.ensureFolderDirs(key);
      return { key, label: PRESET_FOLDERS.find((f) => f.key === key)?.label || key, preset: true };
    }
    this.ensureFolderDirs(key);
    const custom = await this.getCustomFolders();
    if (!custom.includes(key)) {
      custom.push(key);
      await this.prisma.setting.upsert({
        where: { key: CUSTOM_FOLDERS_KEY },
        create: { key: CUSTOM_FOLDERS_KEY, value: custom },
        update: { value: custom },
      });
    }
    return { key, label: key, preset: false };
  }

  private async generateNameBase(originalName: string): Promise<string> {
    const all = await this.settings.findAll();
    const mode = (all.media_naming as string) || 'timestamp';
    const uuid = randomUUID();
    const ts = Date.now();

    switch (mode) {
      case 'original': {
        const base = extname(originalName) ? originalName.replace(extname(originalName), '') : originalName;
        const safe = base.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_').slice(0, 80);
        return `${safe}_${ts}`;
      }
      case 'uuid':
        return uuid;
      case 'timestamp':
      default:
        return String(ts);
    }
  }

  async create(file: Express.Multer.File, userId?: string, folderInput?: string) {
    if (!file?.buffer?.length && !(file as any)?.path) {
      throw new BadRequestException('No file uploaded');
    }

    const folder = sanitizeFolder(folderInput);
    this.ensureFolderDirs(folder);

    // multer encodes originalname as latin-1; decode to utf-8
    const originalName = file.originalname
      ? Buffer.from(file.originalname, 'binary').toString('utf-8')
      : 'file';
    const ext = (extname(originalName) || '').toLowerCase() || this.extFromMime(file.mimetype);
    const nameBase = await this.generateNameBase(originalName);
    const buffer = file.buffer?.length
      ? file.buffer
      : readFileSync((file as any).path);

    const isRasterImage =
      !!file.mimetype?.startsWith('image/') &&
      !file.mimetype.includes('svg') &&
      !file.mimetype.includes('gif');

    let filename: string;
    let path: string;
    let originalPath: string | null = null;
    let mimeType = file.mimetype || 'application/octet-stream';
    let size = buffer.length;

    if (isRasterImage) {
      const origFilename = `${nameBase}${ext || '.bin'}`;
      const origFs = join(UPLOAD_ROOT, folder, 'original', origFilename);
      writeFileSync(origFs, buffer);
      originalPath = `/uploads/${folder}/original/${origFilename}`;

      const webpName = `${nameBase}.webp`;
      const webpFs = join(UPLOAD_ROOT, folder, webpName);
      const webpBuf = await this.compressImage(buffer, folder);
      writeFileSync(webpFs, webpBuf);

      filename = webpName;
      path = `/uploads/${folder}/${webpName}`;
      mimeType = 'image/webp';
      size = webpBuf.length;
    } else {
      filename = `${nameBase}${ext || ''}`;
      const fsPath = join(UPLOAD_ROOT, folder, filename);
      writeFileSync(fsPath, buffer);
      path = `/uploads/${folder}/${filename}`;
    }

    // cleanup multer disk temp if any
    if ((file as any).path && existsSync((file as any).path)) {
      try { unlinkSync((file as any).path); } catch { /* ignore */ }
    }

    return this.prisma.media.create({
      data: {
        filename,
        originalName,
        mimeType,
        size,
        path,
        originalPath,
        folder,
        uploadedBy: userId,
      },
    });
  }

  private async compressImage(buffer: Buffer, folder: string): Promise<Buffer> {
    let pipeline = sharp(buffer).rotate();

    if (folder === 'avatar') {
      pipeline = pipeline.resize(512, 512, { fit: 'cover', position: 'centre' });
      return pipeline.webp({ quality: 85 }).toBuffer();
    }

    if (folder === 'cover') {
      pipeline = pipeline.resize(1920, 1080, { fit: 'inside', withoutEnlargement: true });
      return pipeline.webp({ quality: 82 }).toBuffer();
    }

    // article / general
    pipeline = pipeline.resize(2560, 2560, { fit: 'inside', withoutEnlargement: true });
    return pipeline.webp({ quality: 80 }).toBuffer();
  }

  private extFromMime(mime?: string) {
    if (!mime) return '';
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
    };
    return map[mime] || '';
  }

  async remove(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    const candidates = [
      join(process.cwd(), media.path.replace(/^\//, '')),
      media.originalPath ? join(process.cwd(), media.originalPath.replace(/^\//, '')) : '',
      join(UPLOAD_ROOT, media.filename),
      media.folder ? join(UPLOAD_ROOT, media.folder, media.filename) : '',
    ].filter(Boolean);

    for (const p of candidates) {
      if (p && existsSync(p)) {
        try { unlinkSync(p); } catch { /* ignore */ }
      }
    }

    await this.prisma.media.delete({ where: { id } });
  }
}

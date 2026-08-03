import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { PRESET_FOLDERS, PRESET_FOLDER_KEYS, sanitizeFolder } from './media.constants';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

const mimeTypeMap: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  audio: [
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'audio/flac',
  ],
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
    @InjectQueue('media-metadata') private metadataQueue: Queue,
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

    const articleIds = Array.from(allKeys)
      .filter((key) => key.startsWith('article/'))
      .map((key) => key.slice('article/'.length));
    const articleTitles = articleIds.length
      ? await this.prisma.post.findMany({
          where: { id: { in: articleIds } },
          select: { id: true, title: true },
        })
      : [];
    const titleById = new Map(articleTitles.map((post) => [post.id, post.title]));

    return Array.from(allKeys).map((key) => {
      const preset = PRESET_FOLDERS.find((f) => f.key === key);
      const articleId = key.startsWith('article/') ? key.slice('article/'.length) : '';
      return {
        key,
        label: preset?.label || (articleId
          ? `文章 / ${titleById.get(articleId) || articleId.slice(0, 8)}`
          : key),
        preset: !!preset || Boolean(articleId),
      };
    });
  }

  async removeFolder(folderInput: string) {
    const folder = sanitizeFolder(folderInput);
    const items = await this.prisma.media.findMany({
      where: { folder },
      select: { id: true },
    });
    if (items.length) await this.batchRemove(items.map((item) => item.id));

    const directory = join(UPLOAD_ROOT, folder);
    if (existsSync(directory)) {
      rmSync(directory, { recursive: true, force: true });
    }
    return { removed: items.length, folder };
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

  async batchMove(ids: string[], targetFolder: string) {
    const folder = sanitizeFolder(targetFolder);
    this.ensureFolderDirs(folder);

    const items = await this.prisma.media.findMany({ where: { id: { in: ids } } });
    if (!items.length) throw new NotFoundException('No media found');

    const updated: any[] = [];
    for (const item of items) {
      if (item.folder === folder) {
        updated.push(item);
        continue;
      }

      const oldPath = join(process.cwd(), item.path.replace(/^\//, ''));
      const newPath = join(UPLOAD_ROOT, folder, item.filename);
      if (existsSync(oldPath)) {
        try { renameSync(oldPath, newPath); } catch { /* skip */ }
      }

      let origRel: string | null = null;
      if (item.originalPath) {
        const oldOrig = join(process.cwd(), item.originalPath.replace(/^\//, ''));
        const origName = item.originalPath.split('/').pop() || item.filename;
        const newOrig = join(UPLOAD_ROOT, folder, 'original', origName);
        if (existsSync(oldOrig)) {
          try { renameSync(oldOrig, newOrig); } catch { /* skip */ }
        }
        origRel = `/uploads/${folder}/original/${origName}`;
      }

      const rec = await this.prisma.media.update({
        where: { id: item.id },
        data: {
          folder,
          path: `/uploads/${folder}/${item.filename}`,
          originalPath: origRel,
        },
      });
      updated.push(rec);
    }
    return updated;
  }

  async batchRemove(ids: string[]) {
    const items = await this.prisma.media.findMany({
      where: { id: { in: ids } },
      include: { _count: { select: { albumItems: true, albumCovers: true, placeCovers: true } } },
    });
    if (!items.length) throw new NotFoundException('No media found');
    const referenced = items.filter((item) => item._count.albumItems || item._count.albumCovers || item._count.placeCovers);
    if (referenced.length) {
      throw new BadRequestException(`有 ${referenced.length} 张图片正在被相册或地点引用，请先移除引用`);
    }

    for (const item of items) {
      const candidates = [
        join(process.cwd(), item.path.replace(/^\//, '')),
        item.originalPath ? join(process.cwd(), item.originalPath.replace(/^\//, '')) : '',
        join(UPLOAD_ROOT, item.filename),
        item.folder ? join(UPLOAD_ROOT, item.folder, item.filename) : '',
      ].filter(Boolean);
      for (const p of candidates) {
        if (p && existsSync(p)) {
          try { unlinkSync(p); } catch { /* ignore */ }
        }
      }
    }
    await this.prisma.media.deleteMany({ where: { id: { in: ids } } });
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

  async importFromUrl(url: string, userId?: string, folderInput = 'cover') {
    const src = String(url || '').trim();
    if (!/^https?:\/\//i.test(src)) {
      throw new BadRequestException('无效的图片 URL');
    }

    let res: Response;
    try {
      res = await fetch(src, {
        signal: AbortSignal.timeout(30000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FengyuNotesBot/1.0)',
          Accept: 'image/*,*/*',
        },
      });
    } catch {
      throw new BadRequestException('下载图片失败');
    }

    if (!res.ok) {
      throw new BadRequestException(`下载图片失败 (${res.status})`);
    }

    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new BadRequestException('图片内容为空');
    if (buf.length > 15 * 1024 * 1024) throw new BadRequestException('图片过大');

    let mime = contentType;
    if (!mime.startsWith('image/')) {
      const magic = buf.slice(0, 12);
      if (magic[0] === 0xff && magic[1] === 0xd8) mime = 'image/jpeg';
      else if (magic[0] === 0x89 && magic[1] === 0x50) mime = 'image/png';
      else if (magic[0] === 0x47 && magic[1] === 0x49) mime = 'image/gif';
      else if (magic.toString('ascii', 0, 4) === 'RIFF' && magic.toString('ascii', 8, 12) === 'WEBP') {
        mime = 'image/webp';
      } else {
        throw new BadRequestException('URL 不是有效图片');
      }
    }

    const ext = this.extFromMime(mime) || '.jpg';
    const nameFromUrl = src.split('?')[0].split('/').pop() || `wallpaper${ext}`;
    const file = {
      buffer: buf,
      originalname: nameFromUrl.includes('.') ? nameFromUrl : `${nameFromUrl}${ext}`,
      mimetype: mime,
      size: buf.length,
    } as Express.Multer.File;

    return this.create(file, userId, folderInput, false);
  }

  async create(file: Express.Multer.File, userId?: string, folderInput?: string, compressAnimated?: boolean) {
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

    const isGif = !!file.mimetype?.includes('gif');
    const isRasterImage =
      !!file.mimetype?.startsWith('image/') &&
      !file.mimetype.includes('svg') &&
      !isGif;

    let filename: string;
    let path: string;
    let originalPath: string | null = null;
    let mimeType = file.mimetype || 'application/octet-stream';
    let size = buffer.length;

    // compress animated GIFs if requested
    if (isGif && compressAnimated) {
      const origFilename = `${nameBase}${ext || '.gif'}`;
      const origFs = join(UPLOAD_ROOT, folder, 'original', origFilename);
      writeFileSync(origFs, buffer);
      originalPath = `/uploads/${folder}/original/${origFilename}`;

      const webpName = `${nameBase}.webp`;
      const webpFs = join(UPLOAD_ROOT, folder, webpName);
      const webpBuf = await sharp(buffer, { animated: true }).webp({ quality: 80 }).toBuffer();
      writeFileSync(webpFs, webpBuf);

      filename = webpName;
      path = `/uploads/${folder}/${webpName}`;
      mimeType = 'image/webp';
      size = webpBuf.length;
    } else if (isRasterImage) {
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

    const created = await this.prisma.media.create({
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
    if (isRasterImage) {
      await this.prisma.mediaMetadata.create({ data: { mediaId: created.id } });
      void this.metadataQueue.add('extract', { mediaId: created.id }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      }).catch(async (error: Error) => {
        await this.prisma.mediaMetadata.update({
          where: { mediaId: created.id },
          data: { status: 'failed', error: `无法加入 EXIF 队列：${error.message}` },
        }).catch(() => undefined);
      });
    }
    return created;
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

    if (folder === 'emoji') {
      pipeline = pipeline.resize(160, 160, { fit: 'inside', withoutEnlargement: true });
      return pipeline.webp({ quality: 80 }).toBuffer();
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
      'audio/mpeg': '.mp3',
      'audio/mp4': '.m4a',
      'audio/ogg': '.ogg',
      'audio/wav': '.wav',
      'audio/webm': '.webm',
      'audio/flac': '.flac',
      'application/pdf': '.pdf',
    };
    return map[mime] || '';
  }

  async remove(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: { _count: { select: { albumItems: true, albumCovers: true, placeCovers: true } } },
    });
    if (!media) throw new NotFoundException('Media not found');
    if (media._count.albumItems || media._count.albumCovers || media._count.placeCovers) {
      throw new BadRequestException('图片正在被相册或地点引用，请先移除引用');
    }

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

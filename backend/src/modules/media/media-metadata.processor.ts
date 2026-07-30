import { Logger } from '@nestjs/common';
import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function gpsCoordinate(value?: number[], ref?: string) {
  if (!value || value.length < 3) return null;
  const coordinate = value[0] + value[1] / 60 + value[2] / 3600;
  return ['S', 'W'].includes(String(ref || '').toUpperCase()) ? -coordinate : coordinate;
}

function jsonSafe(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]));
  }
  return value;
}

@Processor('media-metadata')
export class MediaMetadataProcessor {
  private readonly logger = new Logger(MediaMetadataProcessor.name);

  constructor(private prisma: PrismaService) {}

  @Process('extract')
  async extract(job: Job<{ mediaId: string }>) {
    const media = await this.prisma.media.findUnique({ where: { id: job.data.mediaId } });
    if (!media) return;
    const relativePath = media.originalPath || media.path;
    const filePath = join(process.cwd(), relativePath.replace(/^\//, ''));
    if (!existsSync(filePath)) throw new Error('原图文件不存在');

    try {
      const buffer = readFileSync(filePath);
      const image = await sharp(buffer).metadata();
      const exif = image.exif ? exifReader(image.exif) : null;
      const capturedAt = exif?.Photo?.DateTimeOriginal || exif?.Image?.DateTime || null;
      const latitude = gpsCoordinate(exif?.GPSInfo?.GPSLatitude, exif?.GPSInfo?.GPSLatitudeRef);
      const longitude = gpsCoordinate(exif?.GPSInfo?.GPSLongitude, exif?.GPSInfo?.GPSLongitudeRef);
      await this.prisma.mediaMetadata.upsert({
        where: { mediaId: media.id },
        create: {
          mediaId: media.id,
          status: 'completed',
          rawExif: exif ? jsonSafe(exif) as Prisma.InputJsonValue : Prisma.JsonNull,
          capturedAt,
          latitude,
          longitude,
          width: image.width,
          height: image.height,
          cameraMake: exif?.Image?.Make ? String(exif.Image.Make) : null,
          cameraModel: exif?.Image?.Model ? String(exif.Image.Model) : null,
          lensModel: exif?.Photo?.LensModel ? String(exif.Photo.LensModel) : null,
          processedAt: new Date(),
        },
        update: {
          status: 'completed',
          rawExif: exif ? jsonSafe(exif) as Prisma.InputJsonValue : Prisma.JsonNull,
          capturedAt,
          latitude,
          longitude,
          width: image.width,
          height: image.height,
          cameraMake: exif?.Image?.Make ? String(exif.Image.Make) : null,
          cameraModel: exif?.Image?.Model ? String(exif.Image.Model) : null,
          lensModel: exif?.Photo?.LensModel ? String(exif.Photo.LensModel) : null,
          error: null,
          processedAt: new Date(),
        },
      });
    } catch (error: any) {
      await this.prisma.mediaMetadata.upsert({
        where: { mediaId: media.id },
        create: { mediaId: media.id, status: 'failed', error: error.message, processedAt: new Date() },
        update: { status: 'failed', error: error.message, processedAt: new Date() },
      });
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job<{ mediaId: string }>, error: Error) {
    this.logger.warn(`EXIF 解析失败 ${job.data.mediaId}: ${error.message}`);
  }
}

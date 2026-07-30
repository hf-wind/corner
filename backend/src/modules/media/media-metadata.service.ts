import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MediaMetadataService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('media-metadata') private metadataQueue: Queue,
  ) {}

  async findOne(mediaId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        metadata: { include: { confirmedPlace: true } },
      },
    });
    if (!media) throw new NotFoundException('Media not found');
    return media;
  }

  async confirm(mediaId: string, input: { capturedAt?: string | null; placeId?: string | null }) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Media not found');
    if (input.placeId) {
      const place = await this.prisma.place.findUnique({ where: { id: input.placeId }, select: { id: true } });
      if (!place) throw new BadRequestException('地点不存在');
    }
    return this.prisma.mediaMetadata.upsert({
      where: { mediaId },
      create: {
        mediaId,
        status: 'completed',
        confirmedCapturedAt: input.capturedAt ? new Date(input.capturedAt) : null,
        confirmedPlaceId: input.placeId || null,
      },
      update: {
        confirmedCapturedAt: input.capturedAt ? new Date(input.capturedAt) : null,
        confirmedPlaceId: input.placeId || null,
      },
      include: { confirmedPlace: true },
    });
  }

  async retry(mediaId: string) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Media not found');
    await this.prisma.mediaMetadata.upsert({
      where: { mediaId },
      create: { mediaId },
      update: { status: 'pending', error: null, processedAt: null },
    });
    await this.metadataQueue.add('extract', { mediaId }, { attempts: 3, removeOnComplete: true });
    return { queued: true };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import sharp from 'sharp';
import {
  buildPublicLocation,
  type LocationPrecision,
  type LocationVisibility,
} from '../../common/location/public-location';
import { MemoryGraphService } from '../memory-graph/memory-graph.service';
import { PrismaService } from '../prisma/prisma.service';
import type { JourneyQueryDto, SaveJourneyDto } from './dto/journey.dto';
import type { SaveStoryRouteDto } from './dto/story-route.dto';

const journeyInclude = {
  stops: { include: { place: true }, orderBy: { sort: 'asc' as const } },
} satisfies Prisma.JourneyInclude;
const storyInclude = {
  journey: { select: { id: true, title: true, slug: true } },
  steps: {
    orderBy: { sort: 'asc' as const },
    include: {
      node: {
        select: {
          id: true,
          type: true,
          title: true,
          href: true,
          image: true,
          occurredAt: true,
        },
      },
      place: true,
      photoMedia: { select: { id: true, path: true } },
    },
  },
} satisfies Prisma.StoryRouteInclude;

type JourneyWithStops = Prisma.JourneyGetPayload<{
  include: typeof journeyInclude;
}>;
type StoryWithSteps = Prisma.StoryRouteGetPayload<{
  include: typeof storyInclude;
}>;

@Injectable()
export class JourneyService {
  constructor(
    private prisma: PrismaService,
    private memoryGraph: MemoryGraphService,
  ) {}

  private page(query: JourneyQueryDto) {
    return { page: query.page || 1, limit: Math.min(query.limit || 20, 100) };
  }

  async findPublic(query: JourneyQueryDto) {
    const { page, limit } = this.page(query);
    const where: Prisma.JourneyWhereInput = {
      status: 'published',
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.journey.findMany({
        where,
        include: journeyInclude,
        orderBy: [{ happenedAt: 'desc' }, { publishedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.journey.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.publicJourney(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPublicJourney(slug: string) {
    const journey = await this.prisma.journey.findFirst({
      where: { slug, status: 'published' },
      include: journeyInclude,
    });
    if (!journey) throw new NotFoundException('旅行不存在');
    return this.publicJourney(journey);
  }

  async findAdmin(query: JourneyQueryDto) {
    const { page, limit } = this.page(query);
    const where: Prisma.JourneyWhereInput = {
      ...(query.status && query.status !== 'all'
        ? { status: query.status }
        : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.journey.findMany({
        where,
        include: { _count: { select: { stops: true, storyRoutes: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.journey.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAdminJourney(id: string) {
    const item = await this.prisma.journey.findUnique({
      where: { id },
      include: journeyInclude,
    });
    if (!item) throw new NotFoundException('旅行不存在');
    return item;
  }

  async createJourney(dto: SaveJourneyDto, authorId: string) {
    await this.validatePlaces(
      (dto.stops?.map((stop) => stop.placeId).filter(Boolean) as string[]) ||
        [],
    );
    const item = await this.prisma.journey.create({
      data: {
        ...this.journeyData(dto),
        authorId,
        stops: { create: this.stopData(dto.stops || []) },
      },
      include: journeyInclude,
    });
    this.memoryGraph.scheduleRebuild();
    return item;
  }

  async updateJourney(id: string, dto: SaveJourneyDto) {
    await this.findAdminJourney(id);
    await this.validatePlaces(
      (dto.stops?.map((stop) => stop.placeId).filter(Boolean) as string[]) ||
        [],
    );
    const item = await this.prisma.$transaction(async (tx) => {
      if (dto.stops)
        await tx.journeyStop.deleteMany({ where: { journeyId: id } });
      return tx.journey.update({
        where: { id },
        data: {
          ...this.journeyData(dto),
          ...(dto.stops ? { stops: { create: this.stopData(dto.stops) } } : {}),
        },
        include: journeyInclude,
      });
    });
    this.memoryGraph.scheduleRebuild();
    return item;
  }

  async removeJourney(id: string) {
    await this.findAdminJourney(id);
    await this.prisma.journey.delete({ where: { id } });
    this.memoryGraph.scheduleRebuild();
    return { deleted: true };
  }

  async findPublicStories() {
    const rows = await this.prisma.storyRoute.findMany({
      where: { status: 'published' },
      include: storyInclude,
      orderBy: { publishedAt: 'desc' },
    });
    return rows.map((row) => this.publicStory(row));
  }

  async findPublicStory(slug: string) {
    const item = await this.prisma.storyRoute.findFirst({
      where: { slug, status: 'published' },
      include: storyInclude,
    });
    if (!item) throw new NotFoundException('故事航线不存在');
    return this.publicStory(item);
  }

  async findSharedStory(token: string) {
    const item = await this.prisma.storyRoute.findFirst({
      where: { shareToken: token, status: 'published' },
      include: storyInclude,
    });
    if (!item) throw new NotFoundException('分享已失效');
    return this.publicStory(item);
  }

  async findAdminStories() {
    return this.prisma.storyRoute.findMany({
      include: {
        _count: { select: { steps: true } },
        journey: { select: { title: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findAdminStory(id: string) {
    const item = await this.prisma.storyRoute.findUnique({
      where: { id },
      include: storyInclude,
    });
    if (!item) throw new NotFoundException('故事航线不存在');
    return item;
  }

  async createStory(dto: SaveStoryRouteDto, authorId: string) {
    await this.validateStory(dto);
    const story = await this.prisma.storyRoute.create({
      data: {
        ...this.storyData(dto),
        authorId,
        shareToken: randomBytes(18).toString('base64url'),
        steps: { create: this.stepData(dto.steps || []) },
      },
      include: storyInclude,
    });
    this.memoryGraph.scheduleRebuild();
    return story;
  }

  async updateStory(id: string, dto: SaveStoryRouteDto) {
    await this.findAdminStory(id);
    await this.validateStory(dto);
    const story = await this.prisma.$transaction(async (tx) => {
      if (dto.steps) await tx.storyStep.deleteMany({ where: { routeId: id } });
      return tx.storyRoute.update({
        where: { id },
        data: {
          ...this.storyData(dto),
          ...(dto.steps ? { steps: { create: this.stepData(dto.steps) } } : {}),
        },
        include: storyInclude,
      });
    });
    this.memoryGraph.scheduleRebuild();
    return story;
  }

  async removeStory(id: string) {
    await this.findAdminStory(id);
    await this.prisma.storyRoute.delete({ where: { id } });
    this.memoryGraph.scheduleRebuild();
    return { deleted: true };
  }

  async shareCover(slug: string) {
    const story = await this.findPublicStory(slug);
    const title = this.escapeXml(story.title.slice(0, 28));
    const description = this.escapeXml(
      (story.description || '一段沿着时光展开的记忆航线').slice(0, 54),
    );
    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#101820"/><circle cx="1040" cy="110" r="180" fill="#b7d9c4" opacity=".16"/><path d="M90 470 C290 250 480 530 690 310 S970 330 1120 170" fill="none" stroke="#e6b85c" stroke-width="4" opacity=".75"/><g fill="#f3f0e8">${[90, 290, 480, 690, 900, 1120].map((x, i) => `<circle cx="${x}" cy="${[470, 330, 445, 310, 300, 170][i]}" r="${i === 0 ? 12 : 8}"/>`).join('')}</g><text x="90" y="155" fill="#e6b85c" font-size="24" font-family="sans-serif">WIND CORNER · STORY</text><text x="90" y="230" fill="#fff" font-size="54" font-weight="700" font-family="sans-serif">${title}</text><text x="90" y="285" fill="#aeb9b5" font-size="25" font-family="sans-serif">${description}</text></svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  private journeyData(dto: SaveJourneyDto) {
    const published = dto.status === 'published';
    return {
      title: dto.title.trim(),
      slug: dto.slug.trim(),
      description: dto.description?.trim() || null,
      status: dto.status || 'draft',
      coverImage: dto.coverImage || null,
      happenedAt: dto.happenedAt ? new Date(dto.happenedAt) : null,
      endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
      ...(published ? { publishedAt: new Date() } : {}),
    };
  }

  private stopData(stops: NonNullable<SaveJourneyDto['stops']>) {
    return [...stops]
      .sort((a, b) => a.sort - b.sort)
      .map((stop, sort) => ({
        placeId: stop.placeId || null,
        sort,
        title: stop.title.trim(),
        narration: stop.narration?.trim() || null,
        occurredAt: stop.occurredAt ? new Date(stop.occurredAt) : null,
        locationVisibility: stop.locationVisibility || 'private',
        locationPrecision: stop.locationPrecision || 'place',
        locationExactConfirmedAt: stop.locationExactConfirmedAt
          ? new Date(stop.locationExactConfirmedAt)
          : null,
      }));
  }

  private storyData(dto: SaveStoryRouteDto) {
    const published = dto.status === 'published';
    return {
      title: dto.title.trim(),
      slug: dto.slug.trim(),
      description: dto.description?.trim() || null,
      status: dto.status || 'draft',
      coverImage: dto.coverImage || null,
      journeyId: dto.journeyId || null,
      ...(published ? { publishedAt: new Date() } : {}),
    };
  }

  private stepData(steps: NonNullable<SaveStoryRouteDto['steps']>) {
    return [...steps]
      .sort((a, b) => a.sort - b.sort)
      .map((step, sort) => ({
        nodeId: step.nodeId || null,
        placeId: step.placeId || null,
        photoMediaId: step.photoMediaId || null,
        sort,
        title: step.title?.trim() || null,
        narration: step.narration?.trim() || null,
        musicUrl: step.musicUrl || null,
        musicStartSec: step.musicStartSec ?? null,
        musicEndSec: step.musicEndSec ?? null,
        durationSec: step.durationSec || 8,
        locationVisibility: step.locationVisibility || 'private',
        locationPrecision: step.locationPrecision || 'place',
        locationExactConfirmedAt: step.locationExactConfirmedAt
          ? new Date(step.locationExactConfirmedAt)
          : null,
      }));
  }

  private publicJourney(item: JourneyWithStops) {
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      description: item.description,
      coverImage: item.coverImage,
      happenedAt: item.happenedAt,
      endedAt: item.endedAt,
      stops: item.stops.map((stop) => ({
        id: stop.id,
        sort: stop.sort,
        title: stop.title,
        narration: stop.narration,
        occurredAt: stop.occurredAt,
        publicLocation: buildPublicLocation({
          place: stop.place,
          visibility: this.locationVisibility(stop.locationVisibility),
          precision: this.locationPrecision(stop.locationPrecision),
          exactConfirmedAt: stop.locationExactConfirmedAt,
        }),
      })),
    };
  }

  private publicStory(item: StoryWithSteps) {
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      description: item.description,
      coverImage: item.coverImage,
      shareToken: item.shareToken,
      sharePath: `/stories/share/${item.shareToken}`,
      journey: item.journey,
      steps: item.steps.map((step) => ({
        id: step.id,
        sort: step.sort,
        title: step.title || step.node?.title || `第 ${step.sort + 1} 步`,
        narration: step.narration,
        durationSec: step.durationSec,
        music: step.musicUrl
          ? {
              url: step.musicUrl,
              startSec: step.musicStartSec,
              endSec: step.musicEndSec,
            }
          : null,
        photo: step.photoMedia
          ? { id: step.photoMedia.id, path: step.photoMedia.path }
          : step.node?.image
            ? { path: step.node.image }
            : null,
        node: step.node,
        publicLocation: buildPublicLocation({
          place: step.place,
          visibility: this.locationVisibility(step.locationVisibility),
          precision: this.locationPrecision(step.locationPrecision),
          exactConfirmedAt: step.locationExactConfirmedAt,
        }),
      })),
    };
  }

  private async validatePlaces(ids: string[]) {
    const unique = [...new Set(ids)];
    if (
      unique.length &&
      (await this.prisma.place.count({ where: { id: { in: unique } } })) !==
        unique.length
    )
      throw new BadRequestException('包含无效地点');
  }

  private locationVisibility(value: string): LocationVisibility {
    return value === 'public' || value === 'blurred' ? value : 'private';
  }

  private locationPrecision(value: string): LocationPrecision {
    return value === 'exact' || value === 'city' || value === 'province'
      ? value
      : 'place';
  }

  private async validateStory(dto: SaveStoryRouteDto) {
    if (
      dto.journeyId &&
      !(await this.prisma.journey.findUnique({
        where: { id: dto.journeyId },
        select: { id: true },
      }))
    )
      throw new BadRequestException('旅行不存在');
    const nodeIds = [
      ...new Set(
        (dto.steps || [])
          .map((step) => step.nodeId)
          .filter(Boolean) as string[],
      ),
    ];
    if (
      nodeIds.length &&
      (await this.prisma.memoryNode.count({
        where: { id: { in: nodeIds } },
      })) !== nodeIds.length
    )
      throw new BadRequestException('包含无效记忆节点');
    await this.validatePlaces(
      (dto.steps || []).map((step) => step.placeId).filter(Boolean) as string[],
    );
  }

  private escapeXml(value: string) {
    return value.replace(
      /[<>&'"]/g,
      (char) =>
        ({
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          "'": '&apos;',
          '"': '&quot;',
        })[char]!,
    );
  }
}

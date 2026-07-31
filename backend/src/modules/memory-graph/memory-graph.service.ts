import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma, type Place } from '@prisma/client';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMemoryRelationDto } from './dto/create-memory-relation.dto';
import type { MemoryGraphQueryDto } from './dto/memory-graph-query.dto';
import type { UpdateMemoryRelationDto } from './dto/update-memory-relation.dto';
import type {
  MemoryNodeInput,
  MemoryRelationInput,
} from './memory-graph.types';

const GRAPH_CACHE_TTL = 300;
const MAX_TAG_NEIGHBORS = 3;

type GraphPlace = Pick<
  Place,
  | 'id'
  | 'name'
  | 'slug'
  | 'city'
  | 'province'
  | 'country'
  | 'latitude'
  | 'longitude'
  | 'type'
>;
type GraphTag = { id: string; name: string; slug: string };

const graphNodeSelect = {
  id: true,
  type: true,
  title: true,
  slug: true,
  excerpt: true,
  href: true,
  image: true,
  occurredAt: true,
  coordinateSeed: true,
  metadata: true,
} satisfies Prisma.MemoryNodeSelect;

const graphRelationSelect = {
  id: true,
  sourceId: true,
  targetId: true,
  type: true,
  origin: true,
  evidence: true,
  weight: true,
} satisfies Prisma.MemoryRelationSelect;

type MemoryGraphResult = {
  graphVersion: string;
  coordinateVersion: number;
  nodes: Array<Prisma.MemoryNodeGetPayload<{ select: typeof graphNodeSelect }>>;
  relations: Array<
    Prisma.MemoryRelationGetPayload<{ select: typeof graphRelationSelect }>
  >;
};

@Injectable()
export class MemoryGraphService implements OnModuleInit {
  private rebuildTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  onModuleInit() {
    this.scheduleRebuild(1200);
  }

  scheduleRebuild(delayMs = 250) {
    if (this.rebuildTimer) clearTimeout(this.rebuildTimer);
    this.rebuildTimer = setTimeout(() => {
      this.rebuildTimer = undefined;
      void this.rebuild().catch(() => undefined);
    }, delayMs);
  }

  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private seed(id: string) {
    return Number.parseInt(this.hash(id).slice(0, 8), 16) >>> 0;
  }

  private node(
    input: Omit<MemoryNodeInput, 'coordinateSeed' | 'contentHash'>,
  ): MemoryNodeInput {
    const stable = {
      ...input,
      occurredAt: input.occurredAt?.toISOString() || null,
    };
    return {
      ...input,
      coordinateSeed: this.seed(input.id),
      contentHash: this.hash(stable),
    };
  }

  private relation(
    sourceId: string,
    targetId: string,
    type: string,
    evidence: Record<string, unknown>,
    weight: number,
  ): MemoryRelationInput | null {
    if (sourceId === targetId) return null;
    const [source, target] =
      sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
    return {
      id: this.hash(`automatic|${source}|${target}|${type}`).slice(0, 40),
      sourceId: source,
      targetId: target,
      type,
      origin: 'automatic',
      status: 'active',
      evidence,
      weight,
    };
  }

  private cleanText(value: unknown, max = 240) {
    const text =
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
        ? String(value)
        : '';
    return (
      text
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max) || null
    );
  }

  private record(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private stringValue(value: unknown) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  }

  private dateValue(value: unknown) {
    if (value instanceof Date) return value;
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private snapshotTags(value: unknown): GraphTag[] | null {
    if (!Array.isArray(value)) return null;
    return value.flatMap((item) => {
      const tag = this.record(item);
      if (!tag) return [];
      const id = this.stringValue(tag.id);
      const name = this.stringValue(tag.name);
      const slug = this.stringValue(tag.slug);
      return id && name && slug ? [{ id, name, slug }] : [];
    });
  }

  private snapshotPlace(value: unknown): GraphPlace | null {
    const place = this.record(value);
    if (!place) return null;
    const id = this.stringValue(place.id);
    const name = this.stringValue(place.name);
    const slug = this.stringValue(place.slug);
    const latitude =
      typeof place.latitude === 'number' ? place.latitude : Number.NaN;
    const longitude =
      typeof place.longitude === 'number' ? place.longitude : Number.NaN;
    if (
      !id ||
      !name ||
      !slug ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }
    const optionalText = (field: unknown) => this.stringValue(field) || null;
    return {
      id,
      name,
      slug,
      city: optionalText(place.city),
      province: optionalText(place.province),
      country: optionalText(place.country),
      latitude,
      longitude,
      type: this.stringValue(place.type) || 'poi',
    };
  }

  async rebuild() {
    const [posts, moments, albums, libraryItems, journeys, stories] =
      await Promise.all([
        this.prisma.post.findMany({
          where: { status: 'published' },
          include: { place: true, tags: { include: { tag: true } } },
        }),
        this.prisma.moment.findMany({
          where: { status: 'published' },
          include: { place: true },
        }),
        this.prisma.album.findMany({
          where: { status: 'published' },
          include: {
            place: true,
            coverMedia: true,
            items: {
              include: {
                place: true,
                moment: true,
                media: {
                  include: { metadata: { include: { confirmedPlace: true } } },
                },
              },
              orderBy: { sort: 'asc' },
            },
          },
        }),
        this.prisma.libraryItem.findMany({
          where: { publishStatus: 'published' },
          include: { place: true },
        }),
        this.prisma.journey.findMany({
          where: { status: 'published' },
          include: {
            stops: { include: { place: true }, orderBy: { sort: 'asc' } },
          },
        }),
        this.prisma.storyRoute.findMany({
          where: { status: 'published' },
          include: { steps: { orderBy: { sort: 'asc' } } },
        }),
      ]);

    const nodes = new Map<string, MemoryNodeInput>();
    const publicPlaces = new Map<string, GraphPlace>();
    const tagGroups = new Map<string, string[]>();
    const placeGroups = new Map<string, string[]>();
    const relations = new Map<string, MemoryRelationInput>();

    const addNode = (value: MemoryNodeInput) => nodes.set(value.id, value);
    const addToGroup = (
      groups: Map<string, string[]>,
      key: string | null | undefined,
      id: string,
    ) => {
      if (!key) return;
      const values = groups.get(key) || [];
      if (!values.includes(id)) values.push(id);
      groups.set(key, values);
    };
    const addRelation = (value: MemoryRelationInput | null) => {
      if (value) relations.set(value.id, value);
    };
    const rememberPlace = (
      place: GraphPlace | null | undefined,
      nodeId: string,
      visible: boolean,
    ) => {
      if (!place || !visible) return;
      publicPlaces.set(place.id, place);
      addToGroup(placeGroups, place.id, nodeId);
    };

    for (const post of posts) {
      const snapshot = this.record(post.publishedSnapshot);
      const id = `post:${post.id}`;
      const tags =
        this.snapshotTags(snapshot?.tags) ?? post.tags.map((item) => item.tag);
      const snapshotSlug = this.stringValue(snapshot?.slug);
      const visibility = this.stringValue(snapshot?.locationVisibility) || post.locationVisibility;
      const place = this.snapshotPlace(snapshot?.place) || post.place;
      const placeId = visibility === 'private' ? null : String(place?.id || post.placeId || '') || null;
      addNode(
        this.node({
          id,
          type: 'post',
          sourceId: post.id,
          title: this.stringValue(snapshot?.title) || post.title,
          slug: snapshotSlug || post.slug,
          excerpt: this.cleanText(snapshot?.excerpt || snapshot?.content),
          href: `/article/${snapshotSlug || post.slug}`,
          image: this.stringValue(snapshot?.coverImage) || post.coverImage,
          occurredAt: this.dateValue(snapshot?.occurredAt) || post.occurredAt || post.publishedAt || post.createdAt,
          placeId,
          metadata: {
            featured: post.featured,
            locationVisibility: visibility,
            locationPrecision: this.stringValue(snapshot?.locationPrecision) || post.locationPrecision,
            tags: tags.map((tag) => ({
              id: tag.id,
              name: tag.name,
              slug: tag.slug,
            })),
          },
        }),
      );
      rememberPlace(place, id, !!placeId);
      for (const tag of tags)
        addToGroup(tagGroups, String(tag.id || tag.slug), id);
    }

    for (const moment of moments) {
      const snapshot = this.record(moment.publishedSnapshot);
      const visibility =
        this.stringValue(snapshot?.locationVisibility) ||
        moment.locationVisibility;
      const place = this.snapshotPlace(snapshot?.place) || moment.place;
      const placeId =
        visibility === 'private'
          ? null
          : String(place?.id || moment.placeId || '') || null;
      const id = `moment:${moment.id}`;
      addNode(
        this.node({
          id,
          type: 'moment',
          sourceId: moment.id,
          title: this.stringValue(snapshot?.title) || moment.title,
          slug: this.stringValue(snapshot?.slug) || moment.slug,
          excerpt: this.cleanText(snapshot?.excerpt || snapshot?.content),
          href: `/moments/${this.stringValue(snapshot?.slug) || moment.slug}`,
          occurredAt:
            this.dateValue(snapshot?.happenedAt) ||
            moment.happenedAt ||
            moment.publishedAt,
          placeId,
          metadata: {
            locationVisibility: visibility,
            locationPrecision:
              this.stringValue(snapshot?.locationPrecision) ||
              moment.locationPrecision,
          },
        }),
      );
      rememberPlace(place, id, !!placeId);
    }

    for (const album of albums) {
      const albumId = `album:${album.id}`;
      const albumVisible = album.locationVisibility !== 'private';
      addNode(
        this.node({
          id: albumId,
          type: 'album',
          sourceId: album.id,
          title: album.title,
          slug: album.slug,
          excerpt: this.cleanText(album.description),
          href: `/albums/${album.slug}`,
          image: album.coverMedia?.path,
          occurredAt: album.happenedAt || album.publishedAt,
          placeId: albumVisible ? album.placeId : null,
          metadata: {
            photoCount: album.items.length,
            locationVisibility: album.locationVisibility,
          },
        }),
      );
      rememberPlace(album.place, albumId, albumVisible);

      for (const item of album.items) {
        const photoId = `photo:${item.id}`;
        const itemVisible = item.locationVisibility !== 'private';
        const itemPlace = item.place || item.media.metadata?.confirmedPlace;
        addNode(
          this.node({
            id: photoId,
            type: 'photo',
            sourceId: item.id,
            title:
              item.caption || item.media.originalName || item.media.filename,
            excerpt: this.cleanText(item.caption),
            href: `/albums/${album.slug}?photo=${item.id}`,
            image: item.media.path,
            occurredAt:
              item.happenedAt ||
              item.media.metadata?.confirmedCapturedAt ||
              item.media.metadata?.capturedAt,
            placeId: itemVisible ? item.placeId : null,
            metadata: {
              albumId: album.id,
              albumTitle: album.title,
              width: item.media.metadata?.width,
              height: item.media.metadata?.height,
            },
          }),
        );
        addRelation(
          this.relation(
            albumId,
            photoId,
            'same_album',
            { albumId: album.id, albumTitle: album.title },
            1,
          ),
        );
        if (item.momentId)
          addRelation(
            this.relation(
              photoId,
              `moment:${item.momentId}`,
              'reference',
              { albumItemId: item.id },
              0.95,
            ),
          );
        rememberPlace(itemPlace, photoId, itemVisible);
      }
    }

    for (const item of libraryItems) {
      const id = `library:${item.id}`;
      const visible = item.locationVisibility !== 'private';
      addNode(
        this.node({
          id,
          type: 'library',
          sourceId: item.id,
          title: item.title,
          slug: item.slug,
          excerpt: this.cleanText(item.reflection || item.summary),
          href: `/library/${item.slug}`,
          image: item.coverImage,
          occurredAt: item.finishDate || item.startDate || item.publishedAt || item.createdAt,
          placeId: visible ? item.placeId : null,
          metadata: {
            libraryType: item.type,
            creator: item.creator,
            rating: item.rating,
            genres: item.genres,
            featured: item.recommended,
            locationVisibility: item.locationVisibility,
            locationPrecision: item.locationPrecision,
          },
        }),
      );
      rememberPlace(item.place, id, visible);
    }

    for (const journey of journeys) {
      const id = `journey:${journey.id}`;
      const firstPublicStop = journey.stops.find(
        (stop) => stop.placeId && stop.locationVisibility !== 'private',
      );
      addNode(
        this.node({
          id,
          type: 'journey',
          sourceId: journey.id,
          title: journey.title,
          slug: journey.slug,
          excerpt: this.cleanText(journey.description),
          href: `/journeys/${journey.slug}`,
          image: journey.coverImage,
          occurredAt: journey.happenedAt || journey.publishedAt,
          placeId: firstPublicStop?.placeId || null,
          metadata: {
            stopCount: journey.stops.length,
            endedAt: journey.endedAt?.toISOString() || null,
          },
        }),
      );
      for (const stop of journey.stops) {
        const publicStop =
          !!stop.place && stop.locationVisibility !== 'private';
        rememberPlace(stop.place, id, publicStop);
        if (stop.placeId && publicStop)
          addRelation(
            this.relation(
              id,
              `place:${stop.placeId}`,
              'same_journey',
              { journeyId: journey.id, stop: stop.title, sort: stop.sort },
              0.9,
            ),
          );
      }
    }

    for (const story of stories) {
      const stepNodeIds = story.steps
        .map((step) => step.nodeId)
        .filter((id): id is string => !!id && nodes.has(id));
      if (story.journeyId && nodes.has(`journey:${story.journeyId}`)) {
        for (const nodeId of stepNodeIds)
          addRelation(
            this.relation(
              nodeId,
              `journey:${story.journeyId}`,
              'same_journey',
              { journeyId: story.journeyId, storyId: story.id },
              0.92,
            ),
          );
      }
      for (let index = 1; index < stepNodeIds.length; index += 1) {
        addRelation(
          this.relation(
            stepNodeIds[index - 1],
            stepNodeIds[index],
            'story_sequence',
            { storyId: story.id, from: index - 1, to: index },
            0.86,
          ),
        );
      }
    }

    for (const place of publicPlaces.values()) {
      addNode(
        this.node({
          id: `place:${place.id}`,
          type: 'place',
          sourceId: place.id,
          title: place.name,
          slug: place.slug,
          excerpt: this.cleanText(
            [place.city, place.province, place.country]
              .filter(Boolean)
              .join(' · '),
          ),
          href: `/places/${place.slug}`,
          image: null,
          occurredAt: null,
          placeId: place.id,
          metadata: {
            placeType: place.type,
            city: place.city,
            province: place.province,
            country: place.country,
          },
        }),
      );
    }

    for (const [placeId, ids] of placeGroups) {
      for (const id of ids)
        addRelation(
          this.relation(id, `place:${placeId}`, 'same_place', { placeId }, 0.9),
        );
    }
    for (const [tagId, ids] of tagGroups) {
      const ordered = [...ids].sort();
      for (let i = 0; i < ordered.length; i += 1) {
        for (
          let offset = 1;
          offset <= MAX_TAG_NEIGHBORS && i + offset < ordered.length;
          offset += 1
        ) {
          addRelation(
            this.relation(
              ordered[i],
              ordered[i + offset],
              'same_tag',
              { tagId },
              0.65,
            ),
          );
        }
      }
    }
    const timed = [...nodes.values()]
      .filter((item) => item.occurredAt)
      .sort((a, b) => a.occurredAt!.getTime() - b.occurredAt!.getTime());
    for (let i = 1; i < timed.length; i += 1) {
      const days = Math.round(
        (timed[i].occurredAt!.getTime() - timed[i - 1].occurredAt!.getTime()) /
          86400000,
      );
      if (days <= 45)
        addRelation(
          this.relation(
            timed[i - 1].id,
            timed[i].id,
            'time_adjacent',
            { days },
            Math.max(0.35, 0.75 - days / 120),
          ),
        );
    }

    await this.prisma.$transaction(async (tx) => {
      const nodeIds = [...nodes.keys()];
      await tx.memoryNode.deleteMany({
        where: nodeIds.length ? { id: { notIn: nodeIds } } : {},
      });
      for (const value of nodes.values()) {
        const data = {
          ...value,
          metadata: value.metadata as Prisma.InputJsonValue,
        };
        await tx.memoryNode.upsert({
          where: { id: value.id },
          create: data,
          update: data,
        });
      }
      const relationIds = [...relations.keys()];
      await tx.memoryRelation.deleteMany({
        where: {
          origin: 'automatic',
          ...(relationIds.length ? { id: { notIn: relationIds } } : {}),
        },
      });
      for (const value of relations.values()) {
        await tx.memoryRelation.upsert({
          where: { id: value.id },
          create: {
            ...value,
            evidence: value.evidence as Prisma.InputJsonValue,
          },
          update: {
            evidence: value.evidence as Prisma.InputJsonValue,
            weight: value.weight,
            status: 'active',
          },
        });
      }
    });
    await this.invalidate();
    return { nodes: nodes.size, relations: relations.size };
  }

  async graph(query: MemoryGraphQueryDto = {}) {
    const types = String(query.types || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .sort();
    const search = String(query.search || '').trim();
    const limit = Math.min(query.limit || 300, 500);
    const version = await this.graphVersion();
    const cacheKey = `corner:memory-graph:${version}:${this.hash({ types, search, year: query.year, limit }).slice(0, 16)}`;
    try {
      const cached = await this.redis.getJson<MemoryGraphResult>(cacheKey);
      if (cached) return cached;
    } catch {
      /* graph remains available without Redis */
    }

    const occurredAt = query.year
      ? {
          gte: new Date(`${query.year}-01-01T00:00:00.000Z`),
          lt: new Date(`${query.year + 1}-01-01T00:00:00.000Z`),
        }
      : undefined;
    const nodes = await this.prisma.memoryNode.findMany({
      where: {
        ...(types.length ? { type: { in: types } } : {}),
        ...(occurredAt ? { occurredAt } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { excerpt: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'asc' }],
      take: limit,
      select: graphNodeSelect,
    });
    const ids = nodes.map((node) => node.id);
    const relations = ids.length
      ? await this.prisma.memoryRelation.findMany({
          where: {
            hidden: false,
            status: 'active',
            sourceId: { in: ids },
            targetId: { in: ids },
          },
          orderBy: { id: 'asc' },
          select: graphRelationSelect,
        })
      : [];
    const result = {
      graphVersion: version,
      coordinateVersion: 1,
      nodes,
      relations,
    };
    try {
      await this.redis.setJson(cacheKey, result, GRAPH_CACHE_TTL);
    } catch {
      /* optional cache */
    }
    return result;
  }

  async neighbors(id: string) {
    const node = await this.prisma.memoryNode.findUnique({
      where: { id },
      select: { id: true, type: true, title: true, href: true },
    });
    if (!node) throw new NotFoundException('记忆节点不存在');
    const relations = await this.prisma.memoryRelation.findMany({
      where: {
        hidden: false,
        status: 'active',
        OR: [{ sourceId: id }, { targetId: id }],
      },
      include: {
        source: {
          select: {
            id: true,
            type: true,
            title: true,
            href: true,
            image: true,
          },
        },
        target: {
          select: {
            id: true,
            type: true,
            title: true,
            href: true,
            image: true,
          },
        },
      },
      orderBy: [{ weight: 'desc' }, { id: 'asc' }],
      take: 100,
    });
    return { node, relations };
  }

  async adminRelations(query: {
    search?: string;
    origin?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
    const where: Prisma.MemoryRelationWhereInput = {
      ...(query.origin ? { origin: query.origin } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                source: {
                  title: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                target: {
                  title: { contains: query.search, mode: 'insensitive' },
                },
              },
              { type: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.memoryRelation.findMany({
        where,
        include: { source: true, target: true },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.memoryRelation.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async searchNodes(search = '') {
    return this.prisma.memoryNode.findMany({
      where: search
        ? { title: { contains: search, mode: 'insensitive' } }
        : undefined,
      select: { id: true, type: true, title: true, href: true, image: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  async health() {
    const [nodes, relations, candidateCount] = await Promise.all([
      this.prisma.memoryNode.findMany({
        select: { id: true, type: true, title: true, href: true, occurredAt: true, image: true, placeId: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.memoryRelation.findMany({
        where: { hidden: false, status: 'active' },
        select: { sourceId: true, targetId: true },
      }),
      this.prisma.memoryRelation.count({ where: { status: 'candidate' } }),
    ]);
    const connected = new Set(relations.flatMap((relation) => [relation.sourceId, relation.targetId]));
    const isolated = nodes.filter((node) => !connected.has(node.id));
    const missingTime = nodes.filter((node) => node.type !== 'place' && !node.occurredAt);
    const visualTypes = new Set(['post', 'album', 'photo', 'library', 'journey']);
    const missingImage = nodes.filter((node) => visualTypes.has(node.type) && !node.image);
    const byType = nodes.reduce<Record<string, number>>((all, node) => {
      all[node.type] = (all[node.type] || 0) + 1;
      return all;
    }, {});
    const compact = (items: typeof nodes) => items.slice(0, 8).map(({ id, type, title, href }) => ({ id, type, title, href }));
    return {
      totals: { nodes: nodes.length, relations: relations.length, candidates: candidateCount },
      byType,
      issues: {
        isolated: { count: isolated.length, items: compact(isolated) },
        missingTime: { count: missingTime.length, items: compact(missingTime) },
        missingImage: { count: missingImage.length, items: compact(missingImage) },
      },
    };
  }

  async createRelation(dto: CreateMemoryRelationDto) {
    if (dto.sourceId === dto.targetId)
      throw new BadRequestException('不能连接同一节点');
    const count = await this.prisma.memoryNode.count({
      where: { id: { in: [dto.sourceId, dto.targetId] } },
    });
    if (count !== 2) throw new BadRequestException('关系节点不存在');
    const origin = dto.origin || 'manual';
    const [sourceId, targetId] =
      dto.sourceId < dto.targetId
        ? [dto.sourceId, dto.targetId]
        : [dto.targetId, dto.sourceId];
    const id = this.hash(`${origin}|${sourceId}|${targetId}|${dto.type}`).slice(
      0,
      40,
    );
    const relation = await this.prisma.memoryRelation.upsert({
      where: { id },
      create: {
        id,
        sourceId,
        targetId,
        type: dto.type,
        origin,
        status: origin === 'ai' ? 'candidate' : 'active',
        evidence: { reason: dto.reason || '人工创建' },
        weight: dto.weight ?? 0.8,
      },
      update: {
        hidden: false,
        status: origin === 'ai' ? 'candidate' : 'active',
        evidence: { reason: dto.reason || '人工创建' },
        weight: dto.weight ?? 0.8,
      },
      include: { source: true, target: true },
    });
    await this.invalidate();
    return relation;
  }

  async updateRelation(id: string, dto: UpdateMemoryRelationDto) {
    const existing = await this.prisma.memoryRelation.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('记忆关系不存在');
    const relation = await this.prisma.memoryRelation.update({
      where: { id },
      data: dto,
      include: { source: true, target: true },
    });
    await this.invalidate();
    return relation;
  }

  async removeRelation(id: string) {
    const existing = await this.prisma.memoryRelation.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('记忆关系不存在');
    if (existing.origin === 'automatic')
      return this.updateRelation(id, { hidden: true });
    await this.prisma.memoryRelation.delete({ where: { id } });
    await this.invalidate();
    return { deleted: true };
  }

  private async graphVersion() {
    const [nodes, relations] = await Promise.all([
      this.prisma.memoryNode.findMany({
        select: { id: true, contentHash: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.memoryRelation.findMany({
        where: { hidden: false, status: 'active' },
        select: { id: true, weight: true },
        orderBy: { id: 'asc' },
      }),
    ]);
    return this.hash({ nodes, relations }).slice(0, 20);
  }

  private async invalidate() {
    await this.redis.invalidateHttpCache().catch(() => undefined);
  }
}

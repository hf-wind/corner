import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';
import { UpdateLibraryItemDto } from './dto/update-library-item.dto';
import { AiService } from '../ai/ai.service';
import { AiNativeService } from '../ai/ai-native.service';
import { MemoryGraphService } from '../memory-graph/memory-graph.service';
import {
  buildPublicLocation,
  type LocationPrecision,
  type LocationVisibility,
  type PlaceSnapshot,
} from '../../common/location/public-location';
import { prepareSpacetime } from '../../common/location/spacetime';
import { Prisma } from '@prisma/client';

type LibraryQuery = {
  page?: string;
  limit?: string;
  type?: string;
  status?: string;
  search?: string;
  sort?: string;
  needsPublish?: boolean;
  admin: boolean;
};

type PublicLibrarySource = {
  title: string;
  summary?: string;
  creator?: string;
  genres?: string[];
  language?: string;
  coverImage?: string;
};

type PublishedLibrarySnapshot = Record<string, any> & {
  title: string;
  slug: string;
  place: PlaceSnapshot | null;
  locationVisibility: LocationVisibility;
  locationPrecision: LocationPrecision;
};

@Injectable()
export class LibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly memoryGraph?: MemoryGraphService,
    private readonly aiNative?: AiNativeService,
  ) {}

  async lookupMetadata(type: 'book' | 'film', title: string) {
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) throw new BadRequestException('请先输入书名或影视名');
    const aiConfig = await this.ai.getConfig();
    if (!aiConfig.ai_library_enabled) {
      throw new ServiceUnavailableException('书影 AI 资料整理已在后台关闭');
    }
    const sources = await this.lookupPublicSources(type, cleanTitle);
    const workFields =
      type === 'book'
        ? `originalTitle, creator（作者）, summary（180至300字无剧透简介）, genres（字符串数组）, country, language`
        : `originalTitle, director, cast（主要演员字符串数组，最多8人）, summary（180至300字无剧透简介）, genres（字符串数组，优先标明悬疑细分类）, releaseYear, country, language, runtimeMinutes, episodeCount`;
    const recordFields =
      type === 'book'
        ? `reflection（以第一人称写一篇300至500字、自然克制且有具体作品理解的阅读体会草稿）, highlights（3至6条主题摘记或短摘录的字符串数组，每条不超过60字）, quotes（3至6条准确的短名句字符串数组，每条不超过50字）`
        : `reflection（以第一人称写一篇300至500字、避免关键剧透且有具体作品理解的观影体会草稿）, highlights（3至6条令人印象深刻的情节或镜头描述字符串数组，不泄露结局）, quotes（2至5条准确的短台词字符串数组，每条不超过50字）`;
    const style = await this.ai.getSiteStyleInstruction('书影体会');
    const response = await this.ai.chat(
      [
        {
          role: 'system',
          content: [aiConfig.ai_library_prompt, style]
            .filter(Boolean)
            .join('\n\n'),
        },
        {
          role: 'user',
          content: `类型：${type === 'book' ? '书籍' : '影视'}\n名称：${cleanTitle}\n需要字段：title（规范中文名）, ${workFields}, ${recordFields}, sourceIndex\n\n公开资料候选：\n${JSON.stringify(sources.map((source, sourceIndex) => ({ sourceIndex, ...source, coverImage: undefined }))).slice(0, 9000)}`,
        },
      ],
      {
        modelConfigId: aiConfig.ai_library_model_config_id,
        temperature: aiConfig.ai_library_temperature,
        maxTokens: aiConfig.ai_library_max_tokens,
        thinking: 'disabled',
      },
    );
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
      throw new BadRequestException('AI 返回的资料格式无法识别，请重试');
    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new BadRequestException('AI 返回的资料格式无法识别，请重试');
    }

    const result: Record<string, any> = {};
    const stringFields = [
      'title',
      'originalTitle',
      'creator',
      'summary',
      'reflection',
      'country',
      'language',
      'director',
    ];
    const numberFields = ['releaseYear', 'runtimeMinutes', 'episodeCount'];
    for (const key of stringFields) {
      if (typeof parsed[key] === 'string' && parsed[key].trim())
        result[key] = parsed[key].trim();
    }
    for (const key of numberFields) {
      const value = Number(parsed[key]);
      if (Number.isFinite(value) && value > 0) result[key] = Math.round(value);
    }
    for (const key of ['genres', 'cast', 'highlights', 'quotes']) {
      if (Array.isArray(parsed[key]))
        result[key] = parsed[key]
          .map(String)
          .map((value: string) => value.trim())
          .filter(Boolean)
          .slice(0, 12);
    }
    const sourceIndex = Number(parsed.sourceIndex);
    const chosenSource =
      Number.isInteger(sourceIndex) && sources[sourceIndex]
        ? sources[sourceIndex]
        : sources.length === 1
          ? sources[0]
          : undefined;
    if (chosenSource?.coverImage) result.coverImage = chosenSource.coverImage;
    return result;
  }

  private async lookupPublicSources(
    type: 'book' | 'film',
    title: string,
  ): Promise<PublicLibrarySource[]> {
    try {
      return type === 'book'
        ? await this.lookupGoogleBooks(title)
        : await this.lookupWikipedia(title);
    } catch {
      return [];
    }
  }

  private async lookupGoogleBooks(
    title: string,
  ): Promise<PublicLibrarySource[]> {
    const query = new URLSearchParams({
      q: `intitle:${title}`,
      maxResults: '5',
      printType: 'books',
    });
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?${query}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as {
      items?: Array<{ volumeInfo?: Record<string, any> }>;
    };
    return (data.items || [])
      .map((entry) => {
        const info = entry.volumeInfo || {};
        return {
          title: String(info.title || ''),
          summary: String(info.description || '').slice(0, 1800) || undefined,
          creator: Array.isArray(info.authors)
            ? info.authors.join(' / ')
            : undefined,
          genres: Array.isArray(info.categories)
            ? info.categories.map(String)
            : [],
          language: info.language ? String(info.language) : undefined,
          coverImage:
            info.imageLinks?.large ||
            info.imageLinks?.medium ||
            info.imageLinks?.thumbnail?.replace(/^http:/, 'https:'),
        };
      })
      .filter((source) => source.title);
  }

  private async lookupWikipedia(title: string): Promise<PublicLibrarySource[]> {
    const query = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: `${title} 电影 电视剧`,
      gsrlimit: '5',
      prop: 'extracts|pageimages',
      exintro: '1',
      explaintext: '1',
      piprop: 'thumbnail',
      pithumbsize: '900',
      redirects: '1',
      format: 'json',
      origin: '*',
    });
    const response = await fetch(
      `https://zh.wikipedia.org/w/api.php?${query}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as {
      query?: { pages?: Record<string, any> };
    };
    return Object.values(data.query?.pages || {})
      .map((page: any) => ({
        title: String(page.title || ''),
        summary: String(page.extract || '').slice(0, 1800) || undefined,
        coverImage: page.thumbnail?.source
          ? String(page.thumbnail.source)
          : undefined,
      }))
      .filter((source) => source.title);
  }

  async findAll(query: LibraryQuery) {
    const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(query.limit || '12', 10) || 12),
    );
    const where: Record<string, any> = {};
    if (!query.admin) where.publishStatus = 'published';
    else if (query.status && query.status !== 'all')
      where.publishStatus = query.status;
    if (query.admin && query.needsPublish) where.needsPublish = true;
    if (query.type && ['book', 'film'].includes(query.type))
      where.type = query.type;
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { originalTitle: { contains: search, mode: 'insensitive' } },
        { creator: { contains: search, mode: 'insensitive' } },
        { director: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy =
      query.sort === 'rank'
        ? [{ rank: { sort: 'asc', nulls: 'last' } }, { publishedAt: 'desc' }]
        : [
            { recommended: 'desc' },
            { publishedAt: 'desc' },
            { createdAt: 'desc' },
          ];
    if (!query.admin) {
      const rows = await this.prisma.libraryItem.findMany({
        where: { publishStatus: 'published' },
        include: { place: true },
        orderBy: orderBy as any,
      });
      let visible = rows.map((item) => this.presentItem(item));
      if (query.type && ['book', 'film'].includes(query.type))
        visible = visible.filter((item) => item.type === query.type);
      if (query.search?.trim()) {
        const search = query.search.trim().toLocaleLowerCase();
        visible = visible.filter((item) =>
          `${item.title || ''} ${item.originalTitle || ''} ${item.creator || ''} ${item.director || ''}`
            .toLocaleLowerCase()
            .includes(search),
        );
      }
      visible.sort((left, right) => {
        if (query.sort === 'rank') {
          const leftRank = Number(left.rank);
          const rightRank = Number(right.rank);
          if (Number.isFinite(leftRank) || Number.isFinite(rightRank)) {
            if (!Number.isFinite(leftRank)) return 1;
            if (!Number.isFinite(rightRank)) return -1;
            if (leftRank !== rightRank) return leftRank - rightRank;
          }
        } else if (!!left.recommended !== !!right.recommended) {
          return left.recommended ? -1 : 1;
        }
        return (
          new Date(right.publishedAt || right.createdAt || 0).getTime() -
          new Date(left.publishedAt || left.createdAt || 0).getTime()
        );
      });
      const total = visible.length;
      return {
        items: visible.slice((page - 1) * limit, page * limit),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }
    const [items, total] = await Promise.all([
      this.prisma.libraryItem.findMany({
        where,
        include: { place: true },
        orderBy: orderBy as any,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.libraryItem.count({ where }),
    ]);
    return {
      items: items.map((item) => this.presentItem(item, query.admin)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getMeta() {
    const [books, films] = await Promise.all([
      this.prisma.libraryItem.count({
        where: { type: 'book', publishStatus: 'published' },
      }),
      this.prisma.libraryItem.count({
        where: { type: 'film', publishStatus: 'published' },
      }),
    ]);
    return { books, films, total: books + films };
  }

  async findById(id: string) {
    const item = await this.prisma.libraryItem.findUnique({
      where: { id },
      include: { place: true },
    });
    if (!item) throw new NotFoundException('书影记录不存在');
    return this.presentItem(item, true);
  }

  async findPublishedBySlug(slug: string) {
    const direct = await this.prisma.libraryItem.findFirst({
      where: { slug, publishStatus: 'published' },
      include: { place: true },
    });
    const candidates = direct
      ? [direct]
      : await this.prisma.libraryItem.findMany({
          where: {
            publishStatus: 'published',
            publishedSnapshot: { not: Prisma.DbNull },
          },
          include: { place: true },
          take: 500,
        });
    const item = candidates.find(
      (candidate) =>
        (this.readSnapshot(candidate.publishedSnapshot)?.slug ||
          candidate.slug) === slug,
    );
    if (!item) throw new NotFoundException('书影记录不存在或尚未发布');
    void this.prisma.libraryItem
      .update({ where: { id: item.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);
    return this.presentItem(item);
  }

  async create(dto: CreateLibraryItemDto) {
    const data = await this.toData(dto);
    try {
      const item = await this.prisma.libraryItem.create({
        data: {
          ...data,
          publishStatus: 'draft',
          needsPublish: true,
          publishedSnapshot: Prisma.DbNull,
        } as any,
        include: { place: true },
      });
      return this.presentItem(item, true);
    } catch (error: any) {
      if (error?.code === 'P2002')
        throw new BadRequestException('Slug 已存在，请换一个');
      throw error;
    }
  }

  async update(id: string, dto: UpdateLibraryItemDto) {
    const current = await this.prisma.libraryItem.findUnique({
      where: { id },
      include: { place: true },
    });
    if (!current) throw new NotFoundException('书影记录不存在');
    const currentSnapshot =
      this.readSnapshot(current.publishedSnapshot) ||
      (current.publishStatus === 'published'
        ? this.buildSnapshot(current)
        : null);
    const data = await this.toData(dto, current);
    try {
      const item = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.libraryItem.update({
          where: { id },
          data: data as any,
          include: { place: true },
        });
        const needsPublish =
          !currentSnapshot ||
          JSON.stringify(currentSnapshot) !==
            JSON.stringify(this.buildSnapshot(updated));
        return tx.libraryItem.update({
          where: { id },
          data: {
            needsPublish,
            publishedSnapshot: currentSnapshot
              ? (currentSnapshot as Prisma.InputJsonValue)
              : Prisma.DbNull,
          },
          include: { place: true },
        });
      });
      return this.presentItem(item, true);
    } catch (error: any) {
      if (error?.code === 'P2002')
        throw new BadRequestException('Slug 已存在，请换一个');
      throw error;
    }
  }

  async publish(id: string) {
    const current = await this.prisma.libraryItem.findUnique({
      where: { id },
      include: { place: true },
    });
    if (!current) throw new NotFoundException('书影记录不存在');
    const snapshot = this.buildSnapshot(current);
    const item = await this.prisma.libraryItem.update({
      where: { id },
      data: {
        publishStatus: 'published',
        needsPublish: false,
        publishedSnapshot: snapshot as Prisma.InputJsonValue,
        publishedAt: current.publishedAt || new Date(),
      },
      include: { place: true },
    });
    this.memoryGraph?.scheduleRebuild();
    this.aiNative?.schedulePrecompute('library', item.id);
    return this.presentItem(item, true);
  }

  async makePrivate(id: string) {
    const item = await this.prisma.libraryItem
      .update({
        where: { id },
        data: { publishStatus: 'private' },
        include: { place: true },
      })
      .catch(() => null);
    if (!item) throw new NotFoundException('书影记录不存在');
    this.memoryGraph?.scheduleRebuild();
    return this.presentItem(item, true);
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.libraryItem.delete({ where: { id } });
    this.memoryGraph?.scheduleRebuild();
    return { success: true };
  }

  private async toData(dto: UpdateLibraryItemDto, existing?: any) {
    const {
      placeId: _placeId,
      occurredAt: _occurredAt,
      locationVisibility: _visibility,
      locationPrecision: _precision,
      locationSource: _source,
      confirmExactLocation: _confirmExact,
      publishStatus: _publishStatus,
      ...data
    }: Record<string, any> = { ...dto };
    const spacetime = await prepareSpacetime(
      { ...dto, occurredAt: undefined },
      existing,
      async (placeId) => {
        const place = await this.prisma.place.findUnique({
          where: { id: placeId },
          select: { id: true },
        });
        if (!place) throw new BadRequestException('所选地点不存在');
      },
    );
    delete (spacetime as Record<string, unknown>).occurredAt;
    Object.assign(data, spacetime);
    for (const key of [
      'originalTitle',
      'coverImage',
      'creator',
      'summary',
      'reflection',
      'progressStatus',
      'country',
      'language',
      'director',
      'platform',
    ]) {
      if (key in data)
        data[key] =
          typeof data[key] === 'string' ? data[key].trim() || null : data[key];
    }
    for (const key of ['highlights', 'quotes', 'genres', 'cast']) {
      if (Array.isArray(data[key]))
        data[key] = data[key]
          .map((value: string) => value.trim())
          .filter(Boolean);
    }
    if (data.title) data.title = data.title.trim();
    if (data.slug) data.slug = data.slug.trim();
    if ('experienceDate' in data) {
      data.startDate = data.experienceDate
        ? new Date(data.experienceDate)
        : null;
      data.finishDate = null;
      delete data.experienceDate;
    }
    return data;
  }

  private presentItem(item: Record<string, any>, admin = false): any {
    if (!admin) {
      const active =
        this.readSnapshot(item.publishedSnapshot) || this.buildSnapshot(item);
      const {
        place: _activePlace,
        locationVisibility: _activeVisibility,
        locationPrecision: _activePrecision,
        locationSource: _activeSource,
        locationExactConfirmedAt: _activeConfirmed,
        ...visible
      } = active;
      return {
        id: item.id,
        ...visible,
        publishStatus: 'published',
        viewCount: item.viewCount,
        publishedAt: item.publishedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        publicLocation: buildPublicLocation({
          place: active.place,
          visibility: active.locationVisibility,
          precision: active.locationPrecision,
          exactConfirmedAt: active.locationExactConfirmedAt,
        }),
        experienceDate: active.finishDate || active.startDate || null,
      };
    }
    const {
      startDate,
      finishDate,
      publisher: _publisher,
      isbn: _isbn,
      totalPages: _totalPages,
      sourceUrl: _sourceUrl,
      placeId,
      place,
      locationVisibility,
      locationPrecision,
      locationSource,
      locationExactConfirmedAt,
      ...visible
    } = item;
    const placeSnapshot = this.placeSnapshot(place);
    const location = buildPublicLocation({
      place: placeSnapshot,
      visibility: locationVisibility,
      precision: locationPrecision,
      exactConfirmedAt: locationExactConfirmedAt,
    });
    return {
      ...visible,
      ...(admin
        ? {
            placeId,
            place: placeSnapshot,
            locationVisibility,
            locationPrecision,
            locationSource,
            locationExactConfirmedAt,
          }
        : {}),
      publicLocation: location,
      publishStatus: item.publishStatus,
      needsPublish: item.needsPublish ?? true,
      experienceDate: finishDate || startDate || null,
    };
  }

  private buildSnapshot(item: Record<string, any>): PublishedLibrarySnapshot {
    const fields = [
      'type',
      'title',
      'originalTitle',
      'slug',
      'coverImage',
      'creator',
      'summary',
      'reflection',
      'highlights',
      'quotes',
      'genres',
      'cast',
      'progressStatus',
      'rating',
      'rank',
      'recommended',
      'releaseYear',
      'country',
      'language',
      'director',
      'runtimeMinutes',
      'episodeCount',
      'platform',
    ];
    const snapshot: Record<string, any> = {};
    for (const field of fields) snapshot[field] = item[field] ?? null;
    snapshot.startDate = item.startDate
      ? new Date(item.startDate).toISOString()
      : null;
    snapshot.finishDate = item.finishDate
      ? new Date(item.finishDate).toISOString()
      : null;
    snapshot.place = this.placeSnapshot(item.place);
    snapshot.locationVisibility =
      item.locationVisibility === 'public' ||
      item.locationVisibility === 'blurred'
        ? item.locationVisibility
        : 'private';
    snapshot.locationPrecision = ['exact', 'city', 'province'].includes(
      item.locationPrecision,
    )
      ? item.locationPrecision
      : 'place';
    snapshot.locationSource = item.locationSource || null;
    snapshot.locationExactConfirmedAt = item.locationExactConfirmedAt
      ? new Date(item.locationExactConfirmedAt).toISOString()
      : null;
    return snapshot as PublishedLibrarySnapshot;
  }

  private readSnapshot(raw: unknown): PublishedLibrarySnapshot | null {
    if (!raw || typeof raw !== 'object') return null;
    const snapshot = raw as Record<string, any>;
    if (!snapshot.title || !snapshot.slug) return null;
    return {
      ...snapshot,
      title: String(snapshot.title),
      slug: String(snapshot.slug),
      place: this.placeSnapshot(snapshot.place),
    } as PublishedLibrarySnapshot;
  }

  private placeSnapshot(raw: unknown): PlaceSnapshot | null {
    if (!raw || typeof raw !== 'object') return null;
    const place = raw as Record<string, unknown>;
    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    if (
      !place.id ||
      !place.name ||
      !place.slug ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    )
      return null;
    return {
      id: String(place.id),
      name: String(place.name),
      slug: String(place.slug),
      address: place.address == null ? null : String(place.address),
      city: place.city == null ? null : String(place.city),
      province: place.province == null ? null : String(place.province),
      country: place.country == null ? null : String(place.country),
      latitude,
      longitude,
      type: String(place.type || 'poi'),
    };
  }
}

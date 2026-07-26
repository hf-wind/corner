import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';
import { UpdateLibraryItemDto } from './dto/update-library-item.dto';
import { AiService } from '../ai/ai.service';

type LibraryQuery = {
  page?: string;
  limit?: string;
  type?: string;
  status?: string;
  search?: string;
  sort?: string;
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

@Injectable()
export class LibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async lookupMetadata(type: 'book' | 'film', title: string) {
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) throw new BadRequestException('请先输入书名或影视名');
    const sources = await this.lookupPublicSources(type, cleanTitle);
    const workFields = type === 'book'
      ? `originalTitle, creator（作者）, summary（180至300字无剧透简介）, genres（字符串数组）, country, language`
      : `originalTitle, director, cast（主要演员字符串数组，最多8人）, summary（180至300字无剧透简介）, genres（字符串数组，优先标明悬疑细分类）, releaseYear, country, language, runtimeMinutes, episodeCount`;
    const recordFields = type === 'book'
      ? `reflection（以第一人称写一篇300至500字、自然克制且有具体作品理解的阅读体会草稿）, highlights（3至6条主题摘记或短摘录的字符串数组，每条不超过60字）, quotes（3至6条准确的短名句字符串数组，每条不超过50字）`
      : `reflection（以第一人称写一篇300至500字、避免关键剧透且有具体作品理解的观影体会草稿）, highlights（3至6条令人印象深刻的情节或镜头描述字符串数组，不泄露结局）, quotes（2至5条准确的短台词字符串数组，每条不超过50字）`;
    const response = await this.ai.chat(
      [
        {
          role: 'system',
          content: `你是严谨且文风自然的书影音记录助手。优先依据提供的公开资料候选做作品消歧与字段整理，再用可靠常识补缺。只返回一个合法 JSON 对象，不要 Markdown，不要解释。作品资料与原句禁止编造；不确定的资料字段使用 null，不确定的原句返回空数组。体会属于可编辑的第一人称草稿，可以表达具体理解，但不要声称真实发生过的私人经历。返回 sourceIndex 表示采用的候选序号，没有匹配候选则为 null。不要生成评分、排名、阅读/观看状态或日期。`,
        },
        {
          role: 'user',
          content: `类型：${type === 'book' ? '书籍' : '影视'}\n名称：${cleanTitle}\n需要字段：title（规范中文名）, ${workFields}, ${recordFields}, sourceIndex\n\n公开资料候选：\n${JSON.stringify(sources.map((source, sourceIndex) => ({ sourceIndex, ...source, coverImage: undefined }))).slice(0, 9000)}`,
        },
      ],
      { temperature: 0.35, maxTokens: 2600, thinking: 'disabled' },
    );
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new BadRequestException('AI 返回的资料格式无法识别，请重试');
    let parsed: Record<string, any>;
    try { parsed = JSON.parse(jsonMatch[0]); }
    catch { throw new BadRequestException('AI 返回的资料格式无法识别，请重试'); }

    const result: Record<string, any> = {};
    const stringFields = ['title', 'originalTitle', 'creator', 'summary', 'reflection', 'country', 'language', 'director'];
    const numberFields = ['releaseYear', 'runtimeMinutes', 'episodeCount'];
    for (const key of stringFields) {
      if (typeof parsed[key] === 'string' && parsed[key].trim()) result[key] = parsed[key].trim();
    }
    for (const key of numberFields) {
      const value = Number(parsed[key]);
      if (Number.isFinite(value) && value > 0) result[key] = Math.round(value);
    }
    for (const key of ['genres', 'cast', 'highlights', 'quotes']) {
      if (Array.isArray(parsed[key])) result[key] = parsed[key].map(String).map((value: string) => value.trim()).filter(Boolean).slice(0, 12);
    }
    const sourceIndex = Number(parsed.sourceIndex);
    const chosenSource = Number.isInteger(sourceIndex) && sources[sourceIndex] ? sources[sourceIndex] : sources.length === 1 ? sources[0] : undefined;
    if (chosenSource?.coverImage) result.coverImage = chosenSource.coverImage;
    return result;
  }

  private async lookupPublicSources(type: 'book' | 'film', title: string): Promise<PublicLibrarySource[]> {
    try {
      return type === 'book' ? await this.lookupGoogleBooks(title) : await this.lookupWikipedia(title);
    } catch {
      return [];
    }
  }

  private async lookupGoogleBooks(title: string): Promise<PublicLibrarySource[]> {
    const query = new URLSearchParams({ q: `intitle:${title}`, maxResults: '5', printType: 'books' });
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${query}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as { items?: Array<{ volumeInfo?: Record<string, any> }> };
    return (data.items || []).map((entry) => {
      const info = entry.volumeInfo || {};
      return {
        title: String(info.title || ''),
        summary: String(info.description || '').slice(0, 1800) || undefined,
        creator: Array.isArray(info.authors) ? info.authors.join(' / ') : undefined,
        genres: Array.isArray(info.categories) ? info.categories.map(String) : [],
        language: info.language ? String(info.language) : undefined,
        coverImage: info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.thumbnail?.replace(/^http:/, 'https:'),
      };
    }).filter((source) => source.title);
  }

  private async lookupWikipedia(title: string): Promise<PublicLibrarySource[]> {
    const query = new URLSearchParams({
      action: 'query', generator: 'search', gsrsearch: `${title} 电影 电视剧`, gsrlimit: '5',
      prop: 'extracts|pageimages', exintro: '1', explaintext: '1', piprop: 'thumbnail', pithumbsize: '900',
      redirects: '1', format: 'json', origin: '*',
    });
    const response = await fetch(`https://zh.wikipedia.org/w/api.php?${query}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as { query?: { pages?: Record<string, any> } };
    return Object.values(data.query?.pages || {}).map((page: any) => ({
      title: String(page.title || ''),
      summary: String(page.extract || '').slice(0, 1800) || undefined,
      coverImage: page.thumbnail?.source ? String(page.thumbnail.source) : undefined,
    })).filter((source) => source.title);
  }

  async findAll(query: LibraryQuery) {
    const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit || '12', 10) || 12));
    const where: Record<string, any> = {};
    if (!query.admin) where.publishStatus = 'published';
    else if (query.status && query.status !== 'all') where.publishStatus = query.status;
    if (query.type && ['book', 'film'].includes(query.type)) where.type = query.type;
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { originalTitle: { contains: search, mode: 'insensitive' } },
        { creator: { contains: search, mode: 'insensitive' } },
        { director: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = query.sort === 'rank'
      ? [{ rank: { sort: 'asc', nulls: 'last' } }, { publishedAt: 'desc' }]
      : [{ recommended: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }];
    const [items, total] = await Promise.all([
      this.prisma.libraryItem.findMany({ where, orderBy: orderBy as any, skip: (page - 1) * limit, take: limit }),
      this.prisma.libraryItem.count({ where }),
    ]);
    return {
      items: items.map((item) => this.presentItem(item)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getMeta() {
    const [books, films] = await Promise.all([
      this.prisma.libraryItem.count({ where: { type: 'book', publishStatus: 'published' } }),
      this.prisma.libraryItem.count({ where: { type: 'film', publishStatus: 'published' } }),
    ]);
    return { books, films, total: books + films };
  }

  async findById(id: string) {
    const item = await this.prisma.libraryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('书影音记录不存在');
    return this.presentItem(item);
  }

  async findPublishedBySlug(slug: string) {
    const item = await this.prisma.libraryItem.findFirst({ where: { slug, publishStatus: 'published' } });
    if (!item) throw new NotFoundException('书影音记录不存在或尚未发布');
    void this.prisma.libraryItem.update({ where: { id: item.id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);
    return this.presentItem(item);
  }

  async create(dto: CreateLibraryItemDto) {
    const data = this.toData(dto);
    try {
      const item = await this.prisma.libraryItem.create({ data: data as any });
      return this.presentItem(item);
    } catch (error: any) {
      if (error?.code === 'P2002') throw new BadRequestException('Slug 已存在，请换一个');
      throw error;
    }
  }

  async update(id: string, dto: UpdateLibraryItemDto) {
    const current = await this.findById(id);
    const data = this.toData(dto, current.publishStatus);
    try {
      const item = await this.prisma.libraryItem.update({ where: { id }, data: data as any });
      return this.presentItem(item);
    } catch (error: any) {
      if (error?.code === 'P2002') throw new BadRequestException('Slug 已存在，请换一个');
      throw error;
    }
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.libraryItem.delete({ where: { id } });
    return { success: true };
  }

  private toData(dto: UpdateLibraryItemDto, previousStatus = 'draft') {
    const data: Record<string, any> = { ...dto };
    for (const key of ['originalTitle', 'coverImage', 'creator', 'summary', 'reflection', 'progressStatus', 'country', 'language', 'director', 'platform']) {
      if (key in data) data[key] = typeof data[key] === 'string' ? data[key].trim() || null : data[key];
    }
    for (const key of ['highlights', 'quotes', 'genres', 'cast']) {
      if (Array.isArray(data[key])) data[key] = data[key].map((value: string) => value.trim()).filter(Boolean);
    }
    if (data.title) data.title = data.title.trim();
    if (data.slug) data.slug = data.slug.trim();
    if ('experienceDate' in data) {
      data.startDate = data.experienceDate ? new Date(data.experienceDate) : null;
      data.finishDate = null;
      delete data.experienceDate;
    }
    if (data.publishStatus === 'published' && previousStatus !== 'published') data.publishedAt = new Date();
    if (data.publishStatus === 'draft') data.publishedAt = null;
    return data;
  }

  private presentItem(item: Record<string, any>) {
    const {
      startDate,
      finishDate,
      publisher: _publisher,
      isbn: _isbn,
      totalPages: _totalPages,
      sourceUrl: _sourceUrl,
      ...visible
    } = item;
    return {
      ...visible,
      publishStatus: item.publishStatus,
      experienceDate: finishDate || startDate || null,
    };
  }
}

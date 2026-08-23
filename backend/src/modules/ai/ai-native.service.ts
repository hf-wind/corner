import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService, type AiChatActor } from './ai.service';
import type { AiEventDto, AiNarrativeDto } from './dto/ai-native.dto';

const VECTOR_SIZE = 96;
const PUBLIC_TYPES = [
  'post',
  'moment',
  'library',
  'place',
  'album',
  'journey',
  'story',
  'tag',
];

@Injectable()
export class AiNativeService {
  private readonly searchCache = new Map<
    string,
    { expiresAt: number; items: ReturnType<AiNativeService['card']>[] }
  >();

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  private plain(value: unknown, max = 12000) {
    return String(value || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(
        /(?:(?:https?:\/\/)|(?:https?%3a%2f%2f)|(?:\/uploads\/)|(?:%2fuploads%2f))[^\s<>()]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:(?:\?|%3f)[^\s<>()]*)?/gi,
        ' ',
      )
      .replace(/[#>*_~`\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private tokens(value: string) {
    const text = this.plain(value).toLowerCase();
    const result = new Set(
      text.split(/[^\p{L}\p{N}]+/u).filter((item) => item.length > 1),
    );
    const cjk = text.replace(/[^\u4e00-\u9fff]/g, '');
    for (let index = 0; index < cjk.length - 1; index++)
      result.add(cjk.slice(index, index + 2));
    for (let index = 0; index < cjk.length - 2; index++)
      result.add(cjk.slice(index, index + 3));
    return [...result].slice(0, 512);
  }

  private vector(value: string) {
    const vector = Array.from({ length: VECTOR_SIZE }, () => 0);
    for (const token of this.tokens(value)) {
      const digest = createHash('sha256').update(token).digest();
      const index = digest.readUInt16BE(0) % VECTOR_SIZE;
      vector[index] += digest[2] % 2 ? 1 : -1;
    }
    const length =
      Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0)) || 1;
    return vector.map((item) => Number((item / length).toFixed(6)));
  }

  private cosine(left: number[], right: number[]) {
    return left.reduce(
      (sum, item, index) => sum + item * (right[index] || 0),
      0,
    );
  }

  private metadata(value: unknown) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private card(
    item: {
      contentType: string;
      sourceId: string;
      title: string;
      href: string;
      excerpt: string | null;
      image: string | null;
      occurredAt: Date | null;
      metadata: unknown;
    },
    score?: number,
  ) {
    const excerpt = item.excerpt || '';
    return {
      type: item.contentType,
      sourceId: item.sourceId,
      title: item.title,
      href: item.href,
      excerpt: this.plain(excerpt, 280),
      image: item.image || this.firstContentImage(excerpt),
      occurredAt: item.occurredAt?.toISOString() || null,
      metadata: this.metadata(item.metadata),
      score: score == null ? undefined : Number(score.toFixed(4)),
    };
  }

  private async searchCommentCards(query: string, limit: number) {
    const contains = { contains: query, mode: 'insensitive' as const };
    const [postComments, momentComments] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          status: 'approved',
          post: { status: 'published' },
          OR: [
            { content: contains },
            { authorName: contains },
          ],
        },
        include: { post: { select: { title: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        take: 80,
      }),
      this.prisma.momentComment.findMany({
        where: {
          status: 'approved',
          moment: { status: 'published' },
          OR: [
            { content: contains },
            { authorName: contains },
          ],
        },
        include: { moment: { select: { title: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        take: 80,
      }),
    ]);
    const cards = [
      ...postComments.map((comment) => ({
        type: 'comment',
        sourceId: comment.id,
        title: `评论 · ${comment.post.title}`,
        href: `/article/${comment.post.slug}?commentId=${comment.id}${comment.parentId ? `&parentId=${comment.parentId}` : ''}`,
        excerpt: this.plain(comment.content, 280),
        image: null,
        occurredAt: comment.createdAt?.toISOString() || null,
        metadata: { commentId: comment.id, parentId: comment.parentId },
        score: 1.2,
      })),
      ...momentComments.map((comment) => ({
        type: 'moment-comment',
        sourceId: comment.id,
        title: `评论 · ${comment.moment.title}`,
        href: `/moments?focus=${encodeURIComponent(comment.moment.slug)}&commentId=${comment.id}${comment.parentId ? `&parentId=${comment.parentId}` : ''}`,
        excerpt: this.plain(comment.content, 280),
        image: null,
        occurredAt: comment.createdAt?.toISOString() || null,
        metadata: { commentId: comment.id, parentId: comment.parentId },
        score: 1.2,
      })),
    ];
    return cards
      .filter((card) =>
        `${card.title} ${card.excerpt}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
      )
      .sort((left, right) => Number(right.occurredAt || 0) - Number(left.occurredAt || 0))
      .slice(0, Math.max(1, Math.min(80, limit)));
  }

  private searchSnippet(value: unknown, query: string, max = 280) {
    const text = this.plain(value, 12000);
    if (!text) return '';
    const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    if (index < 0) return text.slice(0, max);
    const start = Math.max(0, index - Math.floor(max * 0.35));
    return `${start > 0 ? '…' : ''}${text.slice(start, start + max)}${start + max < text.length ? '…' : ''}`;
  }

  private async searchPublishedContent(query: string, limit: number) {
    const contains = { contains: query, mode: 'insensitive' as const };
    const [posts, moments, albums, libraryItems, journeys, stories, places, photos, tags] =
      await Promise.all([
        this.prisma.post.findMany({
          where: {
            status: 'published',
            OR: [{ title: contains }, { content: contains }, { excerpt: contains }],
          },
          select: { id: true, slug: true, title: true, content: true, excerpt: true, publishedAt: true },
          take: 80,
        }),
        this.prisma.moment.findMany({
          where: {
            status: 'published',
            OR: [{ title: contains }, { content: contains }, { excerpt: contains }],
          },
          select: { id: true, slug: true, title: true, content: true, excerpt: true, publishedAt: true },
          take: 80,
        }),
        this.prisma.album.findMany({
          where: {
            status: 'published',
            OR: [{ title: contains }, { description: contains }],
          },
          select: { id: true, slug: true, title: true, description: true, publishedAt: true },
          take: 80,
        }),
        this.prisma.libraryItem.findMany({
          where: {
            publishStatus: 'published',
            OR: [
              { title: contains },
              { originalTitle: contains },
              { creator: contains },
              { summary: contains },
              { reflection: contains },
            ],
          },
          select: {
            id: true,
            slug: true,
            title: true,
            originalTitle: true,
            creator: true,
            summary: true,
            reflection: true,
            publishedAt: true,
          },
          take: 80,
        }),
        this.prisma.journey.findMany({
          where: {
            status: 'published',
            OR: [{ title: contains }, { description: contains }],
          },
          select: { id: true, slug: true, title: true, description: true, publishedAt: true },
          take: 80,
        }),
        this.prisma.storyRoute.findMany({
          where: {
            status: 'published',
            OR: [{ title: contains }, { description: contains }],
          },
          select: { id: true, slug: true, title: true, description: true, publishedAt: true },
          take: 80,
        }),
        this.prisma.place.findMany({
          where: {
            OR: [
              { name: contains },
              { address: contains },
              { city: contains },
              { province: contains },
              { country: contains },
            ],
          },
          select: { id: true, slug: true, name: true, address: true, city: true, province: true, country: true },
          take: 80,
        }),
        this.prisma.albumItem.findMany({
          where: {
            caption: contains,
            album: { status: 'published' },
          },
          select: { id: true, caption: true, album: { select: { title: true, slug: true } } },
          take: 80,
        }),
        this.prisma.tag.findMany({
          where: { name: contains },
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
            _count: { select: { posts: { where: { post: { status: 'published' } } } } },
          },
          take: 80,
        }),
      ]);

    const createCard = (
      type: string,
      sourceId: string,
      title: string,
      href: string,
      text: unknown,
      occurredAt?: Date | null,
      metadata: Record<string, unknown> = {},
    ) => ({
      type,
      sourceId,
      title,
      href,
      excerpt: this.searchSnippet(text, query),
      image: null,
      occurredAt: occurredAt?.toISOString() || null,
      metadata,
      score: 1.05,
    });

    return [
      ...posts.map((item) => createCard('post', item.id, item.title, `/article/${item.slug}`, item.content || item.excerpt, item.publishedAt)),
      ...moments.map((item) => createCard('moment', item.id, item.title, `/moments?focus=${encodeURIComponent(item.slug)}`, item.content || item.excerpt, item.publishedAt)),
      ...albums.map((item) => createCard('album', item.id, item.title, `/albums/${item.slug}`, item.description, item.publishedAt)),
      ...libraryItems.map((item) => createCard('library', item.id, item.title, `/library/${item.slug}`, [item.originalTitle, item.creator, item.summary, item.reflection].filter(Boolean).join(' · '), item.publishedAt)),
      ...journeys.map((item) => createCard('journey', item.id, item.title, `/journeys/${item.slug}`, item.description, item.publishedAt)),
      ...stories.map((item) => createCard('story', item.id, item.title, `/stories/${item.slug}`, item.description, item.publishedAt)),
      ...places.map((item) => createCard('place', item.id, item.name, `/places/${item.slug}`, [item.address, item.city, item.province, item.country].filter(Boolean).join(' · '))),
      ...photos.map((item) => createCard('photo', item.id, `照片 · ${item.album.title}`, `/albums/${item.album.slug}?photo=${item.id}`, item.caption, null, { albumTitle: item.album.title })),
      ...tags.map((item) => createCard('tag', item.id, `标签 · ${item.name}`, `/tags?tag=${encodeURIComponent(item.slug)}`, `${item.name} · ${item._count.posts} 篇文章`, null, { slug: item.slug, icon: item.icon, color: item.color, postCount: item._count.posts })),
    ]
      .filter((card) =>
        `${card.title} ${card.excerpt}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
      )
      .slice(0, Math.max(1, Math.min(80, limit)));
  }

  private firstContentImage(value: unknown) {
    const text = String(value || '');
    return (
      text.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1]?.trim() ||
      text.match(
        /(?:(?:https?:\/\/)|(?:https?%3a%2f%2f)|(?:\/uploads\/)|(?:%2fuploads%2f))[^\s<>()]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:(?:\?|%3f)[^\s<>()]*)?/i,
      )?.[0] ||
      null
    );
  }

  async syncIndex() {
    const nodes = await this.prisma.memoryNode.findMany({
      where: { type: { in: PUBLIC_TYPES } },
      orderBy: { updatedAt: 'desc' },
    });
    const keys: Array<{ contentType: string; sourceId: string }> = [];
    for (const node of nodes) {
      const metadata = this.metadata(node.metadata);
      const searchableMetadata = Object.entries(metadata)
        .filter(([key]) => !/image|thumbnail|cover|path|url|src/i.test(key))
        .map(([, value]) => this.plain(value, 1200))
        .filter(Boolean)
        .join(' ');
      const body = [node.title, node.excerpt || '', searchableMetadata].filter(Boolean).join('\n');
      const contentHash = this.hash({
        body,
        href: node.href,
        image: node.image,
        occurredAt: node.occurredAt,
      });
      keys.push({ contentType: node.type, sourceId: node.sourceId });
      await this.prisma.aiContentIndex.upsert({
        where: {
          contentType_sourceId: {
            contentType: node.type,
            sourceId: node.sourceId,
          },
        },
        create: {
          contentType: node.type,
          sourceId: node.sourceId,
          title: node.title,
          slug: node.slug,
          href: node.href,
          excerpt: node.excerpt,
          body,
          image: node.image,
          occurredAt: node.occurredAt,
          embedding: this.vector(body),
          metadata: node.metadata as Prisma.InputJsonValue,
          contentHash,
        },
        update: {
          title: node.title,
          slug: node.slug,
          href: node.href,
          excerpt: node.excerpt,
          body,
          image: node.image,
          occurredAt: node.occurredAt,
          embedding: this.vector(body),
          metadata: node.metadata as Prisma.InputJsonValue,
          contentHash,
          indexedAt: new Date(),
        },
      });
    }
    const current = new Set(
      keys.map((item) => `${item.contentType}:${item.sourceId}`),
    );
    const existing = await this.prisma.aiContentIndex.findMany({
      select: { id: true, contentType: true, sourceId: true },
    });
    const stale = existing
      .filter((item) => !current.has(`${item.contentType}:${item.sourceId}`))
      .map((item) => item.id);
    if (stale.length)
      await this.prisma.aiContentIndex.deleteMany({
        where: { id: { in: stale } },
      });
    this.searchCache.clear();
    return {
      indexed: nodes.length,
      removed: stale.length,
      types: [...new Set(nodes.map((item) => item.type))],
    };
  }

  private async ensureIndex() {
    if (!(await this.prisma.aiContentIndex.count())) await this.syncIndex();
  }

  async search(query: string, types: string[] = [], limit = 6) {
    const normalizedQuery = this.plain(query, 240).toLocaleLowerCase();
    if (!normalizedQuery) return [];
    await this.ensureIndex();
    const allowed = types.filter((item) => PUBLIC_TYPES.includes(item));
    const cacheKey = `${normalizedQuery}|${allowed.sort().join(',')}|${Math.max(1, Math.min(12, limit))}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.items;
    const typeFilter = allowed.length ? { contentType: { in: allowed } } : {};
    const items = await this.prisma.aiContentIndex.findMany({
      where: {
        ...typeFilter,
        OR: [
          { title: { contains: normalizedQuery, mode: 'insensitive' } },
          { excerpt: { contains: normalizedQuery, mode: 'insensitive' } },
          { body: { contains: normalizedQuery, mode: 'insensitive' } },
        ],
      },
      orderBy: { occurredAt: 'desc' },
      take: 240,
    });
    const queryVector = this.vector(normalizedQuery);
    const contentResult = items
      .map((item) => ({
        item,
        score: (() => {
          const haystack = `${item.title} ${item.excerpt || ''} ${item.body}`.toLocaleLowerCase();
          const exact = haystack.includes(normalizedQuery) ? 0.65 : 0;
          const title = item.title.toLocaleLowerCase().includes(normalizedQuery) ? 0.9 : 0;
          return this.cosine(
            queryVector,
            Array.isArray(item.embedding) ? item.embedding.map(Number) : [],
          ) + exact + title;
        })(),
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          Number(right.item.occurredAt || 0) -
            Number(left.item.occurredAt || 0),
      )
      .slice(0, Math.max(1, Math.min(12, limit)))
      .map(({ item, score }) => ({
        ...this.card(item, score),
        excerpt: this.searchSnippet(item.body || item.excerpt, normalizedQuery),
      }));
    const [contentResultDirect, commentResult] = await Promise.all([
      this.searchPublishedContent(normalizedQuery, Math.max(1, Math.min(80, limit * 5))),
      this.searchCommentCards(normalizedQuery, Math.max(1, Math.min(80, limit * 4))),
    ]);
    // 索引是增量缓存，实时查询可能同时命中同一条内容；合并时按实体去重，避免搜索结果重复。
    const merged = [...contentResult, ...contentResultDirect, ...commentResult]
      .sort(
        (left, right) =>
          Number(right.score || 0) - Number(left.score || 0) ||
          new Date(right.occurredAt || 0).getTime() -
            new Date(left.occurredAt || 0).getTime(),
      )
    const unique = new Map<string, (typeof merged)[number]>();
    for (const item of merged) {
      const key = `${item.type}:${item.sourceId}`;
      const previous = unique.get(key);
      if (!previous || Number(item.score || 0) > Number(previous.score || 0)) unique.set(key, item);
    }
    const result = [...unique.values()]
      .filter((item) => item.type !== 'photo')
      .slice(0, Math.max(1, Math.min(12, limit)));
    this.searchCache.set(cacheKey, { expiresAt: Date.now() + 15_000, items: result });
    return result;
  }

  async explore(query: string, types: string[] = [], limit = 6) {
    const cards = await this.search(query, types, limit);
    let answer = cards.length
      ? `我找到了 ${cards.length} 条可以继续探索的内容，建议先从《${cards[0].title}》开始。`
      : '暂时没有找到匹配内容，可以换一个主题或时间范围试试。';
    if (cards.length && (await this.ai.isConfigured())) {
      try {
        answer = await this.ai.chat(
          [
            {
              role: 'system',
              content:
                '你是个人数字花园的阅读向导。只能依据候选内容回答，简洁说明推荐逻辑，不得虚构。',
            },
            {
              role: 'user',
              content: `问题：${query}\n候选：${JSON.stringify(cards.map(({ score, ...card }) => card))}`,
            },
          ],
          { temperature: 0.3, maxTokens: 500, thinking: 'disabled' },
        );
      } catch {
        /* local answer remains available */
      }
    }
    return { answer, cards };
  }

  private sentences(value: string) {
    return this.plain(value)
      .split(/(?<=[。！？.!?])\s*/u)
      .map((item) => item.trim())
      .filter((item) => item.length > 8);
  }

  async insight(contentType: string, slugOrId: string) {
    await this.ensureIndex();
    const item = await this.prisma.aiContentIndex.findFirst({
      where: { contentType, OR: [{ slug: slugOrId }, { sourceId: slugOrId }] },
    });
    if (!item) throw new NotFoundException('内容洞察不存在');
    const cached = await this.prisma.aiContentInsight.findUnique({
      where: { contentType_sourceId: { contentType, sourceId: item.sourceId } },
    });
    if (cached?.contentHash === item.contentHash)
      return { ...cached, related: cached.related, card: this.card(item) };
    const sentences = this.sentences(
      `${item.title}。${item.excerpt || ''}。${item.body}`,
    );
    let summary =
      sentences.slice(0, 3).join(' ').slice(0, 500) ||
      item.excerpt ||
      item.title;
    let keyPoints = sentences
      .slice(0, 6)
      .map((sentence) => sentence.slice(0, 140));
    let generatedBy = 'local';
    const related = (
      await this.search(`${item.title} ${item.excerpt || ''}`, [], 8)
    )
      .filter(
        (card) =>
          !(card.type === contentType && card.sourceId === item.sourceId),
      )
      .slice(0, 4);
    if (await this.ai.isConfigured()) {
      try {
        const text = await this.ai.chat(
          [
            {
              role: 'system',
              content: '为阅读条生成可核验内容，只依据材料，严格输出 JSON。',
            },
            {
              role: 'user',
              content: `材料：${item.body.slice(0, 8000)}\n输出 {"summary":"30秒读懂，最多180字","keyPoints":["核心观点，最多6条"]}`,
            },
          ],
          { temperature: 0.2, maxTokens: 800, thinking: 'disabled' },
        );
        const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
        if (typeof parsed.summary === 'string')
          summary = parsed.summary.slice(0, 500);
        if (Array.isArray(parsed.keyPoints))
          keyPoints = parsed.keyPoints.map(String).slice(0, 6);
        generatedBy = 'ai';
      } catch {
        /* deterministic insight remains */
      }
    }
    const saved = await this.prisma.aiContentInsight.upsert({
      where: { contentType_sourceId: { contentType, sourceId: item.sourceId } },
      create: {
        contentType,
        sourceId: item.sourceId,
        slug: item.slug,
        summary,
        keyPoints,
        related: related as unknown as Prisma.InputJsonValue,
        generatedBy,
        contentHash: item.contentHash,
      },
      update: {
        slug: item.slug,
        summary,
        keyPoints,
        related: related as unknown as Prisma.InputJsonValue,
        generatedBy,
        contentHash: item.contentHash,
      },
    });
    return { ...saved, card: this.card(item) };
  }

  async precompute(contentType: string, sourceId: string) {
    await this.syncIndex();
    return this.insight(contentType, sourceId);
  }

  schedulePrecompute(contentType: string, sourceId: string, delayMs = 1800) {
    const timer = setTimeout(() => {
      void this.precompute(contentType, sourceId).catch(() => undefined);
    }, delayMs);
    timer.unref?.();
  }

  async transform(
    userId: string,
    text: string,
    action: 'polish' | 'expand' | 'compress',
  ) {
    const profile = await this.prisma.aiAuthorStyleProfile.findUnique({
      where: { userId },
    });
    const instruction = {
      polish: '润色但不改变事实和语气',
      expand: '扩写并补足过渡，但不得新增事实',
      compress: '压缩冗余并保留关键信息',
    }[action];
    const output = await this.ai.chat(
      [
        {
          role: 'system',
          content: `你是作者的创作副驾驶。${instruction}。保留 Markdown。作者风格：${JSON.stringify(profile?.profile || {})}`,
        },
        { role: 'user', content: text },
      ],
      { temperature: 0.35, maxTokens: 1600, thinking: 'disabled' },
    );
    return { original: text, output, action };
  }

  async rebuildStyle(userId: string) {
    const [posts, moments] = await Promise.all([
      this.prisma.post.findMany({
        where: { authorId: userId, status: 'published' },
        orderBy: { publishedAt: 'desc' },
        take: 20,
        select: { title: true, content: true },
      }),
      this.prisma.moment.findMany({
        where: { authorId: userId, status: 'published' },
        orderBy: { publishedAt: 'desc' },
        take: 30,
        select: { title: true, content: true },
      }),
    ]);
    const samples = [...posts, ...moments].map(
      (item) => `${item.title}\n${this.plain(item.content, 1200)}`,
    );
    if (!samples.length)
      throw new BadRequestException('没有可用于建立风格档案的已发布内容');
    const sampleHash = this.hash(samples);
    let profile: Record<string, unknown> = {
      tone: '克制、自然',
      averageLength: Math.round(
        samples.reduce((sum, item) => sum + item.length, 0) / samples.length,
      ),
      samples: samples.length,
    };
    if (await this.ai.isConfigured()) {
      try {
        const text = await this.ai.chat(
          [
            {
              role: 'system',
              content: '分析作者表达习惯，仅输出 JSON，不评价内容。',
            },
            {
              role: 'user',
              content: `${samples.slice(0, 12).join('\n---\n')}\n输出 {"tone":"","rhythm":"","vocabulary":"","structure":"","avoid":[]}`,
            },
          ],
          { temperature: 0.2, maxTokens: 800, thinking: 'disabled' },
        );
        profile = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      } catch {
        /* statistical profile remains */
      }
    }
    return this.prisma.aiAuthorStyleProfile.upsert({
      where: { userId },
      create: { userId, profile: profile as Prisma.InputJsonValue, sampleHash },
      update: { profile: profile as Prisma.InputJsonValue, sampleHash },
    });
  }

  async narrative(userId: string, dto: AiNarrativeDto) {
    const end = dto.end ? new Date(dto.end) : new Date();
    const start = dto.start ? new Date(dto.start) : new Date(end);
    if (!dto.start)
      start.setDate(
        start.getDate() -
          (dto.kind === 'weekly' ? 7 : dto.kind === 'monthly' ? 31 : 366),
      );
    const nodes = await this.prisma.memoryNode.findMany({
      where: {
        occurredAt: { gte: start, lte: end },
        ...(dto.place
          ? { metadata: { path: ['city'], equals: dto.place } }
          : {}),
      },
      orderBy: { occurredAt: 'asc' },
      take: 120,
    });
    if (!nodes.length)
      throw new BadRequestException('这个时间范围没有可用记忆');
    const title =
      dto.theme ||
      {
        weekly: '这一周的片段',
        monthly: '这个月的回声',
        yearly: '这一年的故事',
        route: '记忆航线',
      }[dto.kind];
    let content = nodes
      .map(
        (node) =>
          `- ${node.occurredAt?.toISOString().slice(0, 10) || '未标日期'} · [${node.title}](${node.href})${node.excerpt ? `：${node.excerpt}` : ''}`,
      )
      .join('\n');
    if (await this.ai.isConfigured()) {
      try {
        content = await this.ai.chat(
          [
            {
              role: 'system',
              content:
                '把公开记忆编成克制、可回到原内容的第一人称叙事；保留每条内容的 Markdown 链接，不虚构。',
            },
            {
              role: 'user',
              content: `标题：${title}\n主题：${dto.theme || ''}\n记忆：${content}`,
            },
          ],
          { temperature: 0.45, maxTokens: 2400, thinking: 'disabled' },
        );
      } catch {
        /* linked timeline remains */
      }
    }
    return this.prisma.aiNarrative.create({
      data: {
        kind: dto.kind,
        title,
        content,
        periodStart: start,
        periodEnd: end,
        filters: { theme: dto.theme || null, place: dto.place || null },
        nodeIds: nodes.map((node) => node.id),
        createdBy: userId,
      },
    });
  }

  async privateQuery(userId: string, query: string) {
    const [posts, moments] = await Promise.all([
      this.prisma.post.findMany({
        where: { authorId: userId },
        take: 200,
        orderBy: { updatedAt: 'desc' },
        select: {
          title: true,
          slug: true,
          content: true,
          status: true,
          updatedAt: true,
        },
      }),
      this.prisma.moment.findMany({
        where: { authorId: userId },
        take: 200,
        orderBy: { updatedAt: 'desc' },
        select: {
          title: true,
          slug: true,
          content: true,
          status: true,
          updatedAt: true,
        },
      }),
    ]);
    const queryVector = this.vector(query);
    const matches = [
      ...posts.map((item) => ({
        ...item,
        type: 'post',
        href: `/admin/posts/${item.slug}`,
      })),
      ...moments.map((item) => ({
        ...item,
        type: 'moment',
        href: `/admin/moments/${item.slug}`,
      })),
    ]
      .map((item) => ({
        item,
        score: this.cosine(
          queryVector,
          this.vector(`${item.title} ${item.content}`),
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ item, score }) => ({
        type: item.type,
        title: item.title,
        href: item.href,
        excerpt: this.plain(item.content, 220),
        status: item.status,
        updatedAt: item.updatedAt,
        score,
      }));
    let answer = matches.length
      ? `在过去的内容中找到了 ${matches.length} 条相关记录。`
      : '没有找到相关记录。';
    if (matches.length && (await this.ai.isConfigured())) {
      try {
        answer = await this.ai.chat(
          [
            {
              role: 'system',
              content:
                '这是作者私有检索。只能依据给定记录回答，明确区分事实与推测，不泄露给其他用户。',
            },
            {
              role: 'user',
              content: `问题：${query}\n记录：${JSON.stringify(matches)}`,
            },
          ],
          { temperature: 0.25, maxTokens: 1000, thinking: 'disabled' },
        );
      } catch {
        /* fallback */
      }
    }
    return { answer, matches };
  }

  async personalized(actor: AiChatActor, limit = 6) {
    const guestIdHash = actor.guestId ? this.hash(actor.guestId) : undefined;
    const recent = await this.prisma.aiInteraction.findMany({
      where: actor.userId ? { userId: actor.userId } : { guestIdHash },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
    const interest = recent
      .map((item) =>
        [item.contentType, item.href, JSON.stringify(item.metadata)]
          .filter(Boolean)
          .join(' '),
      )
      .join(' ');
    return this.search(interest || '最近更新 值得探索', [], limit);
  }

  async track(
    actor: AiChatActor,
    dto: AiEventDto,
    extra: Record<string, unknown> = {},
  ) {
    return this.prisma.aiInteraction.create({
      data: {
        actorType: actor.userId ? 'user' : 'guest',
        userId: actor.userId,
        guestIdHash: actor.guestId ? this.hash(actor.guestId) : undefined,
        scene: dto.scene,
        action: dto.action,
        contentType: dto.contentType,
        sourceId: dto.sourceId,
        href: dto.href,
        helpful: dto.helpful,
        continued: dto.continued || false,
        sourceClicked: dto.sourceClicked || false,
        durationMs: dto.durationMs,
        model: typeof extra.model === 'string' ? extra.model : undefined,
        inputChars: Number(extra.inputChars) || undefined,
        outputChars: Number(extra.outputChars) || undefined,
        inputTokens: Number(extra.inputTokens) || undefined,
        outputTokens: Number(extra.outputTokens) || undefined,
        sourceCount: Number(extra.sourceCount) || 0,
        fallback: Boolean(extra.fallback),
        errorType:
          typeof extra.errorType === 'string' ? extra.errorType : undefined,
        metadata: {
          ...(dto.metadata || {}),
          ...extra,
        } as Prisma.InputJsonValue,
      },
    });
  }

  async analytics() {
    const [total, chats, feedbackTotal, helpful, clicks, byAction] =
      await Promise.all([
        this.prisma.aiInteraction.count(),
        this.prisma.aiInteraction.count({ where: { action: 'chat' } }),
        this.prisma.aiInteraction.count({ where: { helpful: { not: null } } }),
        this.prisma.aiInteraction.count({ where: { helpful: true } }),
        this.prisma.aiInteraction.count({ where: { sourceClicked: true } }),
        this.prisma.aiInteraction.groupBy({
          by: ['action'],
          _count: { _all: true },
          orderBy: { _count: { action: 'desc' } },
          take: 20,
        }),
      ]);
    return {
      total,
      chats,
      feedbackTotal,
      helpful,
      helpfulRate: feedbackTotal
        ? Number(((helpful / feedbackTotal) * 100).toFixed(1))
        : 0,
      sourceClicks: clicks,
      byAction: byAction.map((item) => ({
        action: item.action,
        count: item._count._all,
      })),
    };
  }

  async usageAnalytics(requestedPage = 1, requestedPageSize = 15) {
    const page = Math.max(1, Math.floor(requestedPage) || 1);
    const pageSize = Math.min(50, Math.max(10, Math.floor(requestedPageSize) || 15));
    const [totals, userGroups, guestGroups, daily] = await Promise.all([
      this.prisma.aiInteraction.aggregate({
        where: { action: 'chat' },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.aiInteraction.groupBy({
        by: ['userId'],
        where: { action: 'chat', userId: { not: null } },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
        orderBy: { _sum: { outputTokens: 'desc' } },
        take: 250,
      }),
      this.prisma.aiInteraction.groupBy({
        by: ['guestIdHash'],
        where: {
          action: 'chat',
          actorType: 'guest',
          guestIdHash: { not: null },
        },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
        orderBy: { _sum: { outputTokens: 'desc' } },
        take: 250,
      }),
      this.prisma.aiInteraction.findMany({
        where: {
          action: 'chat',
          createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
        },
        select: { createdAt: true, inputTokens: true, outputTokens: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const userIds = userGroups
      .map((item) => item.userId)
      .filter(Boolean) as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, email: true, avatar: true, bio: true },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));
    const guestHashes = guestGroups
      .map((item) => item.guestIdHash)
      .filter(Boolean) as string[];
    const profiles = await this.prisma.visitorProfile.findMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { visitorIdHash: { in: guestHashes } },
        ],
      },
      select: {
        userId: true,
        visitorIdHash: true,
        nickname: true,
        visitCount: true,
        messageCount: true,
        firstSeenAt: true,
        lastSeenAt: true,
      },
    });
    const profileByUser = new Map(
      profiles.filter((item) => item.userId).map((item) => [item.userId!, item]),
    );
    const profileByHash = new Map(
      profiles.map((item) => [item.visitorIdHash, item]),
    );
    const profileHashes = profiles.map((item) => item.visitorIdHash);
    const recentVisits = profileHashes.length
      ? await this.prisma.visitorVisit.findMany({
          where: { visitorIdHash: { in: profileHashes } },
          orderBy: { createdAt: 'desc' },
          take: Math.min(1000, profileHashes.length * 4),
          select: {
            visitorIdHash: true,
            region: true,
            browser: true,
            device: true,
            createdAt: true,
          },
        })
      : [];
    const latestVisit = new Map<string, (typeof recentVisits)[number]>();
    for (const visit of recentVisits) {
      if (!latestVisit.has(visit.visitorIdHash)) latestVisit.set(visit.visitorIdHash, visit);
    }
    const pricingTier = String(process.env.DEEPSEEK_PRICING_TIER || 'flash').toLowerCase() === 'pro' ? 'pro' : 'flash';
    const beijingHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', hour: '2-digit', hour12: false }).format(new Date()));
    const peak = (beijingHour >= 9 && beijingHour < 12) || (beijingHour >= 14 && beijingHour < 18);
    const officialPricing = pricingTier === 'pro'
      ? peak ? { cacheHit: 0.3, cacheMiss: 9, output: 27 } : { cacheHit: 0.15, cacheMiss: 4.5, output: 13.5 }
      : peak ? { cacheHit: 0.1, cacheMiss: 3, output: 9 } : { cacheHit: 0.05, cacheMiss: 1.5, output: 4.5 };
    const inputPrice = Math.max(0, Number(process.env.AI_INPUT_PRICE_PER_1M || officialPricing.cacheMiss));
    const outputPrice = Math.max(0, Number(process.env.AI_OUTPUT_PRICE_PER_1M || officialPricing.output));
    const present = (input = 0, output = 0) => ({
      inputTokens: input,
      outputTokens: output,
      totalTokens: input + output,
      estimatedCostUsd: Number(
        ((input * inputPrice + output * outputPrice) / 1_000_000).toFixed(6),
      ),
      estimatedCostCny: Number(((input * officialPricing.cacheMiss + output * officialPricing.output) / 1_000_000).toFixed(6)),
      estimatedCostCnyMin: Number(((input * officialPricing.cacheHit + output * officialPricing.output) / 1_000_000).toFixed(6)),
    });
    const byDay = new Map<
      string,
      { input: number; output: number; calls: number }
    >();
    for (const item of daily) {
      const key = item.createdAt.toISOString().slice(0, 10);
      const current = byDay.get(key) || { input: 0, output: 0, calls: 0 };
      current.input += item.inputTokens || 0;
      current.output += item.outputTokens || 0;
      current.calls += 1;
      byDay.set(key, current);
    }
    const actors = [
        ...userGroups.map((item) => {
          const user = item.userId ? userMap.get(item.userId) : undefined;
          const profile = item.userId ? profileByUser.get(item.userId) : undefined;
          const visit = profile ? latestVisit.get(profile.visitorIdHash) : undefined;
          return {
            actorType: 'user',
            actorId: item.userId,
            conversationId: item.userId,
            name: user?.username || profile?.nickname || '已注销用户',
            email: user?.email || '',
            avatar: user?.avatar || '',
            bio: user?.bio || '',
            region: visit?.region || null,
            browser: visit?.browser || null,
            device: visit?.device || null,
            visitCount: profile?.visitCount || 0,
            messageCount: profile?.messageCount || 0,
            firstSeenAt: profile?.firstSeenAt || null,
            lastSeenAt: profile?.lastSeenAt || visit?.createdAt || null,
            calls: item._count._all,
            ...present(item._sum.inputTokens || 0, item._sum.outputTokens || 0),
          };
        }),
        ...guestGroups.map((item) => {
          const hash = item.guestIdHash || '';
          const profile = profileByHash.get(hash);
          const visit = latestVisit.get(hash);
          return {
            actorType: 'guest',
            actorId: hash.slice(0, 12),
            conversationId: `guest:${hash}`,
            name: profile?.nickname?.trim() || '未登记访客',
            email: '',
            avatar: '',
            bio: '',
            region: visit?.region || null,
            browser: visit?.browser || null,
            device: visit?.device || null,
            visitCount: profile?.visitCount || 0,
            messageCount: profile?.messageCount || 0,
            firstSeenAt: profile?.firstSeenAt || null,
            lastSeenAt: profile?.lastSeenAt || visit?.createdAt || null,
            calls: item._count._all,
            ...present(item._sum.inputTokens || 0, item._sum.outputTokens || 0),
          };
        }),
      ].sort((left, right) => right.totalTokens - left.totalTokens);
    const totalActors = actors.length;
    return {
      pricing: {
        inputPerMillionUsd: inputPrice,
        outputPerMillionUsd: outputPrice,
        estimated: true,
        currency: 'CNY',
        source: 'DeepSeek 官方定价',
        modelTier: pricingTier === 'pro' ? 'deepseek-v4-pro' : 'deepseek-v4-flash',
        period: peak ? 'peak' : 'offPeak',
        cacheHitPerMillionCny: officialPricing.cacheHit,
        cacheMissPerMillionCny: officialPricing.cacheMiss,
        outputPerMillionCny: officialPricing.output,
        cacheBreakdownAvailable: false,
      },
      totals: {
        calls: totals._count._all,
        ...present(totals._sum.inputTokens || 0, totals._sum.outputTokens || 0),
      },
      actors: actors.slice((page - 1) * pageSize, page * pageSize),
      actorPagination: { page, pageSize, total: totalActors },
      daily: [...byDay.entries()].map(([date, item]) => ({
        date,
        calls: item.calls,
        ...present(item.input, item.output),
      })),
    };
  }
}

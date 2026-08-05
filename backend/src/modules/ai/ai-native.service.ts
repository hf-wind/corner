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
  'photo',
  'journey',
  'story',
];

@Injectable()
export class AiNativeService {
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
    return {
      type: item.contentType,
      sourceId: item.sourceId,
      title: item.title,
      href: item.href,
      excerpt: item.excerpt || '',
      image: item.image,
      occurredAt: item.occurredAt?.toISOString() || null,
      metadata: this.metadata(item.metadata),
      score: score == null ? undefined : Number(score.toFixed(4)),
    };
  }

  async syncIndex() {
    const nodes = await this.prisma.memoryNode.findMany({
      where: { type: { in: PUBLIC_TYPES } },
      orderBy: { updatedAt: 'desc' },
    });
    const keys: Array<{ contentType: string; sourceId: string }> = [];
    for (const node of nodes) {
      const body = [
        node.title,
        node.excerpt || '',
        JSON.stringify(node.metadata || {}),
      ].join('\n');
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
    await this.ensureIndex();
    const allowed = types.filter((item) => PUBLIC_TYPES.includes(item));
    const items = await this.prisma.aiContentIndex.findMany({
      where: allowed.length ? { contentType: { in: allowed } } : undefined,
      orderBy: { occurredAt: 'desc' },
      take: 1000,
    });
    const queryVector = this.vector(query);
    return items
      .map((item) => ({
        item,
        score:
          this.cosine(
            queryVector,
            Array.isArray(item.embedding) ? item.embedding.map(Number) : [],
          ) + (item.title.includes(query) ? 0.5 : 0),
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          Number(right.item.occurredAt || 0) -
            Number(left.item.occurredAt || 0),
      )
      .slice(0, Math.max(1, Math.min(12, limit)))
      .map(({ item, score }) => this.card(item, score));
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
    const [total, helpful, clicks, byAction] = await Promise.all([
      this.prisma.aiInteraction.count(),
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
      helpful,
      sourceClicks: clicks,
      byAction: byAction.map((item) => ({
        action: item.action,
        count: item._count._all,
      })),
    };
  }
}

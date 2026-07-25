import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { AI_DEFAULTS, AI_SETTING_KEYS, type AiConfig, type AiSettingKey } from './ai-defaults';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  thinking?: 'enabled' | 'disabled';
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  private get apiKey() {
    return process.env.DEEPSEEK_API_KEY || '';
  }

  private get baseUrl() {
    return (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  }

  private get model() {
    return process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async getConfig(): Promise<AiConfig> {
    const all = await this.settings.findAll();
    const cfg = { ...AI_DEFAULTS };

    for (const key of AI_SETTING_KEYS) {
      if (all[key] === undefined || all[key] === null) continue;
      (cfg as any)[key] = this.coerceSetting(key, all[key]);
    }

    if (process.env.AI_PET_SYSTEM_PROMPT && !all.ai_pet_system_prompt) {
      cfg.ai_pet_system_prompt = process.env.AI_PET_SYSTEM_PROMPT;
    }

    return cfg;
  }

  async updateConfig(partial: Record<string, unknown>) {
    const allowed = new Set<string>(AI_SETTING_KEYS);
    for (const [key, value] of Object.entries(partial)) {
      if (!allowed.has(key)) continue;
      const coerced = this.coerceSetting(key as AiSettingKey, value);
      await this.settings.set(key, coerced);
    }
    return this.getConfig();
  }

  getDefaults() {
    return { ...AI_DEFAULTS };
  }

  async getPetMeta() {
    const cfg = await this.getConfig();
    return {
      displayName: cfg.ai_pet_display_name,
      description: cfg.ai_pet_description,
      greetings: cfg.ai_pet_greetings,
      apiConfigured: this.isConfigured(),
    };
  }

  private coerceSetting(key: AiSettingKey, value: unknown) {
    const def = AI_DEFAULTS[key];
    if (typeof def === 'boolean') {
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === 1 || value === '1') return true;
      if (value === 'false' || value === 0 || value === '0') return false;
      return def;
    }
    if (typeof def === 'number') {
      const n = Number(value);
      return Number.isFinite(n) ? n : def;
    }
    if (Array.isArray(def)) {
      if (Array.isArray(value)) return value.map(String).filter(Boolean);
      if (typeof value === 'string') {
        return value
          .split(/\n|[,，]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return def;
    }
    return value == null ? def : String(value);
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}) {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('AI 未配置：请设置 DEEPSEEK_API_KEY');
    }

    const body: Record<string, unknown> = {
      model: options.model || this.model,
      messages,
      stream: false,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      thinking: { type: options.thinking || 'disabled' },
    };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`DeepSeek error ${res.status}: ${text.slice(0, 400)}`);
      throw new ServiceUnavailableException(`AI 请求失败 (${res.status})`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    return content;
  }

  localExcerpt(title: string, content: string, maxLen = 100) {
    const plain = this.toPlainText(content);
    const base = plain || String(title || '').trim();
    if (base.length <= maxLen) return base;
    return `${base.slice(0, maxLen).replace(/\s+\S*$/, '')}…`;
  }

  private toPlainText(content: string) {
    return String(content || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_~\-]+/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async summarize(title: string, content: string) {
    const cfg = await this.getConfig();
    const fallback = this.localExcerpt(title, content, 100);
    if (!content?.trim()) {
      return { excerpt: fallback, source: 'fallback' as const };
    }

    if (!this.isConfigured()) {
      return { excerpt: fallback, source: 'fallback' as const };
    }

    try {
      const text = await this.chat(
        [
          { role: 'system', content: cfg.ai_summarize_prompt },
          {
            role: 'user',
            content: `标题：${title || '无'}\n\n正文：\n${String(content).slice(0, 8000)}`,
          },
        ],
        {
          temperature: cfg.ai_summarize_temperature,
          maxTokens: cfg.ai_summarize_max_tokens,
          thinking: 'disabled',
        },
      );

      const excerpt = text
        .replace(/^["'「『]|["'」』]$/g, '')
        .replace(/^(摘要|简介)[:：]\s*/u, '')
        .trim();
      if (!excerpt) return { excerpt: fallback, source: 'fallback' as const };
      return { excerpt: excerpt.slice(0, 200), source: 'ai' as const };
    } catch (e) {
      this.logger.warn(`summarize fallback: ${e}`);
      return { excerpt: fallback, source: 'fallback' as const };
    }
  }

  async moderateComment(content: string, postTitle?: string): Promise<{ approved: boolean; reason: string }> {
    if (!this.isConfigured()) {
      return { approved: true, reason: 'AI 未配置，自动通过' };
    }

    try {
      const result = await this.chat(
        [
          {
            role: 'system',
            content: `你是一个评论审核助手。请审核以下评论内容是否适合公开发布。

审核标准：
1. 包含广告、推销内容 → 拒绝
2. 包含恶意攻击、辱骂、歧视 → 拒绝
3. 包含色情、暴力、违法内容 → 拒绝
4. 包含垃圾信息、无意义内容 → 拒绝
5. 正常交流、提问、分享观点 → 通过

请严格按以下 JSON 格式回复，不要添加任何其他内容：
{"approved": true/false, "reason": "审核原因简述"}`
          },
          {
            role: 'user',
            content: `文章标题：${postTitle || '无'}\n\n评论内容：\n${content.slice(0, 1000)}`
          }
        ],
        {
          temperature: 0.1,
          maxTokens: 200,
          thinking: 'disabled',
        }
      );

      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          approved: Boolean(parsed.approved),
          reason: String(parsed.reason || 'AI 审核完成'),
        };
      }

      return { approved: true, reason: 'AI 返回格式异常，自动通过' };
    } catch (e) {
      this.logger.warn(`评论审核失败: ${e}`);
      return { approved: true, reason: 'AI 审核异常，自动通过' };
    }
  }

  private extractKeywords(query: string): string[] {
    const raw = String(query || '')
      .toLowerCase()
      .replace(/[^\u4e00-\u9fff\w\s]/g, ' ')
      .trim();
    if (!raw) return [];

    const tokens = new Set<string>();
    for (const t of raw.split(/\s+/).filter(Boolean)) {
      if (t.length >= 2) tokens.add(t);
    }

    const cjk = raw.replace(/[^\u4e00-\u9fff]/g, '');
    if (cjk.length >= 2) {
      for (let i = 0; i < cjk.length - 1; i++) {
        tokens.add(cjk.slice(i, i + 2));
      }
      if (cjk.length >= 3) {
        for (let i = 0; i < cjk.length - 2; i++) {
          tokens.add(cjk.slice(i, i + 3));
        }
      }
    }

    return [...tokens].slice(0, 24);
  }

  private scorePost(
    post: { title: string; excerpt: string | null; content: string; tagNames: string[]; categoryName: string },
    keywords: string[],
  ) {
    if (!keywords.length) return 0;
    const hay = [
      post.title,
      post.excerpt || '',
      post.categoryName,
      post.tagNames.join(' '),
      post.content.slice(0, 4000),
    ]
      .join('\n')
      .toLowerCase();

    let score = 0;
    for (const kw of keywords) {
      if (!hay.includes(kw)) continue;
      if (post.title.toLowerCase().includes(kw)) score += 8;
      if ((post.excerpt || '').toLowerCase().includes(kw)) score += 4;
      if (post.tagNames.some((t) => t.toLowerCase().includes(kw))) score += 5;
      if (post.categoryName.toLowerCase().includes(kw)) score += 3;
      if (post.content.toLowerCase().includes(kw)) score += 2;
    }
    return score;
  }

  private pickSnippet(content: string, keywords: string[], maxLen: number) {
    const plain = this.toPlainText(content);
    if (!plain) return '';
    if (!keywords.length || plain.length <= maxLen) {
      return plain.length <= maxLen ? plain : `${plain.slice(0, maxLen)}…`;
    }

    const lower = plain.toLowerCase();
    let best = 0;
    for (const kw of keywords) {
      const idx = lower.indexOf(kw);
      if (idx >= 0) {
        best = idx;
        break;
      }
    }
    const start = Math.max(0, best - Math.floor(maxLen / 4));
    const slice = plain.slice(start, start + maxLen);
    const prefix = start > 0 ? '…' : '';
    const suffix = start + maxLen < plain.length ? '…' : '';
    return `${prefix}${slice}${suffix}`;
  }

  async buildKnowledgeContext(query = '', cfg?: AiConfig) {
    const config = cfg || (await this.getConfig());
    if (!config.ai_knowledge_enabled) {
      return '（知识库已关闭）';
    }

    const catalogLimit = Math.max(1, Math.min(50, config.ai_knowledge_catalog_limit || 20));
    const topK = Math.max(1, Math.min(10, config.ai_knowledge_top_k || 4));
    const snippetLen = Math.max(100, Math.min(2000, config.ai_knowledge_snippet_len || 600));

    const posts = await this.prisma.post.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: Math.max(catalogLimit, 40),
      select: {
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        tags: { include: { tag: { select: { name: true } } } },
        category: { select: { name: true } },
      },
    });

    if (!posts.length) return '（知识库暂无已发布文章）';

    const normalized = posts.map((p) => ({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      content: p.content,
      tagNames: p.tags.map((t) => t.tag.name),
      categoryName: p.category?.name || '未分类',
    }));

    const catalog = normalized
      .slice(0, catalogLimit)
      .map((p, i) => {
        const tags = p.tagNames.join('、') || '无';
        return `${i + 1}. 《${p.title}》 slug=${p.slug} 分类=${p.categoryName} 标签=${tags}`;
      })
      .join('\n');

    const keywords = this.extractKeywords(query);
    let relatedBlock = '（未匹配到更相关的正文片段，可参考上方目录）';

    if (keywords.length) {
      const ranked = normalized
        .map((p) => ({ p, score: this.scorePost(p, keywords) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      if (ranked.length) {
        relatedBlock = ranked
          .map(({ p }, i) => {
            const snippet = this.pickSnippet(p.content, keywords, snippetLen);
            const ex = (p.excerpt || '').slice(0, 120);
            return `${i + 1}. 《${p.title}》(slug=${p.slug})\n   摘要：${ex || '无'}\n   片段：${snippet || '无'}`;
          })
          .join('\n');
      }
    } else {
      relatedBlock = normalized
        .slice(0, Math.min(topK, 3))
        .map((p, i) => {
          const snippet = this.pickSnippet(p.content, [], Math.min(snippetLen, 300));
          return `${i + 1}. 《${p.title}》(slug=${p.slug})\n   片段：${snippet || p.excerpt || '无'}`;
        })
        .join('\n');
    }

    return `【本站文章目录】\n${catalog}\n\n【与问题相关的内容】\n${relatedBlock}`;
  }

  async previewKnowledge(query = '') {
    const cfg = await this.getConfig();
    const context = await this.buildKnowledgeContext(query, cfg);
    return {
      enabled: cfg.ai_knowledge_enabled,
      query: query || '',
      context,
      limits: {
        catalog: cfg.ai_knowledge_catalog_limit,
        topK: cfg.ai_knowledge_top_k,
        snippetLen: cfg.ai_knowledge_snippet_len,
      },
    };
  }

  async saveMessage(userId: string, role: 'user' | 'assistant', content: string) {
    return this.prisma.chatMessage.create({
      data: { userId, role, content },
    });
  }

  async getHistory(userId: string, limit = 30) {
    const take = Math.max(1, Math.min(200, limit));
    const rows = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, role: true, content: true, createdAt: true },
    });
    return rows.reverse();
  }

  async clearHistory(userId: string) {
    const result = await this.prisma.chatMessage.deleteMany({ where: { userId } });
    return { deleted: result.count };
  }

  async listConversations(q?: string) {
    const users = await this.prisma.user.findMany({
      where: q
        ? {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
        _count: { select: { chatMessages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return users
      .filter((u) => u._count.chatMessages > 0)
      .map((u) => ({
        userId: u.id,
        username: u.username,
        email: u.email,
        avatar: u.avatar,
        messageCount: u._count.chatMessages,
        lastMessage: u.chatMessages[0]
          ? {
              role: u.chatMessages[0].role,
              content: u.chatMessages[0].content.slice(0, 120),
              createdAt: u.chatMessages[0].createdAt,
            }
          : null,
      }))
      .sort((a, b) => {
        const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return tb - ta;
      });
  }

  async getConversation(userId: string, page = 1, pageSize = 50) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, avatar: true },
    });
    if (!user) throw new NotFoundException('用户不存在');

    const take = Math.max(1, Math.min(100, pageSize));
    const skip = Math.max(0, (Math.max(1, page) - 1) * take);
    const [total, messages] = await Promise.all([
      this.prisma.chatMessage.count({ where: { userId } }),
      this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        skip,
        take,
        select: { id: true, role: true, content: true, createdAt: true },
      }),
    ]);

    return {
      user,
      total,
      page: Math.max(1, page),
      pageSize: take,
      messages,
    };
  }

  async petChat(userId: string, message: string) {
    const cfg = await this.getConfig();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    const username = user?.username || '访客';
    const isOwner =
      username.toLowerCase() === String(cfg.ai_owner_username || '').toLowerCase();

    const knowledge = await this.buildKnowledgeContext(message, cfg);
    const identity = [
      `当前对话对象：${username}`,
      isOwner
        ? `对方是站长「${cfg.ai_owner_username}」，以亲密伙伴身份相处。`
        : `对方是访客，热情向导即可；不要把对方叫成大雄，也不要反复提大雄相关梗。`,
    ].join('\n');

    const system: ChatMessage = {
      role: 'system',
      content: `${cfg.ai_pet_system_prompt}\n\n${identity}\n\n【博客知识库】\n${knowledge}`,
    };

    const historyLimit = Math.max(4, Math.min(60, cfg.ai_history_limit || 24));
    const recent = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: historyLimit,
      select: { role: true, content: true },
    });

    let budget = Math.max(500, cfg.ai_history_char_budget || 4096);
    let msgLen = 0;
    const history: ChatMessage[] = [];
    for (const m of recent) {
      const cost = m.content.length;
      if (msgLen + cost > budget) break;
      history.push({ role: m.role as 'user' | 'assistant', content: m.content });
      msgLen += cost;
    }
    history.reverse();

    const userText = String(message || '').slice(0, 2000);
    await this.saveMessage(userId, 'user', userText);

    const messages: ChatMessage[] = [
      system,
      ...history,
      { role: 'user', content: userText },
    ];

    if (!this.isConfigured()) {
      const fallback = cfg.ai_fallback_unconfigured;
      await this.saveMessage(userId, 'assistant', fallback);
      return { reply: fallback, source: 'fallback' as const };
    }

    try {
      const reply = await this.chat(messages, {
        temperature: cfg.ai_chat_temperature,
        maxTokens: cfg.ai_chat_max_tokens,
        thinking: 'disabled',
      });
      const text = reply || '嗯……四次元口袋卡住了，再说一次好不好？';
      await this.saveMessage(userId, 'assistant', text);
      return { reply: text, source: 'ai' as const };
    } catch {
      const fallback = cfg.ai_fallback_error;
      await this.saveMessage(userId, 'assistant', fallback);
      return { reply: fallback, source: 'fallback' as const };
    }
  }
}

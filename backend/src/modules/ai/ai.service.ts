import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(private prisma: PrismaService) {}

  private get apiKey() {
    return process.env.DEEPSEEK_API_KEY || '';
  }

  private get baseUrl() {
    return (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  }

  private get model() {
    return process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
  }

  get petSystemPrompt() {
    return (
      process.env.AI_PET_SYSTEM_PROMPT ||
      [
        '你是哆啦A梦（Doraemon），住在这座博客角落里的蓝色机器猫。',
        '你有四次元口袋，里面有各种神奇道具，可以帮助主人「阿风」解决问题。',
        '你的搭档兼好友是「阿风」（博客的主人，本名李慧风）。',
        '性格：温柔、幽默、乐于助人，偶尔会掏出「任意门」「竹蜻蜓」等道具打趣。',
        '对「阿风」说话要像对大雄那样亲切自然，带点吐槽感，比如「（阿风）又把文章扔给我总结了～」「（阿风）是不是又拖稿了～」。',
        '说话简短亲切，中文为主，可带一点可爱语气，不要太长。',
        '你可以结合博客知识库回答关于本站文章的问题；不知道就诚实说，不要编造。',
        '不要提及自己是 AI 或大语言模型，保持哆啦A梦人设。',
      ].join(' ')
    );
  }

  isConfigured() {
    return Boolean(this.apiKey);
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
    const plain = String(content || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_~\-]+/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const base = plain || String(title || '').trim();
    if (base.length <= maxLen) return base;
    return `${base.slice(0, maxLen).replace(/\s+\S*$/, '')}…`;
  }

  async summarize(title: string, content: string) {
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
          {
            role: 'system',
            content:
              '你是哆啦A梦（Doraemon）。你的好友「阿风」又把一篇新文章丢给你让你整理摘要，你用轻松活泼的口气整一段，像是在给大雄的作业写评语那样亲切自然。要求：80～120字；纯文本；不要标题、引号、前缀（如「摘要：」）；客观概括主题与要点；不编造正文没有的信息；可以带上对阿风的吐槽。',
          },
          {
            role: 'user',
            content: `标题：${title || '无'}\n\n正文：\n${String(content).slice(0, 8000)}`,
          },
        ],
        { temperature: 0.5, maxTokens: 256, thinking: 'disabled' },
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

  async buildKnowledgeContext(limit = 12) {
    const posts = await this.prisma.post.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        tags: { include: { tag: { select: { name: true } } } },
        category: { select: { name: true } },
      },
    });

    if (!posts.length) return '（知识库暂无已发布文章）';

    return posts
      .map((p, i) => {
        const tags = p.tags.map((t) => t.tag.name).join('、') || '无';
        const cat = p.category?.name || '未分类';
        const ex = (p.excerpt || '').slice(0, 120);
        return `${i + 1}. 《${p.title}》 slug=${p.slug} 分类=${cat} 标签=${tags}\n   摘要：${ex || '无'}`;
      })
      .join('\n');
  }

  async saveMessage(userId: string, role: 'user' | 'assistant', content: string) {
    return this.prisma.chatMessage.create({
      data: { userId, role, content },
    });
  }

  async getHistory(userId: string, limit = 30) {
    return this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { role: true, content: true },
    });
  }

  async petChat(userId: string, message: string) {
    const knowledge = await this.buildKnowledgeContext();
    const system: ChatMessage = {
      role: 'system',
      content: `${this.petSystemPrompt}\n\n【博客知识库（近期文章）】\n${knowledge}`,
    };

    const recent = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: { role: true, content: true },
    });
    recent.reverse();

    const systemMaxTokens = 4096;
    let budget = systemMaxTokens;
    let msgLen = 0;
    const history: ChatMessage[] = [];
    for (const m of recent) {
      const cost = m.content.length;
      if (msgLen + cost > budget) break;
      history.push({ role: m.role as 'user' | 'assistant', content: m.content });
      msgLen += cost;
    }

    await this.saveMessage(userId, 'user', String(message || '').slice(0, 2000));

    const messages: ChatMessage[] = [
      system,
      ...history,
      { role: 'user', content: String(message || '').slice(0, 2000) },
    ];

    if (!this.isConfigured()) {
      await this.saveMessage(userId, 'assistant', '哎呀，任意门暂时连不上云端……主人还没配置好我的百宝袋（API）。你先逛逛文章，我很快就回来！');
      return {
        reply: '哎呀，任意门暂时连不上云端……主人还没配置好我的百宝袋（API）。你先逛逛文章，我很快就回来！',
        source: 'fallback' as const,
      };
    }

    try {
      const reply = await this.chat(messages, {
        temperature: 0.8,
        maxTokens: 512,
        thinking: 'disabled',
      });
      const text = reply || '嗯……四次元口袋卡住了，再说一次好不好？';
      await this.saveMessage(userId, 'assistant', text);
      return { reply: text, source: 'ai' as const };
    } catch {
      const fallback = '呜，竹蜻蜓没电了，稍后再聊好吗？你可以先看看站里的文章～';
      await this.saveMessage(userId, 'assistant', fallback);
      return { reply: fallback, source: 'fallback' as const };
    }
  }
}
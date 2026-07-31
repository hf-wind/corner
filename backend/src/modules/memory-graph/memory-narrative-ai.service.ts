import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MemoryNode } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  GenerateNarrationDto,
  RecommendStoryDto,
} from './dto/memory-ai.dto';
import { MemoryGraphService } from './memory-graph.service';

const RELATION_TYPES = new Set(['same_theme', 'reference', 'story_sequence']);

@Injectable()
export class MemoryNarrativeAiService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private graph: MemoryGraphService,
  ) {}

  async suggestRelations(sourceId: string) {
    const source = await this.prisma.memoryNode.findUnique({
      where: { id: sourceId },
    });
    if (!source) throw new NotFoundException('记忆节点不存在');
    const candidates = await this.prisma.memoryNode.findMany({
      where: { id: { not: sourceId } },
      orderBy: { occurredAt: 'desc' },
      take: 60,
    });
    if (!candidates.length) return [];
    const payload = candidates.map((node) => this.safeNode(node));
    const text = await this.ai.chat(
      [
        {
          role: 'system',
          content:
            '你是个人记忆图谱编辑。只根据给定公开摘要寻找明确的语义联系。不得推断精确位置、私密信息或未提供的事实。仅输出 JSON。',
        },
        {
          role: 'user',
          content: `源节点：${JSON.stringify(this.safeNode(source))}\n候选节点：${JSON.stringify(payload)}\n输出 {"relations":[{"targetId":"...","type":"same_theme|reference|story_sequence","reason":"不超过80字的可核验理由","confidence":0.0}]}，最多5条，没有可靠关系时返回空数组。`,
        },
      ],
      { temperature: 0.2, maxTokens: 1200, thinking: 'disabled' },
    );
    const parsed = this.parseJson(text);
    const allowed = new Set(candidates.map((item) => item.id));
    const suggestions = this.recordArray(parsed.relations).slice(0, 5);
    const created = [];
    for (const suggestion of suggestions) {
      const targetId = this.stringValue(suggestion.targetId);
      if (!allowed.has(targetId)) continue;
      const confidence = Math.max(
        0,
        Math.min(1, this.numberValue(suggestion.confidence)),
      );
      if (confidence < 0.35) continue;
      created.push(
        await this.graph.createRelation({
          sourceId,
          targetId,
          type: RELATION_TYPES.has(this.stringValue(suggestion.type))
            ? this.stringValue(suggestion.type)
            : 'same_theme',
          origin: 'ai',
          reason: this.stringValue(suggestion.reason, 'AI 语义候选').slice(
            0,
            300,
          ),
          weight: confidence,
        }),
      );
    }
    return created;
  }

  async recommendStory(dto: RecommendStoryDto) {
    const nodes = await this.prisma.memoryNode.findMany({
      where: dto.nodeIds?.length
        ? { id: { in: dto.nodeIds.slice(0, 80) } }
        : undefined,
      orderBy: { occurredAt: 'asc' },
      take: 80,
    });
    if (!nodes.length)
      throw new BadRequestException('没有可用于编排的公开记忆');
    const targetSteps = Math.max(
      3,
      Math.min(20, Math.round((dto.durationMinutes || 5) * 1.5)),
    );
    const text = await this.ai.chat(
      [
        {
          role: 'system',
          content:
            '你是克制的个人记忆叙事编辑。只使用提供的公开内容，不补造地点、人物或经历。仅输出 JSON。',
        },
        {
          role: 'user',
          content: `主题：${dto.theme}\n目标步骤数：${targetSteps}\n候选：${JSON.stringify(nodes.map((node) => this.safeNode(node)))}\n输出 {"title":"...","reason":"...","steps":[{"nodeId":"...","title":"...","narration":"80字以内旁白草稿","durationSec":8}]}。nodeId 必须来自候选，顺序要有叙事起伏。`,
        },
      ],
      { temperature: 0.45, maxTokens: 2500, thinking: 'disabled' },
    );
    const parsed = this.parseJson(text);
    const allowed = new Set(nodes.map((node) => node.id));
    return {
      title: this.stringValue(parsed.title, dto.theme).slice(0, 255),
      reason: this.stringValue(parsed.reason).slice(0, 500),
      steps: this.recordArray(parsed.steps)
        .filter((step) => allowed.has(this.stringValue(step.nodeId)))
        .slice(0, 20)
        .map((step, sort) => ({
          sort,
          nodeId: this.stringValue(step.nodeId),
          title: this.stringValue(step.title).slice(0, 255) || null,
          narration: this.stringValue(step.narration).slice(0, 500) || null,
          durationSec: Math.max(
            4,
            Math.min(60, this.numberValue(step.durationSec, 8)),
          ),
        })),
    };
  }

  async generateNarrations(dto: GenerateNarrationDto) {
    const ids = [...new Set(dto.nodeIds)].slice(0, 20);
    const nodes = await this.prisma.memoryNode.findMany({
      where: { id: { in: ids } },
    });
    if (!nodes.length)
      throw new BadRequestException('没有可生成旁白的公开记忆');
    const text = await this.ai.chat(
      [
        {
          role: 'system',
          content:
            '为个人记忆故事撰写自然、克制的第一人称旁白草稿。不得虚构给定摘要之外的事实。仅输出 JSON。',
        },
        {
          role: 'user',
          content: `主题：${dto.theme || '时光记忆'}\n步骤：${JSON.stringify(nodes.map((node) => this.safeNode(node)))}\n输出 {"narrations":[{"nodeId":"...","text":"80字以内"}]}。`,
        },
      ],
      { temperature: 0.5, maxTokens: 1800, thinking: 'disabled' },
    );
    const parsed = this.parseJson(text);
    const allowed = new Set(nodes.map((node) => node.id));
    return this.recordArray(parsed.narrations)
      .filter((item) => allowed.has(this.stringValue(item.nodeId)))
      .map((item) => ({
        nodeId: this.stringValue(item.nodeId),
        text: this.stringValue(item.text).slice(0, 500),
      }));
  }

  private safeNode(node: MemoryNode) {
    return {
      id: node.id,
      type: node.type,
      title: node.title,
      excerpt: node.excerpt?.slice(0, 320) || '',
      occurredAt: node.occurredAt?.toISOString() || null,
      metadata: this.safeMetadata(node.metadata),
    };
  }

  private safeMetadata(value: unknown) {
    if (!value || typeof value !== 'object') return {};
    const metadata = value as Record<string, unknown>;
    return Object.fromEntries(
      [
        'tags',
        'libraryType',
        'creator',
        'rating',
        'genres',
        'albumTitle',
        'city',
        'province',
        'country',
        'stopCount',
      ]
        .filter((key) => metadata[key] !== undefined)
        .map((key) => [key, metadata[key]]),
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private recordArray(value: unknown): Array<Record<string, unknown>> {
    return Array.isArray(value)
      ? value.filter((item) => this.isRecord(item))
      : [];
  }

  private stringValue(value: unknown, fallback = '') {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return fallback;
  }

  private numberValue(value: unknown, fallback = 0) {
    const number = typeof value === 'number' ? value : Number.NaN;
    return Number.isFinite(number) ? number : fallback;
  }

  private parseJson(text: string): Record<string, unknown> {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new BadRequestException('AI 返回格式无法识别');
    try {
      const parsed = JSON.parse(match[0]) as unknown;
      if (this.isRecord(parsed)) return parsed;
      throw new BadRequestException('AI 返回格式无法识别');
    } catch {
      throw new BadRequestException('AI 返回格式无法识别');
    }
  }
}

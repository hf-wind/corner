import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { RedisService } from '../../common/redis/redis.service';

export type ClientEnv = {
  ip: string;
  userAgent: string;
  acceptLanguage: string;
};

export type DeviceInfo = {
  browser: string;
  browserVersion: string;
  os: string;
  device: string;
};

export type VisitorContext = {
  visitorIdHash: string;
  nickname: string;
  region: string | null;
  device: DeviceInfo;
};

const VISITOR_SALT =
  process.env.VISITOR_ID_SALT ||
  process.env.JWT_SECRET ||
  'corner-visitor-salt';
const DAILY_THROW_LIMIT = 3;
const DAILY_FISH_LIMIT = 8;
const IDENTIFY_VISIT_THROTTLE_SECONDS = 3600;
const RECENT_CACHE_TTL = 45;

// 轻量敏感词审查：命中后进入待审核而不是直接展示
const SENSITIVE_WORDS = [
  '赌博',
  '博彩',
  '色情',
  '毒品',
  '枪支',
  '代开发票',
  '办证',
  '加微信赚钱',
  '刷单',
  '兼职日结',
  '网贷',
  '反动',
  '法轮',
];

function parseUserAgent(userAgent: string): DeviceInfo {
  const ua = String(userAgent || '');
  let browser = '其他浏览器';
  let browserVersion = '';
  const browserRules: Array<[RegExp, string]> = [
    [/Edg(?:e|A|iOS)?\/([\d.]+)/, 'Edge'],
    [/OPR\/([\d.]+)|Opera/, 'Opera'],
    [/Firefox\/([\d.]+)/, 'Firefox'],
    [/QQBrowser\/([\d.]+)/, 'QQ浏览器'],
    [/UCBrowser\/([\d.]+)/, 'UC浏览器'],
    [/MicroMessenger\/([\d.]+)/, '微信内置'],
    [/CriOS\/([\d.]+)/, 'Chrome'],
    [/Chrome\/([\d.]+)/, 'Chrome'],
    [/Version\/([\d.]+).*Safari/, 'Safari'],
    [/Safari\/([\d.]+)/, 'Safari'],
    [/MSIE ([\d.]+)|Trident\/.*rv:([\d.]+)/, 'IE'],
  ];
  for (const [rule, name] of browserRules) {
    const match = ua.match(rule);
    if (match) {
      browser = name;
      browserVersion = (match[1] || match[2] || '').split('.')[0] || '';
      break;
    }
  }

  let os = '未知系统';
  const osRules: Array<[RegExp, string]> = [
    [/Windows NT 10\.0|Windows NT 11\.0/, 'Windows'],
    [/Windows/, 'Windows'],
    [/Android ([\d.]+)/, 'Android'],
    [/Android/, 'Android'],
    [/iPhone|iPad|iPod/, 'iOS'],
    [/Mac OS X/, 'macOS'],
    [/Linux/, 'Linux'],
  ];
  let osVersion = '';
  for (const [rule, name] of osRules) {
    const match = ua.match(rule);
    if (match) {
      os = name;
      osVersion = match[1] ? ` ${String(match[1]).split('.')[0]}` : '';
      break;
    }
  }

  let device = '桌面端';
  if (/Mobile|iPhone|iPod|Android.+Mobile/.test(ua)) device = '手机';
  else if (/iPad|Tablet|Android(?!.*Mobile)/.test(ua)) device = '平板';

  return {
    browser: browserVersion ? `${browser} ${browserVersion}` : browser,
    browserVersion,
    os: `${os}${osVersion}`,
    device,
  };
}

function shanghaiDayStart(): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = formatter
    .format(new Date())
    .split('-')
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day, -8));
}

function pickNickname(seed: string): string {
  const prefixes = [
    '晚风',
    '拾光',
    '听雨',
    '南屿',
    '青栀',
    '云深',
    '星野',
    '木白',
    '柚夏',
    '临江',
  ];
  const suffixes = [
    '旅人',
    '信使',
    '拾贝者',
    '看云客',
    '守灯人',
    '信笺',
    '小鹿',
    '少年',
    '候鸟',
    '旅者',
  ];
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  // 位移后的有符号结果可能为负数，负索引会拼出 "undefined"。
  const suffixIndex = (hash >>> 5) % suffixes.length;
  const nickname = `${prefixes[hash % prefixes.length]}${suffixes[suffixIndex]}`;
  return nickname.length <= 20 ? nickname : nickname.slice(0, 20);
}

function containsSensitiveWord(content: string): boolean {
  return SENSITIVE_WORDS.some((word) => content.includes(word));
}

@Injectable()
export class VisitorService {
  private readonly logger = new Logger(VisitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly redis: RedisService,
  ) {}

  /** 通过 IP + 归属地 + 浏览器 + 设备计算稳定指纹 */
  private fingerprint(env: ClientEnv, device: DeviceInfo): string {
    return createHash('sha256')
      .update(
        `${env.ip}|${device.browser}|${device.os}|${device.device}|${VISITOR_SALT}`,
      )
      .digest('hex');
  }

  private clientEnv(req: any): ClientEnv {
    return {
      ip: String(req.ip || req.ips?.[0] || 'unknown'),
      userAgent: String(req.headers?.['user-agent'] || ''),
      acceptLanguage: String(req.headers?.['accept-language'] || ''),
    };
  }

  /** 识别访客：登记到访 + 档案 upsert，返回访客上下文 */
  async identify(
    req: any,
    hints?: { screen?: string; timezone?: string; locale?: string },
  ) {
    const env = this.clientEnv(req);
    const device = parseUserAgent(env.userAgent);
    const visitorIdHash = this.fingerprint(env, device);

    let region: string | null = null;
    try {
      const geoInfo = await this.geo.locate(env.ip);
      region = geoInfo?.label || null;
    } catch (error) {
      this.logger.warn(`归属地解析失败: ${(error as Error).message}`);
    }

    const existing = await this.prisma.visitorProfile.findUnique({
      where: { visitorIdHash },
    });

    const repairedNickname = existing?.nickname?.includes('undefined')
      ? pickNickname(visitorIdHash)
      : null;
    const profile = existing
      ? await this.prisma.visitorProfile.update({
          where: { visitorIdHash },
          data: {
            lastSeenAt: new Date(),
            visitCount: { increment: 1 },
            ...(repairedNickname ? { nickname: repairedNickname } : {}),
            ipHash: createHash('sha256')
              .update(`${env.ip}|${VISITOR_SALT}`)
              .digest('hex'),
          },
        })
      : await this.prisma.visitorProfile.create({
          data: {
            visitorIdHash,
            nickname: pickNickname(visitorIdHash),
            ipHash: createHash('sha256')
              .update(`${env.ip}|${VISITOR_SALT}`)
              .digest('hex'),
            visitCount: 1,
          },
        });

    // 每小时最多落一条到访记录，避免翻倍膨胀
    const throttleKey = `corner:visitor:visit:${visitorIdHash}:${Math.floor(Date.now() / (IDENTIFY_VISIT_THROTTLE_SECONDS * 1000))}`;
    const shouldRecord = existing
      ? !(await this.redis.getJson(throttleKey))
      : true;
    if (shouldRecord) {
      await this.prisma.visitorVisit.create({
        data: {
          visitorIdHash,
          region,
          browser: device.browser,
          os: device.os,
          device: device.device,
        },
      });
      await this.redis
        .setJson(throttleKey, 1, IDENTIFY_VISIT_THROTTLE_SECONDS)
        .catch(() => undefined);
    }

    return {
      visitorId: visitorIdHash,
      nickname: profile.nickname,
      region,
      device,
      visits: profile.visitCount,
      isNew: !existing,
      hints: hints ?? null,
    };
  }

  /** 最近到访的访客足迹（首页侧栏使用） */
  async recentVisitors(limit = 3) {
    const take = Math.min(Math.max(Number(limit) || 3, 1), 10);
    const cacheKey = `corner:visitor:recent:${take}`;
    const cached =
      await this.redis.getJson<Array<Record<string, unknown>>>(cacheKey);
    if (cached) {
      return cached.map((row) => ({
        ...row,
        nickname: String(row.nickname || '神秘旅人').replace(
          /undefined/gi,
          '旅人',
        ),
      }));
    }

    const visits = await this.prisma.visitorVisit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    const seen = new Set<string>();
    const rows: Array<{
      hash: string;
      nickname: string;
      region: string | null;
      browser: string | null;
      os: string | null;
      device: string | null;
      at: Date;
    }> = [];
    for (const visit of visits) {
      if (seen.has(visit.visitorIdHash)) continue;
      seen.add(visit.visitorIdHash);
      rows.push({
        hash: visit.visitorIdHash,
        nickname: '神秘旅人',
        region: visit.region,
        browser: visit.browser,
        os: visit.os,
        device: visit.device,
        at: visit.createdAt,
      });
      if (rows.length >= take) break;
    }

    if (rows.length) {
      const profiles = await this.prisma.visitorProfile.findMany({
        where: {
          visitorIdHash: { in: rows.map((row) => row.hash) },
          isBanned: false,
        },
        select: { visitorIdHash: true, nickname: true },
      });
      const nicknameMap = new Map(
        profiles.map((profile) => [profile.visitorIdHash, profile.nickname]),
      );
      for (const row of rows) {
        row.nickname = String(nicknameMap.get(row.hash) || '神秘旅人').replace(
          /undefined/gi,
          '旅人',
        );
      }
    }

    const payload = rows.map(({ hash, ...rest }) => rest);
    await this.redis
      .setJson(cacheKey, payload, RECENT_CACHE_TTL)
      .catch(() => undefined);
    return payload;
  }

  async trackEvents(req: any, events: Array<Record<string, unknown>>) {
    if (!Array.isArray(events) || !events.length) return { saved: 0 };
    const env = this.clientEnv(req);
    const device = parseUserAgent(env.userAgent);
    const visitorIdHash = this.fingerprint(env, device);
    const profile = await this.prisma.visitorProfile.findUnique({
      where: { visitorIdHash },
    });
    if (profile?.isBanned) return { saved: 0 };

    const userId = req.user?.sub || req.user?.id || null;
    const rows = events.slice(0, 40).map((event) => {
      const parsedAt =
        typeof event.at === 'string' ? Date.parse(event.at) : Number.NaN;
      const clientAt =
        Number.isFinite(parsedAt) &&
        Math.abs(Date.now() - parsedAt) < 86_400_000
          ? new Date(parsedAt)
          : null;
      const metadata =
        event.metadata && typeof event.metadata === 'object'
          ? {
              ...(event.metadata as Record<string, unknown>),
              clientAt: clientAt?.toISOString() || null,
            }
          : { clientAt: clientAt?.toISOString() || null };
      return {
        visitorIdHash,
        userId,
        sessionId: event.sessionId
          ? String(event.sessionId).slice(0, 64)
          : null,
        identity: event.identity
          ? String(event.identity).slice(0, 20)
          : userId
            ? 'user'
            : 'anonymous',
        action: String(event.action || 'unknown').slice(0, 40),
        path: event.path ? String(event.path).slice(0, 500) : null,
        contentType: event.contentType
          ? String(event.contentType).slice(0, 40)
          : null,
        sourceId: event.sourceId ? String(event.sourceId).slice(0, 180) : null,
        metadata: metadata as object,
        createdAt: clientAt || new Date(),
      };
    });
    if (!rows.length) return { saved: 0 };
    await this.prisma.visitorEvent.createMany({ data: rows });
    return { saved: rows.length };
  }

  /** 后台访问管理：访客概览与可展开的完整访问链路。 */
  async adminAccess(params: { q?: string; page?: number; limit?: number }) {
    const take = Math.min(Math.max(Number(params.limit) || 20, 1), 60);
    const page = Math.max(Number(params.page) || 1, 1);
    const skip = (page - 1) * take;
    const where: Record<string, unknown> = {};
    if (params.q) {
      where.OR = [
        { nickname: { contains: params.q } },
        { visitorIdHash: { contains: params.q } },
      ];
    }
    const [total, profiles] = await Promise.all([
      this.prisma.visitorProfile.count({ where }),
      this.prisma.visitorProfile.findMany({
        where,
        orderBy: { lastSeenAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          visitorIdHash: true,
          nickname: true,
          visitCount: true,
          lastSeenAt: true,
          firstSeenAt: true,
          isBanned: true,
        },
      }),
    ]);
    const hashes = profiles.map((profile) => profile.visitorIdHash);
    const [visits, eventCounts] = hashes.length
      ? await Promise.all([
          this.prisma.visitorVisit.findMany({
            where: { visitorIdHash: { in: hashes } },
            orderBy: { createdAt: 'desc' },
            take: hashes.length * 2,
          }),
          this.prisma.visitorEvent.groupBy({
            by: ['visitorIdHash'],
            where: { visitorIdHash: { in: hashes } },
            _count: { _all: true },
          }),
        ])
      : [[], []];
    const latestVisit = new Map<string, (typeof visits)[number]>();
    for (const visit of visits)
      if (!latestVisit.has(visit.visitorIdHash))
        latestVisit.set(visit.visitorIdHash, visit);
    const countMap = new Map(
      eventCounts.map((item) => [item.visitorIdHash, item._count._all]),
    );
    return {
      items: profiles.map((profile) => {
        const visit = latestVisit.get(profile.visitorIdHash);
        return {
          ...profile,
          region: visit?.region || null,
          environment:
            [visit?.device, visit?.browser, visit?.os]
              .filter(Boolean)
              .join(' · ') || null,
          eventCount: countMap.get(profile.visitorIdHash) || 0,
        };
      }),
      total,
      page,
      limit: take,
    };
  }

  async adminAccessTimeline(
    visitorIdHash: string,
    params: { sessionId?: string; limit?: number },
  ) {
    const take = Math.min(Math.max(Number(params.limit) || 200, 1), 500);
    const profile = await this.prisma.visitorProfile.findUnique({
      where: { visitorIdHash },
      select: {
        visitorIdHash: true,
        nickname: true,
        firstSeenAt: true,
        lastSeenAt: true,
      },
    });
    if (!profile) throw new NotFoundException('访客不存在');
    const events = await this.prisma.visitorEvent.findMany({
      where: {
        visitorIdHash,
        ...(params.sessionId ? { sessionId: params.sessionId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take,
      select: {
        id: true,
        sessionId: true,
        identity: true,
        action: true,
        path: true,
        contentType: true,
        sourceId: true,
        metadata: true,
        createdAt: true,
      },
    });
    const sessions = [
      ...new Set(events.map((event) => event.sessionId).filter(Boolean)),
    ];
    return { profile, events, sessions };
  }

  /* ---------------- 留言墙 ---------------- */

  async listMessages(page = 1, limit = 30) {
    const take = Math.min(Math.max(Number(limit) || 30, 1), 60);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const where = { type: 'message', status: 'approved' };
    const [total, items] = await Promise.all([
      this.prisma.visitorMessage.count({ where }),
      this.prisma.visitorMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          content: true,
          nickname: true,
          originRegion: true,
          createdAt: true,
        },
      }),
    ]);
    return { items, total, page: Number(page) || 1, limit: take };
  }

  async createMessage(req: any, dto: { content: string; nickname?: string }) {
    const context = await this.ensureVisitorContext(req);
    const content = String(dto.content || '')
      .trim()
      .slice(0, 200);
    if (!content) throw new BadRequestException('留言内容不能为空');
    if (context.nickname === '')
      throw new ForbiddenException('当前身份无法留言');

    const nickname = (
      String(dto.nickname || '').trim() || context.nickname
    ).slice(0, 20);
    const flagged = containsSensitiveWord(content);
    const message = await this.prisma.visitorMessage.create({
      data: {
        type: 'message',
        content,
        nickname,
        visitorIdHash: context.visitorIdHash,
        status: flagged ? 'pending' : 'approved',
        aiReview: flagged ? 'keyword-hit' : null,
        rejectReason: flagged ? '命中敏感词，等待人工审核' : null,
        originRegion: context.region,
      },
    });
    if (!flagged) {
      await this.prisma.visitorProfile.update({
        where: { visitorIdHash: context.visitorIdHash },
        data: { messageCount: { increment: 1 } },
      });
    }
    return { id: message.id, status: message.status, moderated: flagged };
  }

  /* ---------------- 漂流瓶 ---------------- */

  async bottleQuota(req: any) {
    const context = await this.ensureVisitorContext(req);
    const dayStart = shanghaiDayStart();
    const [thrown, fished] = await Promise.all([
      this.prisma.visitorMessage.count({
        where: {
          type: 'bottle',
          visitorIdHash: context.visitorIdHash,
          createdAt: { gte: dayStart },
        },
      }),
      this.prisma.visitorBottleCatch.count({
        where: {
          catcherVisitorIdHash: context.visitorIdHash,
          caughtAt: { gte: dayStart },
        },
      }),
    ]);
    return {
      throwLimit: DAILY_THROW_LIMIT,
      throwUsed: thrown,
      fishLimit: DAILY_FISH_LIMIT,
      fishUsed: fished,
    };
  }

  async throwBottle(
    req: any,
    dto: { content: string; nickname?: string; relayToId?: string },
  ) {
    const context = await this.ensureVisitorContext(req);
    const content = String(dto.content || '')
      .trim()
      .slice(0, 200);
    if (!content) throw new BadRequestException('瓶子内容不能为空');

    const dayStart = shanghaiDayStart();
    const thrown = await this.prisma.visitorMessage.count({
      where: {
        type: 'bottle',
        visitorIdHash: context.visitorIdHash,
        createdAt: { gte: dayStart },
      },
    });
    if (thrown >= DAILY_THROW_LIMIT) {
      throw new ForbiddenException(
        `今天已经投出 ${DAILY_THROW_LIMIT} 只瓶子了，明天再来吧`,
      );
    }

    const flagged = containsSensitiveWord(content);
    const parent = dto.relayToId
      ? await this.prisma.visitorMessage.findUnique({
          where: { id: dto.relayToId },
        })
      : null;

    const bottle = await this.prisma.visitorMessage.create({
      data: {
        type: 'bottle',
        content,
        nickname: (String(dto.nickname || '').trim() || context.nickname).slice(
          0,
          20,
        ),
        visitorIdHash: context.visitorIdHash,
        status: flagged ? 'pending' : 'approved',
        rejectReason: flagged ? '命中敏感词，等待人工审核' : null,
        originRegion: context.region,
        parentId: parent?.id ?? null,
        chainId: parent?.chainId ?? parent?.id ?? null,
      },
    });
    return {
      id: bottle.id,
      status: bottle.status,
      moderated: flagged,
      quota: await this.bottleQuota(req),
    };
  }

  async fishBottle(req: any) {
    const context = await this.ensureVisitorContext(req);
    const dayStart = shanghaiDayStart();
    const fished = await this.prisma.visitorBottleCatch.count({
      where: {
        catcherVisitorIdHash: context.visitorIdHash,
        caughtAt: { gte: dayStart },
      },
    });
    if (fished >= DAILY_FISH_LIMIT) {
      throw new ForbiddenException(`今天的打捞次数用完了，明天海面再见`);
    }

    const holding = await this.prisma.visitorBottleCatch.findFirst({
      where: {
        catcherVisitorIdHash: context.visitorIdHash,
        resolution: 'holding',
        releasedAt: null,
      },
      include: { bottle: true },
    });
    if (holding) {
      const chain = await this.buildChain(holding.bottle);
      return { ...this.presentBottle(holding.bottle, true), chain };
    }
    const seaWhere = {
      type: 'bottle',
      status: 'approved',
      caughtByIdHash: null,
      visitorIdHash: { not: context.visitorIdHash },
    };
    const total = await this.prisma.visitorMessage.count({ where: seaWhere });
    if (!total) return null;
    const bottle = await this.prisma.visitorMessage.findFirst({
      where: seaWhere,
      orderBy: { createdAt: 'desc' },
      skip: Math.floor(Math.random() * total),
    });
    if (!bottle) return null;

    await this.prisma.$transaction([
      this.prisma.visitorMessage.update({
        where: { id: bottle.id },
        data: {
          caughtByIdHash: context.visitorIdHash,
          caughtAt: new Date(),
          catchCount: { increment: 1 },
          currentRegion: context.region,
        },
      }),
      this.prisma.visitorBottleCatch.create({
        data: {
          bottleId: bottle.id,
          catcherVisitorIdHash: context.visitorIdHash,
          catcherRegion: context.region,
          resolution: 'holding',
        },
      }),
    ]);
    const chain = await this.buildChain(bottle);
    return { ...this.presentBottle(bottle, true), chain };
  }

  /** 回溯接力链：沿 parentId 向上取祖先瓶（最多 12 段），按时间正序返回 */
  private async buildChain(bottle: { id: string; parentId: string | null }) {
    const segments: Array<{
      id: string;
      content: string;
      nickname: string;
      originRegion: string | null;
      createdAt: Date;
    }> = [];
    let cursor: string | null = bottle.parentId;
    let guard = 0;
    while (cursor && guard < 12) {
      const parent = await this.prisma.visitorMessage.findUnique({
        where: { id: cursor },
        select: {
          id: true,
          content: true,
          nickname: true,
          originRegion: true,
          createdAt: true,
          parentId: true,
        },
      });
      if (!parent) break;
      segments.unshift({
        id: parent.id,
        content: parent.content,
        nickname: parent.nickname,
        originRegion: parent.originRegion,
        createdAt: parent.createdAt,
      });
      cursor = parent.parentId;
      guard += 1;
    }
    return segments;
  }

  async releaseBottle(req: any, bottleId: string) {
    const context = await this.ensureVisitorContext(req);
    const bottle = await this.prisma.visitorMessage.findUnique({
      where: { id: bottleId },
    });
    if (!bottle) throw new NotFoundException('瓶子不存在');
    if (bottle.caughtByIdHash !== context.visitorIdHash) {
      throw new ForbiddenException('这只瓶子不在你手中');
    }
    const catchEvent = await this.prisma.visitorBottleCatch.findFirst({
      where: {
        bottleId,
        catcherVisitorIdHash: context.visitorIdHash,
        resolution: 'holding',
        releasedAt: null,
      },
      orderBy: { caughtAt: 'desc' },
    });
    await this.prisma.$transaction([
      this.prisma.visitorMessage.update({
        where: { id: bottleId },
        data: { caughtByIdHash: null, caughtAt: null, releasedAt: new Date() },
      }),
      ...(catchEvent
        ? [
            this.prisma.visitorBottleCatch.update({
              where: { id: catchEvent.id },
              data: { resolution: 'released', releasedAt: new Date() },
            }),
          ]
        : []),
    ]);
    return { ok: true };
  }

  private presentBottle(
    bottle: {
      id: string;
      content: string;
      nickname: string;
      originRegion: string | null;
      currentRegion: string | null;
      createdAt: Date;
      catchCount: number;
    },
    holding: boolean,
  ) {
    return {
      id: bottle.id,
      content: bottle.content,
      nickname: bottle.nickname,
      originRegion: bottle.originRegion,
      currentRegion: bottle.currentRegion,
      createdAt: bottle.createdAt,
      catchCount: bottle.catchCount,
      holding,
    };
  }

  /* ---------------- 后台管理 ---------------- */

  async adminMessages(params: {
    type?: string;
    status?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const take = Math.min(Math.max(Number(params.limit) || 20, 1), 60);
    const skip = (Math.max(Number(params.page) || 1, 1) - 1) * take;
    const where: Record<string, unknown> = {};
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;
    if (params.q)
      where.OR = [
        { content: { contains: params.q } },
        { nickname: { contains: params.q } },
      ];
    const [total, items] = await Promise.all([
      this.prisma.visitorMessage.count({ where }),
      this.prisma.visitorMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);
    return { items, total, page: Number(params.page) || 1, limit: take };
  }

  async moderateMessage(id: string, status: string) {
    if (!['approved', 'pending', 'rejected'].includes(status)) {
      throw new BadRequestException('非法状态');
    }
    const message = await this.prisma.visitorMessage.update({
      where: { id },
      data: { status },
    });
    if (
      status === 'approved' &&
      message.type === 'message' &&
      message.visitorIdHash
    ) {
      await this.prisma.visitorProfile.updateMany({
        where: { visitorIdHash: message.visitorIdHash },
        data: { messageCount: { increment: 1 } },
      });
    }
    return message;
  }

  async removeMessage(id: string) {
    await this.prisma.visitorMessage.delete({ where: { id } });
    return { ok: true };
  }

  async adminProfiles(params: { q?: string; page?: number; limit?: number }) {
    const take = Math.min(Math.max(Number(params.limit) || 20, 1), 60);
    const skip = (Math.max(Number(params.page) || 1, 1) - 1) * take;
    const where: Record<string, unknown> = {};
    if (params.q) where.nickname = { contains: params.q };
    const [total, items] = await Promise.all([
      this.prisma.visitorProfile.count({ where }),
      this.prisma.visitorProfile.findMany({
        where,
        orderBy: { lastSeenAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          visitorIdHash: true,
          nickname: true,
          visitCount: true,
          messageCount: true,
          isBanned: true,
          firstSeenAt: true,
          lastSeenAt: true,
        },
      }),
    ]);
    const hashes = items.map((item) => item.visitorIdHash);
    const visits = hashes.length
      ? await this.prisma.visitorVisit.findMany({
          where: { visitorIdHash: { in: hashes } },
          orderBy: { createdAt: 'desc' },
          take: hashes.length * 3,
        })
      : [];
    const latestRegion = new Map<string, string | null>();
    const latestDevice = new Map<string, string | null>();
    for (const visit of visits) {
      if (!latestRegion.has(visit.visitorIdHash))
        latestRegion.set(visit.visitorIdHash, visit.region);
      if (!latestDevice.has(visit.visitorIdHash)) {
        latestDevice.set(
          visit.visitorIdHash,
          [visit.browser, visit.os, visit.device].filter(Boolean).join(' · ') ||
            null,
        );
      }
    }
    return {
      items: items.map((item) => ({
        ...item,
        region: latestRegion.get(item.visitorIdHash) ?? null,
        environment: latestDevice.get(item.visitorIdHash) ?? null,
      })),
      total,
      page: Number(params.page) || 1,
      limit: take,
    };
  }

  async setBanned(id: string, banned: boolean) {
    const profile = await this.prisma.visitorProfile.update({
      where: { id },
      data: { isBanned: banned },
    });
    return { id: profile.id, isBanned: profile.isBanned };
  }

  /** 确保请求者已有档案；无则现场建档（避免留言/捞瓶前必须先显式 identify） */
  private async ensureVisitorContext(req: any): Promise<VisitorContext> {
    const env = this.clientEnv(req);
    const device = parseUserAgent(env.userAgent);
    const visitorIdHash = this.fingerprint(env, device);
    let region: string | null = null;
    try {
      const geoInfo = await this.geo.locate(env.ip);
      region = geoInfo?.label || null;
    } catch {
      region = null;
    }
    const profile = await this.prisma.visitorProfile.findUnique({
      where: { visitorIdHash },
    });
    if (!profile) {
      const created = await this.prisma.visitorProfile.create({
        data: {
          visitorIdHash,
          nickname: pickNickname(visitorIdHash),
          ipHash: createHash('sha256')
            .update(`${env.ip}|${VISITOR_SALT}`)
            .digest('hex'),
          visitCount: 1,
        },
      });
      return { visitorIdHash, nickname: created.nickname, region, device };
    }
    if (profile.isBanned)
      throw new ForbiddenException('当前身份已被限制，无法参与互动');
    return { visitorIdHash, nickname: profile.nickname, region, device };
  }
}

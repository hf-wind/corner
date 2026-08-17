import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { NotificationService } from '../notification/notification.service';
import { GeoService } from '../geo/geo.service';
import { SettingsService } from '../settings/settings.service';
import { checkContentNonsense } from '../../common/content-filter/content-filter';
import {
  BOTTLE_CHAIN_MAX,
  BOTTLE_RATE_LIMIT_PER_DAY,
  FISH_RATE_LIMIT_PER_DAY,
  IDENTIFY_RATE_LIMIT_PER_DAY,
  MESSAGE_RATE_LIMIT_PER_DAY,
  VISITOR_ACHIEVEMENTS,
} from './visitor.constants';

type VisitorRequest = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

export type VisitorActor = {
  userId: string;
  username: string;
} | null;

const IP_HASH_SALT = 'corner:visitor:ip';
const BOTTLE_HOLD_LEASE_MS = 30 * 60 * 1000;

function dayKey(date = new Date()): string {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}${mm}${dd}`;
}

type BottleCandidate = {
  createdAt: Date;
  releasedAt?: Date | null;
  caughtAt?: Date | null;
  catchCount?: number;
  originRegion?: string | null;
  currentRegion?: string | null;
  catchEvents?: Array<{
    catcherVisitorIdHash: string | null;
    catcherUserId: string | null;
  }>;
};

function bottleMatchWeight(
  bottle: BottleCandidate,
  catcherRegion: string | null,
  catcherVisitorIdHash: string | null,
  catcherUserId: string | null,
  now: Date,
): number {
  const lastWaterAt = bottle.releasedAt ?? bottle.createdAt;
  const waitingHours = Math.max(
    0,
    (now.getTime() - lastWaterAt.getTime()) / 3_600_000,
  );
  const waitingWeight = 0.85 + Math.min(1.65, Math.log1p(waitingHours) / 2.8);
  const exposureWeight = 1 / Math.sqrt(1 + Math.max(0, bottle.catchCount ?? 0));
  const bottleRegion = bottle.currentRegion ?? bottle.originRegion;
  const regionWeight =
    catcherRegion && bottleRegion
      ? catcherRegion === bottleRegion
        ? 0.72
        : 1.42
      : 1;
  const seenByCatcher = (bottle.catchEvents ?? []).some(
    (event) =>
      (!!catcherVisitorIdHash &&
        event.catcherVisitorIdHash === catcherVisitorIdHash) ||
      (!!catcherUserId && event.catcherUserId === catcherUserId),
  );
  const diversityWeight = seenByCatcher ? 0.035 : 1;
  return Math.max(
    0.001,
    waitingWeight * exposureWeight * regionWeight * diversityWeight,
  );
}

function weightedBottleIndex(weights: number[]): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = Math.random() * total;
  for (let index = 0; index < weights.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return index;
  }
  return Math.max(0, weights.length - 1);
}

function parseUserAgent(ua: string | undefined): {
  browser: string | null;
  os: string | null;
  device: string | null;
} {
  if (!ua || ua.length > 500) return { browser: null, os: null, device: null };
  const text = ua.toLowerCase();
  let browser: string | null = null;
  if (/edg\//.test(text)) browser = 'Edge';
  else if (/opr\/|opera/.test(text)) browser = 'Opera';
  else if (/micromessenger|微信/.test(text)) browser = '微信';
  else if (/chrome\/|chromium/.test(text)) browser = 'Chrome';
  else if (/firefox\//.test(text)) browser = 'Firefox';
  else if (/safari\//.test(text)) browser = 'Safari';
  let os: string | null = null;
  if (/windows nt/.test(text)) os = 'Windows';
  else if (/iphone|ipad|ipod/.test(text)) os = 'iOS';
  else if (/mac os x/.test(text)) os = 'macOS';
  else if (/android/.test(text)) os = 'Android';
  else if (/linux/.test(text)) os = 'Linux';
  let device: string | null = null;
  if (/ipad|tablet/.test(text)) device = 'tablet';
  else if (/iphone|ipod|android|windows phone|mobile/.test(text))
    device = 'mobile';
  else device = 'desktop';
  return { browser, os, device };
}

@Injectable()
export class VisitorService {
  private readonly logger = new Logger(VisitorService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private aiService: AiService,
    private notificationService: NotificationService,
    private geo?: GeoService,
    private settings?: SettingsService,
  ) {}

  resolveVisitorId(req: VisitorRequest): string {
    const raw = (req.headers['x-visitor-id'] as string | undefined) ?? '';
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new UnauthorizedException('缺少访客标识');
    }
    const hash = createHash('sha256').update(trimmed).digest('hex');
    if (hash.length !== 64) {
      throw new BadRequestException('无效的访客标识');
    }
    return hash;
  }

  resolveVisitorIdOptional(visitorId: string): string | null {
    const trimmed = (visitorId ?? '').trim();
    if (!trimmed) return null;
    return this.resolveVisitorId({ headers: { 'x-visitor-id': trimmed } });
  }

  newVisitorId(): string {
    return randomUUID();
  }

  private ipHash(req: VisitorRequest): string | null {
    const ip = req.ip;
    if (!ip) return null;
    return createHash('sha256').update(`${IP_HASH_SALT}:${ip}`).digest('hex');
  }

  private async checkRateLimit(
    req: VisitorRequest,
    scope: string,
    limit: number,
  ): Promise<void> {
    const key = `corner:visitor:${scope}:${this.ipHash(req) ?? 'unknown'}:${dayKey()}`;
    const current = await this.redis.client.incr(key);
    if (current === 1) {
      await this.redis.client.expire(key, 24 * 3600);
    }
    if (current > limit) {
      throw new ForbiddenException('操作太频繁，请明天再试');
    }
  }

  private async dailyLimit(key: string, fallback: number): Promise<number> {
    if (!this.settings) return fallback;
    try {
      const stored = await this.settings.get(key);
      if (stored === null || stored === undefined || stored === '')
        return fallback;
      const value = Number(stored);
      return Number.isFinite(value)
        ? Math.min(100, Math.max(1, Math.floor(value)))
        : fallback;
    } catch {
      return fallback;
    }
  }

  private async rateLimitUsage(
    req: VisitorRequest,
    scope: string,
    limit: number,
  ) {
    const key = `corner:visitor:${scope}:${this.ipHash(req) ?? 'unknown'}:${dayKey()}`;
    const used = Math.max(0, Number(await this.redis.client.get(key)) || 0);
    return {
      used: Math.min(used, limit),
      limit,
      remaining: Math.max(0, limit - used),
    };
  }

  async bottleQuota(req: VisitorRequest) {
    const [throwLimit, fishLimit] = await Promise.all([
      this.dailyLimit('visitor_bottle_daily_limit', BOTTLE_RATE_LIMIT_PER_DAY),
      this.dailyLimit('visitor_fish_daily_limit', FISH_RATE_LIMIT_PER_DAY),
    ]);
    const [throwQuota, fishQuota] = await Promise.all([
      this.rateLimitUsage(req, 'bottle', throwLimit),
      this.rateLimitUsage(req, 'fish', fishLimit),
    ]);
    return { throw: throwQuota, fish: fishQuota };
  }

  async identify(req: VisitorRequest, visitorIdHash: string, nickname: string) {
    await this.checkRateLimit(req, 'identify', IDENTIFY_RATE_LIMIT_PER_DAY);
    const clean = nickname.trim().slice(0, 20);
    if (!clean) {
      throw new BadRequestException('昵称不能为空');
    }
    const existing = await this.prisma.visitorProfile.findUnique({
      where: { visitorIdHash },
      select: { nickname: true },
    });
    if (existing && existing.nickname?.trim()) {
      throw new BadRequestException('已登记的名字不能修改');
    }
    const profile = await this.prisma.visitorProfile.upsert({
      where: { visitorIdHash },
      update: {
        nickname: clean,
        lastSeenAt: new Date(),
      },
      create: {
        visitorIdHash,
        nickname: clean,
        ipHash: this.ipHash(req),
      },
    });
    if (profile.isBanned) {
      throw new ForbiddenException('该访客已被封禁');
    }
    const unlocked = await this.syncAchievements(visitorIdHash);
    return { nickname: profile.nickname, unlocked };
  }

  async trackVisit(
    req: VisitorRequest,
    visitorIdHash: string,
    userId?: string | null,
  ) {
    let profile: { isBanned: boolean; visitorIdHash: string } | null = null;
    if (userId) {
      profile = await this.prisma.visitorProfile.findFirst({
        where: { userId },
        select: { visitorIdHash: true, isBanned: true },
      });
      if (profile) {
        visitorIdHash = profile.visitorIdHash;
        await this.prisma.visitorProfile.update({
          where: { visitorIdHash },
          data: { lastSeenAt: new Date() },
        });
      } else {
        profile = await this.prisma.visitorProfile.upsert({
          where: { visitorIdHash },
          update: { lastSeenAt: new Date(), userId },
          create: {
            visitorIdHash,
            nickname: '',
            ipHash: this.ipHash(req),
            userId,
          },
        });
      }
    } else {
      profile = await this.prisma.visitorProfile.upsert({
        where: { visitorIdHash },
        update: { lastSeenAt: new Date() },
        create: {
          visitorIdHash,
          nickname: '',
          ipHash: this.ipHash(req),
        },
      });
    }
    if (profile.isBanned) {
      return { ok: false, reason: 'banned' };
    }

    const dedupKey = `corner:visitor:visit-dedup:${visitorIdHash}:${dayKey()}`;
    const isNew = await this.redis.client.sadd(dedupKey, 'visit');
    if (isNew) {
      await this.redis.client.expire(dedupKey, 7 * 24 * 3600);
      const ua = parseUserAgent(
        (req.headers['user-agent'] as string | undefined) ?? undefined,
      );
      let region: string | null = null;
      if (req.ip && this.geo) {
        const info = await this.geo.locate(req.ip).catch(() => null);
        region = info?.label ?? null;
      }
      await this.prisma.visitorVisit.create({
        data: {
          visitorIdHash,
          browser: ua.browser,
          os: ua.os,
          device: ua.device,
          region,
        },
      });
    }
    const dayVisitKey = `corner:visitor:day-visit:${visitorIdHash}:${dayKey()}`;
    const firstToday = await this.redis.client.set(
      dayVisitKey,
      '1',
      'EX',
      48 * 3600,
      'NX',
    );
    if (firstToday) {
      await this.prisma.visitorProfile.update({
        where: { visitorIdHash },
        data: { visitCount: { increment: 1 } },
      });
    }

    const unlocked = await this.syncAchievements(visitorIdHash);
    return { ok: true, unlocked, userBound: userId ?? null };
  }

  private async createMessage(
    req: VisitorRequest,
    actor: VisitorActor,
    visitorIdHash: string | null,
    type: 'message' | 'bottle',
    content: string,
    chainId: string | null = null,
    parentId: string | null = null,
  ) {
    let profile: {
      nickname: string;
      visitorIdHash: string;
      isBanned: boolean;
    } | null = null;
    if (actor) {
      if (!actor.username.trim()) {
        throw new BadRequestException('登录账号缺少用户名');
      }
      const userRow = await this.prisma.user.findUnique({
        where: { id: actor.userId },
        select: { isActive: true },
      });
      if (userRow && !userRow.isActive) {
        throw new ForbiddenException('该账号已被封禁');
      }
    } else {
      if (!visitorIdHash) {
        throw new UnauthorizedException('缺少访客标识');
      }
      profile = await this.prisma.visitorProfile.findUnique({
        where: { visitorIdHash },
      });
      if (!profile || !profile.nickname?.trim()) {
        throw new BadRequestException('请先给自己起一个名字');
      }
      if (profile.isBanned) {
        throw new ForbiddenException('该访客已被封禁');
      }
    }
    const dailyLimit =
      type === 'message'
        ? MESSAGE_RATE_LIMIT_PER_DAY
        : await this.dailyLimit(
            'visitor_bottle_daily_limit',
            BOTTLE_RATE_LIMIT_PER_DAY,
          );
    await this.checkRateLimit(req, type, dailyLimit);

    const clean = content.trim();
    if (!clean) {
      throw new BadRequestException('内容不能为空');
    }

    const nonsenseReason = checkContentNonsense(clean);
    let review: { approved: boolean; reason: string; pending?: boolean };
    if (nonsenseReason) {
      review = { approved: false, reason: nonsenseReason };
    } else {
      review = await this.aiService.moderateStrict(clean);
    }
    const status = review.pending
      ? 'pending'
      : review.approved
        ? 'approved'
        : 'rejected';

    const bottleRegion =
      type === 'bottle' ? await this.resolveRequestRegion(req) : null;
    const record = await this.prisma.visitorMessage.create({
      data: {
        type,
        content: clean,
        nickname: actor ? actor.username.slice(0, 20) : profile!.nickname,
        visitorIdHash: actor ? visitorIdHash : profile!.visitorIdHash,
        userId: actor?.userId ?? null,
        status,
        aiReview:
          status === 'rejected' || status === 'pending' ? review.reason : null,
        aiReviewResult: review.pending
          ? 'pending'
          : review.approved
            ? 'approved'
            : 'rejected',
        chainId,
        parentId,
        originRegion: bottleRegion,
        currentRegion: bottleRegion,
      },
    });

    if (type === 'bottle' && !chainId && record.id) {
      await this.prisma.visitorMessage.update({
        where: { id: record.id },
        data: { chainId: record.id },
      });
      record.chainId = record.id;
    }

    if (
      status === 'approved' &&
      type === 'message' &&
      !actor &&
      visitorIdHash
    ) {
      await this.prisma.visitorProfile.update({
        where: { visitorIdHash },
        data: { messageCount: { increment: 1 } },
      });
    }

    if (actor?.userId) {
      try {
        const kindLabel = type === 'message' ? '留言' : '漂流瓶';
        await this.notificationService.create(actor.userId, {
          type: 'guestbook',
          title:
            status === 'approved'
              ? `你的${kindLabel}已通过审核`
              : status === 'pending'
                ? `你的${kindLabel}已转人工审核`
                : `你的${kindLabel}未通过审核`,
          content:
            status === 'approved'
              ? clean
              : review.reason || '内容未通过 AI 审核',
          link: '/guestbook',
        });
      } catch (error) {
        this.logger.warn(`审核通知发送失败: ${(error as Error).message}`);
      }
    }

    const unlocked = visitorIdHash
      ? await this.syncAchievements(visitorIdHash)
      : [];
    return { record, unlocked, review };
  }

  async createMessageEntry(
    req: VisitorRequest,
    actor: VisitorActor,
    visitorIdHash: string | null,
    content: string,
  ) {
    return this.createMessage(req, actor, visitorIdHash, 'message', content);
  }

  async throwBottle(
    req: VisitorRequest,
    actor: VisitorActor,
    visitorIdHash: string | null,
    content: string,
    parentId?: string,
  ) {
    let chainId: string | null = null;
    let catchEventId: string | null = null;
    if (parentId) {
      const parent = await this.prisma.visitorMessage.findUnique({
        where: { id: parentId },
      });
      if (!parent || parent.type !== 'bottle') {
        throw new BadRequestException('接力的瓶子不存在');
      }
      if (!['approved', 'caught'].includes(parent.status)) {
        throw new BadRequestException('这只瓶子已经离开时光海');
      }
      const selfHash = await this.resolveSelfVisitorHash(actor, visitorIdHash);
      const catcherIdentity: Record<string, string>[] = [];
      if (selfHash) catcherIdentity.push({ catcherVisitorIdHash: selfHash });
      if (actor?.userId) catcherIdentity.push({ catcherUserId: actor.userId });
      const latestCatch = await (
        this.prisma as any
      ).visitorBottleCatch?.findFirst?.({
        where: {
          bottleId: parent.id,
          resolution: 'holding',
          ...(catcherIdentity.length ? { OR: catcherIdentity } : {}),
        },
        orderBy: { caughtAt: 'desc' },
      });
      const isCurrentCatcher = latestCatch
        ? (!!actor?.userId && latestCatch.catcherUserId === actor.userId) ||
          (!!selfHash && latestCatch.catcherVisitorIdHash === selfHash)
        : parent.status === 'caught' &&
          !!selfHash &&
          parent.caughtByIdHash === selfHash;
      if (!isCurrentCatcher) {
        throw new ForbiddenException('只能接力自己刚捞起的瓶子');
      }
      catchEventId = latestCatch?.id ?? null;
      const chainRoot = parent.chainId ?? parent.id;
      const depth = await this.prisma.visitorMessage.count({
        where: {
          chainId: chainRoot,
          type: 'bottle',
          status: { in: ['approved', 'caught'] },
        },
      });
      if (depth >= BOTTLE_CHAIN_MAX) {
        throw new BadRequestException('这封信已经漂了太久，让它在此安歇吧');
      }
      chainId = chainRoot;
    }
    const result = await this.createMessage(
      req,
      actor,
      visitorIdHash,
      'bottle',
      content,
      chainId,
      parentId ?? null,
    );
    if (parentId && catchEventId && result.review.approved) {
      await (this.prisma as any).visitorBottleCatch?.update?.({
        where: { id: catchEventId },
        data: { resolution: 'relayed', releasedAt: new Date() },
      });
    }
    return result;
  }

  async fishBottle(
    req: VisitorRequest,
    actor: VisitorActor,
    visitorIdHash: string | null,
  ) {
    const fishLimit = await this.dailyLimit(
      'visitor_fish_daily_limit',
      FISH_RATE_LIMIT_PER_DAY,
    );
    await this.checkRateLimit(req, 'fish', fishLimit);
    const selfHash = await this.resolveSelfVisitorHash(actor, visitorIdHash);
    const catcherRegion = await this.resolveRequestRegion(req);
    const not: Record<string, unknown>[] = [];
    if (selfHash) not.push({ visitorIdHash: selfHash });
    if (actor?.userId) not.push({ userId: actor.userId });
    const now = new Date();
    const leaseCutoff = new Date(now.getTime() - BOTTLE_HOLD_LEASE_MS);
    const candidates = await this.prisma.visitorMessage.findMany({
      where: {
        type: 'bottle',
        ...(not.length > 0 ? { NOT: not } : {}),
        OR: [
          {
            status: 'approved',
            catchEvents: { none: { resolution: 'holding' } },
          },
          {
            status: { in: ['approved', 'caught'] },
            caughtAt: { lt: leaseCutoff },
            catchEvents: {
              some: {
                resolution: 'holding',
                caughtAt: { lt: leaseCutoff },
              },
            },
          },
        ],
      },
      orderBy: [{ catchCount: 'asc' }, { createdAt: 'asc' }],
      take: 240,
      include: {
        catchEvents: {
          orderBy: { caughtAt: 'desc' },
          take: 24,
          select: {
            catcherVisitorIdHash: true,
            catcherUserId: true,
            resolution: true,
            caughtAt: true,
          },
        },
      },
    });

    let bottle: (typeof candidates)[number] | null = null;
    let catchEventId: string | null = null;
    const seenByCatcher = (candidate: (typeof candidates)[number]) =>
      (candidate.catchEvents ?? []).some(
        (event) =>
          (!!selfHash && event.catcherVisitorIdHash === selfHash) ||
          (!!actor?.userId && event.catcherUserId === actor.userId),
      );
    const unseenCandidates = candidates.filter(
      (candidate) => !seenByCatcher(candidate),
    );
    const seenCandidates = candidates.filter(seenByCatcher);

    for (const tier of [unseenCandidates, seenCandidates]) {
      while (tier.length > 0 && !bottle) {
        const index = weightedBottleIndex(
          tier.map((candidate) =>
            bottleMatchWeight(
              candidate,
              catcherRegion,
              selfHash,
              actor?.userId ?? null,
              now,
            ),
          ),
        );
        const candidate = tier.splice(index, 1)[0];
        await (this.prisma as any).visitorBottleCatch?.updateMany?.({
          where: {
            bottleId: candidate.id,
            resolution: 'holding',
            caughtAt: { lt: leaseCutoff },
          },
          data: { resolution: 'expired', releasedAt: now },
        });
        const updated = await this.prisma.visitorMessage.updateMany({
          where: {
            id: candidate.id,
            status: candidate.status,
            caughtAt: candidate.caughtAt,
          },
          data: {
            status: 'caught',
            caughtByIdHash: selfHash ?? undefined,
            caughtAt: now,
            currentRegion:
              catcherRegion ??
              candidate.currentRegion ??
              candidate.originRegion,
            catchCount: { increment: 1 },
          },
        });
        if (updated.count > 0) {
          bottle = candidate;
          const catchEvent = await (
            this.prisma as any
          ).visitorBottleCatch?.create?.({
            data: {
              bottleId: candidate.id,
              catcherVisitorIdHash: selfHash,
              catcherUserId: actor?.userId ?? null,
              catcherRegion,
            },
          });
          catchEventId = catchEvent?.id ?? null;
        }
      }
      if (bottle) break;
    }
    if (!bottle) {
      throw new NotFoundException('这会儿还没等到新的相遇，过一会儿再来看看吧');
    }

    const chainRows = await this.prisma.visitorMessage.findMany({
      where: {
        chainId: bottle.chainId ?? bottle.id,
        type: 'bottle',
        status: { in: ['approved', 'caught'] },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        nickname: true,
        content: true,
        createdAt: true,
        originRegion: true,
      },
    });
    if (bottle.userId) {
      try {
        await this.notificationService.create(bottle.userId, {
          type: 'guestbook',
          title: '你的漂流瓶被捞起了',
          content: `有人从时光海捞起了你投下的瓶子，去看看吧`,
          link: '/guestbook',
        });
      } catch (error) {
        this.logger.warn(`捞起通知发送失败: ${(error as Error).message}`);
      }
    }
    const unlocked = visitorIdHash
      ? await this.syncAchievements(visitorIdHash)
      : [];
    const ownerUserId = bottle.userId ?? null;
    return {
      bottle: {
        id: bottle.id,
        chain: chainRows,
        nickname: bottle.nickname,
        createdAt: bottle.createdAt,
        originRegion: bottle.originRegion,
        catchCount: (bottle.catchCount ?? 0) + 1,
        catchEventId,
        ownerUserId,
      },
      unlocked,
    };
  }

  /**
   * 登录账号与其访客档案（visitorIdHash）视为同一个人：
   * 优先取登录账号绑定的访客 hash，其次使用请求携带的访客 hash。
   */
  private async resolveSelfVisitorHash(
    actor: VisitorActor,
    visitorIdHash: string | null,
  ): Promise<string | null> {
    if (actor?.userId) {
      const bound = await this.prisma.visitorProfile.findFirst({
        where: { userId: actor.userId },
        select: { visitorIdHash: true },
      });
      return bound?.visitorIdHash ?? visitorIdHash;
    }
    return visitorIdHash;
  }

  private async resolveRequestRegion(
    req: VisitorRequest,
  ): Promise<string | null> {
    if (!req.ip || !this.geo) return null;
    const location = await this.geo.locate(req.ip).catch(() => null);
    return location?.label?.trim().slice(0, 100) || null;
  }

  async releaseBottle(
    req: VisitorRequest,
    actor: VisitorActor,
    visitorIdHash: string | null,
    bottleId: string,
  ) {
    const bottle = await this.prisma.visitorMessage.findUnique({
      where: { id: bottleId },
    });
    if (!bottle || bottle.type !== 'bottle') {
      throw new NotFoundException('漂流瓶不存在');
    }
    if (!['approved', 'caught'].includes(bottle.status)) {
      throw new BadRequestException('这只瓶子已经离开时光海');
    }
    const selfHash = await this.resolveSelfVisitorHash(actor, visitorIdHash);
    const catcherIdentity: Record<string, string>[] = [];
    if (selfHash) catcherIdentity.push({ catcherVisitorIdHash: selfHash });
    if (actor?.userId) catcherIdentity.push({ catcherUserId: actor.userId });
    const latestCatch = await (
      this.prisma as any
    ).visitorBottleCatch?.findFirst?.({
      where: {
        bottleId,
        resolution: 'holding',
        ...(catcherIdentity.length ? { OR: catcherIdentity } : {}),
      },
      orderBy: { caughtAt: 'desc' },
    });
    const isCurrentCatcher = latestCatch
      ? (!!actor?.userId && latestCatch.catcherUserId === actor.userId) ||
        (!!selfHash && latestCatch.catcherVisitorIdHash === selfHash)
      : bottle.status === 'caught' &&
        !!selfHash &&
        bottle.caughtByIdHash === selfHash;
    if (!isCurrentCatcher) {
      throw new ForbiddenException('只能扔回自己刚捞起的瓶子');
    }
    const releasedAt = new Date();
    const currentRegion = await this.resolveRequestRegion(req);
    const updated = await this.prisma.visitorMessage.updateMany({
      where: { id: bottleId, status: { in: ['approved', 'caught'] } },
      data: {
        status: 'approved',
        releasedAt,
        currentRegion:
          currentRegion ?? bottle.currentRegion ?? bottle.originRegion,
      },
    });
    if (!updated.count) {
      throw new BadRequestException('这只瓶子已经被潮汐带走了');
    }
    if (latestCatch?.id) {
      await (this.prisma as any).visitorBottleCatch.update({
        where: { id: latestCatch.id },
        data: { resolution: 'returned', releasedAt },
      });
    }
    return { ok: true, releasedAt };
  }

  async listMessages(type: 'message' | 'bottle', page: number, pageSize = 20) {
    const where = { type, status: 'approved' };
    const [items, total] = await Promise.all([
      this.prisma.visitorMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          content: true,
          nickname: true,
          createdAt: true,
          userId: true,
          visitorIdHash: true,
          user: {
            select: { id: true, username: true, avatar: true },
          },
        },
      }),
      this.prisma.visitorMessage.count({ where }),
    ]);
    return { items, total, page, pageSize, hasMore: page * pageSize < total };
  }

  async wall() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [
      messageCount,
      bottleCount,
      totalVisitors,
      todayVisitors,
      totalVisits,
      recentRows,
      recentMessages,
    ] = await Promise.all([
      this.prisma.visitorMessage.count({
        where: { type: 'message', status: 'approved' },
      }),
      this.prisma.visitorMessage.count({
        where: { type: 'bottle', status: { in: ['approved', 'caught'] } },
      }),
      this.prisma.visitorProfile.count(),
      this.prisma.visitorProfile.count({
        where: { lastSeenAt: { gte: today } },
      }),
      this.prisma.visitorVisit.count(),
      this.prisma.visitorVisit.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      this.prisma.visitorMessage.findMany({
        where: { type: 'message', status: 'approved' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { nickname: true, content: true, createdAt: true },
      }),
    ]);

    const perDay = new Map<string, Set<string>>();
    for (const row of recentRows) {
      const d = new Date(row.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!perDay.has(key)) perDay.set(key, new Set());
    }
    const daily = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const count = perDay.get(key)?.size ?? 0;
      daily.push({ date: key, count });
    }

    return {
      messageCount,
      bottleCount,
      totalVisitors,
      todayVisitors,
      totalVisits,
      daily,
      recentMessages,
    };
  }

  async me(visitorIdHash: string) {
    const profile = await this.prisma.visitorProfile.findUnique({
      where: { visitorIdHash },
    });
    if (!profile) {
      return {
        nickname: null,
        visitCount: 0,
        messageCount: 0,
        bottleCount: 0,
        caughtCount: 0,
        achievements: [],
      };
    }
    const [achievements, messageCount, bottleCount, caughtCount] =
      await Promise.all([
        this.prisma.visitorAchievement.findMany({
          where: { visitorIdHash },
          orderBy: { unlockedAt: 'asc' },
          select: { code: true, unlockedAt: true },
        }),
        this.prisma.visitorMessage.count({
          where: { visitorIdHash, type: 'message', status: 'approved' },
        }),
        this.prisma.visitorMessage.count({
          where: {
            visitorIdHash,
            type: 'bottle',
            status: { in: ['approved', 'caught'] },
          },
        }),
        this.countBottleCatches(visitorIdHash),
      ]);
    return {
      nickname: profile.nickname,
      visitCount: profile.visitCount,
      messageCount,
      bottleCount,
      caughtCount,
      achievements: achievements.map((a) => ({
        code: a.code,
        unlockedAt: a.unlockedAt,
        ...VISITOR_ACHIEVEMENTS.find((def) => def.code === a.code),
      })),
    };
  }

  async recentVisits(limit = 12) {
    const take = Math.min(50, Math.max(5, limit));
    const profiles = await this.prisma.visitorProfile.findMany({
      where: { isBanned: false },
      orderBy: { lastSeenAt: 'desc' },
      take,
      select: {
        id: true,
        visitorIdHash: true,
        nickname: true,
        userId: true,
        lastSeenAt: true,
      },
    });
    if (profiles.length === 0) return [];

    const hashes = profiles.map((profile) => profile.visitorIdHash);
    const visits = await this.prisma.visitorVisit.findMany({
      where: { visitorIdHash: { in: hashes } },
      orderBy: { createdAt: 'desc' },
      take: Math.max(120, hashes.length * 3),
      select: {
        id: true,
        visitorIdHash: true,
        region: true,
        browser: true,
        os: true,
        device: true,
      },
    });
    const latestVisitByHash = new Map<string, (typeof visits)[number]>();
    for (const visit of visits) {
      if (!latestVisitByHash.has(visit.visitorIdHash)) {
        latestVisitByHash.set(visit.visitorIdHash, visit);
      }
    }
    const userIds = profiles
      .map((profile) => profile.userId)
      .filter((id): id is string => !!id);
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true },
        })
      : [];
    const usernameByUserId = new Map(
      users.map((user) => [user.id, user.username]),
    );

    return profiles.map((profile) => {
      const visit = latestVisitByHash.get(profile.visitorIdHash);
      const boundUser = profile?.userId
        ? usernameByUserId.get(profile.userId)
        : null;
      return {
        id: visit?.id ?? profile.id,
        nickname: boundUser || profile?.nickname || '',
        region: visit?.region ?? null,
        browser: visit?.browser ?? null,
        os: visit?.os ?? null,
        device: visit?.device ?? null,
        time: profile.lastSeenAt,
      };
    });
  }

  private async syncAchievements(visitorIdHash: string): Promise<string[]> {
    try {
      const profile = await this.prisma.visitorProfile.findUnique({
        where: { visitorIdHash },
        select: { nickname: true, visitCount: true },
      });
      if (!profile) return [];

      const [msgCount, bottleCount, caughtCount, owned] = await Promise.all([
        this.prisma.visitorMessage.count({
          where: { visitorIdHash, type: 'message', status: 'approved' },
        }),
        this.prisma.visitorMessage.count({
          where: {
            visitorIdHash,
            type: 'bottle',
            status: { in: ['approved', 'caught'] },
          },
        }),
        this.countBottleCatches(visitorIdHash),
        this.prisma.visitorAchievement.findMany({
          where: { visitorIdHash },
          select: { code: true },
        }),
      ]);

      const ownedSet = new Set(owned.map((o) => o.code));
      const candidates: Array<[string, boolean]> = [
        ['first_visit', profile.visitCount >= 3],
        [
          'set_nickname',
          !!profile.nickname?.trim() && msgCount + bottleCount >= 2,
        ],
        ['first_message', msgCount >= 3],
        ['first_bottle', bottleCount >= 3],
        ['catch_bottle', caughtCount >= 3],
        ['visits_5', profile.visitCount >= 10],
        ['visits_30', profile.visitCount >= 30],
      ];
      const toUnlock = candidates
        .filter(([code, ok]) => ok && !ownedSet.has(code))
        .map(([code]) => code);
      if (toUnlock.length > 0) {
        await this.prisma.visitorAchievement.createMany({
          data: toUnlock.map((code) => ({ visitorIdHash, code })),
          skipDuplicates: true,
        });
      }
      return toUnlock;
    } catch (error) {
      this.logger.warn(`成就同步失败: ${(error as Error).message}`);
      return [];
    }
  }

  private countBottleCatches(visitorIdHash: string): Promise<number> {
    const catchModel = (this.prisma as any).visitorBottleCatch;
    if (catchModel?.count) {
      return catchModel.count({
        where: { catcherVisitorIdHash: visitorIdHash },
      });
    }
    return this.prisma.visitorMessage.count({
      where: { caughtByIdHash: visitorIdHash },
    });
  }

  async adminStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [
      visitors,
      todayVisitors,
      visits,
      messages,
      bottles,
      pendingMessages,
      pendingBottles,
    ] = await Promise.all([
      this.prisma.visitorProfile.count(),
      this.prisma.visitorProfile.count({
        where: { lastSeenAt: { gte: today } },
      }),
      this.prisma.visitorVisit.count(),
      this.prisma.visitorMessage.count({ where: { type: 'message' } }),
      this.prisma.visitorMessage.count({ where: { type: 'bottle' } }),
      this.prisma.visitorMessage.count({
        where: { type: 'message', status: 'pending' },
      }),
      this.prisma.visitorMessage.count({
        where: { type: 'bottle', status: 'pending' },
      }),
    ]);
    return {
      visitors,
      todayVisitors,
      visits,
      messages,
      bottles,
      pendingMessages,
      pendingBottles,
    };
  }

  async adminMessages(query: {
    status?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(10, Number(query.pageSize) || 20));
    const [items, total] = await Promise.all([
      this.prisma.visitorMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.visitorMessage.count({ where }),
    ]);
    const userIds = [
      ...new Set(items.map((m) => m.userId).filter(Boolean) as string[]),
    ];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    const caughtHashes = [
      ...new Set(
        items
          .map((message) => message.caughtByIdHash)
          .filter(Boolean) as string[],
      ),
    ];
    const catchers = caughtHashes.length
      ? await this.prisma.visitorProfile.findMany({
          where: { visitorIdHash: { in: caughtHashes } },
          select: { visitorIdHash: true, nickname: true },
        })
      : [];
    const catcherMap = new Map(
      catchers.map((catcher) => [catcher.visitorIdHash, catcher.nickname]),
    );
    const decorated = items.map((m) => ({
      ...m,
      account: m.userId ? (userMap.get(m.userId) ?? null) : null,
      catcher: m.caughtByIdHash
        ? { nickname: catcherMap.get(m.caughtByIdHash) ?? null }
        : null,
    }));
    return { items: decorated, total, page, pageSize };
  }

  async reviewMessage(
    id: string,
    action: 'approve' | 'reject',
    reason?: string,
  ) {
    const message = await this.prisma.visitorMessage.findUnique({
      where: { id },
    });
    if (!message) throw new NotFoundException('消息不存在');
    const data: Record<string, unknown> =
      action === 'approve'
        ? { status: 'approved', rejectReason: null }
        : { status: 'rejected', rejectReason: reason || '管理员拒绝' };
    const updated = await this.prisma.visitorMessage.update({
      where: { id },
      data,
    });
    if (
      action === 'approve' &&
      message.type === 'message' &&
      message.visitorIdHash
    ) {
      await this.prisma.visitorProfile.update({
        where: { visitorIdHash: message.visitorIdHash },
        data: { messageCount: { increment: 1 } },
      });
      await this.syncAchievements(message.visitorIdHash);
    }
    return { ok: true, status: updated.status };
  }

  async setBan(id: string, banned: boolean) {
    const profile = await this.prisma.visitorProfile.findUnique({
      where: { id },
    });
    if (!profile) throw new NotFoundException('访客不存在');
    await this.prisma.visitorProfile.update({
      where: { id },
      data: { isBanned: banned },
    });
    return { ok: true, isBanned: banned };
  }

  async adminProfiles(query: {
    keyword?: string;
    banned?: string;
    type?: 'user' | 'registered' | 'anonymous';
    page?: number;
    pageSize?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (query.keyword?.trim()) {
      where.nickname = { contains: query.keyword.trim() };
    }
    if (query.banned === 'true') where.isBanned = true;
    else if (query.banned === 'false') where.isBanned = false;
    if (query.type === 'user') where.userId = { not: null };
    else if (query.type === 'registered') {
      where.userId = null;
      where.nickname = query.keyword?.trim()
        ? { contains: query.keyword.trim(), not: '' }
        : { not: '' };
    } else if (query.type === 'anonymous') {
      where.userId = null;
      where.nickname = { in: ['', null] };
    }
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(10, Number(query.pageSize) || 20));
    const [items, total] = await Promise.all([
      this.prisma.visitorProfile.findMany({
        where,
        orderBy: { lastSeenAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.visitorProfile.count({ where }),
    ]);
    const hashes = items.map((p) => p.visitorIdHash);
    const userIds = items
      .map((profile) => profile.userId)
      .filter(Boolean) as string[];
    const catchModel = (this.prisma as any).visitorBottleCatch;
    const catchGroupKey = catchModel?.groupBy
      ? 'catcherVisitorIdHash'
      : 'caughtByIdHash';
    const [
      messageCounts,
      bottleCounts,
      caughtCounts,
      achievementCounts,
      users,
      visits,
    ] = await Promise.all([
      this.prisma.visitorMessage.groupBy({
        by: ['visitorIdHash'],
        where: {
          visitorIdHash: { in: hashes },
          type: 'message',
          status: 'approved',
        },
        _count: { _all: true },
      }),
      this.prisma.visitorMessage.groupBy({
        by: ['visitorIdHash'],
        where: {
          visitorIdHash: { in: hashes },
          type: 'bottle',
          status: { in: ['approved', 'caught'] },
        },
        _count: { _all: true },
      }),
      catchModel?.groupBy
        ? catchModel.groupBy({
            by: ['catcherVisitorIdHash'],
            where: { catcherVisitorIdHash: { in: hashes } },
            _count: { _all: true },
          })
        : this.prisma.visitorMessage.groupBy({
            by: ['caughtByIdHash'],
            where: { caughtByIdHash: { in: hashes } },
            _count: { _all: true },
          }),
      this.prisma.visitorAchievement.groupBy({
        by: ['visitorIdHash'],
        where: { visitorIdHash: { in: hashes } },
        _count: { _all: true },
      }),
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, email: true },
          })
        : [],
      hashes.length
        ? this.prisma.visitorVisit.findMany({
            where: {
              visitorIdHash: { in: hashes },
              region: { not: null },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: { visitorIdHash: true, region: true },
          })
        : [],
    ]);
    const countBy = (rows: Array<Record<string, unknown>>, key: string) =>
      new Map(
        rows.map((r) => [String(r[key]), (r._count as { _all: number })._all]),
      );
    const messageMap = countBy(messageCounts, 'visitorIdHash');
    const bottleMap = countBy(bottleCounts, 'visitorIdHash');
    const caughtMap = countBy(caughtCounts, catchGroupKey);
    const achMap = countBy(achievementCounts, 'visitorIdHash');
    const accountMap = new Map(users.map((user) => [user.id, user]));
    const regionByHash = new Map<string, string>();
    for (const visit of visits) {
      if (visit.region && !regionByHash.has(visit.visitorIdHash)) {
        regionByHash.set(visit.visitorIdHash, visit.region);
      }
    }
    return {
      items: items.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        userId: p.userId,
        account: p.userId ? (accountMap.get(p.userId) ?? null) : null,
        identity: p.userId
          ? 'user'
          : !p.nickname?.trim()
            ? 'anonymous'
            : 'registered',
        region: regionByHash.get(p.visitorIdHash) ?? null,
        isBanned: p.isBanned,
        visitCount: p.visitCount,
        messageCount: messageMap.get(p.visitorIdHash) ?? 0,
        bottleCount: bottleMap.get(p.visitorIdHash) ?? 0,
        caughtCount: caughtMap.get(p.visitorIdHash) ?? 0,
        achievementCount: achMap.get(p.visitorIdHash) ?? 0,
        firstSeenAt: p.firstSeenAt,
        lastSeenAt: p.lastSeenAt,
      })),
      total,
      page,
      pageSize,
    };
  }
}

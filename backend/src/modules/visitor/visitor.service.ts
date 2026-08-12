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
import {
  BOTTLE_CHAIN_MAX,
  BOTTLE_RATE_LIMIT_PER_DAY,
  FISH_RATE_LIMIT_PER_DAY,
  IDENTIFY_RATE_LIMIT_PER_DAY,
  MESSAGE_RATE_LIMIT_PER_DAY,
  REPLY_RATE_LIMIT_PER_DAY,
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

function dayKey(date = new Date()): string {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}${mm}${dd}`;
}

@Injectable()
export class VisitorService {
  private readonly logger = new Logger(VisitorService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private aiService: AiService,
    private notificationService: NotificationService,
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
    return createHash('sha256')
      .update(`${IP_HASH_SALT}:${ip}`)
      .digest('hex');
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

  async identify(req: VisitorRequest, visitorIdHash: string, nickname: string, email?: string) {
    await this.checkRateLimit(req, 'identify', IDENTIFY_RATE_LIMIT_PER_DAY);
    const clean = nickname.trim().slice(0, 20);
    if (!clean) {
      throw new BadRequestException('昵称不能为空');
    }
    const existing = await this.prisma.visitorProfile.findUnique({
      where: { visitorIdHash },
      select: { nickname: true },
    });
    if (existing && existing.nickname && existing.nickname !== '无名旅人') {
      throw new BadRequestException('已登记的名字不能修改');
    }
    const cleanEmail = email?.trim().slice(0, 255) || null;
    const profile = await this.prisma.visitorProfile.upsert({
      where: { visitorIdHash },
      update: {
        nickname: clean,
        email: cleanEmail,
        lastSeenAt: new Date(),
      },
      create: { visitorIdHash, nickname: clean, email: cleanEmail, ipHash: this.ipHash(req) },
    });
    if (profile.isBanned) {
      throw new ForbiddenException('该访客已被封禁');
    }
    const unlocked = await this.syncAchievements(visitorIdHash);
    return { nickname: profile.nickname, email: profile.email, unlocked };
  }

  async trackVisit(
    req: VisitorRequest,
    visitorIdHash: string,
    data: { pageType: string; targetTitle?: string; targetHref?: string },
  ) {
    const profile = await this.prisma.visitorProfile.upsert({
      where: { visitorIdHash },
      update: { lastSeenAt: new Date() },
      create: { visitorIdHash, nickname: '无名旅人', ipHash: this.ipHash(req) },
    });
    if (profile.isBanned) {
      return { ok: false, reason: 'banned' };
    }

    const dedupKey = `corner:visitor:visit-dedup:${visitorIdHash}:${dayKey()}`;
    const dedupMember = `${data.pageType}:${data.targetHref ?? ''}`;
    const isNew = await this.redis.client.sadd(dedupKey, dedupMember);
    if (isNew) {
      await this.redis.client.expire(dedupKey, 7 * 24 * 3600);
      await this.prisma.visitorVisit.create({
        data: {
          visitorIdHash,
          pageType: data.pageType,
          targetTitle: data.targetTitle ?? null,
          targetHref: data.targetHref ?? null,
        },
      });
    }
    const dayVisitKey = `corner:visitor:day-visit:${visitorIdHash}:${dayKey()}`;
    const firstToday = await this.redis.client.set(dayVisitKey, '1', 'EX', 48 * 3600, 'NX');
    if (firstToday) {
      await this.prisma.visitorProfile.update({
        where: { visitorIdHash },
        data: { visitCount: { increment: 1 } },
      });
    }

    const unlocked = await this.syncAchievements(visitorIdHash);
    return { ok: true, unlocked };
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
    let profile: { nickname: string; visitorIdHash: string; isBanned: boolean } | null = null;
    if (actor) {
      if (!actor.username.trim()) {
        throw new BadRequestException('登录账号缺少用户名');
      }
    } else {
      if (!visitorIdHash) {
        throw new UnauthorizedException('缺少访客标识');
      }
      profile = await this.prisma.visitorProfile.findUnique({
        where: { visitorIdHash },
      });
      if (!profile || !profile.nickname || profile.nickname === '无名旅人') {
        throw new BadRequestException('请先给自己起一个名字');
      }
      if (profile.isBanned) {
        throw new ForbiddenException('该访客已被封禁');
      }
    }
    await this.checkRateLimit(req, type, type === 'message' ? MESSAGE_RATE_LIMIT_PER_DAY : BOTTLE_RATE_LIMIT_PER_DAY);

    const clean = content.trim();
    if (!clean) {
      throw new BadRequestException('内容不能为空');
    }

    const review = await this.aiService.moderateComment(clean);
    const status = review.approved ? 'approved' : 'rejected';

    const record = await this.prisma.visitorMessage.create({
      data: {
        type,
        content: clean,
        nickname: actor ? actor.username.slice(0, 20) : profile!.nickname,
        visitorIdHash: actor ? visitorIdHash : profile!.visitorIdHash,
        userId: actor?.userId ?? null,
        status,
        aiReview: status === 'rejected' ? review.reason : null,
        aiReviewResult: review.approved ? 'approved' : 'rejected',
        chainId,
        parentId,
      },
    });

    if (type === 'bottle' && !chainId && record.id) {
      await this.prisma.visitorMessage.update({
        where: { id: record.id },
        data: { chainId: record.id },
      });
      record.chainId = record.id;
    }

    if (status === 'approved' && type === 'message' && !actor && visitorIdHash) {
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
              : `你的${kindLabel}未通过审核`,
          content:
            status === 'approved'
              ? clean
              : (review.reason || '内容未通过 AI 审核'),
          link: '/guestbook',
        });
      } catch (error) {
        this.logger.warn(`审核通知发送失败: ${(error as Error).message}`);
      }
    }

    const unlocked = visitorIdHash ? await this.syncAchievements(visitorIdHash) : [];
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
    if (parentId) {
      const parent = await this.prisma.visitorMessage.findUnique({ where: { id: parentId } });
      if (!parent || parent.type !== 'bottle') {
        throw new BadRequestException('接力的瓶子不存在');
      }
      if (parent.status !== 'caught') {
        throw new BadRequestException('只能接力一只刚捞起的瓶子');
      }
      const chainRoot = parent.chainId ?? parent.id;
      const depth = await this.prisma.visitorMessage.count({
        where: { chainId: chainRoot, type: 'bottle', status: { in: ['approved', 'caught'] } },
      });
      if (depth >= BOTTLE_CHAIN_MAX) {
        throw new BadRequestException('这封信已经漂了太久，让它在此安歇吧');
      }
      chainId = chainRoot;
    }
    return this.createMessage(req, actor, visitorIdHash, 'bottle', content, chainId, parentId ?? null);
  }

  async fishBottle(
    req: VisitorRequest,
    actor: VisitorActor,
    visitorIdHash: string | null,
    bottleId: string,
  ) {
    await this.checkRateLimit(req, 'fish', FISH_RATE_LIMIT_PER_DAY);
    const bottle = await this.prisma.visitorMessage.findUnique({ where: { id: bottleId } });
    if (!bottle || bottle.type !== 'bottle' || bottle.status !== 'approved') {
      throw new NotFoundException('这只瓶子已经被别人捞走了');
    }
    if (actor && bottle.userId === actor.userId) {
      throw new BadRequestException('不能捞起自己投的瓶子');
    }
    if (!actor && visitorIdHash && bottle.visitorIdHash === visitorIdHash) {
      throw new BadRequestException('不能捞起自己投的瓶子');
    }
    const updated = await this.prisma.visitorMessage.updateMany({
      where: { id: bottle.id, status: 'approved' },
      data: {
        status: 'caught',
        caughtByIdHash: visitorIdHash ?? undefined,
        caughtAt: new Date(),
      },
    });
    if (updated.count === 0) {
      throw new NotFoundException('这只瓶子已经被别人捞走了');
    }
    const chainRows = await this.prisma.visitorMessage.findMany({
      where: { chainId: bottle.chainId ?? bottle.id, type: 'bottle', status: { in: ['approved', 'caught'] } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, nickname: true, content: true, createdAt: true },
    });
    let contactEmail: string | null = null;
    if (bottle.userId) {
      const owner = await this.prisma.user.findUnique({
        where: { id: bottle.userId },
        select: { email: true },
      });
      contactEmail = owner?.email ?? null;
    } else if (bottle.visitorIdHash) {
      const owner = await this.prisma.visitorProfile.findUnique({
        where: { visitorIdHash: bottle.visitorIdHash },
        select: { email: true },
      });
      contactEmail = owner?.email ?? null;
    }
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
    const unlocked = visitorIdHash ? await this.syncAchievements(visitorIdHash) : [];
    const ownerUserId = bottle.userId ?? null;
    return {
      bottle: {
        id: bottle.id,
        chain: chainRows,
        nickname: bottle.nickname,
        createdAt: bottle.createdAt,
        contactEmail,
        ownerUserId,
        canReply: !!bottle.userId && (!actor || bottle.userId !== actor.userId),
      },
      unlocked,
    };
  }

  async replyBottle(
    req: VisitorRequest,
    actor: VisitorActor,
    visitorIdHash: string | null,
    bottleId: string,
    content: string,
  ) {
    if (!actor?.userId) {
      throw new UnauthorizedException('请先登录后再回复漂流瓶主人');
    }
    const bottle = await this.prisma.visitorMessage.findUnique({ where: { id: bottleId } });
    if (!bottle || bottle.type !== 'bottle') {
      throw new NotFoundException('瓶子不存在');
    }
    if (bottle.status !== 'caught') {
      throw new BadRequestException('只能回复一只你捞起的瓶子');
    }
    if (!bottle.userId) {
      throw new BadRequestException('这只瓶子的主人还没有账号，暂时无法回复');
    }
    if (bottle.userId === actor.userId) {
      throw new BadRequestException('不能回复自己投的瓶子');
    }
    await this.checkRateLimit(req, 'reply', REPLY_RATE_LIMIT_PER_DAY);
    const clean = content.trim();
    if (!clean) {
      throw new BadRequestException('回复内容不能为空');
    }
    const review = await this.aiService.moderateComment(clean);
    const record = await this.prisma.visitorMessage.create({
      data: {
        type: 'reply',
        content: clean,
        nickname: actor.username.slice(0, 20),
        userId: actor.userId,
        visitorIdHash,
        status: review.approved ? 'approved' : 'rejected',
        aiReview: review.approved ? null : review.reason,
        aiReviewResult: review.approved ? 'approved' : 'rejected',
        chainId: bottle.chainId ?? bottle.id,
        parentId: bottle.id,
      },
    });
    if (review.approved) {
      try {
        await this.notificationService.create(bottle.userId, {
          type: 'guestbook',
          title: '有人回复了你的漂流瓶',
          content: `${actor.username}：${clean}`,
          link: '/guestbook',
        });
      } catch (error) {
        this.logger.warn(`回复通知发送失败: ${(error as Error).message}`);
      }
    }
    return { ok: true, record, review };
  }

  async peekBottles(
    limit = 8,
    excludeVisitorHash: string | null = null,
    excludeUserId: string | null = null,
  ) {
    const where: Record<string, unknown> = { type: 'bottle', status: 'approved' };
    const not: Record<string, unknown>[] = [];
    if (excludeVisitorHash) not.push({ visitorIdHash: excludeVisitorHash });
    if (excludeUserId) not.push({ userId: excludeUserId });
    if (not.length > 0) where.NOT = not;
    const candidates = await this.prisma.visitorMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { id: true, parentId: true, chainId: true, nickname: true },
    });
    const referenced = new Set(
      candidates.filter((c) => c.parentId).map((c) => c.parentId as string),
    );
    const tails = candidates.filter((c) => !referenced.has(c.id));
    const chainIds = tails
      .map((t) => t.chainId ?? t.id)
      .filter((id): id is string => !!id);
    const chains = chainIds.length
      ? await this.prisma.visitorMessage.groupBy({
          by: ['chainId'],
          where: { chainId: { in: chainIds }, type: 'bottle' },
          _count: { _all: true },
        })
      : [];
    const depthByChain = new Map(chains.map((c) => [c.chainId, c._count._all]));
    return tails.slice(0, limit).map((t) => ({
      id: t.id,
      nicknameFirstChar: t.nickname.slice(0, 1),
      chainLength: depthByChain.get(t.chainId ?? t.id) ?? 1,
      seed: [...t.id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 997, 7),
    }));
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

    const [messageCount, bottleCount, totalVisitors, todayVisitors, totalVisits, recentRows, recentMessages] =
      await Promise.all([
        this.prisma.visitorMessage.count({ where: { type: 'message', status: 'approved' } }),
        this.prisma.visitorMessage.count({ where: { type: 'bottle', status: { in: ['approved', 'caught'] } } }),
        this.prisma.visitorProfile.count(),
        this.prisma.visitorProfile.count({ where: { lastSeenAt: { gte: today } } }),
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
      return { nickname: null, visitCount: 0, messageCount: 0, bottleCount: 0, caughtCount: 0, achievements: [] };
    }
    const [achievements, bottleCount, caughtCount] = await Promise.all([
      this.prisma.visitorAchievement.findMany({
        where: { visitorIdHash },
        orderBy: { unlockedAt: 'asc' },
        select: { code: true, unlockedAt: true },
      }),
      this.prisma.visitorMessage.count({
        where: { visitorIdHash, type: 'bottle', status: { in: ['approved', 'caught'] } },
      }),
      this.prisma.visitorMessage.count({ where: { caughtByIdHash: visitorIdHash } }),
    ]);
    return {
      nickname: profile.nickname,
      visitCount: profile.visitCount,
      messageCount: profile.messageCount,
      bottleCount,
      caughtCount,
      achievements: achievements.map((a) => ({
        code: a.code,
        unlockedAt: a.unlockedAt,
        ...VISITOR_ACHIEVEMENTS.find((def) => def.code === a.code),
      })),
    };
  }

  async recentVisits(limit = 5) {
    const rows = await this.prisma.visitorVisit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        id: true,
        pageType: true,
        targetTitle: true,
        targetHref: true,
        visitorIdHash: true,
        createdAt: true,
      },
    });
    if (rows.length === 0) return [];

    const hashes = [...new Set(rows.map((r) => r.visitorIdHash))];
    const profiles = await this.prisma.visitorProfile.findMany({
      where: { visitorIdHash: { in: hashes } },
      select: { visitorIdHash: true, nickname: true },
    });
    const nicknameByHash = new Map(profiles.map((p) => [p.visitorIdHash, p.nickname]));

    const items: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const key = `${row.visitorIdHash}:${row.pageType}:${row.targetHref ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: row.id,
        nickname: nicknameByHash.get(row.visitorIdHash) ?? '无名旅人',
        pageType: row.pageType,
        targetTitle: row.targetTitle,
        targetHref: row.targetHref,
        time: row.createdAt,
      });
      if (items.length >= limit) break;
    }
    return items;
  }

  private async syncAchievements(visitorIdHash: string): Promise<string[]> {
    try {
      const profile = await this.prisma.visitorProfile.findUnique({
        where: { visitorIdHash },
        select: { nickname: true, visitCount: true },
      });
      if (!profile) return [];

      const [msgCount, bottleCount, caughtCount, pageTypes, owned] = await Promise.all([
        this.prisma.visitorMessage.count({
          where: { visitorIdHash, type: 'message', status: 'approved' },
        }),
        this.prisma.visitorMessage.count({
          where: { visitorIdHash, type: 'bottle', status: { in: ['approved', 'caught'] } },
        }),
        this.prisma.visitorMessage.count({
          where: { caughtByIdHash: visitorIdHash },
        }),
        this.prisma.visitorVisit.findMany({
          where: { visitorIdHash },
          select: { pageType: true },
          distinct: ['pageType'],
        }),
        this.prisma.visitorAchievement.findMany({
          where: { visitorIdHash },
          select: { code: true },
        }),
      ]);

      const ownedSet = new Set(owned.map((o) => o.code));
      const pageCount = pageTypes.length;
      const candidates: Array<[string, boolean]> = [
        ['first_visit', profile.visitCount >= 1],
        ['set_nickname', !!profile.nickname && profile.nickname !== '无名旅人'],
        ['first_message', msgCount >= 1],
        ['first_bottle', bottleCount >= 1],
        ['catch_bottle', caughtCount >= 1],
        ['visits_5', profile.visitCount >= 5],
        ['visits_30', profile.visitCount >= 30],
        ['pages_10', pageCount >= 10],
        ['pages_20', pageCount >= 20],
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

  async adminStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [visitors, todayVisitors, visits, messages, bottles, pendingMessages, pendingBottles] =
      await Promise.all([
        this.prisma.visitorProfile.count(),
        this.prisma.visitorProfile.count({ where: { lastSeenAt: { gte: today } } }),
        this.prisma.visitorVisit.count(),
        this.prisma.visitorMessage.count({ where: { type: 'message' } }),
        this.prisma.visitorMessage.count({ where: { type: 'bottle' } }),
        this.prisma.visitorMessage.count({ where: { type: 'message', status: 'pending' } }),
        this.prisma.visitorMessage.count({ where: { type: 'bottle', status: 'pending' } }),
      ]);
    return { visitors, todayVisitors, visits, messages, bottles, pendingMessages, pendingBottles };
  }

  async adminMessages(query: { status?: string; type?: string; page?: number; pageSize?: number }) {
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
    const userIds = [...new Set(items.map((m) => m.userId).filter(Boolean) as string[])];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    const decorated = items.map((m) => ({
      ...m,
      account: m.userId ? userMap.get(m.userId) ?? null : null,
    }));
    return { items: decorated, total, page, pageSize };
  }

  async reviewMessage(id: string, action: 'approve' | 'reject', reason?: string) {
    const message = await this.prisma.visitorMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('消息不存在');
    const data: Record<string, unknown> =
      action === 'approve'
        ? { status: 'approved', rejectReason: null }
        : { status: 'rejected', rejectReason: reason || '管理员拒绝' };
    const updated = await this.prisma.visitorMessage.update({ where: { id }, data });
    if (action === 'approve' && message.type === 'message' && message.visitorIdHash) {
      await this.prisma.visitorProfile.update({
        where: { visitorIdHash: message.visitorIdHash },
        data: { messageCount: { increment: 1 } },
      });
      await this.syncAchievements(message.visitorIdHash);
    }
    return { ok: true, status: updated.status };
  }

  async setBan(id: string, banned: boolean) {
    const profile = await this.prisma.visitorProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('访客不存在');
    await this.prisma.visitorProfile.update({
      where: { id },
      data: { isBanned: banned },
    });
    return { ok: true, isBanned: banned };
  }

  async adminProfiles(query: { keyword?: string; banned?: string; page?: number; pageSize?: number }) {
    const where: Record<string, unknown> = {};
    if (query.keyword?.trim()) {
      where.nickname = { contains: query.keyword.trim() };
    }
    if (query.banned === 'true') where.isBanned = true;
    else if (query.banned === 'false') where.isBanned = false;
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
    const [messageCounts, bottleCounts, caughtCounts, achievementCounts] = await Promise.all([
      this.prisma.visitorMessage.groupBy({
        by: ['visitorIdHash'],
        where: { visitorIdHash: { in: hashes }, type: 'message', status: 'approved' },
        _count: { _all: true },
      }),
      this.prisma.visitorMessage.groupBy({
        by: ['visitorIdHash'],
        where: { visitorIdHash: { in: hashes }, type: 'bottle', status: { in: ['approved', 'caught'] } },
        _count: { _all: true },
      }),
      this.prisma.visitorMessage.groupBy({
        by: ['caughtByIdHash'],
        where: { caughtByIdHash: { in: hashes } },
        _count: { _all: true },
      }),
      this.prisma.visitorAchievement.groupBy({
        by: ['visitorIdHash'],
        where: { visitorIdHash: { in: hashes } },
        _count: { _all: true },
      }),
    ]);
    const countBy = (rows: Array<Record<string, unknown>>, key: string) =>
      new Map(rows.map((r) => [String(r[key]), (r._count as { _all: number })._all]));
    const messageMap = countBy(messageCounts as unknown as Array<Record<string, unknown>>, 'visitorIdHash');
    const bottleMap = countBy(bottleCounts as unknown as Array<Record<string, unknown>>, 'visitorIdHash');
    const caughtMap = countBy(caughtCounts as unknown as Array<Record<string, unknown>>, 'caughtByIdHash');
    const achMap = countBy(achievementCounts as unknown as Array<Record<string, unknown>>, 'visitorIdHash');
    return {
      items: items.map((p) => ({
        id: p.id,
        nickname: p.nickname,
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

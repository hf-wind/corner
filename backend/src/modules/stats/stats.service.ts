import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as os from 'os';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async overview() {
    const [postCount, commentCount, totalViews] = await Promise.all([
      this.prisma.post.count({ where: { status: 'published' } }),
      this.prisma.comment.count({ where: { status: 'approved' } }),
      this.prisma.post.aggregate({ _sum: { viewCount: true } }),
    ]);

    return {
      posts: postCount,
      comments: commentCount,
      views: totalViews._sum.viewCount ?? 0,
    };
  }

  async activities(limit = 5) {
    const take = Math.max(1, Math.min(20, limit));
    const pool: Array<{
      id: string;
      type: string;
      label: string;
      title: string;
      href: string;
      timestamp: Date | null;
    }> = [];

    const [
      posts,
      moments,
      albums,
      libraryItems,
      comments,
      visitorMessages,
      momentLikes,
      commentLikes,
    ] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: 'published', publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
        take: 6,
        select: { id: true, title: true, slug: true, publishedAt: true },
      }),
      this.prisma.moment.findMany({
        where: { status: 'published', publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
        take: 6,
        select: { id: true, title: true, slug: true, publishedAt: true },
      }),
      this.prisma.album.findMany({
        where: { status: 'published', publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
        take: 6,
        select: { id: true, title: true, slug: true, publishedAt: true },
      }),
      this.prisma.libraryItem.findMany({
        where: { publishStatus: 'published', publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
        take: 6,
        select: { id: true, title: true, slug: true, publishedAt: true },
      }),
      this.prisma.comment.findMany({
        where: { status: 'approved', post: { status: 'published' } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          content: true,
          authorName: true,
          user: { select: { username: true } },
          post: { select: { title: true, slug: true } },
          createdAt: true,
        },
      }),
      this.prisma.visitorMessage.findMany({
        where: { type: 'message', status: 'approved' },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, content: true, nickname: true, createdAt: true },
      }),
      this.prisma.momentLike.findMany({
        where: { moment: { status: 'published' } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          createdAt: true,
          user: { select: { username: true } },
          moment: { select: { title: true, slug: true } },
        },
      }),
      this.prisma.commentLike.findMany({
        where: {
          comment: { status: 'approved', post: { status: 'published' } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          createdAt: true,
          user: { select: { username: true } },
          comment: {
            select: { post: { select: { title: true, slug: true } } },
          },
        },
      }),
    ]);

    for (const p of posts) {
      pool.push({
        id: p.id,
        type: 'post',
        label: '新文章',
        title: p.title,
        href: `/article/${p.slug}`,
        timestamp: p.publishedAt,
      });
    }
    for (const m of moments) {
      pool.push({
        id: m.id,
        type: 'moment',
        label: '新瞬间',
        title: m.title,
        href: `/moments/${m.slug}`,
        timestamp: m.publishedAt,
      });
    }
    for (const a of albums) {
      pool.push({
        id: a.id,
        type: 'album',
        label: '新相册',
        title: a.title,
        href: `/albums/${a.slug}`,
        timestamp: a.publishedAt,
      });
    }
    for (const l of libraryItems) {
      pool.push({
        id: l.id,
        type: 'library',
        label: '新书影',
        title: l.title,
        href: `/library/${l.slug}`,
        timestamp: l.publishedAt,
      });
    }
    for (const c of comments) {
      const author = c.user?.username ?? c.authorName ?? '匿名';
      pool.push({
        id: c.id,
        type: 'comment',
        label: '新评论',
        title: `${author} 评论了《${c.post.title}》`,
        href: `/article/${c.post.slug}`,
        timestamp: c.createdAt,
      });
    }
    for (const v of visitorMessages) {
      pool.push({
        id: v.id,
        type: 'guestbook',
        label: '新留言',
        title: `${v.nickname}：${v.content}`,
        href: '/guestbook',
        timestamp: v.createdAt,
      });
    }
    for (const l of momentLikes) {
      pool.push({
        id: l.id,
        type: 'like',
        label: '新点赞',
        title: `${l.user.username} 赞了「${l.moment.title}」`,
        href: `/moments/${l.moment.slug}`,
        timestamp: l.createdAt,
      });
    }
    for (const l of commentLikes) {
      pool.push({
        id: l.id,
        type: 'like',
        label: '新点赞',
        title: `${l.user.username} 赞了《${l.comment.post.title}》`,
        href: `/article/${l.comment.post.slug}`,
        timestamp: l.createdAt,
      });
    }
    return pool
      .sort(
        (a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0),
      )
      .slice(0, take)
      .map((item) => ({
        ...item,
        timestamp: item.timestamp?.toISOString() ?? null,
      }));
  }

  async radar() {
    const posts = await this.prisma.post.findMany({
      where: { status: 'published' },
      select: {
        category: { select: { name: true } },
        tags: { include: { tag: { select: { name: true } } } },
        viewCount: true,
        likeCount: true,
      },
    });

    const categories = new Set(
      posts.flatMap((p) => (p.category ? [p.category.name] : [])),
    );
    const tagCount = new Set(
      posts.flatMap((p) => p.tags.map((t) => t.tag.name)),
    ).size;
    const totalViews = posts.reduce((s, p) => s + p.viewCount, 0);
    const totalLikes = posts.reduce((s, p) => s + p.likeCount, 0);

    return {
      categories: categories.size,
      tags: tagCount,
      views: totalViews,
      likes: totalLikes,
      posts: posts.length,
      comments: await this.prisma.comment.count({
        where: { status: 'approved' },
      }),
    };
  }

  async system() {
    const memory = process.memoryUsage();
    let database = 'online';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'unavailable';
    }
    return {
      application: 'Corner',
      framework: 'Vue 3 + Vite SPA / NestJS API',
      frontend: 'Vue 3 + Vite 8',
      backend: 'NestJS 11 + Prisma 7',
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      environment: process.env.NODE_ENV || 'development',
      uptime: formatUptime(process.uptime()),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: `${Math.round(memory.rss / 1024 / 1024)} MB`,
      heapUsage: `${Math.round(memory.heapUsed / 1024 / 1024)} / ${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
      hostMemory: `${formatBytes(os.totalmem() - os.freemem())} / ${formatBytes(os.totalmem())}`,
      cpuCores: os.cpus().length,
      loadAverage: os.loadavg().map((value) => Number(value.toFixed(2))),
      database,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      checkedAt: new Date().toISOString(),
    };
  }

  async adminDashboard() {
    const since = new Date(Date.now() - 30 * 86400000);
    const trendSince = new Date(Date.now() - 14 * 86400000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [
      posts,
      moments,
      albums,
      library,
      categories,
      tags,
      users,
      visitors,
      visitsToday,
      messages,
      bottles,
      pendingComments,
      pendingMomentComments,
      pendingMessages,
      pendingBottles,
      pendingFriendApplications,
      media,
      aiTotals,
      aiRecent,
      recent,
      system,
      trendVisits,
      trendPosts,
      trendMoments,
      trendAlbums,
      trendLibrary,
      trendAi,
    ] = await Promise.all([
      this.prisma.post.groupBy({ by: ['status'], _count: { _all: true }, _sum: { viewCount: true, likeCount: true } }),
      this.prisma.moment.groupBy({ by: ['status'], _count: { _all: true }, _sum: { likeCount: true } }),
      this.prisma.album.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.libraryItem.groupBy({ by: ['publishStatus'], _count: { _all: true } }),
      this.prisma.category.count(),
      this.prisma.tag.count(),
      this.prisma.user.count(),
      this.prisma.visitorProfile.count(),
      this.prisma.visitorVisit.count({ where: { createdAt: { gte: today } } }),
      this.prisma.visitorMessage.count({ where: { type: 'message' } }),
      this.prisma.visitorMessage.count({ where: { type: 'bottle' } }),
      this.prisma.comment.count({ where: { status: 'pending' } }),
      this.prisma.momentComment.count({ where: { status: 'pending' } }),
      this.prisma.visitorMessage.count({ where: { type: 'message', status: 'pending' } }),
      this.prisma.visitorMessage.count({ where: { type: 'bottle', status: 'pending' } }),
      this.prisma.friendApplication.count({ where: { status: 'pending' } }),
      this.prisma.media.count(),
      this.prisma.aiInteraction.aggregate({ where: { action: 'chat' }, _count: { _all: true }, _sum: { inputTokens: true, outputTokens: true } }),
      this.prisma.aiInteraction.count({ where: { action: 'chat', createdAt: { gte: since } } }),
      this.activities(8),
      this.system(),
      this.prisma.visitorVisit.findMany({ where: { createdAt: { gte: trendSince } }, select: { createdAt: true } }),
      this.prisma.post.findMany({ where: { publishedAt: { gte: trendSince } }, select: { publishedAt: true } }),
      this.prisma.moment.findMany({ where: { publishedAt: { gte: trendSince } }, select: { publishedAt: true } }),
      this.prisma.album.findMany({ where: { publishedAt: { gte: trendSince } }, select: { publishedAt: true } }),
      this.prisma.libraryItem.findMany({ where: { publishedAt: { gte: trendSince } }, select: { publishedAt: true } }),
      this.prisma.aiInteraction.findMany({ where: { action: 'chat', createdAt: { gte: trendSince } }, select: { createdAt: true, inputTokens: true, outputTokens: true } }),
    ]);
    const summarize = (rows: Array<Record<string, any>>, key: string) => Object.fromEntries(rows.map((row) => [String(row[key]), row._count._all]));
    const postStatus = summarize(posts, 'status');
    const momentStatus = summarize(moments, 'status');
    const albumStatus = summarize(albums, 'status');
    const libraryStatus = summarize(library, 'publishStatus');
    const dateKey = (value: Date) => new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(value);
    const dates = Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));
      return dateKey(date);
    });
    const countByDate = (items: Array<{ createdAt?: Date; publishedAt?: Date | null }>, field: 'createdAt' | 'publishedAt') => {
      const counts = new Map<string, number>();
      for (const item of items) {
        const value = item[field];
        if (!value) continue;
        const key = dateKey(value);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      return dates.map((key) => counts.get(key) || 0);
    };
    const aiDaily = new Map<string, { calls: number; inputTokens: number; outputTokens: number }>();
    for (const item of trendAi) {
      const key = dateKey(item.createdAt);
      const current = aiDaily.get(key) || { calls: 0, inputTokens: 0, outputTokens: 0 };
      current.calls += 1;
      current.inputTokens += item.inputTokens || 0;
      current.outputTokens += item.outputTokens || 0;
      aiDaily.set(key, current);
    }
    return {
      content: {
        posts: postStatus,
        moments: momentStatus,
        albums: albumStatus,
        library: libraryStatus,
        categories,
        tags,
        media,
        views: posts.reduce((sum, row) => sum + (row._sum.viewCount || 0), 0),
        likes: posts.reduce((sum, row) => sum + (row._sum.likeCount || 0), 0) + moments.reduce((sum, row) => sum + (row._sum.likeCount || 0), 0),
      },
      community: { users, visitors, visitsToday, messages, bottles },
      pending: { articleComments: pendingComments, momentComments: pendingMomentComments, friendApplications: pendingFriendApplications, messages: pendingMessages, bottles: pendingBottles, total: pendingComments + pendingMomentComments + pendingFriendApplications + pendingMessages + pendingBottles },
      ai: { calls: aiTotals._count._all, recentCalls: aiRecent, inputTokens: aiTotals._sum.inputTokens || 0, outputTokens: aiTotals._sum.outputTokens || 0 },
      recent,
      system,
      trends: {
        dates,
        visits: countByDate(trendVisits, 'createdAt'),
        content: {
          posts: countByDate(trendPosts, 'publishedAt'),
          moments: countByDate(trendMoments, 'publishedAt'),
          albums: countByDate(trendAlbums, 'publishedAt'),
          library: countByDate(trendLibrary, 'publishedAt'),
        },
        ai: {
          calls: dates.map((key) => aiDaily.get(key)?.calls || 0),
          inputTokens: dates.map((key) => aiDaily.get(key)?.inputTokens || 0),
          outputTokens: dates.map((key) => aiDaily.get(key)?.outputTokens || 0),
        },
      },
    };
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}天 ${h}小时 ${m}分钟`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 3) return `${Math.round(bytes / 1024 / 1024)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

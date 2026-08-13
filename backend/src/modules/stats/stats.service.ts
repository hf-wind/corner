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
      visits,
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
      this.prisma.visitorVisit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          pageType: true,
          targetTitle: true,
          targetHref: true,
          visitorIdHash: true,
          createdAt: true,
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
    if (visits.length > 0) {
      const hashes = [...new Set(visits.map((v) => v.visitorIdHash))];
      const profiles = await this.prisma.visitorProfile.findMany({
        where: { visitorIdHash: { in: hashes } },
        select: { visitorIdHash: true, nickname: true },
      });
      const nicknameByHash = new Map(
        profiles.map((p) => [p.visitorIdHash, p.nickname]),
      );
      for (const v of visits) {
        const nickname = nicknameByHash.get(v.visitorIdHash) ?? '无名旅人';
        pool.push({
          id: v.id,
          type: 'footprint',
          label: '新足迹',
          title: `${nickname} 到访${v.targetTitle ? `「${v.targetTitle}」` : ''}`,
          href: v.targetHref ?? '/home',
          timestamp: v.createdAt,
        });
      }
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
    return {
      nodeVersion: process.version,
      nestVersion: '',
      platform: process.platform,
      uptime: formatUptime(process.uptime()),
      memoryUsage: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      cpuCores: os.cpus().length,
    };
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}天 ${h}小时 ${m}分钟`;
}

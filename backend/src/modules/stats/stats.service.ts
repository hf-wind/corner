import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as os from 'os';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async overview() {
    const [postCount, commentCount, userCount, totalViews, visitors] = await Promise.all([
      this.prisma.post.count({ where: { status: 'published' } }),
      this.prisma.comment.count({ where: { status: 'approved' } }),
      this.prisma.user.count(),
      this.prisma.post.aggregate({ _sum: { viewCount: true } }),
      this.prisma.visitStat.groupBy({
        by: ['ipHash'],
        where: { ipHash: { not: null } },
      }),
    ]);

    return {
      posts: postCount,
      comments: commentCount,
      users: userCount,
      views: totalViews._sum.viewCount ?? 0,
      visitors: visitors.length,
    };
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

    const categories = new Set(posts.flatMap((p) => (p.category ? [p.category.name] : [])));
    const tagCount = new Set(posts.flatMap((p) => p.tags.map((t) => t.tag.name))).size;
    const totalViews = posts.reduce((s, p) => s + p.viewCount, 0);
    const totalLikes = posts.reduce((s, p) => s + p.likeCount, 0);

    return {
      categories: categories.size,
      tags: tagCount,
      views: totalViews,
      likes: totalLikes,
      posts: posts.length,
      comments: await this.prisma.comment.count({ where: { status: 'approved' } }),
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

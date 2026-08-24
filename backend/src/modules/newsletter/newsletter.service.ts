import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

type WeeklySection = {
  key: 'post' | 'moment' | 'album' | 'library';
  label: string;
  pathPrefix: string;
  items: { title: string; excerpt: string; link: string; date?: Date | null }[];
};

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripHtml(html: string): string {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(text: string, max = 120): string {
  const clean = stripHtml(text);
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private emailService: EmailService,
    private notification: NotificationService,
  ) {}

  async getConfig() {
    const values = await this.settings.getMany([
      'newsletter_enabled',
      'newsletter_day',
      'newsletter_time',
      'newsletter_last_sent_at',
    ]);
    return {
      enabled: values.newsletter_enabled ?? false,
      day: values.newsletter_day ?? 1,
      time: values.newsletter_time ?? '06:00',
      dayLabel: DAY_LABELS[(values.newsletter_day ?? 1) - 1],
      lastSentAt: values.newsletter_last_sent_at || null,
    };
  }

  async updateConfig(dto: {
    enabled?: boolean;
    day?: number;
    time?: string;
  }) {
    if (dto.enabled !== undefined) {
      await this.settings.set('newsletter_enabled', dto.enabled);
    }
    if (dto.day !== undefined) {
      await this.settings.set('newsletter_day', dto.day);
    }
    if (dto.time !== undefined) {
      await this.settings.set('newsletter_time', dto.time);
    }
    this.logger.log(
      `周报配置已更新: ${JSON.stringify({ ...dto })}`,
    );
    return this.getConfig();
  }

  async subscribe(email: string, source = 'article') {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: normalized },
    });

    if (existing?.status === 'active') {
      return { alreadySubscribed: true };
    }

    // 60 秒内刚发过确认邮件则拦截，防止刷接口
    if (
      existing?.status === 'pending' &&
      Date.now() - existing.updatedAt.getTime() < 60_000
    ) {
      throw new HttpException(
        '确认邮件已发送，请 60 秒后再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const token = randomBytes(24).toString('hex');
    const subscriber = existing
      ? await this.prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { status: 'pending', token, source },
        })
      : await this.prisma.newsletterSubscriber.create({
          data: { email: normalized, token, source },
        });

    await this.emailService.sendNewsletterConfirm(subscriber.email, token);
    return { alreadySubscribed: false };
  }

  async confirm(token: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { token },
    });
    if (!subscriber) {
      throw new BadRequestException('确认链接无效或已过期');
    }
    if (subscriber.status === 'active') {
      return { alreadyConfirmed: true };
    }
    if (subscriber.status === 'unsubscribed') {
      throw new BadRequestException('该邮箱已退订，请重新订阅');
    }

    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'active', confirmedAt: new Date() },
    });
    await this.notifyAdmins(subscriber.email, subscriber.source);
    return { alreadyConfirmed: false };
  }

  async unsubscribe(token: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { token },
    });
    if (!subscriber) {
      throw new BadRequestException('退订链接无效');
    }
    if (subscriber.status !== 'unsubscribed') {
      await this.prisma.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: { status: 'unsubscribed' },
      });
    }
    return { unsubscribed: true };
  }

  async adminList(query: {
    page?: number;
    limit?: number;
    status?: string;
    q?: string;
  }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = Math.min(query.limit && query.limit > 0 ? query.limit : 20, 100);
    const where: any = {};
    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.q?.trim()) where.email = { contains: query.q.trim() };

    const [items, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async adminCreate(email: string) {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: normalized },
    });
    if (existing) {
      throw new HttpException('该邮箱已在订阅列表中', HttpStatus.CONFLICT);
    }
    return this.prisma.newsletterSubscriber.create({
      data: {
        email: normalized,
        token: randomBytes(24).toString('hex'),
        status: 'active',
        source: 'admin',
        confirmedAt: new Date(),
      },
    });
  }

  async adminUpdateStatus(id: string, status: string) {
    const data: any = { status };
    if (status === 'active') data.confirmedAt = new Date();
    try {
      return await this.prisma.newsletterSubscriber.update({ where: { id }, data });
    } catch {
      throw new BadRequestException('订阅记录不存在');
    }
  }

  async adminDelete(id: string) {
    try {
      await this.prisma.newsletterSubscriber.delete({ where: { id } });
      return { deleted: true };
    } catch {
      throw new BadRequestException('订阅记录不存在');
    }
  }

  async collectWeeklyItems(since: Date, until: Date) {
    const publishedAt = { gte: since, lt: until };
    const [posts, moments, albums, library] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: 'published', publishedAt },
        orderBy: { publishedAt: 'desc' },
        select: { title: true, slug: true, excerpt: true, content: true, publishedAt: true },
      }),
      this.prisma.moment.findMany({
        where: { status: 'published', publishedAt },
        orderBy: { publishedAt: 'desc' },
        select: { title: true, slug: true, content: true, publishedAt: true },
      }),
      this.prisma.album.findMany({
        where: { status: 'published', publishedAt },
        orderBy: { publishedAt: 'desc' },
        select: { title: true, slug: true, description: true, publishedAt: true },
      }),
      this.prisma.libraryItem.findMany({
        where: { publishStatus: 'published', publishedAt },
        orderBy: { publishedAt: 'desc' },
        select: { title: true, slug: true, summary: true, reflection: true, creator: true, type: true, publishedAt: true },
      }),
    ]);

    return [
      {
        key: 'post' as const,
        label: '文章',
        items: posts.map((p) => ({
          title: p.title,
          desc: clip(p.excerpt || p.content),
          link: `/article/${p.slug}`,
        })),
      },
      {
        key: 'moment' as const,
        label: '瞬间',
        items: moments.map((m) => ({
          title: m.title,
          desc: clip(m.content, 90),
          link: `/moment/${m.slug}`,
        })),
      },
      {
        key: 'album' as const,
        label: '相册',
        items: albums.map((a) => ({
          title: a.title,
          desc: clip(a.description || '', 90),
          link: `/album/${a.slug}`,
        })),
      },
      {
        key: 'library' as const,
        label: '书影',
        items: library.map((l) => ({
          title: l.creator ? `${l.title} · ${l.creator}` : l.title,
          desc: clip(l.reflection || l.summary || '', 90),
          link: `/library/${l.slug}`,
        })),
      },
    ].filter((section) => section.items.length > 0);
  }

  buildWeeklyEmail(sections: ReturnType<NewsletterService['collectWeeklyItems']> extends Promise<infer T> ? T : never, since: Date, until: Date, siteUrl: string) {
    const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
    const periodLabel = `${fmt(since)} – ${fmt(until)}`;
    const totalCount = sections.reduce((sum, s) => sum + s.items.length, 0);

    // 与 newsletter_weekly 邮件模板同一套安全色板（--hue-theme:220deg）
    const primary = '#1a66ff';
    const text1 = '#171a21';
    const text2 = '#40485a';
    const text3 = '#8a92a6';

    const itemsHtml = sections
      .map((section) => {
        const head = `<p style="margin:26px 0 12px;font-size:12px;font-weight:700;letter-spacing:1.6px;color:${primary}">${escapeHtml(section.label)} · ${section.items.length}</p>`;
        const rows = section.items
          .map(
            (item) =>
              `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;background:#ffffff;border:1px solid #e4e8f0;border-radius:10px"><tr><td style="padding:14px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif"><a href="${siteUrl}${item.link}" target="_blank" style="color:${text1};font-size:15px;font-weight:600;text-decoration:none">${escapeHtml(item.title)}</a>${item.desc ? `<br><span style="color:${text2};font-size:13px;line-height:1.7">${escapeHtml(item.desc)}</span>` : ''}</td></tr></table>`,
          )
          .join('');
        return head + rows;
      })
      .join('');

    return { periodLabel, totalCount: String(totalCount), itemsHtml };
  }

  async runDueCheck(): Promise<{ sent: number; reason?: string }> {
    const config = await this.getConfig();
    if (!config.enabled) return { sent: 0, reason: 'disabled' };

    const now = new Date();
    // 配置 day: 1=周一 … 7=周日；JS getDay(): 0=周日 … 6=周六
    const jsDay = now.getDay();
    const configuredJsDay = config.day % 7;
    if (jsDay !== configuredJsDay) return { sent: 0, reason: 'not-scheduled-day' };

    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (hhmm !== config.time) return { sent: 0, reason: 'not-scheduled-time' };

    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const lastRun = await this.settings.get('newsletter_last_run_date');
    if (lastRun === todayStr) return { sent: 0, reason: 'already-run' };
    // 先占位再执行，避免同一分钟内并发重发
    await this.settings.set('newsletter_last_run_date', todayStr);

    const lastSentRaw = await this.settings.get('newsletter_last_sent_at');
    const since = lastSentRaw
      ? new Date(String(lastSentRaw))
      : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const siteUrl = String(
      (await this.settings.get('site_url')) || 'https://corner.ink',
    );
    const sections = await this.collectWeeklyItems(since, now);
    if (sections.length === 0) {
      this.logger.log('本周无新发布内容，跳过周报发送');
      return { sent: 0, reason: 'no-new-content' };
    }

    const subscribers = await this.prisma.newsletterSubscriber.findMany({
      where: { status: 'active' },
      select: { id: true, email: true, token: true },
    });
    if (subscribers.length === 0) {
      return { sent: 0, reason: 'no-subscribers' };
    }

    const email = this.buildWeeklyEmail(sections, since, now, siteUrl);
    let sent = 0;
    for (const subscriber of subscribers) {
      try {
        await this.emailService.sendNewsletterWeekly(subscriber.email, {
          periodLabel: email.periodLabel,
          totalCount: email.totalCount,
          itemsHtml: email.itemsHtml,
          unsubscribeToken: subscriber.token,
        });
        sent += 1;
      } catch (error: any) {
        this.logger.error(
          `周报发送入队失败 ${subscriber.email}: ${error?.message}`,
        );
      }
    }

    await this.settings.set('newsletter_last_sent_at', now.toISOString());
    this.logger.log(`周报已入队 ${sent}/${subscribers.length} 封`);
    return { sent };
  }

  private async notifyAdmins(email: string, source: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin', isActive: true },
      select: { id: true },
    });
    const sourceText = source === 'admin' ? '后台添加' : '文章页订阅';
    for (const admin of admins) {
      await this.notification
        .create(admin.id, {
          type: 'newsletter',
          title: '收到新的周报订阅',
          content: `${email}（${sourceText}）已完成确认`,
          link: '/admin/newsletter',
        })
        .catch((error) =>
          this.logger.error(`站内通知发送失败: ${error?.message}`),
        );
    }
  }
}

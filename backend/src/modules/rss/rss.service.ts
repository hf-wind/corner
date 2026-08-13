import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class RssService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async render() {
    const [posts, moments, titleSetting, descriptionSetting, urlSetting] =
      await Promise.all([
        this.prisma.post.findMany({
          where: { status: 'published' },
          select: {
            title: true,
            slug: true,
            excerpt: true,
            content: true,
            publishedSnapshot: true,
            publishedAt: true,
            updatedAt: true,
          },
          orderBy: { publishedAt: 'desc' },
          take: 30,
        }),
        this.prisma.moment.findMany({
          where: { status: 'published' },
          select: {
            title: true,
            slug: true,
            excerpt: true,
            content: true,
            publishedSnapshot: true,
            publishedAt: true,
            updatedAt: true,
          },
          orderBy: { publishedAt: 'desc' },
          take: 30,
        }),
        this.settings.get('site_title'),
        this.settings.get('site_description'),
        this.settings.get('site_url'),
      ]);
    const siteUrl = String(urlSetting || 'https://corner.ink').replace(
      /\/$/,
      '',
    );
    const title = String(titleSetting || '风隅随笔');
    const description = String(descriptionSetting || '听风于隅，漫写人间');
    const items = [
      ...posts.map((post) => {
        const snapshot = this.postSnapshot(post.publishedSnapshot);
        const slug = snapshot?.slug || post.slug;
        return {
          ...post,
          title: snapshot?.title || post.title,
          excerpt: snapshot?.excerpt ?? post.excerpt,
          content: snapshot?.content || post.content,
          url: `${siteUrl}/article/${slug}`,
          id: `post:${slug}`,
        };
      }),
      ...moments.map((moment) => {
        const snapshot = this.postSnapshot(moment.publishedSnapshot);
        const slug = snapshot?.slug || moment.slug;
        return {
          ...moment,
          title: snapshot?.title || moment.title,
          excerpt: snapshot?.excerpt ?? moment.excerpt,
          content: snapshot?.content || moment.content,
          url: `${siteUrl}/moments?focus=${encodeURIComponent(slug)}`,
          id: `moment:${slug}`,
        };
      }),
    ]
      .sort(
        (left, right) =>
          this.timestamp(right.publishedAt || right.updatedAt) -
          this.timestamp(left.publishedAt || left.updatedAt),
      )
      .slice(0, 40);

    const itemXml = items
      .map((item) => {
        const date = item.publishedAt || item.updatedAt;
        const summary = String(
          item.excerpt || this.plainText(item.content),
        ).slice(0, 500);
        return `<item><title>${this.escape(item.title)}</title><link>${this.escape(item.url)}</link><guid isPermaLink="false">${this.escape(item.id)}</guid><pubDate>${new Date(date).toUTCString()}</pubDate><description>${this.cdata(summary)}</description></item>`;
      })
      .join('');
    const lastBuildDate =
      items[0]?.publishedAt || items[0]?.updatedAt || new Date();
    return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${this.escape(title)}</title><link>${this.escape(siteUrl)}</link><description>${this.escape(description)}</description><language>zh-CN</language><lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate><atom:link href="${this.escape(siteUrl)}/rss.xml" rel="self" type="application/rss+xml"/>${itemXml}</channel></rss>`;
  }

  private timestamp(value: Date | null) {
    return value ? new Date(value).getTime() : 0;
  }
  private postSnapshot(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return null;
    const snapshot = value;
    if (typeof snapshot.title !== 'string' || typeof snapshot.slug !== 'string')
      return null;
    return {
      title: snapshot.title,
      slug: snapshot.slug,
      excerpt: typeof snapshot.excerpt === 'string' ? snapshot.excerpt : null,
      content: typeof snapshot.content === 'string' ? snapshot.content : '',
    };
  }
  private plainText(value: string) {
    return String(value || '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[#>*_`~\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  private escape(value: unknown) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&apos;',
        })[character] || character,
    );
  }
  private cdata(value: string) {
    return `<![CDATA[${value.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
  }
}

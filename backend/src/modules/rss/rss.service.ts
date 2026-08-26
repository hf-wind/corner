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
    const [
      posts,
      moments,
      titleSetting,
      descriptionSetting,
      urlSetting,
      logoSetting,
      mySiteSetting,
    ] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: 'published' },
        select: {
          title: true,
          slug: true,
          excerpt: true,
          content: true,
          coverImage: true,
          author: { select: { username: true } },
          category: { select: { name: true } },
          tags: { select: { tag: { select: { name: true } } } },
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
          author: { select: { username: true } },
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
      this.settings.get('site_logo'),
      this.settings.get('my_site_info'),
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
          coverImage: snapshot?.coverImage ?? post.coverImage,
          authorName: post.author?.username || '',
          categories: [
            post.category?.name,
            ...post.tags.map((entry) => entry.tag.name),
          ].filter((value): value is string => Boolean(value)),
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
          coverImage: null,
          authorName: moment.author?.username || '',
          categories: [] as string[],
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

    let profile: Record<string, unknown> = {};
    if (
      mySiteSetting &&
      typeof mySiteSetting === 'object' &&
      !Array.isArray(mySiteSetting)
    ) {
      profile = mySiteSetting as Record<string, unknown>;
    } else if (typeof mySiteSetting === 'string') {
      try {
        const parsed = JSON.parse(mySiteSetting);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          profile = parsed as Record<string, unknown>;
        }
      } catch {
        profile = {};
      }
    }
    const imageUrl = this.absoluteUrl(
      String(logoSetting || profile.avatar || '/logo.png').trim(),
      siteUrl,
    );
    const itemXml = items
      .map((item) => {
        const date = item.publishedAt || item.updatedAt;
        const summary = this.plainText(
          String(item.excerpt || item.content || ''),
        ).slice(0, 500);
        const image = this.firstImage(item.content, item.url, item.coverImage);
        const imageType = this.imageType(image);
        const contentHtml = `<p>${this.escape(summary)}</p>`;
        return [
          '    <item>',
          `      <title>${this.cdata(String(item.title))}</title>`,
          `      <link>${this.escape(item.url)}</link>`,
          `      <guid isPermaLink="false">${this.escape(item.id)}</guid>`,
          `      <pubDate>${new Date(date).toUTCString()}</pubDate>`,
          item.authorName
            ? `      <dc:creator>${this.cdata(item.authorName)}</dc:creator>`
            : '',
          `      <description>${this.cdata(summary)}</description>`,
          `      <content:encoded>${this.cdata(contentHtml)}</content:encoded>`,
          ...item.categories.map(
            (category) => `      <category>${this.cdata(category)}</category>`,
          ),
          image
            ? `      <media:content url="${this.escape(image)}" type="${imageType}" medium="image"/>`
            : '',
          '    </item>',
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n');
    const lastBuildDate =
      items[0]?.publishedAt || items[0]?.updatedAt || new Date();
    const imageXml = imageUrl
      ? [
          '    <image>',
          `      <url>${this.escape(imageUrl)}</url>`,
          `      <title>${this.cdata(title)}</title>`,
          `      <link>${this.escape(siteUrl)}</link>`,
          '    </image>',
        ].join('\n')
      : '';
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">',
      '  <channel>',
      `    <title>${this.cdata(title)}</title>`,
      `    <link>${this.escape(siteUrl)}</link>`,
      `    <atom:link href="${this.escape(siteUrl)}/rss.xml" rel="self" type="application/rss+xml"/>`,
      `    <description>${this.cdata(description)}</description>`,
      '    <generator>Corner RSS</generator>',
      '    <language>zh-CN</language>',
      '    <docs>https://www.rssboard.org/rss-specification</docs>',
      '    <ttl>5</ttl>',
      imageXml,
      `    <lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>`,
      `    <pubDate>${new Date(lastBuildDate).toUTCString()}</pubDate>`,
      itemXml,
      '  </channel>',
      '</rss>',
    ]
      .filter(Boolean)
      .join('\n');
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
      coverImage:
        typeof snapshot.coverImage === 'string' ? snapshot.coverImage : null,
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
  private firstImage(value: string, base: string, fallback?: string | null) {
    const source =
      String(fallback || '').trim() ||
      String(value || '').match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ||
      String(value || '').match(
        /!\[[^\]]*\]\(([^\s)]+)(?:\s+["'][^"']*["'])?\)/,
      )?.[1] ||
      '';
    return source ? this.absoluteUrl(source, base) : '';
  }
  private absoluteUrl(value: string, base: string) {
    try {
      return new URL(value, base).toString();
    } catch {
      return value;
    }
  }
  private imageType(value: string) {
    if (/\.png(?:$|\?)/i.test(value)) return 'image/png';
    if (/\.gif(?:$|\?)/i.test(value)) return 'image/gif';
    if (/\.webp(?:$|\?)/i.test(value)) return 'image/webp';
    return 'image/jpeg';
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

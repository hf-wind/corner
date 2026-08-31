import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import Parser from 'rss-parser';
import { AiService } from '../ai/ai.service';
import { SettingsService } from '../settings/settings.service';
import {
  UpdateChangelogConfigDto,
  UpsertChangelogEntryDto,
} from './dto/changelog.dto';

const CONFIG_KEY = 'changelog_config';
const MANUAL_KEY = 'changelog_manual_entries';
const SNAPSHOT_KEY = 'changelog_snapshot';
const SNAPSHOT_VERSION = 2;
const execFileAsync = promisify(execFile);

type ChangelogConfig = {
  enabled: boolean;
  title: string;
  subtitle: string;
  repositoryOwner: string;
  repositoryName: string;
  branch: string;
  cacheTtl: number;
  maxGroups: number;
};

type ReleaseItem = {
  sha: string;
  text: string;
  original: string;
  author: string;
  url: string;
};

type ChangelogRelease = {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
  source: 'git' | 'manual';
  sourceLabel: string;
  url: string;
  items: ReleaseItem[];
  translation: 'ai' | 'rules' | 'manual';
  published?: boolean;
};

type GitGroup = {
  id: string;
  publishedAt: string;
  url: string;
  items: Array<Omit<ReleaseItem, 'text'>>;
};

type Snapshot = {
  signature: string;
  fetchedAt: string;
  sourceStatus: 'connected' | 'fallback' | 'stale' | 'unavailable';
  sourceLabel: string;
  releases: ChangelogRelease[];
};

type ListQuery = { page?: number; limit?: number };

@Injectable()
export class ChangelogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChangelogService.name);
  private readonly parser = new Parser();
  private refreshPromise: Promise<Snapshot> | null = null;
  private refreshTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly settings: SettingsService,
    private readonly ai: AiService,
  ) {}

  onModuleInit() {
    this.scheduleAutomaticRefresh(5_000);
  }

  onModuleDestroy() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }

  async status() {
    const config = await this.getConfig();
    return { enabled: config.enabled };
  }

  async list(query: ListQuery = {}) {
    const config = await this.getConfig();
    const [snapshot, manual] = await Promise.all([
      this.getAutomatic(config),
      this.getManualEntries(),
    ]);
    const releases = [
      ...snapshot.releases,
      ...manual.filter((item) => item.published),
    ]
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .slice(0, 100);
    const limit = Math.min(12, Math.max(4, Number(query.limit) || 6));
    const totalPages = Math.max(1, Math.ceil(releases.length / limit));
    const page = Math.min(totalPages, Math.max(1, Number(query.page) || 1));
    const start = (page - 1) * limit;
    const itemCount = releases.reduce(
      (total, release) => total + release.items.length,
      0,
    );

    return {
      enabled: config.enabled,
      title: config.title,
      subtitle: config.subtitle,
      repository: {
        owner: config.repositoryOwner,
        name: config.repositoryName,
        branch: config.branch,
        url: this.repositoryUrl(config),
      },
      releases: releases.slice(start, start + limit),
      page,
      totalPages,
      total: releases.length,
      itemCount,
      fetchedAt: snapshot.fetchedAt,
      sourceStatus: snapshot.sourceStatus,
      sourceLabel: snapshot.sourceLabel,
    };
  }

  async admin() {
    const config = await this.getConfig();
    const [snapshot, manualEntries] = await Promise.all([
      this.getAutomatic(config),
      this.getManualEntries(),
    ]);
    return {
      config,
      manualEntries,
      automaticReleases: snapshot.releases,
      fetchedAt: snapshot.fetchedAt,
      sourceStatus: snapshot.sourceStatus,
      sourceLabel: snapshot.sourceLabel,
      tokenConfigured: Boolean(
        process.env.CHANGELOG_GITHUB_TOKEN || process.env.GITHUB_TOKEN,
      ),
    };
  }

  async updateConfig(dto: UpdateChangelogConfigDto) {
    const current = await this.getConfig();
    const next: ChangelogConfig = {
      enabled: dto.enabled ?? current.enabled,
      title: this.text(dto.title, current.title, 80),
      subtitle: this.text(dto.subtitle, current.subtitle, 240),
      repositoryOwner: this.identifier(
        dto.repositoryOwner,
        current.repositoryOwner,
      ),
      repositoryName: this.identifier(
        dto.repositoryName,
        current.repositoryName,
      ),
      branch: this.branch(dto.branch, current.branch),
      cacheTtl: Math.min(
        86400,
        Math.max(300, Number(dto.cacheTtl) || current.cacheTtl),
      ),
      maxGroups: Math.min(
        30,
        Math.max(4, Number(dto.maxGroups) || current.maxGroups),
      ),
    };
    await this.settings.set(CONFIG_KEY, next);
    this.scheduleAutomaticRefresh(1_000);
    return next;
  }

  async createEntry(dto: UpsertChangelogEntryDto) {
    const entries = await this.getManualEntries();
    const entry = this.manualEntry(dto, `manual:${randomUUID()}`);
    entries.unshift(entry);
    await this.settings.set(MANUAL_KEY, entries);
    return entry;
  }

  async updateEntry(id: string, dto: UpsertChangelogEntryDto) {
    const entries = await this.getManualEntries();
    const index = entries.findIndex((item) => item.id === id);
    if (index < 0) throw new NotFoundException('更新记录不存在');
    entries[index] = this.manualEntry(dto, id);
    await this.settings.set(MANUAL_KEY, entries);
    return entries[index];
  }

  async removeEntry(id: string) {
    const entries = await this.getManualEntries();
    const next = entries.filter((item) => item.id !== id);
    if (next.length === entries.length)
      throw new NotFoundException('更新记录不存在');
    await this.settings.set(MANUAL_KEY, next);
    return { success: true };
  }

  async refresh() {
    const config = await this.getConfig();
    const snapshot = await this.getAutomatic(config, true);
    return {
      success: true,
      releases: snapshot.releases.length,
      items: snapshot.releases.reduce(
        (total, release) => total + release.items.length,
        0,
      ),
      fetchedAt: snapshot.fetchedAt,
      sourceStatus: snapshot.sourceStatus,
      sourceLabel: snapshot.sourceLabel,
    };
  }

  private async getConfig(): Promise<ChangelogConfig> {
    const value = this.record(await this.settings.get(CONFIG_KEY));
    const repository = String(process.env.GITHUB_REPOSITORY || '').split('/');
    const storedTitle = this.text(value.title, '', 80);
    const storedSubtitle = this.text(value.subtitle, '', 240);
    return {
      enabled: value.enabled !== false,
      title:
        !storedTitle ||
        ['最近更新', '更新日志', '风隅更新手记'].includes(storedTitle)
          ? '风迹'
          : storedTitle,
      subtitle:
        !storedSubtitle ||
        [
          '记录每一次推送，也留下那些不适合写进提交信息的细节。',
          '记录每一次功能完善、内容调整与体验修补，也说明风隅随笔如何一步步变得更好。',
        ].includes(storedSubtitle)
          ? '风过无声，循迹可寻。每一次改变，都在时间里留下属于自己的印记，那些细微的更迭与变化，也终将成为一路走来不可忽略的痕迹。'
          : storedSubtitle,
      repositoryOwner: this.identifier(
        value.repositoryOwner,
        repository[0] || 'hf-wind',
      ),
      repositoryName: this.identifier(
        value.repositoryName,
        repository[1] || 'corner',
      ),
      branch: this.branch(value.branch, process.env.CHANGELOG_BRANCH || 'main'),
      cacheTtl: Math.min(86400, Math.max(300, Number(value.cacheTtl) || 1800)),
      maxGroups: Math.min(30, Math.max(4, Number(value.maxGroups) || 12)),
    };
  }

  private async getManualEntries(): Promise<ChangelogRelease[]> {
    const value = await this.settings.get(MANUAL_KEY);
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => this.normalizeManualEntry(item))
      .filter((item): item is ChangelogRelease => Boolean(item))
      .slice(0, 80);
  }

  private async getAutomatic(config: ChangelogConfig, force = false) {
    const signature = this.signature(config);
    const stored = this.snapshot(await this.settings.get(SNAPSHOT_KEY));
    const fresh =
      stored &&
      stored.signature === signature &&
      Date.now() - Date.parse(stored.fetchedAt) < config.cacheTtl * 1000;
    if (!force && fresh) return stored;
    if (!force && stored?.signature === signature && stored.releases.length) {
      void this.runRefresh(config, stored).catch((error) =>
        this.logger.warn(`后台刷新更新日志失败: ${this.errorMessage(error)}`),
      );
      return stored;
    }
    return this.runRefresh(config, stored);
  }

  private scheduleAutomaticRefresh(delayMs: number) {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(
      async () => {
        let nextDelay = 30 * 60 * 1000;
        try {
          const config = await this.getConfig();
          nextDelay = config.cacheTtl * 1000;
          if (config.enabled) await this.getAutomatic(config, true);
        } catch (error) {
          this.logger.warn(`自动刷新风迹失败: ${this.errorMessage(error)}`);
        } finally {
          this.scheduleAutomaticRefresh(nextDelay);
        }
      },
      Math.max(1_000, delayMs),
    );
    this.refreshTimer.unref?.();
  }

  private runRefresh(config: ChangelogConfig, previous: Snapshot | null) {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.refreshAutomatic(config, previous).finally(
      () => {
        this.refreshPromise = null;
      },
    );
    return this.refreshPromise;
  }

  private async refreshAutomatic(
    config: ChangelogConfig,
    previous: Snapshot | null,
  ): Promise<Snapshot> {
    const source = await this.fetchGitGroups(config);
    if (!source.groups.length && previous?.releases.length) {
      return {
        ...previous,
        sourceStatus: 'stale',
        sourceLabel: '保留上次同步结果',
      };
    }

    let releases = source.groups.map((group) => this.fallbackRelease(group));
    releases = await this.enrichWithAi(releases, previous?.releases || []);
    const snapshot: Snapshot = {
      signature: this.signature(config),
      fetchedAt: new Date().toISOString(),
      sourceStatus: source.status,
      sourceLabel: source.label,
      releases: releases.slice(0, config.maxGroups),
    };
    await this.settings.set(SNAPSHOT_KEY, snapshot);
    return snapshot;
  }

  private async fetchGitGroups(config: ChangelogConfig): Promise<{
    groups: GitGroup[];
    status: Snapshot['sourceStatus'];
    label: string;
  }> {
    const token = String(
      process.env.CHANGELOG_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '',
    ).trim();

    if (token) {
      try {
        const groups = await this.fetchGithubEvents(config);
        if (groups.length) {
          return { groups, status: 'connected', label: 'GitHub 推送事件' };
        }
      } catch (error) {
        this.logger.warn(`GitHub 事件接口不可用: ${this.errorMessage(error)}`);
      }
    }

    try {
      const groups = await this.fetchLocalCommits(config);
      if (groups.length) {
        return { groups, status: 'fallback', label: '本地 Git 提交' };
      }
    } catch (error) {
      this.logger.debug(`本地 Git 仓库不可用: ${this.errorMessage(error)}`);
    }

    if (!token) {
      try {
        const groups = await this.fetchGithubEvents(config);
        if (groups.length) {
          return { groups, status: 'connected', label: 'GitHub 推送事件' };
        }
      } catch (error) {
        this.logger.warn(`GitHub 事件接口不可用: ${this.errorMessage(error)}`);
      }
    }

    try {
      const groups = await this.fetchAtomCommits(config);
      return { groups, status: 'fallback', label: 'Git 提交流' };
    } catch (error) {
      this.logger.warn(`Git 提交流不可用: ${this.errorMessage(error)}`);
      return { groups: [], status: 'unavailable', label: '无法获取 Git 提交记录' };
    }
  }

  private async fetchLocalCommits(config: ChangelogConfig) {
    const runtimeLog = await this.readRuntimeLog();
    if (runtimeLog.length) return this.groupLocalCommits(runtimeLog, config);
    const rootResult = await execFileAsync(
      'git',
      ['rev-parse', '--show-toplevel'],
      {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024,
      },
    );
    const repositoryRoot = String(rootResult.stdout).trim();
    if (!repositoryRoot) return [];

    const limit = Math.max(40, config.maxGroups * 8);
    const logResult = await execFileAsync(
      'git',
      [
        '-C',
        repositoryRoot,
        'log',
        config.branch,
        `--max-count=${limit}`,
        '--date=iso-strict',
        '--pretty=format:%H%x1f%aI%x1f%an%x1f%s%x1e',
      ],
      { maxBuffer: 4 * 1024 * 1024 },
    );
    const commits = String(logResult.stdout)
      .split('\x1e')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [sha = '', publishedAt = '', author = '', original = ''] =
          line.split('\x1f');
        return { sha, publishedAt, author, original };
      })
      .filter((commit) => commit.sha && commit.original);

    return this.groupLocalCommits(commits, config);
  }

  private async readRuntimeLog() {
    try {
      const candidates = Array.from(
        new Set(['/app/.runtime-git-log', `${process.cwd()}/.runtime-git-log`]),
      );
      let content = '';
      for (const file of candidates) {
        try {
          content = await readFile(file, 'utf8');
          if (content.trim()) break;
        } catch {
          // Try the next known runtime location.
        }
      }
      if (!content.trim()) return [];
      return content
        .split(/\r?\n/)
        .map((line) => {
          const [sha = '', publishedAt = '', author = '', ...message] =
            line.split('\t');
          return { sha, publishedAt, author, original: message.join('\t') };
        })
        .filter(
          (commit) =>
            /^[0-9a-f]{40}$/i.test(commit.sha) && Boolean(commit.original),
        );
    } catch {
      return [];
    }
  }

  private groupLocalCommits(commits: Array<{ sha: string; publishedAt: string; author: string; original: string }>, config: ChangelogConfig) {
    const grouped = new Map<string, GitGroup>();
    for (const commit of commits) {
      const publishedAt = this.isoDate(commit.publishedAt);
      const day = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(publishedAt));
      const group = grouped.get(day) || {
        id: `local:${day}:${commit.sha.slice(0, 12)}`,
        publishedAt,
        url: `${this.repositoryUrl(config)}/commits/${config.branch}`,
        items: [],
      };
      group.items.push({
        sha: commit.sha,
        original: this.commitMessage(commit.original),
        author: this.text(commit.author, 'repository', 100),
        url: `${this.repositoryUrl(config)}/commit/${commit.sha}`,
      });
      grouped.set(day, group);
    }
    return [...grouped.values()].slice(0, config.maxGroups);
  }

  private async fetchGithubEvents(config: ChangelogConfig) {
    const token = String(
      process.env.CHANGELOG_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '',
    ).trim();
    const response = await fetch(
      `https://api.github.com/repos/${config.repositoryOwner}/${config.repositoryName}/events?per_page=100`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'corner-changelog',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const events = (await response.json()) as Array<Record<string, unknown>>;
    const branchRef = `refs/heads/${config.branch}`;
    return events
      .filter(
        (event) =>
          event.type === 'PushEvent' &&
          this.record(event.payload).ref === branchRef,
      )
      .map((event) => {
        const payload = this.record(event.payload);
        const commits = Array.isArray(payload.commits) ? payload.commits : [];
        const head = this.text(payload.head, '', 80);
        const before = this.text(payload.before, '', 80);
        return {
          id: `push:${this.text(event.id, head || randomUUID(), 120)}`,
          publishedAt: this.isoDate(event.created_at),
          url:
            before && head
              ? `${this.repositoryUrl(config)}/compare/${before}...${head}`
              : this.repositoryUrl(config),
          items: commits
            .map((commit) => this.githubCommit(config, commit))
            .filter((item): item is Omit<ReleaseItem, 'text'> => Boolean(item)),
        } satisfies GitGroup;
      })
      .filter((group) => group.items.length)
      .slice(0, config.maxGroups);
  }

  private githubCommit(
    config: ChangelogConfig,
    value: unknown,
  ): Omit<ReleaseItem, 'text'> | null {
    const commit = this.record(value);
    const sha = this.text(commit.sha, '', 80);
    const original = this.commitMessage(commit.message);
    if (!sha || !original) return null;
    const author = this.record(commit.author);
    return {
      sha,
      original,
      author: this.text(author.name || author.login, 'repository', 100),
      url: `${this.repositoryUrl(config)}/commit/${sha}`,
    };
  }

  private async fetchAtomCommits(config: ChangelogConfig) {
    const branch = config.branch
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
    const response = await fetch(
      `${this.repositoryUrl(config)}/commits/${branch}.atom`,
      {
        headers: { 'User-Agent': 'corner-changelog' },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error(`Git Atom ${response.status}`);
    const feed = await this.parser.parseString(await response.text());
    const grouped = new Map<string, GitGroup>();
    for (const item of feed.items.slice(0, 60)) {
      const original = this.commitMessage(item.title);
      const url = this.text(item.link, this.repositoryUrl(config), 2048);
      const sha = url.split('/').filter(Boolean).at(-1) || '';
      if (!original || !sha) continue;
      const publishedAt = this.isoDate(item.isoDate || item.pubDate);
      const day = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(publishedAt));
      const group = grouped.get(day) || {
        id: `day:${day}`,
        publishedAt,
        url: `${this.repositoryUrl(config)}/commits/${branch}`,
        items: [],
      };
      group.items.push({
        sha,
        original,
        author: this.text(item.creator || item.author, 'repository', 100),
        url,
      });
      grouped.set(day, group);
    }
    return [...grouped.values()].slice(0, config.maxGroups);
  }

  private fallbackRelease(group: GitGroup): ChangelogRelease {
    const items: ReleaseItem[] = group.items.map((item) => ({
      ...item,
      text: this.ruleTranslate(item.original),
    }));
    const first = items[0]?.text || '代码与体验更新';
    const title =
      items.length > 1
        ? `${first.replace(/[。；;]$/, '').slice(0, 34)}等 ${items.length} 项更新`
        : first;
    return {
      id: group.id,
      title,
      summary:
        items.length > 1
          ? `本次推送包含 ${items.length} 项调整，以下为完整变更。`
          : '本次推送完成一项明确更新。',
      publishedAt: group.publishedAt,
      source: 'git',
      sourceLabel: 'Git 自动记录',
      url: group.url,
      items,
      translation: 'rules',
    };
  }

  private async enrichWithAi(
    releases: ChangelogRelease[],
    previous: ChangelogRelease[],
  ) {
    const previousMap = new Map(
      previous.map((release) => [release.id, release]),
    );
    const pending: ChangelogRelease[] = [];
    const result = releases.map((release) => {
      const cached = previousMap.get(release.id);
      const same =
        cached &&
        cached.items.map((item) => item.sha).join(',') ===
          release.items.map((item) => item.sha).join(',');
      if (same && cached.translation === 'ai') return cached;
      pending.push(release);
      return release;
    });
    if (!pending.length) return result;

    try {
      const style = await this.ai.getSiteStyleInstruction('风迹');
      const response = await this.ai.chat(
        [
          {
            role: 'system',
            content: [
              '你是「风迹」编辑。把 Git 提交整理成自然、克制、具体的中文，不夸大、不虚构。每次推送必须有一个概括标题、一句摘要，并保留全部提交为顺序列表。技术名词可以保留英文。只输出 JSON 数组。',
              style,
            ]
              .filter(Boolean)
              .join('\n\n'),
          },
          {
            role: 'user',
            content: `请整理以下推送：${JSON.stringify(
              pending.slice(0, 10).map((release) => ({
                id: release.id,
                commits: release.items.map((item) => ({
                  sha: item.sha,
                  message: item.original,
                })),
              })),
            )}\n输出格式：[{'id':'原id','title':'不超过30字','summary':'不超过70字','items':[{'sha':'原sha','text':'中文变更说明'}]}]`,
          },
        ],
        { temperature: 0.2, maxTokens: 3200, thinking: 'disabled' },
      );
      const translated = this.parseAiReleases(response);
      const translatedMap = new Map(
        translated.map((release) => [this.text(release.id, '', 150), release]),
      );
      return result.map((release) => {
        const copy = translatedMap.get(release.id);
        if (!copy) return release;
        const copyItems = Array.isArray(copy.items) ? copy.items : [];
        const itemMap = new Map(
          copyItems.map((item) => {
            const record = this.record(item);
            return [
              this.text(record.sha, '', 80),
              this.text(record.text, '', 240),
            ];
          }),
        );
        return {
          ...release,
          title: this.text(copy.title, release.title, 100),
          summary: this.text(copy.summary, release.summary, 320),
          items: release.items.map((item) => ({
            ...item,
            text: itemMap.get(item.sha) || item.text,
          })),
          translation: 'ai' as const,
        };
      });
    } catch (error) {
      this.logger.warn(`更新日志 AI 翻译不可用: ${this.errorMessage(error)}`);
      return result;
    }
  }

  private parseAiReleases(value: string): Array<Record<string, unknown>> {
    const match = value.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]) as unknown;
      return Array.isArray(parsed)
        ? parsed.map((item) => this.record(item))
        : [];
    } catch {
      return [];
    }
  }

  private ruleTranslate(message: string) {
    const conventional = message.match(
      /^(feat|fix|refactor|perf|docs|chore|style|test|build|ci)(?:\([^)]*\))?!?:\s*(.+)$/i,
    );
    const type = conventional?.[1]?.toLowerCase() || '';
    let body = conventional?.[2] || message;
    if (/\p{Script=Han}/u.test(body)) return body.trim();

    const phrases: Array<[RegExp, string]> = [
      [/reading experience/gi, '阅读体验'],
      [/github oauth callback/gi, 'GitHub OAuth 回调'],
      [/oauth account binding/gi, 'OAuth 账号绑定'],
      [/global toast feedback/gi, '全局提示反馈'],
      [/frontend docker build/gi, '前端 Docker 构建'],
      [/missing supabase env vars/gi, '缺失的 Supabase 环境变量'],
      [/development environment/gi, '开发环境'],
      [/production environment/gi, '生产环境'],
      [/client configuration/gi, '客户端配置'],
      [/loading state/gi, '加载状态'],
      [/notifications/gi, '通知'],
      [/article/gi, '文章'],
      [/circle feed|circle/gi, '风讯角'],
      [/rss reading feed/gi, 'RSS 阅读信息流'],
      [/rss feed/gi, 'RSS 信息流'],
      [/account/gi, '账号'],
      [/integration/gi, '集成'],
      [/experience/gi, '体验'],
      [/configuration/gi, '配置'],
      [/callback/gi, '回调'],
      [/button/gi, '按钮'],
      [/redirect/gi, '跳转'],
      [/login/gi, '登录'],
      [/frontend/gi, '前端'],
      [/build args/gi, '构建参数'],
      [/flow/gi, '流程'],
      [/refine|polish/gi, '打磨'],
      [/redesign/gi, '重新设计'],
      [/optimize/gi, '优化'],
      [/stabilize/gi, '稳定'],
      [/implement/gi, '实现'],
      [/resolve/gi, '解决'],
      [/gracefully handle/gi, '妥善处理'],
      [/isolate/gi, '隔离'],
      [/hide/gi, '隐藏'],
      [/import/gi, '引入'],
      [/add/gi, '新增'],
    ];
    for (const [pattern, translation] of phrases)
      body = body.replace(pattern, translation);
    body = body.replace(/\s+/g, ' ').trim();
    const prefixes: Record<string, string> = {
      feat: '新增',
      fix: '修复',
      refactor: '重构',
      perf: '优化',
      docs: '更新文档：',
      chore: '维护：',
      style: '调整样式：',
      test: '完善测试：',
      build: '更新构建：',
      ci: '更新部署：',
    };
    const prefix = prefixes[type] || '更新：';
    if (body.startsWith(prefix.replace('：', ''))) return body;
    return `${prefix}${prefix.endsWith('：') ? '' : ' '}${body}`.trim();
  }

  private manualEntry(dto: UpsertChangelogEntryDto, id: string) {
    return {
      id,
      title: this.text(dto.title, '未命名更新', 100),
      summary: this.text(dto.summary, '', 320),
      publishedAt: this.isoDate(dto.publishedAt),
      source: 'manual' as const,
      sourceLabel: '站点补记',
      url: '',
      items: (dto.items || [])
        .map((item, index) => ({
          sha: `${id}:${index}`,
          text: this.text(item.text, '', 240),
          original: '',
          author: '',
          url: '',
        }))
        .filter((item) => item.text),
      translation: 'manual' as const,
      published: dto.published !== false,
    } satisfies ChangelogRelease;
  }

  private normalizeManualEntry(value: unknown): ChangelogRelease | null {
    const entry = this.record(value);
    const id = this.text(entry.id, '', 150);
    const title = this.text(entry.title, '', 100);
    if (!id || !title || !Array.isArray(entry.items)) return null;
    return {
      id,
      title,
      summary: this.text(entry.summary, '', 320),
      publishedAt: this.isoDate(entry.publishedAt),
      source: 'manual',
      sourceLabel: '站点补记',
      url: '',
      items: entry.items
        .map((item, index) => {
          const record = this.record(item);
          const text = this.text(record.text, '', 240);
          return {
            sha: this.text(record.sha, `${id}:${index}`, 180),
            text,
            original: '',
            author: '',
            url: '',
          };
        })
        .filter((item) => item.text),
      translation: 'manual',
      published: entry.published !== false,
    };
  }

  private snapshot(value: unknown): Snapshot | null {
    const snapshot = this.record(value);
    if (!snapshot.signature || !Array.isArray(snapshot.releases)) return null;
    return snapshot as unknown as Snapshot;
  }

  private signature(config: ChangelogConfig) {
    return [
      SNAPSHOT_VERSION,
      config.repositoryOwner,
      config.repositoryName,
      config.branch,
      config.maxGroups,
    ].join(':');
  }

  private repositoryUrl(config: ChangelogConfig) {
    return `https://github.com/${config.repositoryOwner}/${config.repositoryName}`;
  }

  private commitMessage(value: unknown) {
    return this.text(value, '', 500).split(/\r?\n/)[0].trim();
  }

  private isoDate(value: unknown) {
    const date = new Date(typeof value === 'string' ? value : Date.now());
    return Number.isNaN(date.getTime())
      ? new Date().toISOString()
      : date.toISOString();
  }

  private identifier(value: unknown, fallback: string) {
    const text = this.text(value, fallback, 100);
    return /^[a-zA-Z0-9_.-]+$/.test(text) ? text : fallback;
  }

  private branch(value: unknown, fallback: string) {
    const text = this.text(value, fallback, 180);
    return /^[a-zA-Z0-9_./-]+$/.test(text) ? text : fallback;
  }

  private text(value: unknown, fallback = '', max = 500) {
    return typeof value === 'string' && value.trim()
      ? value.trim().slice(0, max)
      : fallback;
  }

  private record(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}

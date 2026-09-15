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
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { BaiduTranslationService } from './baidu-translation.service';
import {
  UpdateChangelogConfigDto,
  UpsertChangelogEntryDto,
} from './dto/changelog.dto';

const CONFIG_KEY = 'changelog_config';
const MANUAL_KEY = 'changelog_manual_entries';
const TRANSLATION_BATCH_SIZE = 40;
const execFileAsync = promisify(execFile);

type ChangelogConfig = {
  enabled: boolean;
  title: string;
  subtitle: string;
  repositoryOwner: string;
  repositoryName: string;
  branch: string;
  cacheTtl: number;
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
  translation: 'baidu' | 'original' | 'rules' | 'manual';
  published?: boolean;
};

type GitCommit = {
  sha: string;
  publishedAt: string;
  author: string;
  original: string;
  url: string;
};

type SourceResult = {
  commits: GitCommit[];
  status: 'connected' | 'fallback' | 'unavailable';
  label: string;
  error?: string;
};

type Snapshot = {
  fetchedAt: string;
  sourceStatus: 'connected' | 'fallback' | 'stale' | 'unavailable';
  sourceLabel: string;
  translationPending: boolean;
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
    private readonly prisma: PrismaService,
    private readonly baiduTranslation: BaiduTranslationService,
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
    ].sort(
      (left, right) =>
        Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
    );
    const limit = Math.min(30, Math.max(4, Number(query.limit) || 12));
    const totalPages = Math.max(1, Math.ceil(releases.length / limit));
    const page = Math.min(totalPages, Math.max(1, Number(query.page) || 1));
    const start = (page - 1) * limit;

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
      itemCount: releases.reduce(
        (total, release) => total + release.items.length,
        0,
      ),
      fetchedAt: snapshot.fetchedAt,
      sourceStatus: snapshot.sourceStatus,
      sourceLabel: snapshot.sourceLabel,
      translationPending: snapshot.translationPending,
    };
  }

  async admin(query: ListQuery = {}) {
    const config = await this.getConfig();
    const repository = this.repositoryKey(config);
    const [snapshot, manualEntries, translationTotal, translationGroups] = await Promise.all([
      this.getAutomatic(config),
      this.getManualEntries(),
      this.prisma.changelogTranslation.count({ where: { repository, branch: config.branch } }),
      this.prisma.changelogTranslation.groupBy({
        by: ['status'],
        where: { repository, branch: config.branch },
        _count: { _all: true },
      }),
    ]);
    const translationLimit = Math.min(50, Math.max(5, Number(query.limit) || 12));
    const translationTotalPages = Math.max(1, Math.ceil(translationTotal / translationLimit));
    const translationPage = Math.min(translationTotalPages, Math.max(1, Number(query.page) || 1));
    const translations = await this.prisma.changelogTranslation.findMany({
      where: { repository, branch: config.branch },
      orderBy: { committedAt: 'desc' },
      skip: (translationPage - 1) * translationLimit,
      take: translationLimit,
    });
    const translationStats = { total: translationTotal, translated: 0, original: 0, pending: 0, failed: 0 };
    for (const group of translationGroups) {
      const count = group._count._all;
      if (group.status === 'translated') translationStats.translated = count;
      else if (group.status === 'original') translationStats.original = count;
      else if (group.status === 'failed') translationStats.failed = count;
      else translationStats.pending += count;
    }
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
      translationConfigured: this.baiduTranslation.configured,
      translationStats,
      translations: translations.map((row) => ({
        sha: row.commitSha,
        original: row.originalMessage,
        translated: row.translatedMessage || '',
        language: row.language,
        status: row.status,
        service: row.translationService || '',
        author: row.author,
        committedAt: row.committedAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        error: row.lastError || '',
        url: row.commitUrl,
      })),
      translationsPage: translationPage,
      translationsTotalPages: translationTotalPages,
      translationsTotal: translationTotal,
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
          ? '风迹墙'
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
    };
  }

  private async getManualEntries(): Promise<ChangelogRelease[]> {
    const value = await this.settings.get(MANUAL_KEY);
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => this.normalizeManualEntry(item))
      .filter((item): item is ChangelogRelease => Boolean(item));
  }

  private async getAutomatic(config: ChangelogConfig, force = false) {
    const repository = this.repositoryKey(config);
    const [state, count, pendingCount] = await Promise.all([
      this.prisma.changelogSyncState.findUnique({
        where: { repository_branch: { repository, branch: config.branch } },
      }),
      this.prisma.changelogTranslation.count({
        where: { repository, branch: config.branch },
      }),
      this.prisma.changelogTranslation.count({
        where: {
          repository,
          branch: config.branch,
          language: { in: ['en', 'mixed'] },
          status: { in: ['pending', 'failed'] },
        },
      }),
    ]);
    const fresh =
      state && Date.now() - state.fetchedAt.getTime() < config.cacheTtl * 1000;
    if (!force && fresh && pendingCount === 0)
      return this.loadSnapshot(config, state);
    if (!force && count > 0) {
      void this.runRefresh(config).catch((error) =>
        this.logger.warn(`后台刷新风迹墙失败: ${this.errorMessage(error)}`),
      );
      return this.loadSnapshot(config, state);
    }
    return this.runRefresh(config);
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
          this.logger.warn(`自动刷新风迹墙失败: ${this.errorMessage(error)}`);
        } finally {
          this.scheduleAutomaticRefresh(nextDelay);
        }
      },
      Math.max(1_000, delayMs),
    );
    this.refreshTimer.unref?.();
  }

  private runRefresh(config: ChangelogConfig) {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.refreshAutomatic(config).finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async refreshAutomatic(config: ChangelogConfig): Promise<Snapshot> {
    const repository = this.repositoryKey(config);
    const existing = await this.prisma.changelogTranslation.findMany({
      where: { repository },
    });
    const source = await this.fetchGitCommits(
      config,
      new Set(existing.map((row) => row.commitSha)),
    );
    if (source.commits.length) {
      const existingMap = new Map(existing.map((row) => [row.commitSha, row]));
      for (let offset = 0; offset < source.commits.length; offset += 100) {
        const operations = source.commits.slice(offset, offset + 100).map((commit) => {
          const language = this.detectLanguage(commit.original);
          const current = existingMap.get(commit.sha);
          const unchanged = current?.originalMessage === commit.original;
          const status = language === 'zh' ? 'original' : 'pending';
          return this.prisma.changelogTranslation.upsert({
            where: {
              repository_commitSha: { repository, commitSha: commit.sha },
            },
            create: {
              repository,
              branch: config.branch,
              commitSha: commit.sha,
              originalMessage: commit.original,
              translatedMessage: language === 'zh' ? commit.original : null,
              language,
              translationService: null,
              status,
              author: commit.author,
              commitUrl: commit.url,
              committedAt: new Date(commit.publishedAt),
            },
            update: {
              branch: config.branch,
              author: commit.author,
              commitUrl: commit.url,
              committedAt: new Date(commit.publishedAt),
              ...(unchanged
                ? {}
                : {
                    originalMessage: commit.original,
                    translatedMessage:
                      language === 'zh' ? commit.original : null,
                    language,
                    translationService: null,
                    status,
                    lastError: null,
                  }),
            },
          });
        });
        await this.prisma.$transaction(operations);
      }
    }

    await this.translatePending(repository, config.branch);
    const fetchedAt = new Date();
    const hasRows =
      (await this.prisma.changelogTranslation.count({
        where: { repository, branch: config.branch },
      })) > 0;
    const sourceStatus = source.commits.length
      ? source.status
      : hasRows
        ? 'stale'
        : 'unavailable';
    const sourceLabel = source.commits.length
      ? source.label
      : hasRows
        ? '保留上次同步结果'
        : source.label;
    const state = await this.prisma.changelogSyncState.upsert({
      where: { repository_branch: { repository, branch: config.branch } },
      create: {
        repository,
        branch: config.branch,
        fetchedAt,
        sourceStatus,
        sourceLabel,
        lastError: source.error || null,
      },
      update: {
        fetchedAt,
        sourceStatus,
        sourceLabel,
        lastError: source.error || null,
      },
    });
    return this.loadSnapshot(config, state);
  }

  private async loadSnapshot(
    config: ChangelogConfig,
    state: {
      fetchedAt: Date;
      sourceStatus: string;
      sourceLabel: string;
    } | null,
  ): Promise<Snapshot> {
    const rows = await this.prisma.changelogTranslation.findMany({
      where: {
        repository: this.repositoryKey(config),
        branch: config.branch,
      },
      orderBy: { committedAt: 'desc' },
    });
    // 翻译失败或未配置时仍展示原文，避免前台一直卡在“正在完成提交翻译”。
    const displayableRows = rows.filter((row) => ['translated', 'original', 'pending', 'failed'].includes(row.status));
    const translationPending = false;
    return {
      fetchedAt: (state?.fetchedAt || new Date(0)).toISOString(),
      sourceStatus: (state?.sourceStatus || 'unavailable') as Snapshot['sourceStatus'],
      sourceLabel: state?.sourceLabel || '等待首次同步',
      translationPending,
      releases: displayableRows.map((row) => {
        const text = row.translatedMessage || row.originalMessage;
        return {
          id: `git:${row.commitSha}`,
          title: text,
          summary: '',
          publishedAt: row.committedAt.toISOString(),
          source: 'git',
          sourceLabel: 'Git 自动记录',
          url: row.commitUrl,
          items: [
            {
              sha: row.commitSha,
              text,
              original: row.originalMessage,
              author: row.author,
              url: row.commitUrl,
            },
          ],
          translation:
            row.status === 'translated'
              ? 'baidu'
              : row.status === 'original'
                ? 'original'
                : 'rules',
        } satisfies ChangelogRelease;
      }),
    };
  }

  private async translatePending(repository: string, branch: string) {
    const pending = await this.prisma.changelogTranslation.findMany({
      where: {
        repository,
        branch,
        language: { in: ['en', 'mixed'] },
        status: { in: ['pending', 'failed'] },
      },
      orderBy: { committedAt: 'asc' },
    });
    if (!pending.length || !this.baiduTranslation.configured) return;

    for (let offset = 0; offset < pending.length; offset += TRANSLATION_BATCH_SIZE) {
      const batch = pending.slice(offset, offset + TRANSLATION_BATCH_SIZE);
      try {
        const inputs = batch.map((row) => this.translationInput(row.originalMessage));
        const results = await this.baiduTranslation.translateBatch(
          inputs.map((input) => input.text),
          'auto',
          'zh',
        );
        await this.prisma.$transaction(
          batch.map((row, index) =>
            this.prisma.changelogTranslation.update({
              where: { id: row.id },
              data: {
                translatedMessage: `${inputs[index].prefix}${results[index].text}`.trim(),
                translationService: 'baidu',
                status: 'translated',
                lastError: null,
              },
            }),
          ),
        );
      } catch (error) {
        const message = this.errorMessage(error).slice(0, 2000);
        this.logger.warn(`百度翻译批次失败: ${message}`);
        await this.prisma.$transaction(
          batch.map((row) =>
            this.prisma.changelogTranslation.update({
              where: { id: row.id },
              data: { status: 'failed', lastError: message },
            }),
          ),
        );
      }
    }
  }

  private async fetchGitCommits(
    config: ChangelogConfig,
    known: Set<string>,
  ): Promise<SourceResult> {
    const token = String(
      process.env.CHANGELOG_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '',
    ).trim();
    let officialError = '';
    if (token) {
      try {
        const commits = await this.fetchGithubCommits(config, token, known);
        return { commits, status: 'connected', label: 'GitHub 官方提交接口' };
      } catch (error) {
        officialError = this.errorMessage(error);
        this.logger.warn(`GitHub 官方提交接口不可用: ${officialError}`);
      }
    }

    try {
      const commits = await this.fetchLocalCommits(config);
      if (commits.length)
        return {
          commits,
          status: 'fallback',
          label: token ? '部署 Git 历史（GitHub 接口异常）' : '部署 Git 历史',
          error: officialError || undefined,
        };
    } catch (error) {
      this.logger.debug(`本地 Git 历史不可用: ${this.errorMessage(error)}`);
    }

    try {
      const commits = await this.fetchAtomCommits(config);
      return {
        commits,
        status: 'fallback',
        label: 'Git 提交流',
        error: officialError || undefined,
      };
    } catch (error) {
      const message = [officialError, this.errorMessage(error)]
        .filter(Boolean)
        .join('; ');
      return {
        commits: [],
        status: 'unavailable',
        label: '无法获取 Git 提交记录',
        error: message,
      };
    }
  }

  private async fetchGithubCommits(
    config: ChangelogConfig,
    token: string,
    known: Set<string>,
  ) {
    const commits: GitCommit[] = [];
    for (let page = 1; ; page += 1) {
      const response = await fetch(
        `https://api.github.com/repos/${config.repositoryOwner}/${config.repositoryName}/commits?sha=${encodeURIComponent(config.branch)}&per_page=100&page=${page}`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'corner-changelog',
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(12_000),
        },
      );
      if (!response.ok) throw new Error(`GitHub API ${response.status}`);
      const batch = (await response.json()) as Array<Record<string, unknown>>;
      let reachedKnownCommit = false;
      for (const value of batch) {
        const commit = this.record(value);
        const sha = this.text(commit.sha, '', 40);
        if (known.has(sha)) reachedKnownCommit = true;
        const detail = this.record(commit.commit);
        const author = this.record(detail.author || detail.committer);
        const original = this.commitMessage(detail.message);
        if (!sha || !original) continue;
        commits.push({
          sha,
          original,
          author: this.text(author.name, 'repository', 100),
          publishedAt: this.isoDate(
            author.date || this.record(detail.committer).date,
          ),
          url: `${this.repositoryUrl(config)}/commit/${sha}`,
        });
      }
      if (batch.length < 100 || reachedKnownCommit) break;
    }
    return commits;
  }

  private async fetchLocalCommits(config: ChangelogConfig) {
    const runtimeLog = await this.readRuntimeLog();
    if (runtimeLog.length) return this.localCommits(runtimeLog, config);
    const rootResult = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024,
    });
    const repositoryRoot = String(rootResult.stdout).trim();
    if (!repositoryRoot) return [];
    const logResult = await execFileAsync(
      'git',
      [
        '-C',
        repositoryRoot,
        'log',
        config.branch,
        '--date=iso-strict',
        '--pretty=format:%H%x1f%aI%x1f%an%x1f%s%x1e',
      ],
      { maxBuffer: 256 * 1024 * 1024 },
    );
    const commits = String(logResult.stdout)
      .split('\x1e')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [sha = '', publishedAt = '', author = '', original = ''] =
          line.split('\x1f');
        return { sha, publishedAt, author, original };
      });
    return this.localCommits(commits, config);
  }

  private async readRuntimeLog() {
    for (const file of ['/app/.runtime-git-log', `${process.cwd()}/.runtime-git-log`]) {
      try {
        const content = await readFile(file, 'utf8');
        if (!content.trim()) continue;
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
        // Try the next runtime location.
      }
    }
    return [];
  }

  private localCommits(
    commits: Array<{
      sha: string;
      publishedAt: string;
      author: string;
      original: string;
    }>,
    config: ChangelogConfig,
  ): GitCommit[] {
    return commits
      .filter((commit) => commit.sha && commit.original)
      .map((commit) => ({
        ...commit,
        original: this.commitMessage(commit.original),
        publishedAt: this.isoDate(commit.publishedAt),
        author: this.text(commit.author, 'repository', 100),
        url: `${this.repositoryUrl(config)}/commit/${commit.sha}`,
      }));
  }

  private async fetchAtomCommits(config: ChangelogConfig): Promise<GitCommit[]> {
    const branch = config.branch
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
    const response = await fetch(
      `${this.repositoryUrl(config)}/commits/${branch}.atom`,
      { headers: { 'User-Agent': 'corner-changelog' }, signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) throw new Error(`Git Atom ${response.status}`);
    const feed = await this.parser.parseString(await response.text());
    return feed.items.flatMap((item) => {
      const original = this.commitMessage(item.title);
      const url = this.text(item.link, this.repositoryUrl(config), 2048);
      const sha = url.split('/').filter(Boolean).at(-1) || '';
      if (!original || !sha) return [];
      return [
        {
          sha,
          original,
          author: this.text(item.creator || item.author, 'repository', 100),
          publishedAt: this.isoDate(item.isoDate || item.pubDate),
          url,
        },
      ];
    });
  }

  private detectLanguage(message: string): 'zh' | 'en' | 'mixed' {
    const hasChinese = /\p{Script=Han}/u.test(message);
    const hasEnglish = /[A-Za-z]/.test(message);
    if (!hasEnglish) return 'zh';
    return hasChinese ? 'mixed' : 'en';
  }

  private translationInput(message: string) {
    const match = message.match(
      /^(feat|fix|refactor|perf|docs|chore|style|test|build|ci)(?:\([^)]*\))?!?:\s*(.+)$/i,
    );
    if (!match) return { prefix: '', text: message };
    const prefixes: Record<string, string> = {
      feat: '新增：',
      fix: '修复：',
      refactor: '重构：',
      perf: '优化：',
      docs: '文档：',
      chore: '维护：',
      style: '样式：',
      test: '测试：',
      build: '构建：',
      ci: '部署：',
    };
    return { prefix: prefixes[match[1].toLowerCase()] || '', text: match[2] };
  }

  private ruleTranslate(message: string) {
    const input = this.translationInput(message);
    return `${input.prefix}${input.text}`.trim();
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
          return {
            sha: this.text(record.sha, `${id}:${index}`, 180),
            text: this.text(record.text, '', 240),
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

  private repositoryKey(config: ChangelogConfig) {
    return `${config.repositoryOwner}/${config.repositoryName}`.toLowerCase();
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

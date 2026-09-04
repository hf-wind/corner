import { rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ChangelogService } from './changelog.service';

describe('ChangelogService runtime Git history', () => {
  const runtimeLog = resolve(process.cwd(), '.runtime-git-log');
  let service: ChangelogService;

  beforeEach(() => {
    service = new ChangelogService({} as any, {} as any, {} as any);
  });

  afterEach(async () => {
    await rm(runtimeLog, { force: true });
  });

  it('reads valid exported commits without a Git binary', async () => {
    await writeFile(
      runtimeLog,
      [
        'a'.repeat(40) + '\t2026-08-31T19:07:39+08:00\thf-wind\tfeat: production history',
        'invalid\t2026-08-31T19:07:39+08:00\tignored\tbad sha',
      ].join('\n'),
      'utf8',
    );

    const commits = await (service as any).readRuntimeLog();

    expect(commits).toEqual([
      {
        sha: 'a'.repeat(40),
        publishedAt: '2026-08-31T19:07:39+08:00',
        author: 'hf-wind',
        original: 'feat: production history',
      },
    ]);
  });

  it('only skips translation when the commit message has no English letters', () => {
    expect((service as any).detectLanguage('修复订阅源更新')).toBe('zh');
    expect((service as any).detectLanguage('fix circle feed')).toBe('en');
    expect((service as any).detectLanguage('修复 RSS 缓存')).toBe('mixed');
  });

  it('hides untranslated commits and exposes a pending sync state', async () => {
    const prisma = (service as any).prisma;
    prisma.changelogTranslation = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'translated',
          commitSha: 'a'.repeat(40),
          originalMessage: 'fix: feed cache',
          translatedMessage: '修复：订阅源缓存',
          status: 'translated',
          language: 'en',
          author: 'hf-wind',
          commitUrl: 'https://github.com/hf-wind/corner/commit/a',
          committedAt: new Date('2026-09-01T00:00:00Z'),
        },
        {
          id: 'pending',
          commitSha: 'b'.repeat(40),
          originalMessage: 'feat: pending translation',
          translatedMessage: null,
          status: 'pending',
          language: 'en',
          author: 'hf-wind',
          commitUrl: 'https://github.com/hf-wind/corner/commit/b',
          committedAt: new Date('2026-09-02T00:00:00Z'),
        },
      ]),
    };

    const snapshot = await (service as any).loadSnapshot(
      {
        repositoryOwner: 'hf-wind',
        repositoryName: 'corner',
        branch: 'main',
      },
      {
        fetchedAt: new Date('2026-09-02T00:00:00Z'),
        sourceStatus: 'connected',
        sourceLabel: 'GitHub',
      },
    );

    expect(snapshot.translationPending).toBe(true);
    expect(snapshot.releases).toHaveLength(1);
    expect(snapshot.releases[0].title).toBe('修复：订阅源缓存');
    expect(snapshot.releases[0].summary).toBe('');
  });
});

describe('ChangelogService admin translation pagination', () => {
  it('returns one cache page while keeping statistics global', async () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      commitSha: String(index).padStart(40, '0'),
      originalMessage: `commit ${index}`,
      translatedMessage: `提交 ${index}`,
      language: 'en',
      status: 'translated',
      translationService: 'baidu',
      author: 'tester',
      committedAt: new Date(`2026-09-${String(index + 1).padStart(2, '0')}T00:00:00Z`),
      updatedAt: new Date('2026-09-04T00:00:00Z'),
      lastError: null,
      commitUrl: `https://example.test/${index}`,
    }));
    const prisma = {
      changelogTranslation: {
        count: jest.fn().mockResolvedValue(12),
        groupBy: jest.fn().mockResolvedValue([
          { status: 'translated', _count: { _all: 9 } },
          { status: 'failed', _count: { _all: 3 } },
        ]),
        findMany: jest.fn().mockResolvedValue(rows.slice(5, 10)),
      },
    };
    const translation = { configured: true };
    const service = new ChangelogService({} as any, prisma as any, translation as any);
    jest.spyOn(service as any, 'getConfig').mockResolvedValue({
      enabled: true,
      repositoryOwner: 'hf-wind',
      repositoryName: 'corner',
      branch: 'main',
    });
    jest.spyOn(service as any, 'getAutomatic').mockResolvedValue({
      releases: [],
      fetchedAt: '',
      sourceStatus: 'connected',
      sourceLabel: 'GitHub',
    });
    jest.spyOn(service as any, 'getManualEntries').mockResolvedValue([]);

    const result = await service.admin({ page: 2, limit: 5 });

    expect(prisma.changelogTranslation.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }));
    expect(result.translations).toHaveLength(5);
    expect(result.translationsPage).toBe(2);
    expect(result.translationsTotalPages).toBe(3);
    expect(result.translationStats).toEqual({ total: 12, translated: 9, original: 0, pending: 0, failed: 3 });
  });
});

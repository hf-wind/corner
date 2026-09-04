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
});

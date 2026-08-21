import { ConflictException, ForbiddenException } from '@nestjs/common';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { BackupService } from './backup.service';

describe('BackupService', () => {
  let root: string;
  let backupRoot: string;
  let controlRoot: string;
  let service: BackupService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'corner-backup-test-'));
    backupRoot = join(root, 'backups');
    controlRoot = join(root, 'control');
    await mkdir(backupRoot, { recursive: true });
    process.env.BACKUP_MOUNT_ROOT = backupRoot;
    process.env.BACKUP_CONTROL_ROOT = controlRoot;
    process.env.BACKUP_RECOVERY_TOKEN = 'r'.repeat(40);
    service = new BackupService();
  });

  afterEach(async () => {
    delete process.env.BACKUP_MOUNT_ROOT;
    delete process.env.BACKUP_CONTROL_ROOT;
    delete process.env.BACKUP_RECOVERY_TOKEN;
    await rm(root, { recursive: true, force: true });
  });

  async function createBackup(backupId = '20260820T120000Z') {
    const directory = join(backupRoot, backupId);
    const archive = `corner-backup-${backupId}.tar.zst`;
    await mkdir(directory);
    await writeFile(join(directory, archive), 'archive');
    await writeFile(
      join(directory, 'manifest.json'),
      JSON.stringify({
        version: 2,
        backupId,
        createdAt: '2026-08-20T12:00:00Z',
        status: 'completed',
        archive,
        archiveBytes: 7,
        sha256: 'abc',
        gitCommit: 'commit',
        encryptedSecrets: true,
        assets: {
          database: true,
          uploads: true,
          docker: true,
          caddy: true,
          systemd: true,
          cron: true,
          runtime: true,
          source: true,
          productionEnv: true,
          developmentEnv: true,
          ssh: true,
          certificates: true,
        },
      }),
    );
  }

  it('lists only valid manifests and reports managed assets', async () => {
    await createBackup();
    await mkdir(join(backupRoot, 'invalid'));
    const records = await service.list();
    const inventory = await service.inventory();
    expect(records.total).toBe(1);
    expect(records.items[0].backupId).toBe('20260820T120000Z');
    expect(inventory.assets.every((asset) => asset.managed)).toBe(true);
    expect(inventory.assets.filter((asset) => asset.encrypted)).toHaveLength(4);
  });

  it('reports optional assets from the manifest instead of assuming presence', async () => {
    await createBackup();
    const manifestPath = join(
      backupRoot,
      '20260820T120000Z',
      'manifest.json',
    );
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.assets.uploads = false;
    manifest.assets.developmentEnv = false;
    manifest.assets.ssh = false;
    manifest.assets.certificates = false;
    await writeFile(manifestPath, JSON.stringify(manifest));

    const inventory = await service.inventory();

    expect(
      inventory.assets
        .filter((asset) => !asset.managed)
        .map((asset) => asset.key),
    ).toEqual(['uploads', 'development-env', 'ssh', 'certificates']);
    expect(inventory.assets.filter((asset) => asset.encrypted)).toHaveLength(1);
  });

  it('writes one backup request and rejects concurrent work', async () => {
    await service.requestBackup('admin-id');
    const request = JSON.parse(
      await readFile(join(controlRoot, 'backup.request'), 'utf8'),
    );
    expect(request.requestedBy).toBe('admin-id');
    await expect(service.requestBackup('admin-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('requires both recovery token and exact confirmation', async () => {
    await createBackup();
    await expect(
      service.requestRestore(
        '20260820T120000Z',
        'admin-id',
        'x'.repeat(40),
        'RESTORE 20260820T120000Z',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.requestRestore(
        '20260820T120000Z',
        'admin-id',
        'r'.repeat(40),
        'wrong',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { access, mkdir, readFile, readdir, stat, writeFile } from 'fs/promises';
import { join } from 'path';

type BackupManifest = {
  version: number;
  backupId: string;
  createdAt: string;
  status: string;
  archive: string;
  archiveBytes: number;
  sha256: string;
  gitCommit: string;
  encryptedSecrets: boolean;
  assets?: Record<string, boolean>;
  email?: {
    archive?: { recipient: string; status: string; attached: boolean };
    notification?: { recipient: string; status: string };
    attachmentLimitMb?: number;
  };
};

@Injectable()
export class BackupService {
  private readonly backupRoot =
    process.env.BACKUP_MOUNT_ROOT ||
    (process.env.NODE_ENV === 'production'
      ? '/app/backups'
      : join(process.cwd(), '..', 'backups'));
  private readonly controlRoot =
    process.env.BACKUP_CONTROL_ROOT ||
    (process.env.NODE_ENV === 'production'
      ? '/app/backup-control'
      : join(process.cwd(), '..', 'data', 'backup-control'));

  async list() {
    let entries: string[] = [];
    try {
      entries = await readdir(this.backupRoot);
    } catch {
      return { items: [], total: 0 };
    }

    const manifests = await Promise.all(
      entries
        .filter((entry) => /^[0-9]{8}T[0-9]{6}Z$/.test(entry))
        .map((entry) => this.readManifest(entry)),
    );
    const items = manifests
      .filter((item): item is BackupManifest => Boolean(item))
      .sort((a, b) => b.backupId.localeCompare(a.backupId));
    return { items, total: items.length };
  }

  async inventory() {
    const { items } = await this.list();
    const latest = items[0];
    const managed = (key: string) => latest?.assets?.[key] === true;
    const encrypted = (key: string) =>
      Boolean(latest?.encryptedSecrets) && managed(key);
    return {
      latestBackupId: latest?.backupId || null,
      checkedAt: new Date().toISOString(),
      assets: [
        this.asset(
          'database',
          'PostgreSQL 数据库',
          'database/blog.dump',
          managed('database'),
        ),
        this.asset(
          'uploads',
          '上传与媒体文件',
          'uploads/uploads.tar.zst',
          managed('uploads'),
        ),
        this.asset(
          'docker',
          'Docker Compose 配置',
          'config/docker/',
          managed('docker'),
        ),
        this.asset('caddy', 'Caddy 站点配置', 'config/caddy/', managed('caddy')),
        this.asset(
          'systemd',
          'systemd 服务与定时器',
          'config/systemd/',
          managed('systemd'),
        ),
        this.asset(
          'cron',
          'crontab 与 cron.d',
          'config/cron/',
          managed('cron'),
        ),
        this.asset(
          'runtime',
          '服务器运行环境清单',
          'config/runtime/',
          managed('runtime'),
        ),
        this.asset(
          'source',
          '完整 Git 源码 Bundle',
          'project/corner-source.bundle',
          managed('source'),
        ),
        this.asset(
          'production-env',
          '生产环境变量与全部应用密钥',
          'secrets/secrets.tar.enc',
          managed('productionEnv'),
          encrypted('productionEnv'),
        ),
        this.asset(
          'development-env',
          '开发数据环境变量',
          'secrets/secrets.tar.enc',
          managed('developmentEnv'),
          encrypted('developmentEnv'),
        ),
        this.asset(
          'ssh',
          '服务器 SSH 配置、授权与部署密钥',
          'secrets/secrets.tar.enc',
          managed('ssh'),
          encrypted('ssh'),
        ),
        this.asset(
          'certificates',
          'Caddy TLS 证书和账户状态',
          'secrets/secrets.tar.enc',
          managed('certificates'),
          encrypted('certificates'),
        ),
      ],
    };
  }

  async status() {
    await mkdir(this.controlRoot, { recursive: true, mode: 0o750 });
    const current = await this.readJson(
      join(this.controlRoot, 'last-result.json'),
    );
    const action =
      (await this.exists('restore.request')) ||
      (await this.exists('restore.processing'))
        ? 'restore'
        : (await this.exists('backup.request')) ||
            (await this.exists('backup.processing'))
          ? 'backup'
          : null;
    if (action && current?.status !== 'running') {
      return {
        action,
        status: 'queued',
        message: '请求已提交，等待宿主机执行',
      };
    }
    return (
      current || {
        action: null,
        status: 'idle',
        message: '当前没有运行中的任务',
      }
    );
  }

  async requestBackup(actorId: string) {
    await this.assertIdle();
    await this.writeRequest('backup.request', {
      action: 'backup',
      requestedBy: actorId,
      requestedAt: new Date().toISOString(),
    });
    return { status: 'queued', message: '完整服务器备份请求已提交' };
  }

  async requestRestore(
    backupId: string,
    actorId: string,
    recoveryToken: string,
    confirmation: string,
  ) {
    if (!/^[0-9]{8}T[0-9]{6}Z$/.test(backupId)) {
      throw new NotFoundException('备份不存在');
    }
    if (confirmation !== `RESTORE ${backupId}`) {
      throw new ForbiddenException('恢复确认文本不正确');
    }
    this.verifyRecoveryToken(recoveryToken);
    const manifest = await this.readManifest(backupId);
    if (!manifest) throw new NotFoundException('备份不存在或清单损坏');
    await this.assertIdle();
    await this.writeRequest('restore.request', {
      action: 'restore',
      backupId,
      requestedBy: actorId,
      requestedAt: new Date().toISOString(),
    });
    return {
      status: 'queued',
      message: '恢复请求已提交，系统会先创建安全备份再恢复数据',
    };
  }

  private asset(
    key: string,
    label: string,
    archivePath: string,
    managed: boolean,
    encrypted = false,
  ) {
    return { key, label, archivePath, managed, encrypted };
  }

  private async readManifest(backupId: string): Promise<BackupManifest | null> {
    const value = await this.readJson(
      join(this.backupRoot, backupId, 'manifest.json'),
    );
    if (
      !value ||
      value.backupId !== backupId ||
      typeof value.archive !== 'string' ||
      !/^corner-backup-[0-9]{8}T[0-9]{6}Z\.tar\.zst$/.test(value.archive)
    ) {
      return null;
    }
    try {
      const archive = await stat(
        join(this.backupRoot, backupId, value.archive),
      );
      if (!archive.isFile()) return null;
    } catch {
      return null;
    }
    return value as BackupManifest;
  }

  private async readJson(path: string): Promise<any | null> {
    try {
      return JSON.parse(await readFile(path, 'utf8'));
    } catch {
      return null;
    }
  }

  private async exists(name: string) {
    try {
      await access(join(this.controlRoot, name));
      return true;
    } catch {
      return false;
    }
  }

  private async assertIdle() {
    await mkdir(this.controlRoot, { recursive: true, mode: 0o750 });
    const names = [
      'backup.request',
      'backup.processing',
      'restore.request',
      'restore.processing',
    ];
    if (
      (await Promise.all(names.map((name) => this.exists(name)))).some(Boolean)
    ) {
      throw new ConflictException('已有备份或恢复任务正在执行');
    }
  }

  private async writeRequest(name: string, payload: Record<string, unknown>) {
    try {
      await writeFile(join(this.controlRoot, name), JSON.stringify(payload), {
        encoding: 'utf8',
        // The host-side systemd service runs as ubuntu while the container
        // writes as its isolated root user. Requests contain no credentials.
        mode: 0o644,
        flag: 'wx',
      });
    } catch (error: any) {
      if (error?.code === 'EEXIST') {
        throw new ConflictException('已有同类任务等待执行');
      }
      throw error;
    }
  }

  private verifyRecoveryToken(provided: string) {
    const expected = process.env.BACKUP_RECOVERY_TOKEN?.trim() || '';
    if (expected.length < 32) {
      throw new ServiceUnavailableException('服务器尚未配置备份恢复口令');
    }
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided.trim());
    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      throw new ForbiddenException('恢复口令不正确');
    }
  }
}

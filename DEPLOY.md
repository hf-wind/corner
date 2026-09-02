# 风隅随笔部署手册

## 无本地数据库的开发环境

开发数据使用服务器上的独立 Compose 项目 `corner-dev-data`，与生产数据库、Redis、目录和凭据完全隔离。两个端口只监听服务器回环地址，必须通过 `ubuntu` 账户的 SSH 隧道访问，不对公网开放。

Windows PowerShell：

```powershell
.\scripts\dev.ps1 -Init
```

首次使用加 `-Init`，脚本会在服务器 `/srv/corner/dev-data` 准备独立数据服务，在本地生成被 Git 忽略的 `backend/.env.tunnel`，初始化测试数据库，并自动启动 SSH 隧道、后端和前端。保持当前窗口开启，按 `Ctrl+C` 会统一停止服务并清理开发端口。

后续启动只需运行 `.\scripts\dev.ps1 -SkipSetup`。如果需要重新执行迁移和种子数据，可再次加 `-Init`；窗口异常关闭后可执行 `.\scripts\dev.ps1 -Stop` 清理本项目残留端口。本地访问地址为前端 `http://localhost:3000`、后端 `http://localhost:4000/api`；本地无需安装 PostgreSQL 或 Redis。

日常运维、日志、备份邮件、版本发布和故障处理见 [OPERATIONS.md](./OPERATIONS.md)。

生产环境使用 Docker Compose。宿主机只需安装 Docker、Git 和基础运维工具，Node.js、PostgreSQL、Redis、前端及后端运行环境都封装在镜像中。

## 生产架构

```text
Internet -> Caddy :80/:443 -> frontend :3000
                           -> backend :4000 -> PostgreSQL :5432
                                            -> Redis :6379
```

- Caddy 自动申请和续期 `corner.ink`、`www.corner.ink` 的 HTTPS 证书。
- PostgreSQL、Redis、前端和后端均不映射宿主机公网端口。
- `www.corner.ink` 永久跳转到 `https://corner.ink`。
- 后端容器启动时自动执行 `prisma migrate deploy`。

## 服务器目录

```text
/srv/corner/
├── app/       # Git 工作区，可随时重新克隆
├── data/      # PostgreSQL、Redis、上传文件和 Caddy 状态
│   └── backup-control/ # 后台与宿主机 systemd 间的受控请求目录
└── backups/   # 完整迁移归档、清单与校验和
```

迁移服务器时只需迁移 `/srv/corner/backups` 中的最新完整备份，并重新克隆仓库。应用代码与持久数据不混放。

## 环境变量

在 `/srv/corner/app/.env` 配置生产变量，模板见 `.env.example`。必须配置：

- `POSTGRES_PASSWORD`
- `REDIS_PASS`
- `JWT_SECRET`
- `SEED_ADMIN_PASSWORD`
- `ACME_EMAIL`
- `DATA_ROOT=/srv/corner/data`
- `BACKUP_ROOT=/srv/corner/backups`
- `BACKUP_ENCRYPTION_KEY`：至少 32 位，只用于加密敏感资产包
- `BACKUP_RECOVERY_TOKEN`：至少 32 位，后台恢复的独立二次口令

DeepSeek 可使用 `DEEPSEEK_API_KEY` 或兼容变量 `AI_API_KEY`。`.env` 包含密钥，权限必须为 `600`，不得提交 Git。

## 首次部署

```bash
sudo install -d -o ubuntu -g ubuntu /srv/corner/{app,data,backups}
git clone git@github.com:hf-wind/corner.git /srv/corner/app
cd /srv/corner/app
cp .env.example .env
chmod 600 .env
# 编辑 .env 后生成提交记录并启动
bash ./scripts/export-git-log.sh
docker compose config --quiet
docker compose up -d --build --wait
docker compose exec -T backend npm run prisma:seed
curl --fail https://corner.ink/api/health
```

`prisma:seed` 是幂等初始化脚本，会写入管理员、站点设置、文章、瞬间、书影、表情和 AI 模型配置。它不会在每次发布时自动运行。

## 备份与迁移

创建完整备份：

```bash
cd /srv/corner/app
./scripts/backup.sh
```

每个恢复点包含 `corner-backup-<时间>.tar.zst`、`manifest.json`、`SHA256SUMS` 和报告。归档内部包括：

- `database/blog.dump`：PostgreSQL 自定义格式备份
- `uploads/uploads.tar.zst`：上传和媒体文件
- `config/`：Caddy、Docker Compose、systemd、cron 与运行环境清单
- `project/corner-source.bundle`：包含全部 refs 的 Git Bundle
- `secrets/secrets.tar.enc`：AES-256-CBC + PBKDF2 加密的生产/开发 `.env`、SSH 目录和 Caddy TLS 状态

敏感资产不会以明文进入邮件附件。备份通知只发送到 `BACKUP_NOTIFICATION_EMAIL_TO`（默认 QQ 邮箱）；完整归档不超过 `BACKUP_EMAIL_MAX_MB`（默认 20MB）时随通知邮件附加归档，超过阈值时仅发送清晰的报告正文，不会发送大附件。

建议通过系统定时器或 cron 每日执行，并将 `/srv/corner/backups` 再同步到对象存储或另一台机器。只保存在同一块系统盘不构成灾备。

仓库已提供每日备份的 systemd timer：

```bash
sudo cp deploy/systemd/corner-backup.* deploy/systemd/corner-backup-control.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now corner-backup.timer corner-backup-control.path
systemctl list-timers corner-backup.timer
```

在新服务器恢复：

```bash
cd /srv/corner/app
CONFIRM_RESTORE=corner ./scripts/restore.sh /path/to/backup
```

恢复脚本会先创建完整安全备份，再替换数据库和上传文件。现有上传目录会改名为 `uploads.pre-restore-<时间>`。后台恢复额外要求管理员权限、独立恢复口令和精确确认文本，且不会覆盖 SSH、证书或系统服务。迁移新服务器时，使用单独保管的 `BACKUP_ENCRYPTION_KEY` 解密 `secrets.tar.enc`，人工检查目标路径后再恢复系统级资产。

## CI/CD

`.github/workflows/deploy.yml` 在每次推送 `main` 后执行：

1. 使用 Node.js 22 安装依赖并测试、构建前后端。
2. 使用独立 CI SSH 密钥连接生产服务器。
3. 发布前执行一次完整备份。
4. 仅允许 fast-forward 更新代码。
5. 调用 `scripts/deploy.sh` 构建镜像、启动服务并等待健康检查。
6. 请求 `https://corner.ink/api/health` 完成外部验收。

GitHub Actions 的 `production` environment 需要以下 Secrets：

| Secret | 值 |
|---|---|
| `SSH_HOST` | `124.222.190.43` |
| `SSH_USER` | `ubuntu` |
| `SSH_PRIVATE_KEY` | CI 专用私钥 |
| `SSH_KNOWN_HOSTS` | `ssh-keyscan -H 124.222.190.43` 的结果 |
| `APP_PATH` | `/srv/corner/app` |

服务器克隆私有仓库使用单独、只读的 GitHub deploy key；不要复制个人 SSH 私钥，也不要在服务器长期保存 GitHub PAT。

## 常用操作

```bash
cd /srv/corner/app
docker compose ps
docker compose logs --tail=200 backend
docker compose logs --tail=200 caddy
docker compose pull
bash ./scripts/export-git-log.sh
docker compose up -d --build --wait
./scripts/backup.sh
```

防火墙只开放 `22/tcp`、`80/tcp`、`443/tcp` 和 `443/udp`。PostgreSQL 与 Redis 只能通过 Compose 内部网络访问。

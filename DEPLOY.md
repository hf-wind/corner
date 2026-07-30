# 风隅随笔部署手册

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
└── backups/   # 数据库、上传文件、环境配置的时间点备份
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

DeepSeek 可使用 `DEEPSEEK_API_KEY` 或兼容变量 `AI_API_KEY`。`.env` 包含密钥，权限必须为 `600`，不得提交 Git。

## 首次部署

```bash
sudo install -d -o ubuntu -g ubuntu /srv/corner/{app,data,backups}
git clone git@github.com:hf-wind/corner.git /srv/corner/app
cd /srv/corner/app
cp .env.example .env
chmod 600 .env
# 编辑 .env 后启动
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

备份目录包括：

- `database.dump`：PostgreSQL 自定义格式备份
- `uploads.tar.gz`：上传文件
- `environment.env`：生产环境配置，包含密钥
- `git-commit.txt`：备份对应的代码提交
- `SHA256SUMS`：完整性校验

建议通过系统定时器或 cron 每日执行，并将 `/srv/corner/backups` 再同步到对象存储或另一台机器。只保存在同一块系统盘不构成灾备。

仓库已提供每日备份的 systemd timer：

```bash
sudo cp deploy/systemd/corner-backup.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now corner-backup.timer
systemctl list-timers corner-backup.timer
```

在新服务器恢复：

```bash
cd /srv/corner/app
cp /path/to/backup/environment.env .env
chmod 600 .env
CONFIRM_RESTORE=corner ./scripts/restore.sh /path/to/backup
```

恢复脚本会替换当前数据库。现有上传目录不会直接删除，而会改名为 `uploads.pre-restore-<时间>` 以便回退。

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
docker compose up -d --build --wait
./scripts/backup.sh
```

防火墙只开放 `22/tcp`、`80/tcp`、`443/tcp` 和 `443/udp`。PostgreSQL 与 Redis 只能通过 Compose 内部网络访问。

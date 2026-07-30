# 风隅随笔 v1.0.0 运维与迁移手册

## 目录与服务

生产代码位于 `/srv/corner/app`，持久数据位于 `/srv/corner/data`，备份位于 `/srv/corner/backups`。代码目录可以重新克隆；PostgreSQL、Redis、上传文件、Caddy 证书和日志不能跟随代码目录删除。

```bash
cd /srv/corner/app
docker compose ps
docker compose images
curl --fail https://corner.ink/api/health
```

## 生产环境变量

敏感配置只放在 `/srv/corner/app/.env`，权限必须为 `600`。Turnstile 的 site key 可以公开，secret key 和 QQ SMTP 授权码不可提交 Git。

```dotenv
TURNSTILE_SITE_KEY=你的-site-key
TURNSTILE_SECRET_KEY=你的-secret-key
TURNSTILE_HOSTNAME=corner.ink
TURNSTILE_ENABLED=true

EMAIL_SMTP_HOST=smtp.qq.com
EMAIL_SMTP_PORT=465
EMAIL_SMTP_SECURE=true
EMAIL_SMTP_USER=1833079849@qq.com
EMAIL_SMTP_PASS=QQ邮箱SMTP授权码
EMAIL_FROM_NAME=风隅随笔
EMAIL_FROM_ADDRESS=1833079849@qq.com

BACKUP_ROOT=/srv/corner/backups
BACKUP_RETENTION_DAYS=14
BACKUP_EMAIL_TO=1833079849@qq.com
BACKUP_EMAIL_MAX_MB=20
```

修改后执行：

```bash
chmod 600 .env
docker compose config --quiet
docker compose up -d --build --wait
```

本地开发的 `NODE_ENV` 不是 `production`，前后端默认跳过 Turnstile。若使用生产构建的 Compose 容器做本地调试，在本地 `.env` 设置 `TURNSTILE_ENABLED=false`；生产环境必须保持为 `true`，缺少 secret key 时认证接口会拒绝请求。

使用远程开发数据时，运行 `scripts/dev.ps1`。它会在一个 PowerShell 窗口中自动启动 SSH 隧道、后端和前端，同时转发 PostgreSQL `15432` 和 Redis `16379`；按 `Ctrl+C` 会统一停止进程，并清理 `3000`、`4000`、`15432`、`16379` 的本项目残留监听。首次使用运行 `scripts/dev.ps1 -Init`，后续可运行 `scripts/dev.ps1 -SkipSetup`。

## 日志

容器标准日志按每个容器 `10MB x 5` 自动轮转：

```bash
cd /srv/corner/app
docker compose logs -f --tail=200 backend
docker compose logs -f --tail=200 frontend
docker compose logs -f --tail=200 caddy
docker compose logs --since=30m backend
```

Caddy 访问日志保存在 `/srv/corner/data/logs/caddy/access.log`，滚动文件保留 14 天。备份定时任务日志：

```bash
journalctl -u corner-backup.service -n 200 --no-pager
journalctl -u corner-backup.service -f
systemctl status corner-backup.timer
systemctl list-timers corner-backup.timer
```

后台“邮件”页面可以查看验证码和通知邮件的发送状态及 SMTP 错误。验证码接口只有 SMTP 实际发送成功后才返回成功。

## Redis 缓存与限流

匿名公共 GET 使用 Redis 缓存，响应头 `X-Cache` 为 `HIT`、`MISS` 或 `BYPASS`。登录态、后台、SSE、健康检查、用户私有响应和会增加浏览量的详情接口不会缓存。成功写操作会推进全局缓存版本，使旧缓存立即失效。

所有实例共享 Redis 限流。认证、验证码、评论、AI、友链探测、上传和搜索有独立的更严格额度；触发时返回 HTTP `429` 和 `Retry-After`。

```bash
docker compose exec -T redis redis-cli -a "$REDIS_PASS" INFO stats
docker compose exec -T redis redis-cli -a "$REDIS_PASS" --scan --pattern 'corner:http-cache:*'
docker compose exec -T redis redis-cli -a "$REDIS_PASS" --scan --pattern 'corner:rate:*'
```

不要在生产高峰执行 `KEYS *`。缓存故障会降级到数据库，限流故障会记录后端错误并暂时放行，因此 Redis 异常时应立即处理。

## 备份与恢复

每天约北京时间 03:30 自动备份。每个目录包含数据库、上传文件、环境配置、Git 提交和 SHA256；超过 14 天的备份目录会自动删除。邮件附件包含数据库和上传文件，但明确排除 `environment.env`；附件超过默认 20MB 时只发送报告，完整备份仍留在服务器。

```bash
cd /srv/corner/app
./scripts/backup.sh
latest="$(find /srv/corner/backups -mindepth 1 -maxdepth 1 -type d | sort | tail -n 1)"
(cd "$latest" && sha256sum --check SHA256SUMS)
```

恢复会替换数据库。先确认目标目录，再执行：

```bash
cd /srv/corner/app
cp /path/to/backup/environment.env .env
chmod 600 .env
CONFIRM_RESTORE=corner ./scripts/restore.sh /path/to/backup
```

## 迁移服务器

1. 在旧服务器执行一次手工备份并校验 `SHA256SUMS`。
2. 将完整备份目录复制到新服务器，不要通过邮件附件迁移 `.env`。
3. 新服务器安装 Docker Engine、Compose plugin、Git、UFW 和 fail2ban。
4. 创建 `/srv/corner/{app,data,backups}`，克隆私有仓库并安装只读 deploy key。
5. 从备份复制 `environment.env` 为 `.env`，更新 DNS 到新公网 IP。
6. 使用 `restore.sh` 恢复，再启动 Compose；检查迁移、HTTPS、登录、邮件、Turnstile 和上传文件。
7. 安装 `deploy/systemd/corner-backup.*` 并启用 timer。
8. 更新 GitHub Actions 的 `SSH_HOST`、`SSH_KNOWN_HOSTS` 和必要的 CI SSH 密钥。

数据恢复完成前不要停旧服务器。DNS 切换并验收至少 24 小时后，再下线旧机。

## 版本发布

当前正式版从 `v1.0.0` 开始。`main` 每次成功验证并部署后默认递增 patch，自动创建 annotated tag 和 GitHub Release；说明取自上一个 tag 到当前提交的提交信息。

```bash
# 默认 patch，例如 v1.0.0 -> v1.0.1
git commit -m "fix: 修复某问题"
git push origin main

# 下一次自动发布 minor 或 major
git commit -m "feat: 新功能 [release:minor]"
git commit -m "feat!: 大版本调整 [release:major]"

# 这次提交不生成版本
git commit -m "docs: 更新文档 [skip release]"

# 对当前 main 手工指定发布级别
gh workflow run deploy.yml -f release=minor
gh workflow run deploy.yml -f release=major
```

查看结果：

```bash
git fetch --tags
git tag --sort=-version:refname | head
gh run list --workflow deploy.yml --limit 5
gh release list --limit 5
```

## 安全边界

生产站只监听 22、80、443；PostgreSQL 和 Redis 不映射公网端口。内容管理、用户列表、媒体库、邮件日志、系统信息和 AI 创作接口只允许管理员。普通用户只能管理自己的资料、评论、点赞和头像上传。后台“用户”页面支持搜索、角色调整和账号启停；禁用状态立即作用于现有 JWT，系统禁止当前管理员自我停用及停用最后一个有效管理员。

前端会阻止非管理员常见的 F12、检查元素快捷键和右键菜单，但浏览器端无法从技术上真正禁用开发者工具。这一层只用于减少误操作，不能代替服务端鉴权、Turnstile、限流、CSP 和安全响应头。

一旦密钥曾出现在聊天、日志或终端历史中，应在对应平台轮换。服务器和 CI 不再需要个人 GitHub PAT，历史 PAT 应撤销。

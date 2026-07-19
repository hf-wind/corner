# Corner 博客 — 部署文档

## 项目概览

Corner 是一个全栈博客系统，采用 Docker 容器化部署。

| 前端 | 后端 | 数据库 | 缓存 | 反向代理 |
|------|------|--------|------|----------|
| Nuxt 3 (Vue 3) | NestJS 11 | PostgreSQL 16 | Redis 7 | Nginx |

---

## 架构

```
用户 → Nginx (:80) → /api → backend (:4000) → PostgreSQL
                  → /     → frontend (:3000)
                  → /uploads → backend (:4000)
                  ───────────────────────
                  Redis (session cache, 无外部暴露)
```

### 端口映射

| 服务 | 容器内端口 | 宿主机端口（可配） | 说明 |
|------|-----------|-------------------|------|
| Nginx | 80 | `${NGINX_PORT:-80}` | 唯一对外入口 |
| backend | 4000 | — | 仅内部访问 |
| frontend | 3000 | — | 仅内部访问 |
| PostgreSQL | 5432 | — | 仅内部 |
| Redis | 6379 | — | 仅内部 |

---

## 目录结构

```
corner/
├── .github/workflows/deploy.yml   # GitHub Actions 自动部署
├── backend/                        # NestJS 后端
│   ├── prisma/schema.prisma        # 数据库模型
│   ├── src/                        # 源代码
│   └── Dockerfile
├── frontend/                       # Nuxt 3 前端
│   ├── pages/                      # 页面组件
│   ├── layouts/                    # 布局组件
│   └── Dockerfile
├── nginx/conf.d/default.conf       # Nginx 反向代理配置
├── docker-compose.yml              # 生产环境编排
├── docker-compose.dev.yml          # 开发环境编排
├── .env                            # 环境变量（不提交 git）
├── .env.example                    # 环境变量模板（提交 git）
└── .gitignore
```

---

## 环境变量

### `.env`（本地开发，不提交）

```env
# Database
POSTGRES_DB=corner
POSTGRES_USER=corner
POSTGRES_PASSWORD=your_password

# Redis
REDIS_PASS=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# App
NGINX_PORT=80
```

### `.env.example`（提交流程模板）

仅含占位值，密码不可泄露。每次新增变量时同步更新此模板。

---

## 本地开发

```bash
# 1. 克隆并安装依赖
git clone git@github.com:hf-wind/corner.git

# 2. 创建 .env（复制 .env.example 并填入真实密码）
cp .env.example .env

# 3. 启动所有服务
docker compose -f docker-compose.dev.yml up -d --build

# 前端热更新（也可在容器外独立运行）
cd frontend && npx nuxi dev
```

---

## 生产部署

### 服务器要求

| 项目 | 规格 |
|------|------|
| OS | Ubuntu 22.04+ |
| Docker | 24+ |
| Docker Compose | v2+ |
| 端口 | 80 (HTTP), 22 (SSH) |
| 域名 | 需指向服务器 IP |

### 首次部署

```bash
# 1. 安装 Docker
curl -fsSL https://get.docker.com | bash

# 2. 克隆仓库
git clone git@github.com:hf-wind/corner.git ~/corner
cd ~/corner

# 3. 创建 .env（生产环境，填写强密码）
cat > .env << 'EOF'
POSTGRES_PASSWORD=<随机强密码>
REDIS_PASS=<随机强密码>
JWT_SECRET=<随机字符串>
NGINX_PORT=80
EOF

# 4. 启动
docker compose up -d --build
```

### 更新部署

方式一（推荐）：**推送 main 分支**，GitHub Actions 自动部署

方式二：**服务器手动部署**

```bash
cd ~/corner
git pull
docker compose up -d --build
```

---

## CI/CD 流水线

文件：`.github/workflows/deploy.yml`

### 触发条件

- 推送 `main` 分支
- 手动：GitHub → Actions → Deploy → Run workflow

### 流程

```
push main → 触发 Actions → SSH 连接服务器
                         → git pull
                         → docker compose up -d --build
```

### GitHub Secrets 配置

| Secret | 值 | 说明 |
|--------|----|------|
| `SSH_HOST` | `124.222.190.43` | 服务器 IP |
| `SSH_USER` | `ubuntu` | SSH 用户名 |
| `SSH_PASS` | 密码 | SSH 登录密码 |
| `APP_PATH` | `/home/ubuntu/corner` | 项目路径 |

> 注意：所有密码变量通过 `${VAR}` 引用，不硬编码在 `docker-compose.yml` 中。

---

## 数据库

### 模型（Prisma ORM）

| 表 | 说明 |
|----|------|
| `users` | 用户（作者/管理员） |
| `posts` | 文章（支持草稿/发布状态） |
| `categories` | 分类（支持无限层级） |
| `tags` | 标签 |
| `post_tags` | 文章-标签多对多关系 |
| `comments` | 评论（支持回复嵌套） |
| `media` | 媒体文件（图片上传） |
| `settings` | 键值对配置 |
| `visit_stats` | 访问统计 |

### 迁移

```bash
# 生成 Prisma Client
npx prisma generate

# 推送 schema 到数据库
npx prisma db push

# 生产环境（docker 内）
docker compose exec backend npx prisma db push
```

---

## Nginx 配置

```nginx
# nginx/conf.d/default.conf
location /api     → backend:4000    # API 请求
location /uploads → backend:4000    # 上传文件
location /        → frontend:3000   # 前端页面（含 WebSocket 支持）
```

Nginx 配置挂载方式：

```yaml
volumes:
  - ./nginx/conf.d:/etc/nginx/conf.d  # 配置文件热更新，无需重建
```

---

## 常见排查

### 查看服务状态

```bash
docker compose ps
docker compose logs backend -f   # 后端日志
docker compose logs frontend -f  # 前端日志
docker compose logs nginx -f     # Nginx 日志
```

### 健康检查端点

- API: `http://localhost/api/health` → `{"status":"ok"}`
- 前端: `http://localhost/` → HTTP 200

### 重建单个服务

```bash
docker compose up -d --build backend   # 仅重建后端
docker compose up -d --build frontend  # 仅重建前端
```

### 容器间网络问题

所有服务在 `corner_default` 网络内，通过服务名互相访问：

- 后端数据库连接：`postgres:5432`
- 后端 Redis 连接：`redis:6379`
- 前端请求 API：`http://backend:4000`

### Actions 部署失败

1. 检查 GitHub Secrets 是否配置完整（SSH_HOST, SSH_USER, SSH_PASS, APP_PATH）
2. SSH 登录服务器，手动运行 `cd ~/corner && git pull && docker compose up -d --build` 确认环境正常
3. 服务器 iptables 清理（`sudo iptables -L INPUT -n` 确认 policy ACCEPT）

---

## 安全要点

- `.env` 含数据库密码、JWT 密钥等敏感信息，**绝不提交 git**
- `docker-compose.yml` 中的密码通过 `${VAR}` 引用，防止硬编码泄露
- JWT 密钥和数据库密码建议使用 `openssl rand -base64 32` 生成
- Nginx 为唯一对外暴露端口，backend/frontend 不直接暴露
- 所有敏感文件在 `.gitignore` 中排除

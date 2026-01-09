# Docker 部署指南

本指南介绍 `docker` 目录下各服务、关键文件与使用方式，帮助在本地或服务器上快速完成 Blog 项目的容器化部署。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `docker-compose.yml` | 定义 MySQL、Redis、后端、前端等所有服务与依赖关系 |
| `backend/Dockerfile` | Node.js 后端镜像定义，基于 `node:lts-alpine`，使用 pnpm@6.11.0 安装生产依赖并启动 `node app.js` |
| `frontend/Dockerfile` | 前端构建 + Nginx 托管的多阶段镜像，构建阶段使用 `node:lts-alpine`，生产阶段使用 `nginx:alpine` |
| `nginx/nginx.conf` | 自定义 Nginx 配置，含 Gzip 压缩、静态资源缓存、API 代理缓存、接口代理和健康检查 |
| `scripts/init.sql` | MySQL 初始化脚本，建库并为关键字段创建索引（users.username 唯一索引，articles 表的多个索引） |
| `scripts/load-images.sh` | 从 `backup` 目录加载 Docker 镜像的脚本，用于离线环境或加速启动 |
| `scripts/run-compose.sh` | 一键启动脚本，先加载镜像（如果缺失），再执行 `docker-compose up -d --build` |
| `backup/` | 存放预导出的 Docker 镜像 tar 文件（mysql-latest.tar, redis-latest.tar, node-lts-alpine.tar, nginx-alpine.tar） |

## 服务拓扑

| 服务 | 镜像/构建 | 端口 | 依赖 | 说明 |
| --- | --- | --- | --- | --- |
| mysql | `mysql:8.0` | `DB_PORT`→3306 | - | 使用 `scripts/init.sql` 初始化数据库与索引 |
| redis | `redis:8.4.0` | `REDIS_PORT`→6379 | - | `appendonly yes` 持久化，供后端缓存使用 |
| backend | 自建镜像（Node LTS + pnpm） | `PORT`→3001 | mysql、redis | 读取环境变量连接数据库/缓存，健康检查 `GET /api/health` |
| frontend | Nginx | `FRONTEND_PORT`→80 | backend | Vue 构建产物由 Nginx 托管，`/api` 代理到后端 |

所有服务通过 `blog-network` 互联，并使用 `mysql_data`、`redis_data`、`backend_logs` 三个持久化卷。

## 环境要求

- Docker Engine ≥ 24
- Docker Compose v2
- (可选) `.env` 文件放于仓库根目录以覆盖 `docker-compose.yml` 中的默认值

常用覆盖变量：

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `DB_NAME` | `blog_db` | MySQL 数据库名 |
| `DB_USER` | `blog_user` | 数据库业务账号 |
| `DB_PASSWORD` | `root123` | 数据库 root/业务账号密码 |
| `DB_PORT` | `3306` | 暴露到宿主机的数据库端口 |
| `REDIS_PORT` | `6379` | Redis 暴露端口 |
| `PORT` | `3001` | 后端服务暴露端口 |
| `FRONTEND_PORT` | `80` | 前端（Nginx）暴露端口 |
| `JWT_SECRET` | `your_jwt_secret_key_change_in_production` | 生产环境务必修改 |

## 快速启动

### 方式一：使用启动脚本（推荐）

1. 确保仓库根目录包含 `packages/` 代码与 workspace 配置（Dockerfile 会引用）。
2. 可选：在仓库根目录创建 `.env`，设置数据库密码等敏感信息。
3. 执行启动脚本：
   ```bash
   cd docker
   bash scripts/run-compose.sh
   ```
   脚本会自动检查并加载 `backup/` 目录中的镜像（如果缺失），然后启动所有服务。

### 方式二：直接使用 docker-compose

1. 确保仓库根目录包含 `packages/` 代码与 workspace 配置。
2. 可选：在仓库根目录创建 `.env`，设置数据库密码等敏感信息。
3. 位于项目根目录执行：
   ```bash
   cd docker
   docker-compose up -d --build
   ```

### 访问服务

- 前端：通过浏览器访问 `http://localhost`（或自定义 `FRONTEND_PORT`）
- 后端接口：默认 `http://localhost:3001/api`
- 健康检查：`http://localhost:3001/api/health` 或 `http://localhost/health`

## 常用操作

| 操作 | 命令 |
| --- | --- |
| 查看日志 | `docker-compose logs -f backend`（服务名可替换） |
| 停止服务 | `docker-compose down` |
| 停止并清理卷 | `docker-compose down -v` |
| 只重建后端 | `docker-compose up -d --build backend` |
| 只重建前端 | `docker-compose up -d --build frontend` |
| 手动加载镜像 | `bash scripts/load-images.sh`（从 backup 目录加载预导出的镜像） |

## 健康检查与代理

- **MySQL**：`mysqladmin ping` 保证数据库可用，健康检查间隔 10s。
- **Redis**：`redis-cli ping` 确认缓存正常，健康检查间隔 10s。
- **Backend**：`curl http://localhost:3001/api/health`，健康检查间隔 30s，启动等待期 40s。
  ```json
  {
    "code": 200,
    "message": "服务正常",
    "data": {
      "status": "healthy",
      "database": "connected",
      "redis": "connected",
      "memory": {"rss": "112MB", "heapTotal": "42MB", "heapUsed": "33MB"},
      "uptime": "1461s"
    }
  }
  ```
- **Nginx**：通过 `/health` endpoint 提供探针，返回 `200 "healthy\n"`。

### Nginx 代理与缓存

- **API 代理**：`/api` 路由代理至 `backend:3001`，支持 HTTP/1.1 和 WebSocket。
- **API 缓存**：GET/HEAD 请求缓存 60 分钟，404 缓存 1 分钟，支持后台更新和缓存锁定。
- **静态资源**：图片、CSS、JS、字体等文件启用 1 年长缓存，`Cache-Control: public, immutable`。
- **前端路由**：Vue Router 支持，所有路由回退到 `index.html`，HTML 文件禁用缓存。
- **Gzip 压缩**：启用 Gzip，压缩级别 6，支持文本、JSON、JavaScript、XML、字体等类型。

## 数据与日志

- **`mysql_data`**：MySQL 数据文件，位于宿主机 Docker 卷目录。
- **`redis_data`**：Redis AOF 持久化数据，位于容器内 `/data`。
- **`backend_logs`**：后端容器内 `/app/logs`，包含 `combined.log` 和 `error.log`。

删除容器不会清空这些数据，若需重置请附加 `-v` 参数或手动删除卷。

## 镜像管理

### 预导出镜像

项目在 `backup/` 目录提供了预导出的 Docker 镜像，适用于：
- 离线环境部署
- 加速首次启动（避免从 Docker Hub 拉取）
- 版本锁定（确保使用特定版本的镜像）

包含的镜像：
- `mysql-latest.tar` - MySQL 数据库镜像
- `redis-latest.tar` - Redis 缓存镜像
- `node-lts-alpine.tar` - Node.js LTS Alpine 镜像（用于构建）
- `nginx-alpine.tar` - Nginx Alpine 镜像（前端生产环境）

### 使用预导出镜像

`scripts/load-images.sh` 脚本会自动检查镜像是否存在，如果缺失则从 `backup/` 目录加载。也可以手动执行：

```bash
cd docker
bash scripts/load-images.sh
```

### 导出新镜像

如果需要更新备份镜像，可以使用以下命令：

```bash
docker save mysql:8.0 -o docker/backup/mysql-8.0.tar
docker save redis:8.4.0 -o docker/backup/redis-8.4.0.tar
docker save node:lts-alpine -o docker/backup/node-lts-alpine.tar
docker save nginx:alpine -o docker/backup/nginx-alpine.tar
```

## 数据库初始化

`scripts/init.sql` 会在 MySQL 容器首次启动时自动执行，完成以下操作：

1. **创建数据库**：`blog_db`（如果不存在），字符集 `utf8mb4`，排序规则 `utf8mb4_unicode_ci`。
2. **创建索引**（如果不存在）：
   - `users.username` - 唯一索引
   - `articles.author_id, category_id, publish_time` - 联合索引
   - `articles.publish_time` - 单独索引（降序，用于排序）
   - `articles.category_id` - 分类查询索引
   - `articles.author_id` - 作者查询索引

注意：表结构由 Sequelize ORM 自动创建，此脚本仅负责数据库和索引的初始化。

## 排错提示

- **依赖未复制**：确保在 `docker/` 目录执行 compose，Dockerfile 构建上下文为项目根目录（`context: ..`），能访问 `package.json`、`packages/**`。
- **端口冲突**：修改 `.env` 中的 `*_PORT`。变更后需 `docker-compose up -d`。
- **数据库初始化失败**：首次启动时会挂载 `scripts/init.sql`。如果脚本执行报错，可删除 `mysql_data` 卷后重新启动：
  ```bash
  docker-compose down -v
  docker-compose up -d
  ```
- **前端 404**：Nginx `try_files` 已处理前端路由，若仍报错检查构建产物是否生成或重新构建镜像：
  ```bash
  docker-compose up -d --build frontend
  ```
- **镜像加载失败**：如果 `load-images.sh` 加载失败，脚本会继续执行，Docker Compose 会从 Docker Hub 拉取镜像。
- **健康检查失败**：确保后端服务已正常启动，检查日志：`docker-compose logs backend`。

## 生产环境部署

如需生产环境部署，建议：

1. **修改敏感配置**：在 `.env` 中设置强密码和 `JWT_SECRET`。
2. **启用 HTTPS**：在 `nginx/nginx.conf` 中取消注释 HTTPS 配置段，配置 SSL 证书。
3. **使用外部反向代理**：考虑使用 Traefik、Caddy 或云服务商的负载均衡器。
4. **数据备份**：定期备份 `mysql_data` 和 `redis_data` 卷。
5. **日志管理**：配置日志轮转和集中日志收集（如 ELK、Loki）。
6. **监控告警**：配置健康检查监控和告警系统。


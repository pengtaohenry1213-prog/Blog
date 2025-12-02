## 技术栈学习路径

### 第一阶段：容器化基础（1-2 周）

#### 1. Docker 基础
- 核心概念：镜像、容器、数据卷、网络
- 实践：
  - 运行 `docker run hello-world`
  - 理解 `docker-compose.yml` 中的服务定义
  - 学习 Dockerfile 多阶段构建（如 `frontend/Dockerfile`）
- 资源：
  - Docker 官方文档：https://docs.docker.com/
  - 重点：`docker-compose` 命令、服务依赖、健康检查

#### 2. Docker Compose
- 核心概念：服务编排、网络、数据卷、环境变量
- 实践：
  - 分析项目中的 `docker-compose.yml`
  - 理解 `depends_on` 和健康检查
  - 学习 `.env` 文件配置
- 重点：
  - 服务间通信（`blog-network`）
  - 数据持久化（`volumes`）
  - 健康检查配置

### 第二阶段：数据库与缓存（1-2 周）

#### 3. MySQL
- 核心概念：数据库、表、索引、SQL
- 实践：
  - 查看 `scripts/init.sql` 了解索引设计
  - 学习联合索引（如 `articles` 表的 `author_id, category_id, publish_time`）
  - 理解唯一索引（`users.username`）
- 重点：
  - 索引优化原理
  - 字符集与排序规则（`utf8mb4`）
  - 数据库初始化流程

#### 4. Redis
- 核心概念：键值存储、持久化、缓存策略
- 实践：
  - 理解 AOF 持久化（`appendonly yes`）
  - 学习缓存策略（如 README 中的分级缓存）
- 重点：
  - 缓存过期时间设置
  - 缓存预热与失效策略

### 第三阶段：Web 服务器与反向代理（1 周）

#### 5. Nginx
- 核心概念：反向代理、负载均衡、静态文件服务
- 实践：
  - 分析 `nginx/nginx.conf` 配置
  - 理解以下配置：
    - Gzip 压缩（第 27-37 行）
    - 代理缓存（第 39-41 行，72-82 行）
    - 静态资源缓存（第 99-103 行）
    - 前端路由处理（第 121-124 行）
- 重点：
  - `proxy_pass` 反向代理
  - `proxy_cache` 缓存配置
  - `try_files` 前端路由回退
  - `Cache-Control` 缓存头

### 第四阶段：后端开发（2-3 周）

#### 6. Node.js + Express
- 核心概念：中间件、路由、RESTful API
- 实践：
  - 查看 `packages/backend/` 目录结构
  - 理解模块化架构（`modules/` 目录）
  - 学习中间件（认证、错误处理、日志）
- 重点：
  - 健康检查接口实现
  - 环境变量配置
  - 日志管理

#### 7. Sequelize ORM
- 核心概念：模型、迁移、关联
- 实践：
  - 查看 `packages/backend/models/` 中的模型定义
  - 理解数据库连接配置

### 第五阶段：前端构建与部署（1 周）

#### 8. 前端构建流程
- 核心概念：多阶段构建、静态资源优化
- 实践：
  - 分析 `frontend/Dockerfile` 的多阶段构建
  - 理解构建产物到 Nginx 的部署流程
- 重点：
  - 构建优化（代码分割、压缩）
  - 静态资源缓存策略

### 第六阶段：高级主题（1-2 周）

#### 9. 健康检查与监控
- 学习点：
  - Docker 健康检查机制
  - 服务依赖管理（`depends_on` + `condition: service_healthy`）
  - 探针设计（如 `/api/health`、`/health`）

#### 10. 性能优化
- 学习点：
  - Gzip 压缩原理与配置
  - 缓存策略（API 缓存、静态资源缓存）
  - 数据库索引优化
  - Redis 缓存预热

#### 11. 安全实践
- 学习点：
  - JWT 认证机制
  - 环境变量管理（敏感信息不硬编码）
  - HTTPS 配置（SSL/TLS）

## 快速学习建议

### 实践优先
1. 本地运行项目：
   ```bash
   cd docker
   bash scripts/run-compose.sh
   ```
2. 修改配置并观察效果：
   - 调整 `nginx.conf` 的 Gzip 级别
   - 修改缓存时间，观察浏览器行为
   - 查看健康检查日志

### 循序渐进
- 先理解单个服务（如 MySQL），再理解服务间关系
- 先理解基础配置，再深入优化策略
- 先本地实践，再学习生产部署

### 重点文件学习顺序
1. `docker-compose.yml` - 整体架构
2. `nginx/nginx.conf` - 反向代理与缓存
3. `scripts/init.sql` - 数据库设计
4. `backend/Dockerfile` 和 `frontend/Dockerfile` - 构建流程

### 推荐学习资源
- Docker：官方文档 + 《Docker 从入门到实践》
- Nginx：官方文档 + Nginx Cookbook
- MySQL：索引优化相关文章
- Redis：Redis 设计与实现

### 学习检查清单
- [ ] 能解释 docker-compose.yml 中每个服务的作用
- [ ] 理解 Nginx 反向代理和缓存配置
- [ ] 能解释数据库索引的作用和设计原则
- [ ] 理解健康检查的工作机制
- [ ] 能独立配置 Gzip 和缓存策略
- [ ] 理解多阶段构建的优势

建议从 Docker 基础开始，然后逐步深入到各个组件。遇到具体问题可以查看项目中的配置文件，结合实践加深理解。
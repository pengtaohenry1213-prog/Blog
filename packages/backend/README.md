# 后端服务模块 README

## Schema
### 计划: 
```
页面渲染层(Views): await statsApi.getXXX()
      ↓
接口层(API): request({ url:'/stats/xxx', method:'get', params })
      ↓
路由层(Router): (express.Router) router.get('/xxx', authenticate, statsController.getXXX)
      ↓
控制器层(Controller): await statsService.getXXX()
      ↓
服务层(Service): await Article.findAll({ where: {...}, order:[...], limit: 5, attributes: [...] })
      ↓
数据访问层(Modals): sequelize.define(...) 定义xx模型(表), 并创建索引
      ↓
数据库层(MySQL): const sequelize = new Sequelize(...) 创建数据库连接, 并执行 SQL 语句
```

## 项目概述
本模块是个人博客系统的后端服务，基于 Node.js + Express 构建，负责处理前端请求、业务逻辑处理、数据持久化及缓存管理等核心功能, "采用 分层架构设计，遵循 单一职责原则". "分为 路由层 → 控制器层 → 服务层 → 数据访问层 → 数据库层", "这是 RESTful API 服务的 业界标准架构模式". 通过 Sequelize 实现与 MySQL 数据库的交互，结合 Redis 提升系统性能，支持 JWT 身份认证与权限控制。

## 技术栈
- **核心框架**：Node.js (LTS)、Express.js
- **ORM 框架**：Sequelize（面向对象的数据库操作，支持 MySQL）
- **数据库驱动**：mysql2
- **缓存系统**：Redis（Node Redis v4 客户端）
- **认证授权**：JWT (JSON Web Token)、bcryptjs（密码加密）
- **配置管理**：dotenv（环境变量管理）
- **请求验证**：express-validator
- **日志记录**：winston
- **API 文档**：Swagger/OpenAPI（swagger-jsdoc + swagger-ui-express）
- **安全增强**：Helmet.js（设置安全 HTTP 头）、CORS、express-rate-limit（请求限流）

## 目录结构
```plaintext
backend/
├── app.js                    # 应用入口，路由挂载、中间件配置、Swagger、健康检查
├── package.json              # 项目依赖配置 ("dev": "NODE_OPTIONS='' node --watch app.js" 中使用 NODE_OPTIONS='' 避免了Cursor 自动附加debug模式)
├── pnpm-lock.yaml            # 依赖锁定文件
├── README.md                 # 项目说明
│
├── config/                   # 配置模块
│   ├── index.js              # 主配置文件（环境变量加载）
│   ├── database.js           # MySQL 数据库配置
│   └── redis.js              # Redis 缓存配置
│
├── models/                   # 数据库模型（Sequelize）
│   ├── Article.js            # 文章模型
│   ├── Category.js           # 分类模型
│   └── User.js               # 用户模型
│
├── modules/                  # 业务模块（"分为 路由层 → 控制器层 → 服务层 → 数据访问层 → 数据库层"）
│   ├── article/              # 文章业务
│   │   ├── router.js         # 文章路由定义
│   │   ├── controller.js     # 文章控制器（请求处理层）
│   │   └── service.js        # 文章服务（业务逻辑层）
│   ├── user/                 # 用户业务
│   │   ├── router.js         # 用户路由定义
│   │   ├── controller.js     # 用户控制器（请求处理层）
│   │   └── service.js        # 用户服务（业务逻辑层）
│   └── auth/                 # 认证业务
│       ├── router.js         # 认证路由定义
│       ├── controller.js     # 认证控制器（请求处理层）
│       └── service.js        # 认证服务（业务逻辑层）
│
├── middleware/               # 中间件
│   ├── auth.js               # JWT 身份验证中间件
│   ├── errorHandler.js       # 全局错误处理
│   ├── rateLimiter.js        # 请求限流
│   ├── requestLogger.js      # 请求日志
│   └── validator.js          # 数据验证
│
├── utils/                    # 工具函数
│   ├── logger.js             # 日志工具（winston）
│   ├── jwt.js                # JWT 处理
│   ├── bcrypt.js             # 密码加密/验证
│   └── cache.js              # Redis 缓存封装
│
├── scripts/                  # 脚本
│   └── init-db.js            # 数据库初始化脚本
│
└── logs/                     # 日志目录（运行时生成）
    └── error.log             # 错误日志
```

## 功能模块说明

### 1. 路由层
定义 RESTful API 接口，按业务模块划分：
- 文章接口：`/api/articles`（支持 GET/POST/PUT/DELETE）
- 用户接口：`/api/users`（支持登录、信息管理）
- 权限接口：`/api/auth`（支持权限验证）

### 2. 控制器层
处理 HTTP 请求与响应，调用对应服务层方法，实现请求参数校验与返回结果格式化。

### 3. 服务层
封装核心业务逻辑，实现与数据访问层的交互，包含：
- 文章管理：CRUD 操作、阅读量统计、热门文章计算
- 用户管理：注册、登录、信息修改、权限控制
- 缓存管理：Redis 缓存同步、过期策略执行

### 4. 数据访问层
通过 Sequelize ORM 实现与 MySQL 的交互，主要操作表：
- `users`：用户信息存储（id、用户名、密码哈希等）
- `articles`：文章内容存储（标题、内容、分类等）
- `categories`：文章分类存储

### 5. 中间件
- 身份验证：JWT Token 验证
- 权限校验：基于角色的访问控制
- 错误处理：全局异常捕获与格式化
- 请求日志：记录接口访问日志

## 配置说明
- 环境配置通过 `NODE_ENV` 区分开发/测试/生产环境
- 敏感配置（数据库密码、JWT 密钥）通过环境变量注入，不硬编码
- 配置文件位置：`config/` 目录下对应环境的配置文件

## 缓存策略
- 热门文章（Top 10）：缓存 5 分钟，定期更新
- 文章详情页：按文章 ID 缓存，有效期 1 小时，更新时主动删除缓存
- 缓存预热：服务启动时自动加载热门文章到 Redis

## 性能优化
- 数据库索引：articles 表的 author_id、category_id、publish_time 字段创建联合索引；users 表的 username 字段创建唯一索引
- 分页查询：文章列表接口支持 limit 和 offset 分页参数
- 接口缓存：高频访问接口结果缓存至 Redis

## 开发指南

### 快速启动

1. **安装依赖**（建议使用 `pnpm`，也支持 `npm`）

```bash
pnpm install
# 或
npm install
```

2. **配置环境变量**

在项目根目录创建 `.env` 或 `.env.development`，参考如下：

```bash
# 服务器配置
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=blog_db
DB_USER=root
DB_PASSWORD=your_password

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT 配置
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# CORS 配置
CORS_ORIGIN=http://localhost:5173
```

3. **启动服务**

- 开发模式（支持文件监视自动重启）：

```bash
npm run dev
```

- 生产模式：

```bash
npm start
```

4. **其他常用命令**

- 初始化数据库：

```bash
npm run init-db
```

- 代码检查（ESLint）：

```bash
npm run lint
```

### 项目信息

- 入口文件：`app.js`
- 依赖管理：`package.json`（依赖锁定：`pnpm-lock.yaml`）
- API 文档：启动后访问 `http://localhost:3001/api-docs`
- 健康检查：GET `http://localhost:3001/api/health`

## 部署说明
- 基于 `node:lts-alpine` 镜像构建 Docker 容器
- 通过 docker-compose 与前端、MySQL、Redis 容器联动部署
- 日志目录通过数据卷挂载实现持久化存储

## 进阶：可以升级到 DDD 吗？
如果你的项目业务变得更复杂，可以在 Service 层上方添加 Domain Layer（领域层）：
```
Router → Controller → Domain → Service → Model → Database
                        ↑
                   业务核心逻辑
                   (独立于框架)
```
目前的 5 层架构已经足够优秀了，继续保持即可。👍


## app.js 运行时执行流程
```
    应用启动
      ↓
    [1] 加载核心依赖
      ├── express、cors、helmet
      ├── config（环境配置）
      └── logger（日志系统）
      ↓
    [2] 中间件初始化和装配
      ├── 安全中间件（Helmet、CORS）
      ├── 请求解析（JSON、URL-encoded）
      ├── 请求日志（requestLogger）
      └── 限流控制（apiLimiter）
      ↓
    [3] API 文档系统（Swagger）
      └── swagger-jsdoc + swagger-ui-express
      ↓
    [4] 健康检查端点
      └── /api/health（检查 DB + Redis）
      ↓
    [5] 业务路由挂载
      ├── /api/articles（文章模块）
      ├── /api/users（用户模块）
      └── /api/auth（认证模块）
      ↓
    [6] 错误处理
      ├── 404 处理
      └── 全局错误处理
      ↓
    [7] 服务器启动
      ├── 数据库连接验证
      ├── 数据库模型同步（开发环境）
      └── 监听端口
      ↓
    [8] 优雅关闭处理
      ├── SIGTERM 信号处理
      └── SIGINT 信号处理
```

## 运行时服务依赖图
```
  ┌──────────────────────────────────────────────────────────────┐
  │                        app.js                                │
  ├──────────────────────────────────────────────────────────────┤
  │                                                              │
  │  Express 框架 ─┬─ 中间件链                                     │
  │               │  ├─ Helmet（安全）                            │
  │               │  ├─ CORS（跨域）                              │
  │               │  ├─ Body Parser（请求解析）                    │
  │               │  ├─ Request Logger（日志）                    │
  │               │  └─ Rate Limiter（限流）                      │
  │               │                                             │
  │               ├─ Swagger/OpenAPI（API 文档）                 │
  │               │                                             │
  │               ├─ 路由模块                                    │
  │               │  ├─ Article Module（文章）                   │
  │               │  ├─ User Module（用户）                      │
  │               │  └─ Auth Module（认证）                      │
  │               │                                               │
  │               ├─ 错误处理                                    │
  │               │  ├─ 404 Handler                               │
  │               │  └─ Global Error Handler                      │
  │               │                                               │
  │               └─ 生命周期管理                                │
  │                  ├─ 启动（连接 DB + Redis）                  │
  │                  └─ 关闭（SIGTERM / SIGINT）                 │
  │                                                                │
  ├──────────────────────────────────────────────────────────────┤
  │                   外部依赖服务                                 │
  ├──────────────────────────────────────────────────────────────┤
  │  MySQL ────┬─ 数据库连接（Sequelize）                       │
  │            └─ 数据持久化                                     │
  │                                                                │
  │  Redis ────┬─ 缓存连接                                       │
  │            └─ 会话 + 高频数据缓存                            │
  │                                                                │
  │  Logger ───┬─ 请求日志                                       │
  │            ├─ 错误日志                                       │
  │            └─ 应用日志                                       │
  └──────────────────────────────────────────────────────────────┘
```
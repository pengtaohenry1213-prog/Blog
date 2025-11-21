# 个人博客系统架构设计

## 一、整体架构设计
采用前后端分离的monorepo架构，通过Docker容器化部署，实现开发与生产环境的一致性。整体架构分为四层：
1. **客户端层**：Vue3前端应用（前台+后台）
2. **服务层**：Node.js+Express后端API服务
3. **数据层**：MySQL主数据库 + Redis缓存
4. **部署层**：Docker容器 + Nginx反向代理 + HTTPS

## 二、目录结构设计（monorepo）
```plaintext
blog-project/
├── packages/               # 子包目录
│   ├── frontend/           # 前端项目
│   |   ├── public/
│   |   └── src/
│   |       ├── utils/
│   |       │   └── security.js  # 前端签名、加密工具
│   ├── backend/            # 后端项目
│   │   ├── modules/          # 业务模块拆分
│   │   ├── config/           # 环境配置
│   │   ├── logs/             # 日志目录（挂载数据卷）
│   │   └── utils/            # 工具函数（含加密、签名等）
│   └── common/             # 共享模块（类型定义、工具函数等）
│           ├── README.md
│           ├── package.json
│           ├── index.js      # 入口文件
│           ├── types/
│           └── index.js      # 类型定义
└── utils/
    └── index.js       # 工具函数
├── docker/                 # Docker 配置
│   ├── frontend/           # 前端镜像配置
│   ├── backend/            # 后端镜像配置
│   └── docker-compose.yml  # 容器编排配置
|   ├── nginx/
|   │   └── nginx.conf        # 新增 Nginx 详细配置（含 Gzip、缓存）
├── .gitignore              # Git 忽略文件
├── package.json            # 根项目配置（workspace 管理）
└── README.md               # 项目说明
```

## 三、模块详细设计
### 1. 前端模块（Vue3+Vite）
- **核心技术**：Vue3、Vite、Vue Router、Pinia、Axios、Element Plus
- **功能模块**：
  - 前台：文章列表、文章详情、分类导航、热门文章、搜索功能
  - 后台：登录/注销、文章管理（CRUD）、用户管理（权限控制）、数据统计
- **构建流程**：
  - 开发环境：Vite热更新
  - 生产环境：打包为静态资源，通过Nginx部署
- **前端代码规范**：
  - 集成ESLint + Prettier强制代码风格统一，配置Husky实现提交前代码校验（pre-commit钩子）。

### 2. 后端模块（Node.js+Express）
- **核心技术**：Node.js(LTS)、Express、Sequelize(ORM)、Redis客户端
- **功能模块**：
  - 路由层：API接口定义（文章、用户、权限相关）
  - 控制器层：请求处理逻辑
  - 服务层：业务逻辑封装
  - 数据访问层：MySQL交互、Redis缓存操作
  - 中间件：身份验证、权限校验、错误处理、请求日志
  - 后端模块化拆分：
    在backend目录下新增modules子目录，按业务域拆分模块（如articleModule、userModule、authModule），每个模块包含独立的路由、控制器和服务，示例结构：
    ```plaintext
    backend/
    ├── modules/
    │   ├── article/
    │   │   ├── router.js      # 文章相关路由
    │   │   ├── controller.js  # 文章请求处理
    │   │   └── service.js     # 文章业务逻辑
    │   └── user/              # 用户模块同理
    └── app.js                 # 模块聚合与中间件挂载
  ```
  - 配置中心支持
  新增 config 模块，区分开发 / 测试 / 生产环境配置（通过 NODE_ENV 切换），支持环境变量注入（推荐 dotenv 库），敏感配置（如数据库密码、JWT 密钥）不硬编码。

  - **API 设计**：
    - 文章接口：`/api/articles`（GET/POST/PUT/DELETE）
    - 用户接口：`/api/users`（登录、信息管理）
    - 权限接口：`/api/auth`（权限验证）

### 3. 数据层设计
- **MySQL 数据库**：
  - 表结构：
    - `users`（用户表：id、用户名、密码哈希、角色、创建时间）
    - `articles`（文章表：id、标题、内容、分类、作者ID、发布时间、阅读量）
    - `categories`（分类表：id、名称、描述）
- **Redis 缓存**：
  - 存储热门文章（按阅读量排序，定期更新）
  - 用户登录令牌（Token）存储
  - 接口请求频率限制

### 4. 部署方案（Docker）
- **镜像规划**：
  1. 基础镜像：使用官方 `mysql:latest` 和 `redis:latest`
  2. 前端镜像：基于 `nginx:alpine` 打包静态资源
  3. 后端镜像：基于 `node:lts-alpine` 部署服务
- **容器编排（docker-compose）**：
  - 定义 4 个服务：frontend、backend、mysql、redis
  - 配置网络桥接，实现容器间通信
  - 挂载数据卷，持久化 MySQL 和 Redis 数据
- **Nginx 配置**：
  - 反向代理：将 API 请求转发至后端服务
  - 静态资源：直接提供前端打包文件
  - HTTPS：配置 SSL 证书，强制 HTTPS 访问

## 四、关键技术点与解决方案
1. **权限控制**：基于 JWT 的 Token 认证，结合角色权限校验中间件
2. **缓存策略**：热门文章定时同步至 Redis，设置合理过期时间
3. **数据安全**：密码加密存储（bcrypt），接口参数校验（joi/express-validator）
4. **性能优化**：
  - 前端路由懒加载，后端接口缓存，数据库索引优化
  - 数据库优化
    a. MySQL 索引设计：为 articles 表的 author_id、category_id、publish_time 字段创建联合索引；为 users 表的 username 字段创建唯一索引。
    b. 分页与懒加载：文章列表接口实现基于 limit 和 offset 的分页查询，前端配合滚动触底加载更多。
  - 缓存策略细化
    a. Redis 分级缓存：
      - 一级缓存：热门文章列表（Top 10），设置 5 分钟过期时间，更新频率高。
      - 二级缓存：文章详情页，按文章 ID 缓存，设置 1 小时过期时间，更新文章时主动删除缓存。
    b.缓存预热：后端启动时自动从 MySQL 加载热门文章到 Redis，避免首次请求冷启动。
5. **Nginx 增强配置**
  - 启用 Gzip 压缩：压缩前端静态资源和 API 响应数据，减少传输体积。
  - 配置缓存策略：对前端 JS/CSS/图片等静态资源设置 `Cache-Control` 缓存头，长缓存静态资源。

## 五、目录结构补充调整
基于上述补充，调整后的目录结构新增关键节点：
```plaintext
blog-project/
├── packages/
│   ├── backend/
│   │   ├── modules/          # 业务模块拆分
│   │   ├── config/           # 环境配置
│   │   ├── logs/             # 日志目录（挂载数据卷）
│   │   └── utils/            # 工具函数（含加密、签名等）
│   └── frontend/
│       ├── public/
│       └── src/
│           ├── utils/
│           │   └── security.js  # 前端签名、加密工具
└── docker/
    ├── nginx/
    │   └── nginx.conf        # 新增 Nginx 详细配置（含 Gzip、缓存）
```
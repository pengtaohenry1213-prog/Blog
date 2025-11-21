# 个人博客系统 + 后台管理

## 项目简介
一个基于全栈技术栈的个人博客系统，包含前台展示与后台管理功能，采用前后端分离架构，通过Docker容器化部署，支持线上环境稳定运行。

## 核心技术栈
- **前端**：Vue3 + Vite + Vue Router + Pinia + Element Plus
- **后端**：Node.js(LTS) + Express + Sequelize(ORM)
- **数据存储**：MySQL（主数据） + Redis（缓存）
- **部署**：Docker + Nginx + HTTPS

## 项目结构（monorepo）
```
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
│           ├── index.js       # 入口文件
│           ├── types/
│           └── index.js       # 类型定义
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

## 功能概览
1. **前台功能**：文章列表、详情展示、分类导航、热门文章、搜索
2. **后台功能**：登录/注销、文章管理（CRUD）、用户管理（权限控制）、数据统计

## 快速启动

**详细启动指南请参考：[docs/start.md](docs/start.md)**

### 环境要求
- Node.js >= 18.0.0
- pnpm >= 6.11.0
- Docker >= 20.10.0（容器部署需要）
- Docker Compose >= 2.0.0（容器部署需要）

### 开发环境快速启动
1. 克隆仓库：`git clone <仓库地址>`
2. 安装依赖：`pnpm install`
3. 配置环境变量：复制 `packages/backend/.env.example` 为 `.env` 并修改配置
4. 启动 MySQL 和 Redis：`cd docker && docker-compose up -d mysql redis`
5. 初始化数据库：`cd packages/backend && pnpm run init-db`
6. 启动后端：`pnpm run dev:backend`（端口：3001）
7. 启动前端：`pnpm run dev:frontend`（端口：5173）

### Docker 容器部署
1. 配置环境变量：复制 `docker/.env.example` 为 `.env` 并修改配置
2. 构建并启动：`cd docker && docker-compose up -d --build`
3. 初始化数据库：进入容器执行 `pnpm run init-db`

### 默认账户
- 用户名：`admin`
- 密码：`admin123`

**注意：生产环境请务必修改默认密码！**

## 开发与协作
- 分支策略：`main`（生产）、`develop`（开发）、`feature/xxx`（功能分支）
- 代码规范：集成ESLint + Prettier，提交前通过Husky校验

## 相关文档
- **项目启动指南**：参见 `docs/start.md` ⭐
- 详细架构设计：参见 `docs/architecture.md`
- 部署手册：参见 `docs/deployment.md`
- 开发手册: 参见 `docs/development.md`
- 性能与安全优化文档：参见 `docs/optimization.md`
- 开发工作流：参见 `docs/workflow.md`

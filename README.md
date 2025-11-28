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
Blog/
├── .vscode/                  # VS Code 调试 & 工作区配置
│   ├── launch.json           # 调试配置（前后端 / Docker 等）
│   ├── settings.json         # 工作区级别编辑器配置
│   └── README.md             # 本地开发 & 调试说明
├── docker/                 # Docker 配置
│   ├── frontend/           # 前端镜像配置
│   ├── backend/            # 后端镜像配置
│   └── docker-compose.yml  # 容器编排配置
|   ├── nginx/
|   │   └── nginx.conf        # 新增 Nginx 详细配置（含 Gzip、缓存）
│   ├── backup/               # 预构建镜像 / 数据备份（可选）
│   ├── scripts/              # 容器启动 / 初始化脚本
│   ├── docker-compose.yml    # 生产 / 本地环境编排
│   └── README.md             # 容器化部署说明
├── docs/                     # 文档中心
│   ├── start.md              # 启动指南
│   ├── architecture.md       # 架构设计
│   ├── deployment.md         # 部署手册
│   ├── optimization.md       # 性能与安全优化
│   ├── development.md        # 开发规范与约定
│   └── workflow.md           # 团队协作工作流
├── packages/                 # 子包目录（monorepo workspace）
│   ├── frontend/             # 前端项目（Vue3 + Vite）
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── api/          # 前端接口封装
│   │   │   ├── views/        # 页面（前台 + 后台）
│   │   │   ├── components/   # 通用组件（含图表、Markdown 编辑器）
│   │   │   ├── stores/       # Pinia 状态管理
│   │   │   └── utils/        # 工具函数（含前端签名、加密等）
│   │   └── vite.config.js
│   ├── backend/              # 后端项目（Node.js + Express + Sequelize）
│   │   ├── app.js            # 后端入口
│   │   ├── config/           # 环境 & 数据库 & Redis 配置
│   │   ├── modules/          # 业务模块（文章 / 用户 / 统计 / 鉴权等）
│   │   ├── models/           # Sequelize 模型定义
│   │   ├── middleware/       # 中间件（鉴权 / 日志 / 限流 / 校验等）
│   │   ├── scripts/          # 数据库初始化 & 索引维护脚本
│   │   ├── logs/             # 日志目录（挂载到宿主机）
│   │   └── utils/            # 工具函数（加密、签名、日志封装等）
│   └── common/               # 前后端共享模块
│       ├── package.json
│       ├── index.js          # 入口文件
│       ├── types/            # 类型 / 接口定义
│       └── utils/            # 公共工具函数
├── env                       # 环境变量示例 / 模板（如本地开发 env）
├── pnpm-workspace.yaml       # pnpm workspaces 配置
├── package.json              # 根项目配置（workspace 管理）
├── pnpm-lock.yaml
└── README.md                 # 项目说明（当前文件）
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

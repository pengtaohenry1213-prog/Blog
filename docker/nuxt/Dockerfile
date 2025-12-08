# ============================================================================
# Nuxt3应用 Dockerfile（多阶段构建）
#   用途：构建 Nuxt3 SSR 应用的 Docker 镜像
#   说明：使用 pnpm workspace 管理 monorepo 项目结构
#   策略：使用多阶段构建，第一阶段构建应用，第二阶段运行 Node.js 服务
#   优势：最终镜像只包含运行所需的文件，体积更小，安全性更高
#  ┌─────────────────────────────────────┐
#  │ 第一阶段：builder 阶段                │
#  │ FROM node:lts-alpine AS builder     │
#  │                                     │
#  │ WORKDIR /app  ←─── 在 builder 镜像中 │
#  │ ├── 安装依赖                         │
#  │ ├── 复制源代码                       │
#  │ └── 构建应用 pnpm run build          │
#  │                                     │
#  │ 最终生成：builder 镜像                │
#  │ (包含所有开发依赖和构建产物)            │
#  └─────────────────────────────────────┘
#                ↓ (只复制构建产物)
#  ┌───────────────────────────────────────────────┐
#  │ 第二阶段：production 阶段                       │
#  │ FROM node:lts-alpine  ←─── 全新镜像            │
#  │                                               │
#  │ WORKDIR /app  ←─── 在新的镜像中                 │
#  │ ├── 安装生产依赖                                │
#  │ └── 从 builder 复制 .output                    │
#  │                                               │
#  │ 最终生成：production 镜像                       │
#  │ (只包含运行所需文件)                             │
#  |                                               |
#  | 启动命令 (在 /app/packages/nuxt-ssr)            |
#  |   通过 Node.js 运行.output/server/index.mjs文件 |
#  └───────────────────────────────────────────────┘
# ============================================================================

# 第一阶段：构建阶段（Builder Stage）: 此阶段负责安装依赖、编译源代码，生成 Nuxt3 构建产物

# 构建阶段基础镜像: 使用 Node.js LTS 版本的 Alpine Linux 镜像作为构建环境
#   Alpine 是一个轻量级 Linux 发行版，镜像体积小，安全性高
#   lts 表示长期支持版本，稳定性更好
#   AS builder: 为此阶段命名，后续可以通过 --from=builder 引用
FROM node:lts-alpine AS builder

# 设置构建工作目录: 在容器内创建并切换到 /app 目录
WORKDIR /app

# 安装包管理器: 全局安装 pnpm（Performant Node Package Manager）, pnpm 比 npm/yarn 更快，磁盘占用更少，支持 workspace 功能
RUN npm install -g pnpm@10.24.0

# 复制 workspace 配置文件（依赖安装优化层）: 先复制依赖管理文件(package.json、pnpm-lock.yaml、pnpm-workspace.yaml)，利用 Docker 层缓存机制
#   如果依赖文件未变化，可以复用之前的安装层，加快构建速度
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 创建 monorepo 所需的目录结构: packages/common: 共享代码模块, packages/nuxt-ssr: Nuxt3 项目目录
# -p 参数：如果目录已存在则不报错，支持递归创建
RUN mkdir -p packages/common packages/nuxt-ssr

# 复制共享模块的依赖文件: 先复制 common 模块的 package.json，用于依赖解析, 这样可以正确安装 workspace 内部的依赖关系
COPY packages/common/package.json ./packages/common/

# 复制 Nuxt 项目依赖文件: 复制 packages/nuxt-ssr 的 package.json
COPY packages/nuxt-ssr/package.json ./packages/nuxt-ssr/

# 安装所有依赖（包括开发依赖）: --frozen-lockfile 严格使用 pnpm-lock.yaml，不更新锁文件, 确保构建的一致性和可重现性
#   注意：构建阶段需要安装 devDependencies（如构建工具、编译器、Nuxt CLI 等）
# > pnpm 会自动识别 workspace 配置，正确处理内部包依赖
RUN pnpm install --frozen-lockfile

# 复制源代码: 在依赖安装完成后再复制源代码, 这样代码变更不会影响依赖层的缓存，提高构建效率
# 复制: Nuxt3 项目源代码 + 共享模块源代码
COPY packages/nuxt-ssr/ ./packages/nuxt-ssr/
COPY packages/common/ ./packages/common/

# 切换到 Nuxt 项目目录: 将工作目录切换到 Nuxt 项目目录, 后续构建命令将在此目录下执行
WORKDIR /app/packages/nuxt-ssr

# 设置构建时环境变量: ARG 用于构建时传入参数, ENV 设置运行时环境变量
#   NUXT_PUBLIC_API_BASE_URL: Nuxt3 公共环境变量，用于配置后端 API 地址
#   默认值: http://backend:3001/api (backend 是 Docker Compose 中的服务名)
ARG NUXT_PUBLIC_API_BASE_URL
ENV NUXT_PUBLIC_API_BASE_URL=${NUXT_PUBLIC_API_BASE_URL:-http://backend:3001/api}

# 构建 Nuxt3 应用: 执行构建命令，生成 SSR 应用构建产物到 .output 目录
#   构建产物包括: 服务端代码(.output/server)、客户端代码(.output/public)、路由配置等
RUN pnpm run build


# 第二阶段：生产阶段（Production Stage）: 此阶段只包含运行所需的文件，使用轻量级的 Node.js 镜像

# 生产阶段基础镜像: 使用 Node.js LTS 版本的 Alpine Linux 镜像作为运行环境
# ✅ 重新开始的好处：干净的基础镜像, 这是 Docker 多阶段构建的常见做法
FROM node:lts-alpine
# FROM builder  # ❌ 不推荐

# 设置工作目录: 在容器内创建并切换到 /app 目录. 注: 与上面的不是同一个目录, 各自在不同的 镜像中创建的 `/app` 目录
WORKDIR /app

# 安装包管理器: 全局安装 pnpm, 用于安装生产依赖
RUN npm install -g pnpm@10.24.0

# 复制 workspace 配置文件（依赖安装优化层）: 先复制依赖管理文件，利用 Docker 层缓存机制
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 创建 monorepo 所需的目录结构: packages/common: 共享代码模块, packages/nuxt-ssr: Nuxt3 项目目录
RUN mkdir -p packages/common packages/nuxt-ssr

# 复制共享模块的依赖文件: 先复制 common 模块的 package.json，用于依赖解析
COPY packages/common/package.json ./packages/common/

# 复制 Nuxt 项目依赖文件: 复制 packages/nuxt-ssr 的 package.json
COPY packages/nuxt-ssr/package.json ./packages/nuxt-ssr/

# 安装生产环境依赖: --frozen-lockfile 严格使用 pnpm-lock.yaml，不更新锁文件, 确保构建的一致性和可重现性
#   --only=production: 只安装生产依赖（dependencies），跳过开发依赖（devDependencies）, 减小镜像体积，提高安全性
# > pnpm 会自动识别 workspace 配置，正确处理内部包依赖
RUN pnpm install --frozen-lockfile --only=production

# 从构建阶段复制构建产物: 从 builder 阶段复制 Nuxt3 构建好的 .output 目录
#   .output 目录包含: 服务端代码、客户端静态资源、路由配置等
COPY --from=builder /app/packages/nuxt-ssr/.output ./packages/nuxt-ssr/.output

# 复制必要的配置文件: 复制 Nuxt 配置文件和 package.json（运行时可能需要）
COPY packages/nuxt-ssr/nuxt.config.ts ./packages/nuxt-ssr/
COPY packages/nuxt-ssr/package.json ./packages/nuxt-ssr/

# 复制共享模块源代码: 复制共享模块源代码（如果 Nuxt 应用运行时需要）
COPY packages/common/ ./packages/common/

# 切换到 Nuxt 项目目录: 将工作目录切换到 Nuxt 项目目录, 后续命令（如 CMD）将在此目录下执行
WORKDIR /app/packages/nuxt-ssr

# 设置运行时环境变量
#   NODE_ENV=production: 设置为生产环境模式
#   NUXT_PUBLIC_API_BASE_URL: Nuxt3 公共环境变量，用于配置后端 API 地址
ENV NODE_ENV=production
ENV NUXT_PUBLIC_API_BASE_URL=${NUXT_PUBLIC_API_BASE_URL:-http://backend:3001/api}

# 暴露端口: 声明容器运行时监听的端口3000(Nuxt3 SSR 服务端口)
# 注意：这只是一个文档说明，实际端口映射需要在 docker run 时指定 -p 参数
EXPOSE 3000

# 健康检查配置: 配置容器健康检查机制
#   --interval=30s: 每 30 秒执行一次健康检查
#   --timeout=10s: 每次检查的超时时间为 10 秒
#   --start-period=40s: 容器启动后 40 秒内不判定为不健康（给应用启动时间）
#   --retries=3: 连续失败 3 次才标记为不健康
#   使用 Node.js 内置 http 模块检查根路径，返回 200 状态码则判定为健康
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动命令 在 /app/packages/nuxt-ssr
# 容器启动时执行的默认命令: 使用 node 运行 Nuxt3 服务端入口文件(.output/server/index.mjs)
#   这是 Nuxt3 构建后生成的服务端入口文件，用于启动 SSR 服务
#   使用 exec 格式（数组形式），避免 shell 包装，信号处理更可靠
CMD ["node", ".output/server/index.mjs"]


# Nuxt3 Dockerfile
# 构建阶段
FROM node:lts-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@latest

# 复制根目录的 workspace 配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 创建 packages 目录结构
RUN mkdir -p packages/common nuxt-blog

# 复制共享模块依赖
COPY packages/common/package.json ./packages/common/

# 复制 Nuxt 项目依赖文件
COPY nuxt-blog/package.json ./nuxt-blog/

# 安装依赖（pnpm 会自动处理 workspace）
RUN pnpm install --frozen-lockfile

# 复制所有源代码
COPY nuxt-blog/ ./nuxt-blog/
COPY packages/common/ ./packages/common/

# 切换到 Nuxt 项目目录并构建
WORKDIR /app/nuxt-blog

# 设置环境变量
ARG NUXT_PUBLIC_API_BASE_URL
ENV NUXT_PUBLIC_API_BASE_URL=${NUXT_PUBLIC_API_BASE_URL:-http://backend:3001/api}

# 构建 Nuxt3 应用
RUN pnpm run build

# 生产阶段
FROM node:lts-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@latest

# 复制根目录的 workspace 配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 创建 packages 目录结构
RUN mkdir -p packages/common nuxt-blog

# 复制共享模块依赖
COPY packages/common/package.json ./packages/common/

# 复制 Nuxt 项目依赖文件
COPY nuxt-blog/package.json ./nuxt-blog/

# 安装生产依赖
RUN pnpm install --frozen-lockfile --only=production

# 从构建阶段复制构建产物
COPY --from=builder /app/nuxt-blog/.output ./nuxt-blog/.output
# 复制必要的配置文件
COPY nuxt-blog/nuxt.config.ts ./nuxt-blog/
COPY nuxt-blog/package.json ./nuxt-blog/
# 复制共享模块（如果需要）
COPY packages/common/ ./packages/common/

# 切换到 Nuxt 项目目录
WORKDIR /app/nuxt-blog

# 设置环境变量
ENV NODE_ENV=production
ENV NUXT_PUBLIC_API_BASE_URL=${NUXT_PUBLIC_API_BASE_URL:-http://backend:3001/api}

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动 Nuxt3 应用
CMD ["node", ".output/server/index.mjs"]


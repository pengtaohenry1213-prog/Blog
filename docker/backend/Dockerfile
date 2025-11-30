# 后端 Dockerfile
FROM node:lts-alpine

WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache curl

# 新增：安装 pnpm
RUN npm install -g pnpm@latest

# 复制根目录的 workspace 配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 创建 packages 目录结构
RUN mkdir -p packages/common packages/backend

# 复制共享模块依赖
COPY packages/common/package.json ./packages/common/

# 复制后端依赖文件
COPY packages/backend/package*.json ./packages/backend/

# 安装依赖（如果 lockfile 存在，优先使用 ci；否则 fallback 到 install）
# pnpm ci 命令必须依赖 pnpm-lock.yaml 才能运行
# RUN if [ -f "pnpm-lock.yaml" ]; then pnpm ci --only=production; else pnpm install; fi

# 安装依赖（pnpm 会自动处理 workspace）
RUN pnpm install --frozen-lockfile --only=production

# 复制源代码
COPY packages/backend/ ./packages/backend/
COPY packages/common/ ./packages/common/

# 切换到后端目录
WORKDIR /app/packages/backend

# 创建日志目录
RUN mkdir -p logs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# 启动应用
CMD ["node", "app.js"]


# 前端 Dockerfile
# 构建阶段
FROM node:lts-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@6.11.0

# 复制根目录的 workspace 配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 创建 packages 目录结构
RUN mkdir -p packages/common packages/frontend

# 复制共享模块依赖
COPY packages/common/package.json ./packages/common/

# 复制前端依赖文件
COPY packages/frontend/package.json ./packages/frontend/

# 安装依赖（pnpm 会自动处理 workspace）
RUN pnpm install --frozen-lockfile

# 复制所有源代码
COPY packages/frontend/ ./packages/frontend/
COPY packages/common/ ./packages/common/

# 切换到前端目录并构建
WORKDIR /app/packages/frontend
RUN pnpm run build

# 生产阶段
FROM nginx:alpine

# 复制构建产物到 nginx
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
# ============================================================================
# 后端应用 Dockerfile
#   用途：构建后端 Node.js 应用的 Docker 镜像
#   说明：使用 pnpm workspace 管理 monorepo 项目结构
#
# ## 第一阶段: 构建应用
# 构建基础镜像 node.js [FROM node:lts-alpine]
# -> 构建工作目录(在容器内创建并切换到 /app 目录) [WORKDIR /app]
#    1. 安装系统依赖 [RUN apk add --no-cache curl]
#    2. 安装包管理器 [npm install -g pnpm@10.24.0]
#    3. 复制 workspace 配置文件（依赖安装优化层）
#      在容器 /app 与 本地项目文件 同步 package.json、pnpm-locker.yaml、pnpm-workspace.yaml、packages/common、packages/backend
#      app/
#      ├── packages/                 # 子包目录（monorepo workspace 单体仓库, 无论是前端应用、后端服务、公共组件库、工具函数，还是文档，都可以放在同一个仓库里管理）
#      │   └── backend/              # 后端项目(子目录中, 只有package.json)
#      |     └── package.json
#      |   └── common/               # 前后端共享模块(子目录中, 只有package.json)
#      |     └── package.json
#      │   
#      ├── pnpm-workspace.yaml       # pnpm workspaces 配置
#      |     packages:
#      |       - 'packages/*'
#      ├── package.json              # 根项目配置（workspace 管理）
#      └── pnpm-lock.yaml
#    
#    3. pnpm安装依赖包 pnpm install --frozen-lockfile --only=production
#    4. 复制源代码 到 app/packages 对应的目录: common 和 backend
#    5. 切换到 后端应用目录 /app/packages/backend -> 创建日志文件存储目录(logs) -> 指定暴漏端口: 3001
#    6. 健康检查配置 http://localhost:3001/api/health
#    7. 启动命令, 使用 node 直接运行 app.js 入口文件 CMD ["node", "app.js"]
# ============================================================================


# 基础镜像选择
#   使用 Node.js LTS 版本的 Alpine Linux 镜像
#     Alpine 是一个轻量级 Linux 发行版，镜像体积小，安全性高
#     lts 表示长期支持版本，稳定性更好
FROM node:lts-alpine


# 设置工作目录: 在容器内创建并切换到 /app 目录, 后续所有命令（如 COPY、RUN）都会在这个目录下执行
WORKDIR /app

# 安装系统依赖: 安装 curl 工具，用于健康检查, --no-cache 参数：不缓存包索引，减小镜像体积
# 在 Alpine 镜像中(node:lts-alpine) 安装 curl 工具.
RUN apk add --no-cache curl

# 安装包管理器: 全局安装 pnpm（Performant Node Package Manager）, pnpm 比 npm/yarn 更快，磁盘占用更少，支持 workspace 功能
RUN npm install -g pnpm@10.24.0

# 复制 workspace 配置文件（依赖安装优化层）
#   先复制依赖管理文件(package.json、pnpm-lock.yaml、pnpm-workspace.yaml)，利用 Docker 层缓存机制
#   如果依赖文件未变化，可以复用之前的安装层，加快构建速度
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 创建 monorepo 所需的目录结构: packages/common: 共享代码模块, packages/backend: 后端服务代码
# -p 参数：如果目录已存在则不报错，支持递归创建
RUN mkdir -p packages/common packages/backend

# 复制共享模块的依赖文件: 先复制 common 模块的 package.json，用于依赖解析, 这样可以正确安装 workspace 内部的依赖关系
COPY packages/common/package.json ./packages/common/

# 复制后端模块的依赖文件: package*.json 通配符匹配 package.json 和 package-lock.json
COPY packages/backend/package*.json ./packages/backend/

# 安装生产环境依赖
#   --frozen-lockfile: 严格使用 pnpm-lock.yaml，不更新锁文件, 确保构建的一致性和可重现性
#   --only=production: 只安装生产依赖（dependencies），跳过开发依赖（devDependencies）, 减小镜像体积，提高安全性
# > pnpm 会自动识别 workspace 配置，正确处理内部包依赖
RUN pnpm install --frozen-lockfile --only=production


# 复制源代码: 在依赖安装完成后再复制源代码, 这样代码变更不会影响依赖层的缓存，提高构建效率
# 复制: 后端服务源代码 + 共享模块源代码
COPY packages/backend/ ./packages/backend/
COPY packages/common/ ./packages/common/

# 切换到后端服务目录: 将工作目录切换到后端服务目录, 后续命令（如 CMD）将在此目录下执行
WORKDIR /app/packages/backend

# 创建日志目录: 创建日志文件存储目录, 确保应用运行时可以正常写入日志文件
RUN mkdir -p logs

# 暴露端口: 声明容器运行时监听的端口3001(后端 API 服务端口)
# 注意：这只是一个文档说明，实际端口映射需要在 docker run 时指定 -p 参数
EXPOSE 3001

# ----------------------------------------------------------------------------
# 健康检查配置
# 配置容器健康检查机制
# --interval=30s: 每 30 秒执行一次健康检查
# --timeout=10s: 每次检查的超时时间为 10 秒
# --start-period=40s: 容器启动后 40 秒内不判定为不健康（给应用启动时间）
# --retries=3: 连续失败 3 次才标记为不健康
# 使用 curl 检查 /api/health 端点，返回非 200 状态码则判定为失败
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# 启动命令 在 /app/packages/backend
# 容器启动时执行的默认命令: 使用 node 直接运行 app.js 入口文件, 使用 exec 格式（数组形式），避免 shell 包装，信号处理更可靠
CMD ["node", "app.js"]

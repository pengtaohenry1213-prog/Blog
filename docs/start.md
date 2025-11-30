# 项目启动指南

## 一、环境要求

- Node.js >= 18.0.0
- pnpm >= 6.11.0
- Docker >= 20.10.0
<!-- - Docker Compose >= 2.0.0 -->

## 二、本地开发环境启动

### 1. 安装依赖 [测试可用]

```bash
# 在项目根目录执行
pnpm install

# 或者分别安装前后端依赖
cd packages/backend && pnpm install
cd ../frontend && pnpm install
```

### 2. 配置环境变量

  #### 后端环境变量
    复制 `packages/backend/.env.example` 为 `.env` 并修改配置：

    ```bash
    cd packages/backend
    cp .env.example .env
    ```

    编辑 `.env` 文件，配置数据库、Redis 等信息。

  #### 前端环境变量（可选）
    如果需要，可以在 `packages/frontend` 目录创建 `.env` 文件：
    ```env
    VITE_API_BASE_URL=http://localhost:3001/api
    ```

  #### 共享模块包 添加 工作空间 配置文件
    在根目录创建 `pnpm-workspace.yaml` 用于指定共享模块包工作空间. 其内容如下:
    ```
    packages:
      - 'packages/*'
    ```

    编辑 packages/backend/package.json 和 packages/frontend/package.json，确保有如下依赖：
    ```
    {
      "dependencies": {
        "@blog/common": "workspace:*",  // 关键：使用 workspace 协议引用本地共享模块
        // 其他依赖...
      }
    }
    ```

    编辑 packages/frontend/vite.config.json
    ```
    resolve: {
      alias: {
        ...,
        '@blog/common': fileURLToPath(new URL('../common', import.meta.url))
      }
    }
    ```
    
    在项目根目录执行：`pnpm run install`

    > 这会让 pnpm：
    >  - 识别 workspace 配置
    >  - 在 packages/backend/node_modules/@blog 创建指向 ../common 的符号链接
    >  - 在 packages/frontend/node_modules/@blog 创建符号链接（如果 frontend 也依赖它）

    > 验证配置. 安装后，检查：`ls -la packages/backend/node_modules/@blog`、`ls -la packages/frontend/node_modules/@blog`

    > 为什么需要这样做？
    >  - npm：使用 package.json 中的 "workspaces" 字段
    >  - pnpm：使用独立的 pnpm-workspace.yaml 文件
    >  - yarn：使用 package.json 中的 "workspaces" 字段
    >  - 由于项目使用 pnpm，必须创建 pnpm-workspace.yaml，否则 pnpm 不会处理 workspace 依赖。

### 3. 启动 MySQL 和 Redis
  > 安装 Docker Compose 
  `brew install docker-compose`

  #### 方式一：使用 Docker Compose（推荐）[测试可用]
  ```bash
  cd docker
  docker-compose up -d mysql redis
  ****
  ```

  #### 方式二：本地安装
  确保本地已安装并启动 MySQL 和 Redis 服务。


### 4. 初始化数据库
```bash
cd packages/backend
pnpm run init-db
```

这将创建数据库表结构并创建默认管理员账户：
- 用户名：`admin`
- 密码：`admin123`

### 5. 启动后端服务
```bash
cd packages/backend
pnpm run dev
```

后端服务将在 `http://localhost:3001` 启动。

### 6. 启动前端服务
```bash
cd packages/frontend
pnpm run dev
```

前端服务将在 `http://localhost:5173` 启动。

## 三、Docker 容器化部署

### 1. 配置环境变量

复制 `docker/.env.example` 为 `.env` 并修改配置：
```bash
cd docker
cp .env.example .env
```

### 2. 构建并启动所有服务 [测试可用]
根据项目配置，执行 docker-compose up -d --build 会构建并启动所有服务（MySQL、Redis、前后端），在后台运行，映射对应端口（3306、6379、3000、80）。
```bash
cd docker
docker-compose up -d --build
```

这将启动以下服务：
- MySQL（端口：3306）
- Redis（端口：6379）
- 后端服务（端口：3001）
- 前端服务（端口：80）

### 3. 初始化数据库

```bash
# 进入后端容器
docker exec -it blog-backend sh

# 执行初始化脚本
pnpm run init-db

# 验证初始化是否成功
# 安装三方数据查看IDE dbeaver
# 官网：https://dbeaver.io/download/

```

### 4. 查看服务状态
```bash
docker-compose ps
```

```
NAME            IMAGE             COMMAND                  SERVICE    CREATED             STATUS                       PORTS
blog-backend    docker-backend    "docker-entrypoint.s…"   backend    15 minutes ago      Up 15 minutes (healthy)      0.0.0.0:3001->3001/tcp, [::]:3001->3001/tcp
blog-frontend   docker-frontend   "/docker-entrypoint.…"   frontend   15 minutes ago      Up 15 minutes                0.0.0.0:80->80/tcp, [::]:80->80/tcp
blog-mysql      mysql:latest      "docker-entrypoint.s…"   mysql      About an hour ago   Up 39 minutes (healthy)      0.0.0.0:3306->3306/tcp, [::]:3306->3306/tcp
blog-redis      redis:latest      "docker-entrypoint.s…"   redis      About an hour ago   Up About an hour (healthy)   0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp
```

### 5. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 6. 停止服务

```bash
docker-compose down
```

### 7. 停止并删除数据卷（谨慎操作）

```bash
docker-compose down -v
```

## 四、访问地址

### 本地开发环境

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001
- API 文档：http://localhost:3001/api-docs

### Docker 环境

- 前端：http://localhost
- 后端 API：http://localhost:3001
- API 文档：http://localhost:3001/api-docs

## 五、默认账户

- 用户名：`admin`
- 密码：`admin123`

**注意：生产环境请务必修改默认密码！**

## 六、常见问题

### 1. 数据库连接失败

- 检查 MySQL 服务是否启动
- 检查环境变量中的数据库配置是否正确
- 检查防火墙设置

### 2. Redis 连接失败

- 检查 Redis 服务是否启动
- 检查环境变量中的 Redis 配置是否正确

### 3. 前端无法访问后端 API

- 检查后端服务是否正常启动
- 检查 CORS 配置
- 检查代理配置（开发环境）

### 4. Docker 容器启动失败

- 检查端口是否被占用
- 检查 Docker 和 Docker Compose 版本
- 查看容器日志：`docker-compose logs`

## 七、项目结构
```
blog-project/
├── packages/
│   ├── backend/          # 后端项目
│   │   ├── modules/      # 业务模块
│   │   ├── models/       # 数据模型
│   │   ├── middleware/   # 中间件
│   │   └── app.js        # 入口文件
│   ├── frontend/         # 前端项目
│   |   ├── src/
│   |   │   ├── views/    # 页面组件
│   |   │   ├── router/   # 路由配置
│   |   │   └── stores/   # 状态管理
│   |   └── vite.config.js
│   └── common/           # 共享模块（类型定义、工具函数等）
│       ├── README.md
│       ├── package.json
│       ├── index.js      # 入口文件
│       ├── types/
│       └── index.js      # 类型定义
├── docker/               # Docker 配置
│   ├── docker-compose.yml
│   ├── frontend/Dockerfile
│   ├── backend/Dockerfile
│   └── nginx/nginx.conf
└── README.md
```

## 八、开发建议

1. **代码规范**：项目已配置 ESLint 和 Prettier，建议在提交代码前运行 `pnpm run lint` 和 `pnpm run format`
2. **API 文档**：后端集成了 Swagger，访问 `/api-docs` 查看 API 文档
3. **日志查看**：后端日志存储在 `packages/backend/logs/` 目录
4. **数据库迁移**：生产环境建议使用 Sequelize 迁移工具而不是 `sync`

## 九、生产环境部署

1. 修改所有默认密码和密钥
2. 配置 HTTPS（在 Nginx 配置中添加 SSL 证书）
3. 设置环境变量为 `NODE_ENV=production`
4. 配置数据库备份策略
5. 配置日志轮转
6. 设置监控和告警

## 部署项目(前、后端)到docker容器
先定位到Blog/docker, `cd docker`
1. 开启backend和frontend容器
`docker-compose up -d backend frontend`
> 查看所有服务状态: `docker-compose ps`
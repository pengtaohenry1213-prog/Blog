在开发阶段执行服务和网站的步骤如下：

1. **安装依赖**  
   在项目根目录执行：
   ```bash
   pnpm install
   # 或分别分别前后端分别安装
   cd packages/backend && pnpm install
   cd ../frontend && pnpm install
   ```

2. **配置环境变量**  
   - 后端：复制 `packages/backend/.env.example` 为 `.env` 并修改数据库、Redis 配置  
   - 前端（可选）：在 `packages/frontend` 创建 `.env`，设置 `VITE_API_BASE_URL`

   - 共享模块包 添加 工作空间 配置文件
   在项目根目录创建 `pnpm-workspace.yaml` 用于指定共享模块包工作空间. 其内容如下:
      ```
      packages:
         - 'packages/*'
      ```
   在项目根目录执行：`pnpm run install`

3. **启动 MySQL 和 Redis**（推荐 Docker 方式）  
   ```bash
   cd docker
   docker-compose up -d mysql redis
   ```

4. **初始化数据库**  
   ```bash
   cd packages/backend
   pnpm run init-db
   ```

5. **启动后端服务**  
   ```bash
   cd packages/backend
   pnpm run dev  # 启动在 http://localhost:3001
   ```

6. **启动前端服务**  
   ```bash
   cd packages/frontend
   pnpm run dev  # 启动在 http://localhost:5173
   ```

访问地址：  
- 前端：http://localhost:5173  
- 后端 API：http://localhost:3001
- API 文档：http://localhost:3001/api-docs


### 默认账户
- 用户名：`admin`
- 密码：`admin123`
# 部署配置详情

## Docker设置偏好
1. **镜像规划原则**：
   - 基础镜像：直接使用官方现成镜像（`mysql:8.0`、`redis:8.4.0`），减少自定义维护成本
   - 业务镜像：前端和后端分别构建独立镜像，便于单独更新和版本控制
   - 整体打包：通过`docker-compose`将所有核心模块（前端、后端、MySQL、Redis）统一编排，实现一键部署

2. **镜像构建细节**：
   - 前端镜像：基于`nginx:alpine`，将打包后的静态资源拷贝至Nginx默认目录
   - 后端镜像：基于`node:lts-alpine`，安装依赖后启动API服务
   - 镜像优化：使用多阶段构建减小镜像体积（如前端仅保留打包结果，后端仅保留运行时依赖）

3. **打包 & 部署项目 到 docker容器**
   - 打包 & 部署项目
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

   - 查看所有服务状态: `docker-compose ps`

   - 测试访问   
      * 前端：http://localhost:5173
      * 后端 API：http://localhost:3001
      * API 文档：http://localhost:3001/api-docs

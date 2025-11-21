Docker Compose 是 Docker 官方提供的用于定义和运行多容器 Docker 应用的工具，其核心目标是通过配置文件（默认 docker-compose.yml）管理多个容器的协同工作，简化多容器应用的部署和运维流程。以下是其工作机制的详细解析：

## 核心概念
1. 服务（Service）：一个应用的组件（如数据库、web 应用），对应一个或多个容器实例。
2. 项目（Project）：由多个关联服务组成的完整应用，通过 docker-compose.yml 定义。
3. 配置文件：默认 docker-compose.yml（或 .yaml），用 YAML 语法描述服务、网络、数据卷等配置。
   
## 工作流程
### 1. 解析配置文件
  Docker Compose 读取配置文件（默认 docker-compose.yml），解析其中定义的服务（services）、网络（networks）、数据卷（volumes） 等信息：
    * 服务配置：每个服务包含镜像（或构建信息）、端口映射、环境变量、依赖关系、启动命令等。
    * 网络配置：定义服务间通信的网络（默认创建一个桥接网络，所有服务加入该网络，可通过服务名互相访问）。
    * 数据卷配置：定义持久化存储，用于容器间共享数据或持久化数据。

### 2. 创建 / 管理依赖资源
    * 根据配置，Compose 会自动创建所需的网络和数据卷（若未指定外部资源）：
    * 网络：确保同一项目的服务在同一网络内，可通过服务名（如 db）访问，无需手动配置 IP。
    * 数据卷：按配置创建命名卷或绑定挂载，确保数据持久化（容器销毁后数据不丢失）。

### 3. 启动服务（按依赖顺序）
  Compose 会根据服务的 depends_on 配置确定启动顺序（例如先启动数据库，再启动依赖它的应用），然后为每个服务创建并启动容器：
  * 若服务配置了 build，则先构建镜像（等价于 docker build），再基于镜像创建容器。
    e.g. 
    servies:
      backend:
        build:
          context: ..
          dockerfile: docker/backend/Dockerfile
  * 若服务使用已有镜像（image 配置），则直接拉取（若本地不存在）并创建容器。
    e.g.
    services:
      mysql:
        image: mysql:latest
        container_name: blog-mysql
  
  * 容器启动时，会应用配置中的端口映射、环境变量、挂载卷等参数（等价于 docker run 的参数）。


### 4. 维护服务生命周期

### 5. 附加说明
hostPort:containerPort 基本语法：宿主机端口:容器端口，如: ${DB_PORT:-3306}:3306
${DB_PORT:-3306} 的含义: ${变量名:-默认值}
  * 宿主机端口 = ${DB_PORT}（如果没设置，则使用默认 3306）
  * 容器端口 = 3306（MySQL 固定端口）
 

## 关键特性与机制



version: '3.8'

services:
  # MySQL 数据库
  mysql:
    image: mysql:latest
    container_name: blog-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:-root123}
      MYSQL_DATABASE: ${DB_NAME:-blog_db}
      MYSQL_USER: ${DB_USER:-blog_user}
      MYSQL_PASSWORD: ${DB_PASSWORD:-root123}
    ports:
      - "${DB_PORT:-3306}:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - blog-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Redis 缓存
  redis:
    image: redis:latest
    container_name: blog-redis
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
    networks:
      - blog-network
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # 后端服务
  backend:
    build:
      context: ..
      dockerfile: docker/backend/Dockerfile
    container_name: blog-backend
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: mysql
      DB_PORT: 3306
      DB_NAME: ${DB_NAME:-blog_db}
      DB_USER: ${DB_USER:-blog_user}
      DB_PASSWORD: ${DB_PASSWORD:-root123}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET:-your_jwt_secret_key_change_in_production}
      JWT_EXPIRES_IN: 7d
      CORS_ORIGIN: http://localhost
    ports:
      - "${BACKEND_PORT:-3001}:3001"
    volumes:
      - backend_logs:/app/logs
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - blog-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped

  # 前端服务
  frontend:
    build:
      context: ..
      dockerfile: docker/frontend/Dockerfile
    container_name: blog-frontend
    ports:
      - "${FRONTEND_PORT:-80}:80"
    depends_on:
      - backend
    networks:
      - blog-network
    restart: unless-stopped

volumes:
  mysql_data:
    driver: local
  redis_data:
    driver: local
  backend_logs:
    driver: local

networks:
  blog-network:
    driver: bridge


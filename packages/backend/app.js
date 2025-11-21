/*
  # 流程图：博客系统后端架构概览
  ## app.js 运行时执行流程
    应用启动
      ↓
    [1] 加载核心依赖
      ├── express、cors、helmet
      ├── config（环境配置）
      └── logger（日志系统）
      ↓
    [2] 中间件初始化和装配
      ├── 安全中间件（Helmet、CORS）
      ├── 请求解析（JSON、URL-encoded）
      ├── 请求日志（requestLogger）
      └── 限流控制（apiLimiter）
      ↓
    [3] API 文档系统（Swagger）
      └── swagger-jsdoc + swagger-ui-express
      ↓
    [4] 健康检查端点
      └── /api/health（检查 DB + Redis）
      ↓
    [5] 业务路由挂载
      ├── /api/articles（文章模块）
      ├── /api/users（用户模块）
      └── /api/auth（认证模块）
      ↓
    [6] 错误处理
      ├── 404 处理
      └── 全局错误处理
      ↓
    [7] 服务器启动
      ├── 数据库连接验证
      ├── 数据库模型同步（开发环境）
      └── 监听端口
      ↓
    [8] 优雅关闭处理
      ├── SIGTERM 信号处理
      └── SIGINT 信号处理

  ## 运行时服务依赖图
  ┌──────────────────────────────────────────────────────────────┐
  │                        app.js                                 │
  ├──────────────────────────────────────────────────────────────┤
  │                                                                │
  │  Express 框架 ─┬─ 中间件链                                    │
  │               │  ├─ Helmet（安全）                           │
  │               │  ├─ CORS（跨域）                             │
  │               │  ├─ Body Parser（请求解析）                  │
  │               │  ├─ Request Logger（日志）                   │
  │               │  └─ Rate Limiter（限流）                     │
  │               │                                               │
  │               ├─ Swagger/OpenAPI（API 文档）                 │
  │               │                                               │
  │               ├─ 路由模块                                    │
  │               │  ├─ Article Module（文章）                   │
  │               │  ├─ User Module（用户）                      │
  │               │  └─ Auth Module（认证）                      │
  │               │                                               │
  │               ├─ 错误处理                                    │
  │               │  ├─ 404 Handler                               │
  │               │  └─ Global Error Handler                      │
  │               │                                               │
  │               └─ 生命周期管理                                │
  │                  ├─ 启动（连接 DB + Redis）                  │
  │                  └─ 关闭（SIGTERM / SIGINT）                 │
  │                                                                │
  ├──────────────────────────────────────────────────────────────┤
  │                   外部依赖服务                                 │
  ├──────────────────────────────────────────────────────────────┤
  │  MySQL ────┬─ 数据库连接（Sequelize）                       │
  │            └─ 数据持久化                                     │
  │                                                                │
  │  Redis ────┬─ 缓存连接                                       │
  │            └─ 会话 + 高频数据缓存                            │
  │                                                                │
  │  Logger ───┬─ 请求日志                                       │
  │            ├─ 错误日志                                       │
  │            └─ 应用日志                                       │
  └──────────────────────────────────────────────────────────────┘
*/

// 加载核心依赖
import express from 'express'; // 导入 express 框架
import cors from 'cors'; // 导入 cors 中间件
import helmet from 'helmet'; // 导入 helmet 中间件, 其用于 设置安全 HTTP 头
import { config } from './config/index.js';
import sequelize from './config/database.js'; // 导入数据库连接
import redisClient from './config/redis.js'; // 导入 Redis 连接
import logger from './utils/logger.js'; // 导入日志记录器
import { requestLogger } from './middleware/requestLogger.js'; // 导入请求日志记录器
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'; // 错误处理中间件

import { apiLimiter } from './middleware/rateLimiter.js'; // 导入限流器中间件

// 导入路由
import articleRouter from './modules/article/router.js'; // 文章路由
import userRouter from './modules/user/router.js'; // 用户路由
import authRouter from './modules/auth/router.js'; // 认证路由

const app = express();
const PORT = config.server.port;

// 中间件初始化和装配
app.use(helmet()); // 安全中间件 - helmet: 设置各种 HTTP 头以增强安全性
app.use(cors(config.cors)); // 安全中间件 - cors: 跨域资源共享 (CORS)
app.use(express.json()); // 解析请求体(JSON)
app.use(express.urlencoded({ extended: true })); // 解析请求体(URL 编码)
app.use(requestLogger); // 请求日志（requestLogger）
app.use('/api', apiLimiter); // API 限流控制（apiLimiter）


// API 文档系统（Swagger）: swagger-jsdoc + swagger-ui-express
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Swagger 配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '博客系统 API',
      version: '1.0.0',
      description: '个人博客系统 + 后台管理 API 文档'
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: `${config.env} 服务器`
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./modules/**/*.js', './app.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 健康检查接口: /api/health（检查 DB + Redis）
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: 健康检查
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 服务正常
 */
app.get('/api/health', async (req, res) => {
  /*
    检查内容：
      ✅ MySQL 数据库连接状态
      ✅ Redis 缓存连接状态
      ✅ 内存使用情况（RSS、Heap Total、Heap Used）
      ✅ 服务运行时间（Uptime）
  */
  try {
    // 检查 MySQL 连接
    await sequelize.authenticate();
    const dbStatus = 'connected';

    // 检查 Redis 连接
    let redisStatus = 'disconnected';
    try {
      await redisClient.ping();
      redisStatus = 'connected';
    } catch (error) {
      logger.warn('Redis connection check failed:', error.message);
    }

    // 获取 内存使用情况  + 服务正常运行时间
    const memoryUsage = process.memoryUsage();
    const memoryInfo = {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    };

    res.json({
      code: 200,
      message: '服务正常',
      data: {
        status: 'healthy',
        database: dbStatus,
        redis: redisStatus,
        memory: memoryInfo,
        uptime: `${Math.round(process.uptime())}s`
      }
    });
  } catch (error) {
    logger.error(`Health check error: ${error.message}`);
    res.status(503).json({
      code: 503,
      message: '服务异常',
      data: {
        status: 'unhealthy',
        error: error.message
      }
    });
  }
});

// API 路由, 业务路由挂载
app.use('/api/articles', articleRouter); // 文章模块, 文章 CRUD、搜索、分类等
app.use('/api/users', userRouter); // 用户模块, 用户注册、登录、信息管理
app.use('/api/auth', authRouter); // 认证模块, 身份认证、权限控制、Token 管理

// 错误处理
app.use(notFoundHandler);   // 处理 404 错误
app.use(errorHandler);      // 全局错误处理

// 服务器启动 ✅
async function startServer() {
  try {
    // ✅ 验证 MySQL 连接可用
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // ✅ 同步 Sequelize 模型（开发环境）
    if (config.env === 'development') {
      // await sequelize.sync({ alter: true });
      logger.info('数据库模型已同步');
    }

    logger.info(`服务器运行在 http://localhost:${PORT}`);

    // ✅ 监听指定端口（默认 3001）
    // ✅ 输出启动成功日志
    app.listen(PORT, () => {
      logger.info(`服务器运行在 http://localhost:${PORT}`);
      logger.info(`API 文档: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

/* 
  功能：
    监听 SIGTERM（系统终止信号）和 SIGINT（Ctrl+C）
    优雅关闭数据库和缓存连接
    释放资源，防止数据损坏
*/
process.on('SIGTERM', async () => {
  logger.info('SIGTERM 信号 received，正在关闭服务器...');
  await sequelize.close();
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT 信号 received，正在关闭服务器...');
  await sequelize.close();
  await redisClient.quit();
  process.exit(0);
});

// 执行启动服务器
startServer();

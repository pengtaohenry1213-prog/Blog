// packages/backend/config/index.js

// dotenv 是一个用于加载环境变量文件的库，它可以帮助我们管理环境变量，避免在代码中直接使用环境变量，提高代码的可读性和可维护性。
import dotenv from 'dotenv';

// 根据 NODE_ENV 加载不同的环境变量文件
const env = process.env.NODE_ENV || 'development';
if (env === 'development') {
  // 开发环境加载 .env.development 文件
  dotenv.config({ path: '.env.development' });
} else if (env === 'test') {
  // 测试环境加载 .env.test 文件
  dotenv.config({ path: '.env.test' });
} else if (env === 'production') {
  // 生产环境加载 .env.production 文件
  dotenv.config({ path: '.env.production' });
}

// 默认加载 .env 文件
dotenv.config();


// 添加调试日志（仅在开发环境）
if (env === 'development') {
  console.log('REDIS_PASSWORD from env:', process.env.REDIS_PASSWORD);
  console.log('Redis config:', {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD ? '***' : undefined
  });
}

/**
 * 环境配置对象
 */
export const config = {
  // 环境
  env: env,
  
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT, 10) || 3001,
    host: process.env.HOST || '0.0.0.0'
  },
  
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    name: process.env.DB_NAME || 'blog_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    pool: {
      max: env === 'production' ? 10 : 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  
  // Redis 配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: (process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim()) || undefined
  },
  
  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  // CORS 配置
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  },
  
  // 日志配置
  logging: {
    level: env === 'production' ? 'info' : 'debug',
    file: env === 'production'
  }
};

export default config;


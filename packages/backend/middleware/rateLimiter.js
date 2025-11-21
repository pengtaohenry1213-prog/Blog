import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

// 根据环境调整限流配置
const isDevelopment = config.env === 'development';

/**
 * 通用 API 限流中间件
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: isDevelopment ? 1000 : 100, // 开发环境更宽松
  message: {
    code: 429,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * 登录接口限流中间件
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: isDevelopment ? 200 : 5, // 开发环境更宽松
  message: {
    code: 429,
    message: '登录尝试次数过多，请稍后再试'
  },
  skipSuccessfulRequests: true,
  // 开发环境下可以添加更详细的错误信息
  handler: (req, res) => {
    res.status(429).json({
      code: 429,
      message: isDevelopment 
        ? `登录尝试次数过多，请稍后再试（开发环境：15分钟内最多200次失败尝试）`
        : '登录尝试次数过多，请稍后再试'
    });
  }
});


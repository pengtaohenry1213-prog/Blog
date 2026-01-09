/*
 * express-rate-limit 是 Express 框架中最常用的请求限流中间件，
 *   核心作用是限制客户端在指定时间窗口内对特定接口 / 服务的请求次数，
 *   从而保护服务器免受暴力攻击（如密码爆破）、恶意刷接口、DDoS 攻击
 *   等行为的影响，同时也能避免服务器因突发高并发请求过载。 
 * 
 * 目的: 通过合理配置限流规则，可大幅提升 JWT 认证系统的安全性和稳定性。
 * 
 * 注: 分布式场景必用 Redis：多服务器部署时，内存限流会失效，需依赖 Redis 共享状态；
 */

import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

// 根据环境调整限流配置
const isDevelopment = config.env === 'development';

/**
 * 通用 API 限流中间件
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 限流时间窗口（毫秒），如 60 * 1000 代表 1 分钟（毫秒）
  max: isDevelopment ? 1000 : 100, // 时间窗口内允许的最大请求数（默认 5）, 开发环境更宽松, 每个IP在窗口内最多 1000 次请求
  message: { // 超出限制时的响应内容（支持字符串 / JSON）
    code: 429,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true, // 启用 `RateLimit-*` 响应头 (默认启用) 是否返回 RateLimit-Limit/RateLimit-Remaining 等标准响应头
  legacyHeaders: false, // 禁用 `X-RateLimit-*` 响应头 (默认禁用)
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
  skip: (req) => { // 跳过admin用户的请求, 管理员不限流
    return req.user.role === 'admin';
  },
  // keyGenerator: (req) => {}, // 自定义限流标识（默认 IP），如 (req) => req.user.userId（按用户 ID 限流）
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

// ========== 应用限流 ==========
// app.use(globalLimiter); // 全局限流（所有接口生效）
// 或 ↓ (在指定请求中叠加更严格的限流)
// app.post('/login', loginLimiter, (req, res) => { // 登录接口叠加更严格的限流
//   const { username, password } = req.body;
//   // 原有登录逻辑...
// });

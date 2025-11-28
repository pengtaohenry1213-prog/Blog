import { verifyToken, extractToken } from '../utils/jwt.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * JWT 认证中间件
 */
export async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证令牌'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        code: 401,
        message: '无效的认证令牌'
      });
    }

    // 查询用户信息
    const user = await User.findByPk(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        code: 401,
        message: '用户不存在或已被禁用'
      });
    }

    // 将用户信息附加到请求对象
    req.user = user;
    req.userId = user.id;

    // console.log('authenticate user = ', user);
    // console.log('authenticate req.user = ', req.user);
    // console.log('authenticate req.userId = ', req.userId);
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(401).json({
      code: 401,
      message: '认证失败'
    });
  }
}

/**
 * 可选认证中间件（用于公开接口，但需要识别已登录用户）
 * 如果提供了 token 就验证并设置 req.user，如果没有 token 就跳过
 */
export async function optionalAuthenticate(req, res, next) {
  try {
    const token = extractToken(req);
    
    // 如果没有 token，直接跳过，不设置 req.user
    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      // token 无效，但不阻止请求，只是不设置 req.user
      return next();
    }

    // 查询用户信息
    const user = await User.findByPk(decoded.userId);
    if (user && user.status === 'active') {
      // 将用户信息附加到请求对象
      req.user = user;
      req.userId = user.id;
    }

    next();
  } catch (error) {
    // 认证出错也不阻止请求，只是不设置 req.user
    logger.error(`Optional authentication error: ${error.message}`);
    next();
  }
}

/**
 * 权限校验中间件
 * @param {...string} roles 允许的角色
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '未认证'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }

    next();
  };
}


import logger from '../utils/logger.js';

/**
 * 错误处理中间件
 */
export function errorHandler(err, req, res, next) {
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Sequelize 验证错误
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      code: 400,
      message: '数据验证失败',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Sequelize 唯一约束错误
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      code: 409,
      message: '数据已存在',
      field: err.errors[0]?.path
    });
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      code: 401,
      message: '无效的令牌'
    });
  }

  // 默认错误响应
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? '服务器内部错误' 
    : err.message;

  res.status(statusCode).json({
    code: statusCode,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    code: 404,
    message: `路由 ${req.method} ${req.path} 不存在`
  });
}


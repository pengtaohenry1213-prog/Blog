import { validationResult } from 'express-validator';

/**
 * 验证中间件
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      code: 400,
      message: '参数验证失败',
      errors: errors.array()
    });
  }
  next();
}


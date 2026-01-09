import { validationResult } from 'express-validator';

/**
 * 验证中间件
 */
export function validate(req, res, next) {
  // 使用 express-validator 验证请求参数
  const errors = validationResult(req);
  // 如果验证失败，返回 400 错误
  if (!errors.isEmpty()) {
    return res.status(400).json({
      code: 400,
      message: '参数验证失败', // 错误信息
      errors: errors.array() // 错误列表
    });
  }
  next(); // 继续执行下一个中间件
}


import authService from './service.js';
import logger from '../../utils/logger.js';

class AuthController {
  /**
   * 用户登录
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);

      res.json({
        code: 200,
        message: '登录成功',
        data: result
      });
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      if (error.message.includes('错误') || error.message.includes('禁用')) {
        return res.status(401).json({
          code: 401,
          message: error.message
        });
      }
      next(error);
    }
  }

  /**
   * 用户登出
   */
  async logout(req, res, next) {
    try {
      await authService.logout(req.userId);
      res.json({
        code: 200,
        message: '登出成功'
      });
    } catch (error) {
      logger.error(`Logout error: ${error.message}`);
      next(error);
    }
  }

  /**
   * 用户注册
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        code: 201,
        message: '注册成功',
        data: result
      });
    } catch (error) {
      logger.error(`Register error: ${error.message}`);
      if (error.message.includes('已存在') || error.message.includes('已被注册')) {
        return res.status(409).json({
          code: 409,
          message: error.message
        });
      }
      next(error);
    }
  }
}

export default new AuthController();


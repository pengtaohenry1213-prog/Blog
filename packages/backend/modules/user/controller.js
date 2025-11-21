import userService from './service.js';
import logger from '../../utils/logger.js';
import { Op } from 'sequelize';

class UserController {
  /**
   * 获取用户列表
   */
  async getList(req, res, next) {
    try {
      const { page = 1, pageSize = 10, keyword } = req.query;
      const result = await userService.getUserList({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        keyword
      });

      res.json({
        code: 200,
        message: '获取成功',
        data: result
      });
    } catch (error) {
      logger.error(`Get user list error: ${error.message}`);
      next(error);
    }
  }

  /**
   * 获取用户详情
   */
  async getDetail(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(parseInt(id));

      if (!user) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在'
        });
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: user
      });
    } catch (error) {
      logger.error(`Get user detail error: ${error.message}`);
      next(error);
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrent(req, res, next) {
    try {
      const user = await userService.getUserById(req.userId);
      res.json({
        code: 200,
        message: '获取成功',
        data: user
      });
    } catch (error) {
      logger.error(`Get current user error: ${error.message}`);
      next(error);
    }
  }

  /**
   * 创建用户
   */
  async create(req, res, next) {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json({
        code: 201,
        message: '创建成功',
        data: user
      });
    } catch (error) {
      logger.error(`Create user error: ${error.message}`);
      if (error.message.includes('已存在')) {
        return res.status(409).json({
          code: 409,
          message: error.message
        });
      }
      next(error);
    }
  }

  /**
   * 更新用户
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.updateUser(
        parseInt(id),
        req.body,
        req.userId,
        req.user.role
      );

      res.json({
        code: 200,
        message: '更新成功',
        data: user
      });
    } catch (error) {
      logger.error(`Update user error: ${error.message}`);
      if (error.message.includes('不存在') || error.message.includes('无权')) {
        return res.status(403).json({
          code: 403,
          message: error.message
        });
      }
      next(error);
    }
  }

  /**
   * 删除用户
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await userService.deleteUser(parseInt(id), req.userId, req.user.role);

      res.json({
        code: 200,
        message: '删除成功'
      });
    } catch (error) {
      logger.error(`Delete user error: ${error.message}`);
      if (error.message.includes('不存在') || error.message.includes('无权') || error.message.includes('不能删除')) {
        return res.status(403).json({
          code: 403,
          message: error.message
        });
      }
      next(error);
    }
  }
}

export default new UserController();


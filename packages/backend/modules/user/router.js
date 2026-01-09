/**
 * 用户路由定义
 * 职责：定义 RESTful API 端点和路由规则
 * 典型内容：
 *  路由路径映射（如 GET /api/users、POST /api/users）
 *  路由中间件链（验证、日志、速率限制等）
 *  请求分发到对应的 controller 方法
 * 
 * 示例结构：
    const express = require('express');
    const router = express.Router();
    const controller = require('./controller');
    const authMiddleware = require('../../middleware/auth');

    router.get('/', controller.getUsers);           // 获取用户列表
    router.get('/:id', controller.getUserById);     // 获取单个用户
    router.post('/', controller.createUser);        // 创建用户
    router.put('/:id', authMiddleware, controller.updateUser);  // 更新用户
    router.delete('/:id', authMiddleware, controller.deleteUser); // 删除用户

    module.exports = router;
 */

import express from 'express';
import userController from './controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { body, param, query } from 'express-validator'; // express 请求验证
import { validate } from '../../middleware/validator.js';

// import { formatDate } from '@blog/common';
// console.log('formatDate = ', typeof formatDate);

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 获取用户列表（仅管理员）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回用户列表
 */
router.get(
  '/',
  authorize('admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    validate
  ],
  userController.getList
);

/**
 * @swagger
 * /api/users/current:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回当前用户信息
 */
router.get('/current', userController.getCurrent);

/**
 * @swagger
 * /api/users/:id:
 *   get:
 *     summary: 获取用户详情
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: integer
 *     responses:
 *       200:
 *         description: 成功返回用户详情
 */
router.get(
  '/:id',
  [param('id').isInt(), validate],
  userController.getDetail
);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: 创建用户（仅管理员）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post(
  '/',
  authorize('admin'),
  [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
    validate
  ],
  userController.create
);

/**
 * @swagger
 * /api/users/:id:
 *   put:
 *     summary: 更新用户
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put(
  '/:id',
  [param('id').isInt(), validate],
  userController.update
);

/**
 * @swagger
 * /api/users/:id:
 *   delete:
 *     summary: 删除用户（仅管理员）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete(
  '/:id',
  authorize('admin'),
  [param('id').isInt(), validate],
  userController.delete
);

export default router;


import express from 'express';
import articleController from './controller.js';
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth.js';
import { body, query, param } from 'express-validator';
import { validate } from '../../middleware/validator.js';
import { idempotencyGuard } from '../../middleware/idempotency.js';

const router = express.Router();

/*
  router.post(path, [middleware...], handler)
  middleware（可选，一个或多个）, 如下, 执行顺序：从左到右
  router.post(
    '/create',
    authMiddleware,
    validateMiddleware,
    (req, res) => {}
  );

*/

/**
 * @swagger
 * /api/articles:
 *   get:
 *     summary: 获取文章列表
 *     tags: [Articles]
 *     parameters:
 *       - name: page
 *         in: query
 *         type: integer
 *         default: 1
 *       - name: pageSize
 *         in: query
 *         type: integer
 *         default: 10
 *       - name: categoryId
 *         in: query
 *         type: integer
 *       - name: keyword
 *         in: query
 *         type: string
 *       - name: status
 *         in: query
 *         type: string
 *         default: published
 *     responses:
 *       200:
 *         description: 成功返回文章列表
 */
router.get(
  '/',
  optionalAuthenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    validate
  ],
  articleController.getList
);

/**
 * @swagger
 * /api/articles/hot:
 *   get:
 *     summary: 获取热门文章
 *     tags: [Articles]
 *     responses:
 *       200:
 *         description: 成功返回热门文章列表
 */
router.get('/hot', articleController.getHot);

/**
 * @swagger
 * /api/articles/:id:
 *   get:
 *     summary: 获取文章详情
 *     tags: [Articles]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: integer
 *     responses:
 *       200:
 *         description: 成功返回文章详情
 */
router.get(
  '/:id',
  [param('id').isInt(), validate],
  articleController.getDetail
);

/**
 * @swagger
 * /api/articles:
 *   post:
 *     summary: 创建文章
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post(
  '/',
  authenticate,
  idempotencyGuard,   // 在校验和控制器之前
  [
    body('title').notEmpty().withMessage('标题不能为空'),
    body('content').notEmpty().withMessage('内容不能为空'),
    validate
  ],
  articleController.create
);

/**
 * @swagger
 * /api/articles/:id:
 *   put:
 *     summary: 更新文章
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: integer
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put(
  '/:id',
  authenticate,
  [param('id').isInt(), validate],
  articleController.update
);

/**
 * @swagger
 * /api/articles/:id:
 *   delete:
 *     summary: 删除文章
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete(
  '/:id',
  authenticate,
  [param('id').isInt(), validate],
  articleController.delete
);

/**
 * @swagger
 * /api/articles/:id/like:
 *   post:
 *     summary: 点赞文章
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: integer
 *     responses:
 *       200:
 *         description: 点赞成功
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idempotencyKey
 *             properties:
 *               idempotencyKey:
 *                 type: string
 *                 description: 幂等键，用于保证同一操作只执行一次
 */
router.post(
  '/:id/like', 
  authenticate, 
  idempotencyGuard, // 在校验和控制器之前执行
  [param('id').isInt(), validate], 
  articleController.like
);

/**
 * @swagger
 * /api/articles/:id/unlike:
 *   delete:
 *     summary: 取消点赞文章
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *       - name: id
 *         in: path
 *         required: true
 *         type: integer
 *     responses:
 *       200:
 *         description: 取消点赞成功
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idempotencyKey
 *             properties:
 *               idempotencyKey:
 *                 type: string
 *                 description: 幂等键，用于保证同一操作只执行一次
 */
router.post(
  '/:id/unlike', 
  authenticate, 
  idempotencyGuard, // 在校验和控制器之前执行
  [param('id').isInt(), validate], 
  articleController.unlike
);

/**
 * @swagger
 * /api/articles/:id/vote:
 *   post:
 *     summary: 投票文章
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *       - name: id
 *         in: path
 *         required: true
 *         type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: integer
 *                 enum: [1, -1, 0]
 *               idempotencyKey:
 *                 type: string
 *                 description: 幂等键，用于保证同一操作只执行一次
 *     responses:
 *       200:
 *         description: 投票成功
 */
router.post(
  '/:id/vote', 
  authenticate, 
  idempotencyGuard, // 在校验和控制器之前执行
  [
    param('id').isInt(),
    body('value').isIn([1, -1, 0]).withMessage('投票值必须是 1(赞成)、-1(反对) 或 0(取消)'),
    validate
  ], 
  articleController.vote
);

export default router;


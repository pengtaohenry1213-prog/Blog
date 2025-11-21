import express from 'express';
import articleController from './controller.js';
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth.js';
import { body, query, param } from 'express-validator';
import { validate } from '../../middleware/validator.js';

const router = express.Router();

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

export default router;


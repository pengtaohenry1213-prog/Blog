import express from 'express';
import statsController from './controller.js';
import { authenticate } from '../../middleware/auth.js'; // JWT 认证中间件

const router = express.Router();

/**
 * @swagger
 * /api/stats/overview:
 *   get:
 *     summary: 获取概览统计数据
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回统计数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalArticles:
 *                       type: integer
 *                     publishedArticles:
 *                       type: integer
 *                     totalUsers:
 *                       type: integer
 *                     totalViews:
 *                       type: integer
 *                     visitTrend:
 *                       type: object
 *                     sourcePie:
 *                       type: array
 *                     topArticles:
 *                       type: object
 *                     visitHeatmap:
 *                       type: array 
 */
router.get('/overview', authenticate, statsController.getOverview);

export default router;

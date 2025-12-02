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

/**
 * @swagger
 * /api/stats/browsing-time:
 *   post:
 *     summary: 上报页面浏览时长
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 type: string
 *                 description: 页面标识，如 admin-dashboard
 *               totalTime:
 *                 type: number
 *                 description: 累计浏览时长（秒）
 *               sessionTime:
 *                 type: number
 *                 description: 本次会话浏览时长（秒）
 *               isTracking:
 *                 type: boolean
 *                 description: 客户端当前是否仍在统计
 *               reason:
 *                 type: string
 *                 description: 上报原因，如 periodic / unload
 *               reportedAt:
 *                 type: string
 *                 format: date-time
 *                 description: 客户端上报时间
 *     responses:
 *       200:
 *         description: 上报成功
 */
router.post('/browsing-time', authenticate, statsController.reportBrowsingTime);

/**
 * @swagger
 * /api/stats/browsing-time/summary:
 *   get:
 *     summary: 获取页面浏览时长汇总信息
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *         required: false
 *         description: 页面标识，如 admin-dashboard；为空时返回当前用户所有页面的汇总
 *     responses:
 *       200:
 *         description: 成功返回汇总数据
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
 *                     page:
 *                       type: string
 *                     userId:
 *                       type: integer
 *                     totalSessionTime:
 *                       type: number
 *                     totalReportedTime:
 *                       type: number
 *                     lastReportedAt:
 *                       type: string
 *                       format: date-time
 *                     reportCount:
 *                       type: integer
 */
router.get('/browsing-time/summary', authenticate, statsController.getBrowsingSummary);

export default router;

import statsService from './service.js';
import logger from '../../utils/logger.js';

class StatsController {
  /**
   * 获取概览统计数据
   */
  async getOverview(req, res, next) {
    try {
      const data = await statsService.getOverview();
      logger.info(`data.sourcePie: ${data.sourcePie}`)
      res.json({
        code: 200,
        message: '获取成功',
        data
      });
    } catch (error) {
      logger.error(`Get overview stats error: ${error.message}`);
      next(error);
    }
  }

  /**
   * 浏览时长上报
   */
  async reportBrowsingTime(req, res, next) {
    try {
      const payload = req.body || {};
      const user = req.user || null;

      await statsService.recordBrowsingTime(
        {
          ...payload,
          // 从请求中补充一些通用字段
          userAgent: req.headers['user-agent'],
          ip:
            req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.ip ||
            req.connection?.remoteAddress
        },
        user
      );

      res.json({
        code: 200,
        message: '上报成功'
      });
    } catch (error) {
      logger.error(`Report browsing time error: ${error.message}`);
      next(error);
    }
  }

  /**
   * 获取浏览时长汇总信息
   */
  async getBrowsingSummary(req, res, next) {
    try {
      const page = req.query.page;
      const user = req.user || null;

      const data = await statsService.getBrowsingSummary({ page, user });

      res.json({
        code: 200,
        message: '获取成功',
        data
      });
    } catch (error) {
      logger.error(`Get browsing summary error: ${error.message}`);
      next(error);
    }
  }
}

export default new StatsController();


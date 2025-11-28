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
}

export default new StatsController();


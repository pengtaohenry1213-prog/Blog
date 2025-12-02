import Article from '../../models/Article.js';
import User from '../../models/User.js';
import BrowsingStat from '../../models/BrowsingStat.js';
import { Op, fn, col } from 'sequelize';
// import sequelize from '../../config/database.js';
import debug from 'debug';


// 创建命名空间的调试器
const debugStats = debug('app:stats:service');
const debugStatsCategory = debug('app:stats:category');

class StatsService {
  /**
   * getOverview: 获取概览统计数据, 返回: 
   * {
   *   totalArticles: 总文章数,
   *   publishedArticles: 已发布文章数,
   *   totalUsers: 总用户数,
   *   totalViews: 总浏览量,
   *   visitTrend: 访问趋势,
   *   sourcePie: 流量来源分布,
   *   topArticles: 热门文章 Top 5,
   *   visitHeatmap: 访问时间分布
   * }
   */
  async getOverview() {
    // 获取基础统计数据
    const [totalArticles, publishedArticles, totalUsers, viewsResult] = await Promise.all([
      Article.count(),
      Article.count({ where: { status: 'published' } }),
      User.count(),
      Article.findOne({
        attributes: [[fn('SUM', col('read_count')), 'total']],
        raw: true
      })
    ]);

    const totalViews = viewsResult?.total ? parseInt(viewsResult.total) : 0;

    // 获取最近7天的访问趋势（基于文章发布时间和阅读量模拟）
    const visitTrend = await this.getVisitTrend();

    // 使用 debug 替代 logger.info
    // debugStatsCategory('开始查询分类数据');
    
    // 获取流量来源分布（模拟数据，后续可以接入真实统计）
    const sourcePie = await this.getSourcePie();

    // debugStatsCategory('最终结果:', sourcePie);

    // 获取热门文章 Top 5
    const topArticles = await this.getTopArticles();
    
    // 获取访问时间分布（模拟数据，后续可以接入真实统计）
    const visitHeatmap = this.getVisitHeatmap();

    return {
      totalArticles, // 总文章数
      publishedArticles, // 已发布文章数
      totalUsers, // 总用户数
      totalViews, // 总浏览量
      visitTrend, // 访问趋势
      sourcePie, // 流量来源分布
      topArticles, // 热门文章 Top 5
      visitHeatmap, // 访问时间分布
    };
  }

  /**
   * 获取最近7天访问趋势
   */
  async getVisitTrend() {
    const days = [];
    const pvData = [];
    const uvData = [];

    // 获取最近7天的日期
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      days.push(`第 ${7 - i} 天`);

      // 查询该日期发布的文章数量作为模拟PV
      const dayStart = new Date(dateStr + 'T00:00:00');
      const dayEnd = new Date(dateStr + 'T23:59:59');
      
      const articles = await Article.findAll({
        where: {
          publish_time: {
            [Op.between]: [dayStart, dayEnd]
          },
          status: 'published'
        }
      });

      // 模拟PV和UV数据（基于文章数量和阅读量）
      const pv = articles.reduce((sum, article) => sum + (article.read_count || 0), 0) || Math.floor(Math.random() * 200) + 50;
      const uv = Math.floor(pv * 0.6); // UV约为PV的60%

      pvData.push(pv);
      uvData.push(uv);
    }

    return {
      days,
      pv: pvData,
      uv: uvData
    };
  }

  /**
   * 获取文章分类分布（替代流量来源分布）
   * 按分类统计已发布文章的数量和阅读量
   */
  async getSourcePie() {
    const Category = (await import('../../models/Category.js')).default;

    // 查询所有分类及其文章统计
    const categories = await Category.findAll({
      include: [{
        model: Article,
        as: 'articles',
        where: { status: 'published' },
        required: false,
        attributes: []
      }],
      attributes: [
        'id',
        'name',
        [fn('COUNT', col('articles.id')), 'articleCount'],
        [fn('SUM', col('articles.read_count')), 'totalViews']
      ],
      group: ['Category.id', 'Category.name'],
      raw: false
    });


    // debug 会自动格式化对象，比 JSON.stringify 更友好
    // debugStatsCategory('分类查询结果:', categories);
    // debugStatsCategory('分类数量:', categories.length);

    // 如果没有分类数据，返回空数组或默认数据
    if (!categories || categories.length === 0) {
      debugStatsCategory('警告: 没有找到分类数据');
      return [
        { value: 0, name: '暂无分类数据' }
      ];
    }

    // 转换为饼图数据格式
    const result = categories.map(category => {
      const articleCount = parseInt(category.get('articleCount') || 0);
      const totalViews = parseInt(category.get('totalViews') || 0);
      const value = totalViews > 0 ? totalViews : articleCount;
      
      return {
        value: value,
        name: category.name || '未命名分类'
      };
    })//.filter(item => item.value > 0);

    return result;
  }

  /**
   * 获取热门文章 Top 5
   */
  async getTopArticles() {
    const articles = await Article.findAll({
      where: {
        status: 'published'
      },
      order: [['read_count', 'DESC']],
      limit: 5,
      attributes: ['id', 'title', 'read_count']
    });

    return {
      names: articles.map(article => article.title || '未命名文章'),
      views: articles.map(article => article.read_count || 0)
    };
  }

  /**
   * 获取访问时间分布（模拟数据）
   */
  getVisitHeatmap() {
    const hours = Array.from({ length: 24 }).map((_, i) => i);
    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // 0=周一, 6=周日
    const heatmapData = [];

    // 生成模拟的热力图数据
    daysOfWeek.forEach((dayIndex) => {
      hours.forEach((hourIndex) => {
        // 模拟：工作日9-18点访问量较高，周末访问量较低
        let value = Math.floor(Math.random() * 100);
        if (dayIndex < 5 && hourIndex >= 9 && hourIndex <= 18) {
          value = Math.floor(Math.random() * 150) + 50; // 工作日工作时间访问量更高
        } else if (dayIndex >= 5) {
          value = Math.floor(Math.random() * 80); // 周末访问量较低
        }
        heatmapData.push([hourIndex, dayIndex, value]);
      });
    });

    return heatmapData;
  }

  /**
   * 记录浏览时长
   * @param {Object} payload 前端上报的数据
   * @param {Object} user 当前登录用户（可选）
   */
  async recordBrowsingTime(payload, user) {
    const {
      page,
      totalTime,
      sessionTime,
      isTracking,
      reason,
      reportedAt
    } = payload || {};

    if (!page) {
      throw new Error('page is required for browsing time reporting');
    }

    const userId = user?.id || null;

    await BrowsingStat.create({
      page,
      user_id: userId,
      total_time: Number(totalTime) || 0,
      session_time: Number(sessionTime) || 0,
      is_tracking: !!isTracking,
      reason: reason || null,
      reported_at: reportedAt ? new Date(reportedAt) : new Date(),
      user_agent: payload.userAgent || null,
      ip: payload.ip || null
    });
  }

  /**
   * 获取浏览时长汇总信息
   * 可按 page 和 user 维度做聚合
   */
  async getBrowsingSummary({ page, user }) {
    const where = {};
    if (page) {
      where.page = page;
    }
    if (user?.id) {
      where.user_id = user.id;
    }

    const [agg, totalCount] = await Promise.all([
      BrowsingStat.findOne({
        attributes: [
          [fn('SUM', col('session_time')), 'totalSessionTime'],
          [fn('SUM', col('total_time')), 'totalReportedTime'],
          [fn('MAX', col('reported_at')), 'lastReportedAt']
        ],
        where,
        raw: true
      }),
      BrowsingStat.count({ where })
    ]);

    return {
      page: page || null,
      userId: user?.id || null,
      totalSessionTime: Number(agg?.totalSessionTime || 0),
      totalReportedTime: Number(agg?.totalReportedTime || 0),
      lastReportedAt: agg?.lastReportedAt || null,
      reportCount: totalCount
    };
  }
}

export default new StatsService();


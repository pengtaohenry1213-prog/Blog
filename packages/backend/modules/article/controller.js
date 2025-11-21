import articleService from './service.js';
import logger from '../../utils/logger.js';

class ArticleController {
  /**
   * 获取文章列表
   */
  async getList(req, res, next) {
    try {
      const { page = 1, pageSize = 10, categoryId, keyword } = req.query;

      // 管理员可以指定 status，如果为空字符串或未定义，则传递 undefined（表示查询所有状态）
      // 非管理员只能查看已发布的文章
      let status;
      if (req.user?.role === 'admin') {
        // 如果 status 为空字符串或未定义，传递 undefined 表示查询所有状态
        status = req.query.status && req.query.status.trim() !== '' 
          ? req.query.status 
          : undefined;
      } else {
        status = 'published';
      }

      const result = await articleService.getArticleList({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        keyword,
        status
      });

      res.json({
        code: 200,
        message: '获取成功',
        data: result
      });
    } catch (error) {
      logger.error(`Get article list error: ${error.message}`);
      next(error);
    }
  }

  /**
   * 获取文章详情
   */
  async getDetail(req, res, next) {
    try {
      const { id } = req.params;
      const article = await articleService.getArticleById(parseInt(id));

      if (!article) {
        return res.status(404).json({
          code: 404,
          message: '文章不存在'
        });
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: article
      });
    } catch (error) {
      logger.error(`Get article detail error: ${error.message}`);
      next(error);
    }
  }

  /**
   * 获取热门文章
   */
  async getHot(req, res, next) {
    try {
      const articles = await articleService.getHotArticles();
      res.json({
        code: 200,
        message: '获取成功',
        data: articles
      });
    } catch (error) {
      logger.error(`Get hot articles error: ${error.message}`);
      next(error);
    }
  }

  /**
   * 创建文章
   */
  async create(req, res, next) {
    try {
      const article = await articleService.createArticle(req.body, req.userId);
      res.status(201).json({
        code: 201,
        message: '创建成功',
        data: article
      });
    } catch (error) {
      logger.error(`Create article error: ${error.message}`);
      next(error);
    }
  }

  /**
   * 更新文章
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const article = await articleService.updateArticle(
        parseInt(id),
        req.body,
        req.userId,
        req.user.role
      );

      res.json({
        code: 200,
        message: '更新成功',
        data: article
      });
    } catch (error) {
      logger.error(`Update article error: ${error.message}`);
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
   * 删除文章
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await articleService.deleteArticle(parseInt(id), req.userId, req.user.role);

      res.json({
        code: 200,
        message: '删除成功'
      });
    } catch (error) {
      logger.error(`Delete article error: ${error.message}`);
      if (error.message.includes('不存在') || error.message.includes('无权')) {
        return res.status(403).json({
          code: 403,
          message: error.message
        });
      }
      next(error);
    }
  }
}

export default new ArticleController();


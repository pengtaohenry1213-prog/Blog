import Article from '../../models/Article.js';
import Category from '../../models/Category.js';
import User from '../../models/User.js';
import cacheService from '../../utils/cache.js';
import { Op } from 'sequelize';
// import logger from '../../utils/logger.js';

class ArticleService {
  /**
   * 获取文章列表（分页）
   */
  async getArticleList({ page = 1, pageSize = 10, categoryId, keyword, status }) {
    const offset = (page - 1) * pageSize;
    const where = {};

    // 只有当 status 有有效值时才添加到查询条件中
    // 如果 status 是 undefined，则不添加 status 条件，表示查询所有状态
    if (status !== undefined && status !== null && status !== '') {
      where.status = status;
    }

    if (categoryId) {
      where.category_id = categoryId;
    }

    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { content: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const { count, rows } = await Article.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        }
      ],
      order: [['publish_time', 'DESC']],
      limit: pageSize,
      offset
    });

    return {
      list: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    };
  }

  /**
   * 获取文章详情
   */
  async getArticleById(id) {
    // 先尝试从缓存获取
    const cacheKey = `article:${id}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const article = await Article.findByPk(id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        }
      ]
    });

    if (article) {
      // 缓存文章详情，1小时过期
      await cacheService.set(cacheKey, article, 3600);
      // 增加阅读量
      await article.increment('read_count');
    }

    return article;
  }

  /**
   * 获取热门文章（Top 10）
   */
  async getHotArticles() {
    const cacheKey = 'articles:hot';
    
    // 先尝试从缓存获取
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const articles = await Article.findAll({
      where: { status: 'published' },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ],
      order: [['read_count', 'DESC']],
      limit: 10
    });

    // 缓存热门文章，5分钟过期
    await cacheService.set(cacheKey, articles, 300);

    return articles;
  }

  /**
   * 创建文章
   */
  async createArticle(data, authorId) {
    const article = await Article.create({
      ...data,
      author_id: authorId,
      publish_time: data.status === 'published' ? new Date() : null
    });

    // 清除相关缓存
    await cacheService.del('articles:hot');
    await cacheService.delPattern('article:*');

    return article;
  }

  /**
   * 更新文章
   */
  async updateArticle(id, data, userId, userRole) {
    const article = await Article.findByPk(id);
    if (!article) {
      throw new Error('文章不存在');
    }

    // 权限检查：只有作者或管理员可以修改
    if (article.author_id !== userId && userRole !== 'admin') {
      throw new Error('无权修改此文章');
    }

    // 如果状态从草稿变为已发布，设置发布时间
    if (data.status === 'published' && article.status !== 'published') {
      data.publish_time = new Date();
    }

    await article.update(data);

    // 清除相关缓存
    await cacheService.del(`article:${id}`);
    await cacheService.del('articles:hot');
    await cacheService.delPattern('article:*');

    return article;
  }

  /**
   * 删除文章
   */
  async deleteArticle(id, userId, userRole) {
    const article = await Article.findByPk(id);
    if (!article) {
      throw new Error('文章不存在');
    }

    // 权限检查：只有作者或管理员可以删除
    if (article.author_id !== userId && userRole !== 'admin') {
      throw new Error('无权删除此文章');
    }

    await article.destroy();

    // 清除相关缓存
    await cacheService.del(`article:${id}`);
    await cacheService.del('articles:hot');
    await cacheService.delPattern('article:*');

    return true;
  }
}

export default new ArticleService();


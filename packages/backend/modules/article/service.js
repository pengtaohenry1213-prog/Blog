import Article from '../../models/Article.js';
import Category from '../../models/Category.js';
import User from '../../models/User.js';
import ArticleReaction from '../../models/ArticleReaction.js';
import ArticleVote from '../../models/ArticleVote.js';
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
   * @param {number} id - 文章ID
   * @param {number} [userId] - 当前用户ID（可选，用于返回用户特定的点赞/投票状态）
   */
  async getArticleById(id, userId = null) {
    // 先尝试从缓存获取（注意：缓存不包含用户特定状态）
    const cacheKey = `article:${id}`;
    const cached = await cacheService.get(cacheKey);
    
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

    if (!article) {
      return null;
    }

    // 获取点赞统计
    const likeCount = await ArticleReaction.count({
      where: {
        article_id: id,
        type: 'like',
        value: 1
      }
    });

    // 获取投票统计
    const up = await ArticleVote.count({
      where: {
        article_id: id,
        value: 1
      }
    });

    const down = await ArticleVote.count({
      where: {
        article_id: id,
        value: -1
      }
    });

    const voteScore = up - down;

    // 获取用户特定的状态（如果已登录）
    let liked = false;
    let vote = 0;

    if (userId) {
      const userLike = await ArticleReaction.findOne({
        where: {
          article_id: id,
          user_id: userId,
          type: 'like'
        }
      });
      liked = !!userLike;

      const userVote = await ArticleVote.findOne({
        where: {
          article_id: id,
          user_id: userId
        }
      });
      vote = userVote ? userVote.value : 0;
    }

    // 将统计信息添加到文章对象
    const articleData = article.toJSON();
    articleData.likeCount = likeCount;
    articleData.liked = liked;
    articleData.voteScore = voteScore;
    articleData.vote = vote;
    articleData.up = up;
    articleData.down = down;

    // 缓存文章详情（不包含用户特定状态），1小时过期
    await cacheService.set(cacheKey, articleData, 3600);
    
    // 增加阅读量
    await article.increment('read_count');

    return articleData;
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

  /**
   * 点赞文章
   */
  async like(articleId, userId) {
    // 检查是否已点赞
    const existing = await ArticleReaction.findOne({
      where: {
        article_id: articleId,
        user_id: userId,
        type: 'like'
      }
    });

    if (existing) {
      // 已点赞，返回当前状态
      const likeCount = await ArticleReaction.count({
        where: {
          article_id: articleId,
          type: 'like',
          value: 1
        }
      });
      return { articleId, liked: true, likeCount };
    }

    // 创建点赞记录（唯一约束会防止重复）
    await ArticleReaction.create({
      article_id: articleId,
      user_id: userId,
      type: 'like',
      value: 1
    });

    // 统计点赞数
    const likeCount = await ArticleReaction.count({
      where: {
        article_id: articleId,
        type: 'like',
        value: 1
      }
    });

    // 清除文章缓存
    await cacheService.del(`article:${articleId}`);

    return { articleId, liked: true, likeCount };
  }

  /**
   * 取消点赞文章
   */
  async unlike(articleId, userId) {
    // 查找点赞记录
    const reaction = await ArticleReaction.findOne({
      where: {
        article_id: articleId,
        user_id: userId,
        type: 'like'
      }
    });

    if (!reaction) {
      // 未点赞，返回当前状态
      const likeCount = await ArticleReaction.count({
        where: {
          article_id: articleId,
          type: 'like',
          value: 1
        }
      });
      return { articleId, liked: false, likeCount };
    }

    // 删除点赞记录
    await reaction.destroy();

    // 统计点赞数
    const likeCount = await ArticleReaction.count({
      where: {
        article_id: articleId,
        type: 'like',
        value: 1
      }
    });

    // 清除文章缓存
    await cacheService.del(`article:${articleId}`);

    return { articleId, liked: false, likeCount };
  }

  /**
   * 投票文章
   */
  async vote(articleId, userId, value) {
    // value: 1(赞成)/-1(反对)/0(取消投票)
    if (![1, -1, 0].includes(value)) {
      throw new Error('投票值无效，必须是 1(赞成)、-1(反对) 或 0(取消)');
    }

    // 查找现有投票记录
    const existingVote = await ArticleVote.findOne({
      where: {
        article_id: articleId,
        user_id: userId
      }
    });

    if (value === 0) {
      // 取消投票
      if (existingVote) {
        await existingVote.destroy();
      }
    } else {
      // 创建或更新投票记录（唯一约束会防止重复）
      if (existingVote) {
        await existingVote.update({ value });
      } else {
        await ArticleVote.create({
          article_id: articleId,
          user_id: userId,
          value
        });
      }
    }

    // 统计投票数
    const up = await ArticleVote.count({
      where: {
        article_id: articleId,
        value: 1
      }
    });

    const down = await ArticleVote.count({
      where: {
        article_id: articleId,
        value: -1
      }
    });

    const voteScore = up - down;

    // 清除文章缓存
    await cacheService.del(`article:${articleId}`);

    return { articleId, vote: value, voteScore, up, down };
  }
}

export default new ArticleService();


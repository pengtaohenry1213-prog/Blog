// 模型索引文件 - 确保所有模型被加载
// 这个文件确保 Sequelize 能够识别所有模型，特别是在使用 sync() 时

import Article from './Article.js';
import User from './User.js';
import Category from './Category.js';
import ArticleReaction from './ArticleReaction.js';
import ArticleVote from './ArticleVote.js';
import BrowsingStat from './BrowsingStat.js';

// 导出所有模型
export {
  Article,
  User,
  Category,
  ArticleReaction,
  ArticleVote,
  BrowsingStat
};

// 默认导出模型数组（用于某些工具）
export default [
  Article,
  User,
  Category,
  ArticleReaction,
  ArticleVote,
  BrowsingStat
];


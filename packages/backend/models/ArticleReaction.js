import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Article from './Article.js';
import User from './User.js';

// 文章反应模型（点赞、收藏等）
const ArticleReaction = sequelize.define(
  'ArticleReaction',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    article_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Article,
        key: 'id'
      },
      comment: '文章ID'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      },
      comment: '用户ID'
    },
    type: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '反应类型：like-点赞'
    },
    value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '反应值：1-点赞'
    }
  },
  {
    tableName: 'article_reactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        name: 'idx_article_reactions_unique',
        fields: ['article_id', 'user_id', 'type']
      },
      {
        name: 'idx_article_reactions_article_id',
        fields: ['article_id']
      },
      {
        name: 'idx_article_reactions_user_id',
        fields: ['user_id']
      }
    ]
  }
);

// 定义关联关系
ArticleReaction.belongsTo(Article, { foreignKey: 'article_id', as: 'article' });
ArticleReaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default ArticleReaction;


import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Article from './Article.js';
import User from './User.js';

// 文章投票模型
const ArticleVote = sequelize.define(
  'ArticleVote',
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
    value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '投票值：1-赞成，-1-反对，0-取消'
    }
  },
  {
    tableName: 'article_votes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        name: 'idx_article_votes_unique',
        fields: ['article_id', 'user_id']
      },
      {
        name: 'idx_article_votes_article_id',
        fields: ['article_id']
      },
      {
        name: 'idx_article_votes_user_id',
        fields: ['user_id']
      }
    ]
  }
);

// 定义关联关系
ArticleVote.belongsTo(Article, { foreignKey: 'article_id', as: 'article' });
ArticleVote.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default ArticleVote;


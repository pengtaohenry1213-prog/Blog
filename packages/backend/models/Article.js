import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';
import Category from './Category.js';

const Article = sequelize.define('Article', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '文章标题'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '文章内容'
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '文章摘要'
  },
  cover: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '封面图片URL'
  },
  author_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    comment: '作者ID'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Category,
      key: 'id'
    },
    comment: '分类ID'
  },
  publish_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '发布时间'
  },
  read_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '阅读量'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft',
    comment: '状态：draft-草稿，published-已发布，archived-已归档'
  },
  tags: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '标签（逗号分隔）'
  }
}, {
  tableName: 'articles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['author_id']
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['publish_time']
    },
    {
      fields: ['status']
    },
    // 联合索引
    {
      fields: ['author_id', 'category_id', 'publish_time']
    }
  ]
});

// 定义关联关系
Article.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
Article.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

export default Article;


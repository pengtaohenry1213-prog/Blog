import sequelize from '../config/database.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
// import Article from '../models/Article.js';
import { hashPassword } from '../utils/bcrypt.js';
import logger from '../utils/logger.js';

/**
 * 数据库初始化脚本
 * 创建表结构并初始化默认数据
 */
async function initDatabase() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 同步数据库模型（强制同步，会删除现有表）
    // 注意：生产环境请使用迁移工具
    await sequelize.sync({ force: false });
    logger.info('数据库表结构已同步');

    // 检查是否已有管理员账户
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    
    if (!adminUser) {
      // 创建默认管理员账户
      const adminPassword = await hashPassword('admin123');
      const admin = await User.create({
        username: 'admin',
        password: adminPassword,
        email: 'admin@example.com',
        role: 'admin',
        status: 'active'
      });
      logger.info('默认管理员账户已创建: admin / admin123');
    } else {
      logger.info('管理员账户已存在，跳过创建');
    }

    // 创建默认分类
    const categories = [
      { name: '技术', slug: 'tech', description: '技术相关文章' },
      { name: '生活', slug: 'life', description: '生活相关文章' },
      { name: '随笔', slug: 'essay', description: '随笔文章' }
    ];

    for (const cat of categories) {
      const existing = await Category.findOne({ where: { slug: cat.slug } });
      if (!existing) {
        await Category.create(cat);
        logger.info(`分类 "${cat.name}" 已创建`);
      }
    }

    logger.info('数据库初始化完成');
    process.exit(0);
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

initDatabase();


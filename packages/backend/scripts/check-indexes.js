import sequelize from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * 检查 users 表的索引情况
 */
async function checkIndexes() {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 查询 users 表的所有索引
    const [results] = await sequelize.query(`
      SHOW INDEX FROM users
    `);

    logger.info(`\nusers 表共有 ${results.length} 个索引：\n`);
    
    // 按索引名分组统计
    const indexGroups = {};
    results.forEach(row => {
      const keyName = row.Key_name;
      if (!indexGroups[keyName]) {
        indexGroups[keyName] = {
          columns: [],
          unique: row.Non_unique === 0,
          type: row.Index_type
        };
      }
      indexGroups[keyName].columns.push(row.Column_name);
    });

    // 输出索引信息
    Object.keys(indexGroups).forEach(keyName => {
      const index = indexGroups[keyName];
      logger.info(`索引名: ${keyName}`);
      logger.info(`  列: ${index.columns.join(', ')}`);
      logger.info(`  唯一: ${index.unique ? '是' : '否'}`);
      logger.info(`  类型: ${index.type}`);
      logger.info('');
    });

    logger.info(`总计: ${Object.keys(indexGroups).length} 个不同的索引`);
    
    // 检查是否有重复索引
    const duplicateIndexes = [];
    const columnIndexMap = {};
    
    Object.keys(indexGroups).forEach(keyName => {
      const index = indexGroups[keyName];
      const key = index.columns.sort().join(',');
      if (!columnIndexMap[key]) {
        columnIndexMap[key] = [];
      }
      columnIndexMap[key].push(keyName);
    });

    Object.keys(columnIndexMap).forEach(key => {
      if (columnIndexMap[key].length > 1) {
        duplicateIndexes.push({
          columns: key,
          indexes: columnIndexMap[key]
        });
      }
    });

    if (duplicateIndexes.length > 0) {
      logger.warn('\n发现重复索引：');
      duplicateIndexes.forEach(dup => {
        logger.warn(`  列组合 [${dup.columns}] 有多个索引: ${dup.indexes.join(', ')}`);
      });
    }

    process.exit(0);
  } catch (error) {
    logger.error('检查索引失败:', error);
    process.exit(1);
  }
}

checkIndexes();


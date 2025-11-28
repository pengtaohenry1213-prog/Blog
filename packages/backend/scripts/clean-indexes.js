import sequelize from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * 清理 users 表的重复和多余索引
 * 只保留必要的索引：PRIMARY, idx_users_username (唯一), idx_users_email (唯一)
 */
async function cleanIndexes() {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 查询 users 表的所有索引
    const [results] = await sequelize.query(`
      SHOW INDEX FROM users
    `);

    // 按索引名分组
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

    logger.info(`发现 ${Object.keys(indexGroups).length} 个索引`);

    // 需要保留的索引
    const keepIndexes = ['PRIMARY'];
    
    // 需要创建的索引（如果不存在）
    const requiredIndexes = [
      { name: 'idx_users_username', columns: ['username'], unique: true },
      { name: 'idx_users_email', columns: ['email'], unique: true }
    ];

    // 检查并标记需要保留的索引
    Object.keys(indexGroups).forEach(keyName => {
      if (keyName === 'PRIMARY') {
        keepIndexes.push(keyName);
        return;
      }
      
      const index = indexGroups[keyName];
      const indexColumns = index.columns.sort().join(',');
      
      // 检查是否匹配需要的索引
      for (const reqIndex of requiredIndexes) {
        const reqColumns = reqIndex.columns.sort().join(',');
        if (indexColumns === reqColumns && index.unique === reqIndex.unique) {
          // 如果名称正确，保留；如果名称不对，需要重命名或删除后重建
          if (keyName === reqIndex.name) {
            keepIndexes.push(keyName);
          }
          break;
        }
      }
    });

    // 删除不需要的索引
    const indexesToDelete = Object.keys(indexGroups).filter(
      keyName => !keepIndexes.includes(keyName)
    );

    if (indexesToDelete.length === 0) {
      logger.info('没有需要删除的索引');
    } else {
      logger.info(`准备删除 ${indexesToDelete.length} 个索引...`);
      
      for (const indexName of indexesToDelete) {
        try {
          await sequelize.query(`DROP INDEX \`${indexName}\` ON \`users\``);
          logger.info(`✓ 已删除索引: ${indexName}`);
        } catch (error) {
          logger.warn(`✗ 删除索引失败 ${indexName}:`, error.message);
        }
      }
    }

    // 创建需要的索引（如果不存在）
    for (const reqIndex of requiredIndexes) {
      const exists = Object.keys(indexGroups).some(keyName => {
        const index = indexGroups[keyName];
        const indexColumns = index.columns.sort().join(',');
        const reqColumns = reqIndex.columns.sort().join(',');
        return indexColumns === reqColumns && index.unique === reqIndex.unique;
      });

      if (!exists || !Object.keys(indexGroups).includes(reqIndex.name)) {
        try {
          const uniqueClause = reqIndex.unique ? 'UNIQUE' : '';
          await sequelize.query(
            `CREATE ${uniqueClause} INDEX \`${reqIndex.name}\` ON \`users\` (\`${reqIndex.columns.join('`, `')}\`)`
          );
          logger.info(`✓ 已创建索引: ${reqIndex.name}`);
        } catch (error) {
          logger.warn(`✗ 创建索引失败 ${reqIndex.name}:`, error.message);
        }
      } else {
        logger.info(`✓ 索引已存在: ${reqIndex.name}`);
      }
    }

    logger.info('索引清理完成');
    process.exit(0);
  } catch (error) {
    logger.error('清理索引失败:', error);
    process.exit(1);
  }
}

cleanIndexes();


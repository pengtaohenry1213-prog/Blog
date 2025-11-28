import sequelize from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * 清理所有表的重复索引
 */
async function cleanAllIndexes() {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    const tables = ['users', 'categories', 'articles'];

    for (const tableName of tables) {
      try {
        // 查询表的所有索引
        const [results] = await sequelize.query(`SHOW INDEX FROM \`${tableName}\``);
        
        if (results.length === 0) {
          logger.info(`表 ${tableName} 没有索引，跳过`);
          continue;
        }

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

        logger.info(`\n表 ${tableName} 发现 ${Object.keys(indexGroups).length} 个索引`);

        // 需要保留的索引（主键）
        const keepIndexes = ['PRIMARY'];
        
        // 根据表名定义需要的索引
        const requiredIndexes = {
          users: [
            { name: 'idx_users_username', columns: ['username'], unique: true },
            { name: 'idx_users_email', columns: ['email'], unique: true }
          ],
          categories: [
            { name: 'idx_categories_name', columns: ['name'], unique: true },
            { name: 'idx_categories_slug', columns: ['slug'], unique: true }
          ],
          articles: [
            { name: 'idx_articles_author_id', columns: ['author_id'], unique: false },
            { name: 'idx_articles_category_id', columns: ['category_id'], unique: false },
            { name: 'idx_articles_publish_time', columns: ['publish_time'], unique: false },
            { name: 'idx_articles_status', columns: ['status'], unique: false },
            { name: 'idx_articles_author_cat_time', columns: ['author_id', 'category_id', 'publish_time'], unique: false }
          ]
        };

        const tableRequiredIndexes = requiredIndexes[tableName] || [];

        // 检查并标记需要保留的索引
        Object.keys(indexGroups).forEach(keyName => {
          if (keyName === 'PRIMARY') {
            keepIndexes.push(keyName);
            return;
          }
          
          const index = indexGroups[keyName];
          const indexColumns = index.columns.sort().join(',');
          
          // 检查是否匹配需要的索引
          for (const reqIndex of tableRequiredIndexes) {
            const reqColumns = reqIndex.columns.sort().join(',');
            if (indexColumns === reqColumns && index.unique === reqIndex.unique) {
              // 如果名称正确，保留
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
          logger.info(`表 ${tableName} 没有需要删除的索引`);
        } else {
          logger.info(`准备删除表 ${tableName} 的 ${indexesToDelete.length} 个索引...`);
          
          for (const indexName of indexesToDelete) {
            try {
              await sequelize.query(`DROP INDEX \`${indexName}\` ON \`${tableName}\``);
              logger.info(`✓ 已删除索引: ${tableName}.${indexName}`);
            } catch (error) {
              logger.warn(`✗ 删除索引失败 ${tableName}.${indexName}:`, error.message);
            }
          }
        }

        // 创建需要的索引（如果不存在）
        for (const reqIndex of tableRequiredIndexes) {
          const exists = Object.keys(indexGroups).some(keyName => {
            if (keyName === reqIndex.name) {
              const index = indexGroups[keyName];
              const indexColumns = index.columns.sort().join(',');
              const reqColumns = reqIndex.columns.sort().join(',');
              return indexColumns === reqColumns && index.unique === reqIndex.unique;
            }
            return false;
          });

          if (!exists) {
            try {
              const uniqueClause = reqIndex.unique ? 'UNIQUE' : '';
              await sequelize.query(
                `CREATE ${uniqueClause} INDEX \`${reqIndex.name}\` ON \`${tableName}\` (\`${reqIndex.columns.join('`, `')}\`)`
              );
              logger.info(`✓ 已创建索引: ${tableName}.${reqIndex.name}`);
            } catch (error) {
              logger.warn(`✗ 创建索引失败 ${tableName}.${reqIndex.name}:`, error.message);
            }
          } else {
            logger.info(`✓ 索引已存在: ${tableName}.${reqIndex.name}`);
          }
        }
      } catch (error) {
        logger.warn(`处理表 ${tableName} 时出错:`, error.message);
      }
    }

    logger.info('\n所有表的索引清理完成');
    process.exit(0);
  } catch (error) {
    logger.error('清理索引失败:', error);
    process.exit(1);
  }
}

cleanAllIndexes();


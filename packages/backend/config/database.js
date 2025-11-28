import { Sequelize } from 'sequelize';
import { config } from './index.js';
import logger from '../utils/logger.js';

// 自定义 Sequelize 日志函数，可以控制是否输出 SQL 日志
// 设置为 false 可以完全禁用 SQL 日志输出
const sequelizeLogging = process.env.SEQUELIZE_LOGGING === 'true' 
  ? (msg) => logger.debug(msg) // 使用 logger.debug 而不是 console.log，可以通过日志级别控制
  : false;

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'mysql', // Sequelize 会使用已安装的 mysql2 包作为驱动
    logging: sequelizeLogging, // 默认禁用 SQL 日志，通过环境变量 SEQUELIZE_LOGGING=true 启用
    pool: config.database.pool,
    timezone: '+08:00'
  }
);

export default sequelize;


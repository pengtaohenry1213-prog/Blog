import { Sequelize } from 'sequelize';
import { config } from './index.js';

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'mysql', // Sequelize 会使用已安装的 mysql2 包作为驱动
    logging: config.env === 'development' ? console.log : false,
    pool: config.database.pool,
    timezone: '+08:00'
  }
);

export default sequelize;


import { createClient } from 'redis';
import config from './index.js'; // 导入配置(从.env 文件中加载环境变量[Server、Redis、Database、Jwt、Cors、Logging])

// 处理Redis连接失败时, 给出友好的错误提示信息
import { printConnectionError } from '../utils/connectionHelper.js';
// import logger from '../utils/logger.js';

// 创建 Redis 客户端配置
const redisClientConfig = {
  socket: {
    host: config.redis.host,
    port: config.redis.port
  }
};

// 只有在配置了密码时才添加 password 字段
if (config.redis.password) {
  redisClientConfig.password = config.redis.password;
}

const redisClient = createClient(redisClientConfig);

let isConnected = false;
// 监听 Redis 连接错误
redisClient.on('error', (err) => {
  if(!isConnected) {
    // 只在初始连接失败时显示友好的提示信息
    printConnectionError(err, 'Redis');
  }
  else {
    // 连接后的错误只记录日志信息
    console.error('Redis Client Error:', err.message);
  }
});

// 监听 Redis 连接成功
redisClient.on('connect', () => {
  isConnected = true;
  console.log('Redis 连接成功');
});

// 连接 Redis
(async () => {
  try {
    // 连接 Redis
    await redisClient.connect();
  } catch (error) {
    // 连接失败时显示友好提示，但不抛出错误
    printConnectionError(error, 'Redis');
    // Redis 连接失败不阻止服务器启动（如果应用可以降级运行）
  }
})();

// 导出 Redis 客户端
export default redisClient;


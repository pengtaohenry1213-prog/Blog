import { createClient } from 'redis';
import { config } from './index.js';

// 处理Redis连接失败时, 给出友好的错误提示信息
import { printConnectionError } from '../utils/connectionHelper.js';
import logger from '../utils/logger.js';

const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port
  },
  password: config.redis.password
});

let isConnected = false;

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

redisClient.on('connect', () => {
  isConnected = true;
  console.log('Redis 连接成功');
});

// 连接 Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    // 连接失败时显示友好提示，但不抛出错误
    printConnectionError(error, 'Redis');
    // Redis 连接失败不阻止服务器启动（如果应用可以降级运行）
  }
})();

export default redisClient;


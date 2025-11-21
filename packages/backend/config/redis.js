import { createClient } from 'redis';
import { config } from './index.js';

const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port
  },
  password: config.redis.password
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

// 连接 Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Redis connection failed:', error);
  }
})();

export default redisClient;


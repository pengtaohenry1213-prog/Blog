import redisClient from '../config/redis.js';
import logger from './logger.js';

/**
 * Redis 缓存工具类
 */
class CacheService {
  /**
   * 获取缓存
   * @param {string} key 缓存键
   * @returns {Promise<any>} 缓存值
   */
  async get(key) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error: ${error.message}`);
      return null;
    }
  }

  /**
   * 设置缓存
   * @param {string} key 缓存键
   * @param {any} value 缓存值
   * @param {number} expire 过期时间（秒）
   */
  async set(key, value, expire = 3600) {
    try {
      await redisClient.setEx(key, expire, JSON.stringify(value));
    } catch (error) {
      logger.error(`Cache set error: ${error.message}`);
    }
  }

  /**
   * 删除缓存
   * @param {string} key 缓存键
   */
  async del(key) {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error(`Cache del error: ${error.message}`);
    }
  }

  /**
   * 批量删除缓存（支持通配符）
   * @param {string} pattern 匹配模式
   */
  async delPattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      logger.error(`Cache delPattern error: ${error.message}`);
    }
  }

  /**
   * 检查缓存是否存在
   * @param {string} key 缓存键
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      return await redisClient.exists(key) === 1;
    } catch (error) {
      logger.error(`Cache exists error: ${error.message}`);
      return false;
    }
  }
}

export default new CacheService();


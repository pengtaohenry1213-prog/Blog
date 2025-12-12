// packages/backend/middleware/idempotency.js

/*
  Idempotency-Key 不是 HTTP RFC 标准请求头，但它是业界广泛采用的事实标准，
  主要用于在 POST 等非幂等请求中实现业务级幂等性，在支付、订单、创建资源等场景中几乎是必备设计。

  Idempotency-Key 是干嘛的？
  核心目的：保证幂等性
    * 同一个“业务操作”，即使请求被重复发送，结果只执行一次

  典型使用场景
    * 创建订单
    * 支付
    * 提交表单
    * 发起扣款
    * 创建资源（POST）

  idempotencyGuard 中间件的实现流程：
  1. 获取幂等键
  2. 如果幂等键不存在，则返回 400 错误
  3. 如果幂等键存在，则继续执行
  4. 如果幂等键存在，则继续执行
  5. 如果幂等键存在，则继续执行
  6. 如果幂等键存在，则继续执行
*/

// 导入 Redis 客户端
import redisClient from '../config/redis.js';
// 导入日志工具
import logger from '../utils/logger.js';

// 幂等键 TTL（5 分钟）
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 覆盖客户端重试窗口(5分钟)
const isProd = process.env.NODE_ENV === 'production';


/**
 * 幂等性中间件
 * @param {*} req 请求对象
 * @param {*} res 响应对象
 * @param {*} next 下一个中间件
 * @returns 下一个中间件
 */
export async function idempotencyGuard(req, res, next) {
  // 获取用户 ID
  const userId = req.userId || 'guest';
  // 获取幂等键 优先从请求头 Idempotency-Key 获取 || 其次从请求体 idempotencyKey 获取
  const idempotencyKey = req.get('Idempotency-Key') || req.body?.idempotencyKey;

  // 如果幂等键不存在，则返回 400 错误
  if (!idempotencyKey) {
    // 统一打日志
    logger.warn(`Missing Idempotency-Key for ${req.method} ${req.originalUrl}, user=${userId}`);

    // 如果是生产环境，则返回 400 错误
    if (isProd) {
      // 生产：可以选择 A 或 B

      // A：严格模式（推荐最终状态）
      return res.status(400).json({
        code: 400,
        message: '请求不合法，请稍后重试'
      });

      // B：兼容模式（上线初期可用）
      // return next();
    } else {
      // 开发/测试：明确提示方便调试
      return res.status(400).json({
        code: 400,
        message: '缺少幂等键 Idempotency-Key（开发环境提示）'
      });
    }
  }

  // 构造 Redis 键
  const redisKey = `idem:${userId}:${idempotencyKey}`; // Redis 键格式：idem:${userId}:${idempotencyKey}
  try {
    /*
      处理流程：
        首次请求：使用 SET NX 原子操作设置占位符（status: 'processing'）
        重复请求：
          - 如果状态为 'succeeded'，直接返回缓存的响应（200）
          - 如果状态为 'processing'，返回 409 Conflict
          - 如果状态为 'failed'，返回 409 Conflict
    */

    // 尝试原子占位（只占第一次）, 如果占位成功，则继续执行
    const placeholder = {
      status: 'processing',
      method: req.method,
      path: req.originalUrl,
      startedAt: Date.now()
    };

    // 尝试原子占位（只占第一次）, 如果占位成功，则继续执行
    const setOk = await redisClient.set(redisKey, JSON.stringify(placeholder), {
      NX: true,
      PX: IDEMPOTENCY_TTL_MS // 幂等键 TTL（5 分钟）
    });

    // 已存在同键请求
    if (!setOk) {
      // 如果占位失败，则说明已存在同键请求
      const cachedRaw = await redisClient.get(redisKey);
      if (!cachedRaw) {
        // 如果缓存数据不存在，则返回 409 错误
        return res.status(409).json({ code: 409, message: '请求处理中, 请稍后重试' });
      }
      // 解析缓存数据
      const cached = JSON.parse(cachedRaw);

      // 已成功处理过
      if (cached.status === 'succeeded' && cached.response) {
        // 如果缓存数据存在，则直接返回第一次的业务结果
        return res.status(200).json(cached.response);
      }

      // 如果缓存数据存在，但状态为失败，则返回 409 错误
      return res.status(409).json({
        code: 409,
        message: '请求已受理, 请勿重复提交',
        data: { status: cached.status }
      });
    }

    // 拦截响应以写入结果；失败则释放键允许重试，成功则更新缓存
    // 绑定 res.json 方法
    const rawJson = res.json.bind(res);
    // 重写 res.json 方法
    res.json = async (body) => {
      // 成功则更新缓存
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // 成功则更新缓存
        const successPayload = {
          status: 'succeeded',
          response: body,
          finishedAt: Date.now()
        };
        // 更新缓存
        await redisClient.set(redisKey, JSON.stringify(successPayload), { PX: IDEMPOTENCY_TTL_MS });
      } else if (res.statusCode >= 500) {
        // 放行后续重试
        await redisClient.del(redisKey);
      }
      // 返回原始响应
      return rawJson(body);
    };

    next();
  } catch (error) {
    // 统一打日志
    logger.error(`Idempotency middleware error: ${error.message}`);
    // 返回 500 错误
    return res.status(500).json({ code: 500, message: '幂等校验失败' });
  }
}
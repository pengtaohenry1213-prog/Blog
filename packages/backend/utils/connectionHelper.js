import logger from './logger.js';


/**
 * 解析连接错误并提供友好的提示信息
 * @param {Error} error - 错误对象
 * @param {string} [serviceName] - 可选的服务名称（MySQL/Redis）
 */
export function getConnectionErrorHint(error, serviceName) {
  const errorCode = error?.code || error?.original?.code || error?.errno;
  const errorMessage = error?.message || error?.original?.message || '';
  
  // MySQL 连接错误
  if (error?.name === 'SequelizeConnectionRefusedError' || errorCode === 'ECONNREFUSED') {
    // 判断服务类型的优先级：
    // 1. 通过错误名称判断（SequelizeConnectionRefusedError 肯定是 MySQL）
    // 2. 通过传入的 serviceName 参数判断
    // 3. 通过 errorMessage 中的端口号判断
    // 4. 通过错误堆栈或原始错误信息判断
    // 5. 默认值
    
    let detectedService = '数据库服务';
    let serviceType = 'MySQL'; // 默认假设是 MySQL
    
    // 方法1: 通过错误名称判断
    if (error?.name === 'SequelizeConnectionRefusedError') {
      detectedService = 'MySQL (3306)';
      serviceType = 'MySQL';
    }
    // 方法2: 通过传入的 serviceName 判断
    else if (serviceName) {
      if (serviceName.toLowerCase().includes('mysql')) {
        detectedService = 'MySQL (3306)';
        serviceType = 'MySQL';
      } else if (serviceName.toLowerCase().includes('redis')) {
        detectedService = 'Redis (6379)';
        serviceType = 'Redis';
      }
    }
    // 方法3: 通过 errorMessage 中的端口号判断（如果 errorMessage 不为空）
    else if (errorMessage) {
      if (errorMessage.includes('3306')) {
        detectedService = 'MySQL (3306)';
        serviceType = 'MySQL';
      } else if (errorMessage.includes('6379')) {
        detectedService = 'Redis (6379)';
        serviceType = 'Redis';
      }
    }
    // 方法4: 通过错误堆栈或原始错误信息判断
    else {
      const errorStack = error?.stack || '';
      const originalError = error?.original;
      
      // 检查堆栈中是否包含 sequelize 或 mysql
      if (errorStack.includes('sequelize') || errorStack.includes('mysql')) {
        detectedService = 'MySQL (3306)';
        serviceType = 'MySQL';
      }
      // 检查原始错误的地址和端口
      else if (originalError?.address || originalError?.port) {
        const port = originalError.port;
        if (port === 3306 || port === config.database.port) {
          detectedService = 'MySQL (3306)';
          serviceType = 'MySQL';
        } else if (port === 6379 || port === config.redis.port) {
          detectedService = 'Redis (6379)';
          serviceType = 'Redis';
        }
      }
      // 如果还是无法判断，检查错误对象的其他属性
      else if (error?.parent?.address || error?.parent?.port) {
        const port = error.parent.port;
        if (port === 3306 || port === config.database.port) {
          detectedService = 'MySQL (3306)';
          serviceType = 'MySQL';
        } else if (port === 6379 || port === config.redis.port) {
          detectedService = 'Redis (6379)';
          serviceType = 'Redis';
        }
      }
    }
    
    return {
      type: 'connection_refused',
      service: serviceType,
      message: `❌ ${detectedService} 连接失败`,
      hint: `请确保 ${serviceType} 服务已启动\n` +
            `   - 检查服务状态: ${serviceType === 'MySQL' ? 'brew services list | grep mysql' : 'brew services list | grep redis'}\n` +
            `   - 启动服务: ${serviceType === 'MySQL' ? 'brew services start mysql' : 'brew services start redis'}\n` +
            `   - 或使用 Docker: docker-compose up -d ${serviceType === 'MySQL' ? 'mysql' : 'redis'}`
    };
  }
  
  // 认证错误
  if (errorCode === 'ER_ACCESS_DENIED_ERROR' || errorMessage.includes('Access denied')) {
    return {
      type: 'authentication_error',
      service: 'MySQL',
      message: '❌ MySQL 认证失败',
      hint: '请检查数据库用户名和密码配置'
    };
  }
  
  // 数据库不存在
  if (errorCode === 'ER_BAD_DB_ERROR' || errorMessage.includes("Unknown database")) {
    return {
      type: 'database_not_found',
      service: 'MySQL',
      message: '❌ 数据库不存在',
      hint: '请先创建数据库或检查数据库名称配置'
    };
  }
  
  // 默认错误
  return {
    type: 'unknown',
    service: serviceName || 'Unknown',
    message: '❌ 连接失败',
    hint: errorMessage || '未知错误'
  };
}

/**
 * 输出友好的错误提示
 */
export function printConnectionError(error, serviceName) {
  // 将 serviceName 传递给 getConnectionErrorHint，帮助判断服务类型
  const hint = getConnectionErrorHint(error, serviceName);
  
  console.log('\n' + '='.repeat(60));
  console.log(`🚨 ${serviceName || hint.service} 服务连接失败`);
  console.log('='.repeat(60));
  console.log(hint.message);
  console.log('\n💡 解决方案:');
  console.log(hint.hint);
  console.log('='.repeat(60) + '\n');
  
  // 详细错误信息只记录到日志文件，不输出到控制台
  logger.error(`${serviceName || hint.service} connection error:`, {
    code: error?.code || error?.original?.code,
    message: error?.message || error?.original?.message,
    stack: error?.stack
  });
}

// 可选：启动前检查依赖（开发环境）startServer() 时调用 checkDependencies()
export async function checkDependencies(sequelize, redisClient) {
  const issues = [];
  
  // 检查 MySQL
  try {
    await sequelize.authenticate();
    logger.info('✅ MySQL 连接检查通过');
  } catch (error) {
    issues.push({ service: 'MySQL', error });
  }
  
  // 检查 Redis（可选，不阻塞）
  try {
    await redisClient.ping();
    logger.info('✅ Redis 连接检查通过');
  } catch (error) {
    issues.push({ service: 'Redis', error });
  }
  
  if (issues.length > 0) {
    console.log('\n⚠️  检测到以下服务未启动:\n');
    issues.forEach(({ service, error }) => {
      printConnectionError(error, service);
    });
    console.log('💡 提示: 某些服务（如 Redis）是可选的，但 MySQL 必须启动\n');
  }
  
  return issues.length === 0;
}
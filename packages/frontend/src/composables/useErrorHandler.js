/**
 * 错误处理工具模块
 * 提供统一的错误识别、分类和处理功能
 * 
 * 功能：
 *  - 错误类型识别（AI_API, NETWORK, VALIDATION, UNKNOWN）
 *  - 默认错误处理器
 *  - 自定义错误处理支持
 *  - 错误日志记录
 * 
 * 使用场景：
 *  - 异步函数错误处理
 *  - API 请求错误处理
 *  - 表单验证错误处理
 *  - 任何需要统一错误处理的场景
 */

/**
 * 错误类型枚举
 */
export const ErrorType = {
  // AI_API: 'AI_API',
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  SERVER: 'SERVER',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  UNKNOWN: 'UNKNOWN'
};

/**
 * 错误消息映射表
 */
const ERROR_MESSAGES = {
  // [ErrorType.AI_API]: 'AI 服务暂时不可用，请稍后重试',
  [ErrorType.NETWORK]: '网络连接失败，请检查网络后重试',
  [ErrorType.VALIDATION]: '数据验证失败，请检查输入',
  [ErrorType.SERVER]: '服务器错误，请稍后重试',
  [ErrorType.UNAUTHORIZED]: '未授权，请重新登录',
  [ErrorType.FORBIDDEN]: '没有权限执行此操作',
  [ErrorType.UNKNOWN]: '操作失败，请稍后重试'
};

/**
 * 识别错误类型
 * @param {Error} error - 错误对象
 * @returns {string} 错误类型
 */
export function identifyErrorType(error) {
  if (!error) {
    return ErrorType.UNKNOWN;
  }

  const errorMessage = error?.message || error?.toString() || '';
  const lowerMessage = errorMessage.toLowerCase();
  const status = error?.status || error?.response?.status || error?.code;

  // HTTP 状态码识别
  if (status === 401) {
    return ErrorType.UNAUTHORIZED;
  }
  if (status === 403) {
    return ErrorType.FORBIDDEN;
  }
  if (status >= 500) {
    return ErrorType.SERVER;
  }
  if (status === 400 || status === 422) {
    return ErrorType.VALIDATION;
  }

  // AI API 错误
  // if (
  //   lowerMessage.includes('unable to reach the model provider') ||
  //   lowerMessage.includes('model provider') ||
  //   lowerMessage.includes('api key') ||
  //   lowerMessage.includes('provider was unable to process') ||
  //   lowerMessage.includes('openai') ||
  //   lowerMessage.includes('anthropic') ||
  //   lowerMessage.includes('ai service')
  // ) {
  //   return ErrorType.AI_API;
  // }

  // 网络错误
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('econnrefused') ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ENOTFOUND' ||
    error?.code === 'ETIMEDOUT'
  ) {
    return ErrorType.NETWORK;
  }

  // 验证错误
  if (
    lowerMessage.includes('validation') ||
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('format')
  ) {
    return ErrorType.VALIDATION;
  }

  return ErrorType.UNKNOWN;
}

/**
 * 创建增强的错误对象
 * @param {Error} originalError - 原始错误
 * @param {string} errorType - 错误类型
 * @param {string} friendlyMessage - 友好错误消息
 * @returns {Error} 增强的错误对象
 */
function createEnhancedError(originalError, errorType, friendlyMessage) {
  const enhancedError = new Error(friendlyMessage);
  
  // 保留原始错误
  enhancedError.originalError = originalError;
  enhancedError.errorType = errorType;
  enhancedError.timestamp = new Date().toISOString();
  
  // 保留原始错误的属性
  if (originalError?.code) enhancedError.code = originalError.code;
  if (originalError?.status) enhancedError.status = originalError.status;
  if (originalError?.response) enhancedError.response = originalError.response;
  if (originalError?.stack) enhancedError.stack = originalError.stack;
  
  return enhancedError;
}

/**
 * 默认错误处理器
 * @param {Error} error - 错误对象
 * @param {string} errorType - 错误类型（可选，如果不提供会自动识别）
 * @param {Object} options - 配置选项
 * @param {boolean} options.silent - 是否静默处理（不记录日志），默认 false
 * @param {string} options.context - 错误上下文（用于日志），默认空字符串
 * @returns {Error} 处理后的错误对象
 */
export function defaultErrorHandler(error, errorType = null, options = {}) {
  const { silent = false, context = '' } = options;
  
  // 如果没有提供错误类型，自动识别
  const type = errorType || identifyErrorType(error);
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  
  // 记录错误日志
  if (!silent) {
    const logContext = context ? `[${context}]` : '';
    console.error(`${logContext} ${type} Error:`, {
      message: errorMessage,
      error: error,
      errorType: type,
      timestamp: new Date().toISOString()
    });
  }

  // 获取友好错误消息
  let friendlyMessage = ERROR_MESSAGES[type] || ERROR_MESSAGES[ErrorType.UNKNOWN];
  
  // 对于验证错误，优先使用原始错误消息（如果存在）
  if (type === ErrorType.VALIDATION && errorMessage && errorMessage !== 'Unknown error') {
    friendlyMessage = errorMessage;
  }

  // 创建增强的错误对象
  return createEnhancedError(error, type, friendlyMessage);
}

/**
 * 创建错误处理器
 * @param {Object} options - 配置选项
 * @param {Function} options.onError - 自定义错误处理器，接收 (error, errorType) => Error
 * @param {boolean} options.silent - 是否静默处理（不记录日志），默认 false
 * @param {string} options.context - 错误上下文（用于日志），默认空字符串
 * @returns {Function} 错误处理函数
 * 
 * @example
 * // 基础用法
 * const handleError = createErrorHandler();
 * try {
 *   await someAsyncFunction();
 * } catch (error) {
 *   throw handleError(error);
 * }
 * 
 * // 自定义错误处理
 * const handleError = createErrorHandler({
 *   onError: (error, errorType) => {
 *     ElMessage.error('操作失败');
 *     return defaultErrorHandler(error, errorType);
 *   },
 *   context: 'MyComponent'
 * });
 */
export function createErrorHandler(options = {}) {
  const {
    onError = null,
    silent = false,
    context = ''
  } = options;

  /**
   * 错误处理函数
   * @param {Error} error - 原始错误
   * @returns {Error} 处理后的错误
   */
  return function handleError(error) {
    // 识别错误类型
    const errorType = identifyErrorType(error);
    
    // 如果提供了自定义错误处理器，使用自定义处理器
    if (onError && typeof onError === 'function') {
      try {
        const handledError = onError(error, errorType);
        // 确保返回的是 Error 对象
        if (handledError instanceof Error) {
          return handledError;
        }
        // 如果不是 Error 对象，使用默认处理
        return defaultErrorHandler(error, errorType, { silent, context });
      } catch (handlerError) {
        // 如果自定义处理器出错，回退到默认处理
        console.error('[createErrorHandler] Error handler failed:', handlerError);
        return defaultErrorHandler(error, errorType, { silent, context });
      }
    }
    
    // 使用默认错误处理器
    return defaultErrorHandler(error, errorType, { silent, context });
  };
}

/**
 * Vue Composable: useErrorHandler
 * 提供响应式的错误处理功能
 * 
 * @param {Object} options - 配置选项
 * @param {Function} options.onError - 自定义错误处理器
 * @param {boolean} options.silent - 是否静默处理
 * @param {string} options.context - 错误上下文
 * @returns {Object} { handleError, ErrorType, identifyErrorType }
 * 
 * @example
 * const { handleError } = useErrorHandler({ context: 'MyComponent' });
 * 
 * try {
 *   await submitForm();
 * } catch (error) {
 *   throw handleError(error);
 * }
 */
export function useErrorHandler(options = {}) {
  const handleError = createErrorHandler(options);
  
  return {
    handleError,
    ErrorType,
    identifyErrorType
  };
}
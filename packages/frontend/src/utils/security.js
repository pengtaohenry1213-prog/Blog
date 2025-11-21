/**
 * 前端安全工具函数
 */

/**
 * XSS 防护：转义 HTML 特殊字符
 * @param {string} str 待转义的字符串
 * @returns {string} 转义后的字符串
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return str.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * 生成请求签名（用于敏感接口）
 * @param {object} params 请求参数
 * @param {string} secret 密钥
 * @param {number} timestamp 时间戳
 * @returns {string} 签名
 */
export function generateSignature(params, secret, timestamp) {
  // 简单的签名算法示例（实际项目中应使用更安全的算法）
  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
  const sign = btoa(`${signStr}&timestamp=${timestamp}&secret=${secret}`);
  return sign;
}

/**
 * 验证输入（防止 SQL 注入等）
 * @param {string} input 输入内容
 * @returns {boolean} 是否安全
 */
export function validateInput(input) {
  if (typeof input !== 'string') return true;
  
  // 检查危险字符
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\(/i,
    /expression\(/i
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * 清理用户输入
 * @param {string} input 输入内容
 * @returns {string} 清理后的内容
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}


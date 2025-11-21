/**
 * 共享工具函数
 */

/**
 * 格式化日期时间
 * @param {Date|string} date - 日期对象或日期字符串
 * @param {string} format - 格式（默认：YYYY-MM-DD HH:mm:ss）
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 生成分页参数
 * @param {number} page - 页码（从1开始）
 * @param {number} pageSize - 每页数量
 * @returns {{offset: number, limit: number}} Sequelize 分页参数
 */
export function getPaginationParams(page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize;
  const limit = parseInt(pageSize, 10);
  return { offset, limit };
}

/**
 * 生成分页结果
 * @param {number} total - 总记录数
 * @param {number} page - 当前页码
 * @param {number} pageSize - 每页数量
 * @param {Array} items - 数据列表
 * @returns {Object} 分页结果对象
 */
export function getPaginationResult(total, page, pageSize, items) {
  return {
    total,
    page: parseInt(page, 10),
    pageSize: parseInt(pageSize, 10),
    totalPages: Math.ceil(total / pageSize),
    items
  };
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 生成 URL 友好的 slug
 * @param {string} text - 原始文本
 * @returns {string} slug
 */
export function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // 移除特殊字符
    .replace(/[\s_-]+/g, '-') // 替换空格和下划线为连字符
    .replace(/^-+|-+$/g, ''); // 移除首尾连字符
}

/**
 * 截取文本摘要
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @param {string} suffix - 后缀（默认：...）
 * @returns {string} 摘要文本
 */
export function truncateText(text, maxLength = 100, suffix = '...') {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
}


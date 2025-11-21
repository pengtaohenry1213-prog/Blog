/**
 * 共享类型定义（使用 JSDoc 注释）
 * 这些类型定义可以在前后端共享使用
 */

/**
 * @typedef {Object} User
 * @property {number} id - 用户ID
 * @property {string} username - 用户名
 * @property {string} email - 邮箱
 * @property {string} role - 角色（admin/user）
 * @property {string} status - 状态（active/inactive）
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 */

/**
 * @typedef {Object} Article
 * @property {number} id - 文章ID
 * @property {string} title - 标题
 * @property {string} content - 内容
 * @property {string} summary - 摘要
 * @property {string} slug - URL 友好标识
 * @property {number} authorId - 作者ID
 * @property {number} categoryId - 分类ID
 * @property {number} viewCount - 阅读量
 * @property {boolean} published - 是否发布
 * @property {Date} publishTime - 发布时间
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 */

/**
 * @typedef {Object} Category
 * @property {number} id - 分类ID
 * @property {string} name - 分类名称
 * @property {string} slug - URL 友好标识
 * @property {string} description - 描述
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 */

/**
 * @typedef {Object} ApiResponse
 * @property {number} code - 状态码
 * @property {string} message - 消息
 * @property {*} data - 数据
 */

/**
 * @typedef {Object} PaginationParams
 * @property {number} page - 页码（从1开始）
 * @property {number} pageSize - 每页数量
 */

/**
 * @typedef {Object} PaginationResult
 * @property {number} total - 总记录数
 * @property {number} page - 当前页码
 * @property {number} pageSize - 每页数量
 * @property {number} totalPages - 总页数
 * @property {Array} items - 数据列表
 */

export {};


import jwt from 'jsonwebtoken';
import config from '../config/index.js';

const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRES_IN = config.jwt.expiresIn;

/**
 * 生成 JWT token（登录时使用）
 * @param {object} payload 载荷数据
 * @returns {string} Token
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * 验证 JWT Token, 使用密钥验证 token 并解码，失败返回 null
 * @param {string} token Token 字符串
 * @returns {object|null} 解码后的数据或 null
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * 从请求头 Authorization: Bearer <token> 中提取 token
 * @param {object} req Express 请求对象
 * @returns {string|null} Token 或 null
 */
export function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}


import bcrypt from 'bcryptjs';

/**
 * 加密密码
 * @param {string} password 明文密码
 * @returns {Promise<string>} 加密后的密码
 */
export async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * 验证密码
 * @param {string} password 明文密码
 * @param {string} hash 加密后的密码
 * @returns {Promise<boolean>} 是否匹配
 */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}


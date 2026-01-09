import User from '../../models/User.js';
import { comparePassword } from '../../utils/bcrypt.js';
import { generateToken } from '../../utils/jwt.js';
import cacheService from '../../utils/cache.js';

class AuthService {
  /**
   * 用户登录
   */
  async login(username, password) {
    const user = await User.findOne({ where: { username } });
    
    if (!user) {
      throw new Error('用户名或密码错误');
    }

    if (user.status !== 'active') {
      throw new Error('用户已被禁用');
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('用户名或密码错误');
    }

    // 生成 Token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    console.log('生成 Token: ', token);

    // 将 Token 存储到 Redis（可选，用于实现登出功能）
    await cacheService.set(`token:${user.id}`, token, 7 * 24 * 60 * 60); // 7天

    // 返回用户信息（不包含密码）和 Token
    const userData = user.toJSON();
    delete userData.password;

    return {
      user: userData,
      token
    };
  }

  /**
   * 用户登出
   */
  async logout(userId) {
    // 从 Redis 中删除 Token
    await cacheService.del(`token:${userId}`);
    return true;
  }

  /**
   * 用户注册
   */
  async register(data) {
    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username: data.username } });
    if (existingUser) {
      throw new Error('用户名已存在');
    }

    // 检查邮箱是否已存在
    if (data.email) {
      const existingEmail = await User.findOne({ where: { email: data.email } });
      if (existingEmail) {
        throw new Error('邮箱已被注册');
      }
    }

    // 创建用户（使用 User Service）
    const { hashPassword } = await import('../../utils/bcrypt.js');
    const { default: userService } = await import('../user/service.js');
    
    const user = await userService.createUser(data);

    // 自动登录，生成 Token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    await cacheService.set(`token:${user.id}`, token, 7 * 24 * 60 * 60);

    return {
      user,
      token
    };
  }
}

export default new AuthService();


import User from '../../models/User.js';
import { hashPassword, comparePassword } from '../../utils/bcrypt.js';
import { Op } from 'sequelize';
// import logger from '../../utils/logger.js';

class UserService {
  /**
   * 获取用户列表（分页）
   */
  async getUserList({ page = 1, pageSize = 10, keyword }) {
    const offset = (page - 1) * pageSize;
    const where = {};

    if (keyword) {
      where.username = { [Op.like]: `%${keyword}%` };
    }

    // findAndCountAll 方法是一个结合了 findAll 和 count 的便利方法。这在处理与分页相关的查询时很有用，当你想要获取带有限制和偏移的数据，同时还需要知道匹配查询的总记录数时。FROMP: https://sequelize.org/docs/v6/core-concepts/model-querying-finders/
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset
    });

    return {
      list: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    };
  }

  /**
   * 根据ID获取用户信息
   */
  async getUserById(id) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    return user;
  }

  /**
   * 创建用户
   */
  async createUser(data) {
    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username: data.username } });
    if (existingUser) {
      throw new Error('用户名已存在');
    }

    // 加密密码
    const hashedPassword = await hashPassword(data.password);

    const user = await User.create({
      ...data,
      password: hashedPassword
    });

    // 返回用户信息（不包含密码）
    const userData = user.toJSON();
    delete userData.password;
    return userData;
  }

  /**
   * 更新用户信息
   */
  async updateUser(id, data, currentUserId, currentUserRole) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 权限检查：只有本人或管理员可以修改
    if (id !== currentUserId && currentUserRole !== 'admin') {
      throw new Error('无权修改此用户');
    }

    // 如果更新密码，需要加密
    if (data.password) {
      data.password = await hashPassword(data.password);
    }

    await user.update(data);

    const userData = user.toJSON();
    delete userData.password;
    return userData;
  }

  /**
   * 删除用户
   */
  async deleteUser(id, currentUserId, currentUserRole) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 只有管理员可以删除用户，且不能删除自己
    if (currentUserRole !== 'admin') {
      throw new Error('无权删除用户');
    }

    if (id === currentUserId) {
      throw new Error('不能删除自己');
    }

    await user.destroy();
    return true;
  }

  /**
   * 验证用户密码
   */
  async verifyPassword(userId, password) {
    const user = await User.findByPk(userId);
    if (!user) {
      return false;
    }
    return await comparePassword(password, user.password);
  }
}

export default new UserService();


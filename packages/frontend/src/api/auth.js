import request from '@/utils/request';

/**
 * 认证相关 API
 */
export const authApi = {
  // 登录
  login(username, password) {
    return request.post('/auth/login', { username, password });
  },

  // 登出
  logout() {
    return request.post('/auth/logout');
  },

  // 注册
  register(data) {
    return request.post('/auth/register', data);
  }
};


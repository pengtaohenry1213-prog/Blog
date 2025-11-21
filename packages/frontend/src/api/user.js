import request from '@/utils/request';

/**
 * 用户相关 API
 */
export const userApi = {
  // 获取用户列表
  getList(params) {
    return request.get('/users', { params });
  },

  // 获取用户详情
  getDetail(id) {
    return request.get(`/users/${id}`);
  },

  // 获取当前用户信息
  getCurrent() {
    return request.get('/users/current');
  },

  // 创建用户
  create(data) {
    return request.post('/users', data);
  },

  // 更新用户
  update(id, data) {
    return request.put(`/users/${id}`, data);
  },

  // 删除用户
  delete(id) {
    return request.delete(`/users/${id}`);
  }
};


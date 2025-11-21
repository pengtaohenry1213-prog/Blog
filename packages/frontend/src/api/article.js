import request from '@/utils/request';

/**
 * 文章相关 API
 */
export const articleApi = {
  // 获取文章列表
  getList(params) {
    return request.get('/articles', { params });
  },

  // 获取文章详情
  getDetail(id) {
    return request.get(`/articles/${id}`);
  },

  // 获取热门文章
  getHot() {
    return request.get('/articles/hot');
  },

  // 创建文章
  create(data) {
    return request.post('/articles', data);
  },

  // 更新文章
  update(id, data) {
    return request.put(`/articles/${id}`, data);
  },

  // 删除文章
  delete(id) {
    return request.delete(`/articles/${id}`);
  }
};


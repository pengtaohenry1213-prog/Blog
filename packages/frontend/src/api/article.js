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
  },

  // 增加文章点赞方法 likeArticle
  // 点赞接口如: POST /api/articles/:id/like
  // idempotencyKey: 幂等键，用于保证同一操作只执行一次
  likeArticle(id, idempotencyKey) {
    return request.post(`/articles/${id}/like`, null, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });
  },

  // 取消文章点赞方法 unlikeArticle
  // 取消点赞接口如: POST /api/articles/:id/unlike
  // idempotencyKey: 幂等键，用于保证同一操作只执行一次
  unlikeArticle(id, idempotencyKey) {
    return request.post(`/articles/${id}/unlike`, null, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });
  },

  // 增加文章投票方法 voteArticle(id, value)
  // 投票接口如: POST /api/articles/:id/vote（body: { value: 1 | -1 | 0 }）
  // idempotencyKey: 幂等键，用于保证同一操作只执行一次
  voteArticle(id, value, idempotencyKey) {
    return request.post(`/articles/${id}/vote`, { value }, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });
  },

  // 取消文章投票
  // unvoteArticle(id) {
  //   return request.delete(`/articles/${id}/vote`);
  // },

  // getDetail 时建议返回 liked/likeCount/vote/voteScore
};


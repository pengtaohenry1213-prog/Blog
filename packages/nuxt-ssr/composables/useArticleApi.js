import { useRequest } from '~/composables/useRequest';

/**
 * 文章相关 API 封装
 * 用于 Nuxt3 SSR 环境下的文章数据获取
 */
export const useArticleApi = () => {
  const request = useRequest();

  return {
    /**
     * 获取文章列表（分页）
     * @param {Object} params - 查询参数
     * @param {number} params.page - 页码
     * @param {number} params.pageSize - 每页数量
     * @param {number} [params.categoryId] - 分类ID
     * @param {string} [params.keyword] - 搜索关键词
     * @returns {Promise<{list: Array, total: number, page: number, pageSize: number}>}
     */
    async getList(params = {}) {
      const response = await request.get('/articles', { params });
      return response;
    },

    /**
     * 获取文章详情
     * @param {number|string} id - 文章ID
     * @returns {Promise<Object>}
     */
    async getDetail(id) {
      console.warn('===== 这里是 Nuxt SSR 文章详情页 getDetail =====');
      const response = await request.get(`/articles/${id}`);
      return response;
    },

    /**
     * 获取热门文章
     * @returns {Promise<Array>}
     */
    async getHot() {
      const response = await request.get('/articles/hot');
      return response;
    }
  };
};
 

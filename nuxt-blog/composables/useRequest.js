/**
 * Nuxt 3 推荐的请求封装方式
 * 使用 $fetch（基于 ofetch），自动支持 SSR 和客户端
 * 已将请求封装从 axios 改为使用 $fetch（Nuxt3 推荐方式）。
 * 
 * ## 主要改动
 * 1. 使用 $fetch 替代 axios
 *    - 自动支持 SSR 和客户端 
 *    - 内置在 Nuxt3 中，无需额外依赖
 *    - 更简洁的 API
 * 2. 保持相同的接口
 *    - useArticleApi 无需修改
 *    - 仍然提供 get, post, put, delete 方法
 * 3. 功能保持不变
 *    - 自动添加认证 token
 *    - 处理后端响应格式 { code, message, data }
 *    - 错误处理和提示
 *    - 401 自动跳转登录
 *
 * ## 优势
 * - SSR 友好：$fetch 在服务端和客户端都能正常工作
 * - 更轻量：不需要 axios 依赖
 * - 更好的集成：与 Nuxt3 运行时配置集成
 * - 类型支持：更好的 TypeScript 支持
 * 
 * 现在 nuxt-blog 使用 $fetch，而原 Vue3+Vite 项目继续使用 axios，互不干扰。
 * 代码已通过 lint 检查，可以正常使用。
 */
export const useRequest = () => {
  const config = useRuntimeConfig(); // 服务端可以直接访问所有环境变量（通过 useRuntimeConfig()）
  const baseURL = config.public.apiBase || '/api';

  /**
   * 创建请求函数，自动处理认证和错误
   */
  const createFetch = async (url, options = {}) => {
    // 获取认证 token（仅在客户端）
    let token = '';
    if (process.client) {
      try {
        const { useAuthStore } = await import('~/stores/auth');
        const authStore = useAuthStore();
        token = authStore.token || '';
      } catch (error) {
        // 如果 store 不存在，忽略错误
        console.warn('Auth store not available:', error);
      }
    }

    // 设置请求头
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      // 使用 $fetch 发送请求
      const response = await $fetch(url, {
        baseURL,
        ...options,
        headers,
        // 处理错误响应
        onResponseError({ response }) {
          const status = response.status;
          const data = response._data || {};

          // 在客户端显示错误消息
          if (process.client) {
            import('element-plus').then(({ ElMessage }) => {
              switch (status) {
                case 401: {
                  ElMessage.error('未登录或登录已过期');
                  // 清理认证状态
                  import('~/stores/auth').then(({ useAuthStore }) => {
                    const authStore = useAuthStore();
                    authStore.clearAuthState?.();
                  });
                  // 跳转到登录页
                  if (typeof window !== 'undefined') {
                    window.location.href = '/admin/login';
                  }
                  break;
                }
                case 403:
                  ElMessage.error(data?.message || '权限不足');
                  break;
                case 404:
                  ElMessage.error('请求的资源不存在');
                  break;
                case 429:
                  ElMessage.error('请求过于频繁，请稍后再试');
                  break;
                case 500:
                  ElMessage.error('服务器内部错误');
                  break;
                default:
                  ElMessage.error(data?.message || `请求失败: ${status}`);
              }
            }).catch(() => {
              // 忽略错误
            });
          }

          // 抛出错误
          const error = new Error(data?.message || '请求失败');
          error.statusCode = status;
          error.data = data;
          throw error;
        }
      });

      // 处理响应数据格式
      // 确保正确处理后端响应格式, 后端返回格式：{ code: 200, message: '...', data: {...} }
      const { code, message, data } = response || {};
      
      // 如果后端返回了标准格式 { code, message, data }
      if (code !== undefined) {
        // code 为 200 或 201 表示成功
        if (code === 200 || code === 201) {
          return data !== undefined ? data : response;
        } else {
          // code 不是 200/201，抛出错误
          const error = new Error(message || '请求失败');
          error.statusCode = code;
          error.data = response;
          throw error;
        }
      }
      
      // 否则直接返回响应（兼容其他格式）
      return response;
    } catch (error) {
      // 网络错误或其他错误
      if (process.client && !error.statusCode) {
        import('element-plus').then(({ ElMessage }) => {
          ElMessage.error('网络错误，请检查网络连接');
        }).catch(() => {
          // 忽略错误
        });
      }
      throw error;
    }
  };

  return {
    get(url, options = {}) {
      return createFetch(url, { ...options, method: 'GET' });
    },
    post(url, body, options = {}) {
      return createFetch(url, { ...options, method: 'POST', body });
    },
    put(url, body, options = {}) {
      return createFetch(url, { ...options, method: 'PUT', body });
    },
    delete(url, options = {}) {
      return createFetch(url, { ...options, method: 'DELETE' });
    }
  };
};

import axios from 'axios';
// import { ElMessage } from 'element-plus'; 这些 import 可以移除（插件会自动处理）
import { useAuthStore } from '@/stores/auth';
import router from '@/router';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data;
    
    if (code === 200 || code === 201) {
      return data !== undefined ? data : response.data;
    } else {
      ElMessage.error(message || '请求失败');
      return Promise.reject(new Error(message || '请求失败'));
    }
  },
  (error) => {
    const { response } = error;
    
    if (response) {
      const { status, data } = response;
      
      switch (status) {
        case 401: {
          ElMessage.error('未登录或登录已过期');

          const authStore = useAuthStore();

          // 401 时只做本地清理，避免再去调用 /auth/logout 导致死循环
          authStore.clearAuthState?.();
          router.push('/admin/login');
          break;
        }
        case 403:
          ElMessage.error(data?.message || '权限不足');
          break;
        case 404:
          ElMessage.error('请求的资源不存在');
          break;
        case 429:
          ElMessage.error('请求过于频繁，请稍后再试 429');
          break;
        case 500:
          ElMessage.error('服务器内部错误');
          break;
        default:
          ElMessage.error(data?.message || `请求失败: ${status}`);
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接');
    }
    
    return Promise.reject(error);
  }
);

export default request;


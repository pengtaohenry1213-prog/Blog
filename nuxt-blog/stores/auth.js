import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  // 使用 useCookie 来存储 token，这样在 SSR 环境下也能访问
  const token = ref('');
  const user = ref(null);

  // 在客户端初始化时从 localStorage 读取
  if (process.client) {
    token.value = localStorage.getItem('token') || '';
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        user.value = JSON.parse(userStr);
      } catch (e) {
        user.value = null;
      }
    }
  }

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  // 本地清理登录状态（不请求后端）
  function clearAuthState() {
    token.value = '';
    user.value = null;
    if (process.client) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  // 设置认证信息
  function setAuth(tokenValue, userValue) {
    token.value = tokenValue;
    user.value = userValue;
    if (process.client) {
      localStorage.setItem('token', tokenValue);
      localStorage.setItem('user', JSON.stringify(userValue));
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    clearAuthState,
    setAuth
  };
});


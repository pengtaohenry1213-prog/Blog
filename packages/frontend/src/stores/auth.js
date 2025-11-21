import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, userApi } from '@/api';
import router from '@/router';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '');
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  // 本地清理登录状态（不请求后端）
  function clearAuthState() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // 登录
  async function login(username, password) {
    const result = await authApi.login(username, password);
    token.value = result.token;
    user.value = result.user;

    console.log('login result = ', result);

    localStorage.setItem('token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));

    return result;
  }

  // 登出
  async function logout() {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 无论后端是否成功，都本地清理一次
      clearAuthState();
      router.push('/admin/login');
    }
  }

  // 获取当前用户信息
  async function fetchCurrentUser() {
    const userData = await userApi.getCurrent();
    user.value = userData;
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    clearAuthState,
    fetchCurrentUser
  };
});


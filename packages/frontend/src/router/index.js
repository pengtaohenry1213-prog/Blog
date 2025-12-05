import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import(/* webpackChunkName: "frontend" */ '@/views/frontend/Layout.vue'),
      children: [
        {
          path: '',
          name: 'Home',
          component: () => import(/* webpackChunkName: "frontend" */ '@/views/frontend/Home.vue')
        },
        {
          path: 'article/:id',
          name: 'ArticleDetail',
          component: () => import(/* webpackChunkName: "frontend" */ '@/views/frontend/ArticleDetail.vue')
        },
        {
          path: 'category/:id',
          name: 'Category',
          component: () => import(/* webpackChunkName: "frontend" */ '@/views/frontend/Category.vue')
        },
        {
          path: 'search',
          name: 'Search',
          component: () => import(/* webpackChunkName: "frontend" */ '@/views/frontend/Search.vue')
        },
        {
          path: 'canvasText',
          name: 'CanvasText',
          component: () => import(/* webpackChunkName: "frontend" */ '@/views/frontend/CanvasText.vue')
        }
      ]
    },
    {
      path: '/admin',
      component: () => import(/* webpackChunkName: "frontend_admin" */ '@/views/admin/Layout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'test',
          name: 'test',
          component: () => import(/* webpackChunkName: "frontend_admin" */ '@/views/admin/Test.vue'),
          meta: { requireAuth: false },
        },
        {
          path: '',
          redirect: '/admin/dashboard'
        },
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import(/* webpackChunkName: "frontend_admin" */ '@/views/admin/Dashboard.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'articles',
          name: 'ArticleList',
          component: () => import(/* webpackChunkName: "frontend_admin" */ '@/views/admin/ArticleList.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'articles/create',
          name: 'ArticleCreate',
          component: () => import(/* webpackChunkName: "frontend_admin" */ '@/views/admin/ArticleForm.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'articles/edit/:id',
          name: 'ArticleEdit',
          component: () => import(/* webpackChunkName: "frontend_admin" */ '@/views/admin/ArticleForm.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'users',
          name: 'UserList',
          component: () => import(/* webpackChunkName: "frontend_admin" */ '@/views/admin/UserList.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        }
      ]
    },
    {
      path: '/admin/login',
      name: 'Login',
      component: () => import(/* webpackChunkName: "frontend_admin" */ '@/views/admin/Login.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import(/* webpackChunkName: "frontend_admin" */ '@/views/NotFound.vue')
    }
  ]
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // 需要登录的路由
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
    return;
  }

  // 需要管理员权限的路由
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'Dashboard' });
    return;
  }

  // 已登录用户访问登录页，重定向到后台
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'Dashboard' });
    return;
  }

  next();
});

export default router;


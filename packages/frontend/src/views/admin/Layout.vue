<template>
  <el-container class="admin-layout">
    <el-aside width="200px" class="sidebar">
      <div class="logo">后台管理</div>
      <el-menu
        :default-active="activeMenu"
        router
        class="admin-menu"
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/admin/articles">
          <el-icon><Document /></el-icon>
          <span>文章管理</span>
        </el-menu-item>
        <el-menu-item v-if="authStore.isAdmin" index="/admin/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-right">
          <span>欢迎，{{ authStore.user?.username }}</span>
          <el-button type="danger" size="small" @click="handleLogout">退出</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <Suspense>
          <template #default>
            <router-view />
          </template>
          <template #fallback>
            <div class="loading-container">
              <el-icon class="is-loading">
                <Loading />
              </el-icon>
              <span>加载中......</span>
            </div>
          </template>
        </Suspense>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useBrowsingTime } from '@/composables/useTabVisibility';
import { statsApi } from '@/api';
import { DataBoard, Document, User, Loading } from '@element-plus/icons-vue';

const route = useRoute();
const authStore = useAuthStore();
const activeMenu = computed(() => route.path);
const currentPage = computed(() => route.name || route.path || 'admin');

/*
  用一套 useBrowsingTime({ storageKey: '__admin_browsing_time__', enableMultiTab: true })，
  负责整个 /admin 区域的浏览时长。

  通过 currentPage = computed(() => route.name || route.path) + watch(sessionTime) + watch(currentPage)，实现：
    - 周期上报（periodic）
    - 路由切换上报（route-switch）
    - 卸载上报（unmount）
*/

// 使用浏览时间统计组件，自动上报浏览时间
const {
  totalTime,
  sessionTime,
  resetSession,
  isTracking
} = useBrowsingTime({
  autoStart: true,
  visibilityOptions: {
    componentName: 'Layout.vue/useBrowsingTime',
    enableMultiTab: true,
    storageKey: '__admin_browsing_time__'
  }
});

// 上报浏览时间间隔
let lastReportedSession = 0;

// 上报间隔时间(秒)
const REPORT_GAP_SECONDS = 5;

/**
 * 上报浏览时间
 */
async function reportAdminBrowsing(page, reason = 'periodic') {
  try {
    await statsApi.reportBrowsingTime({
      page,
      totalTime: totalTime.value,
      sessionTime: sessionTime.value,
      isTracking: isTracking.value,
      reason,
      reportedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Report admin browsing time failed:', error);
  }
}

// 监听浏览时间，如果间隔大于上报间隔，则上报浏览时间
watch(sessionTime, (val) => {
  if (val - lastReportedSession >= REPORT_GAP_SECONDS) {
    lastReportedSession = val;
    reportAdminBrowsing(currentPage.value, 'periodic');
  }
});

// 监听浏览页面，如果页面切换，则上报浏览时间
watch(
  currentPage,
  (next, prev) => {
    if (prev) {
      reportAdminBrowsing(prev, 'route-switch');
    }
    lastReportedSession = 0;
    resetSession();
  },
  { flush: 'post' }
);

// 卸载时上报浏览时间
onBeforeUnmount(() => {
  reportAdminBrowsing(currentPage.value, 'unmount');
});

/**
 * 退出登录
 */
function handleLogout() {
  authStore.logout();
}
</script>

<style scoped>
.admin-layout {
  height: 100vh;
}

.sidebar {
  background: #304156;
  color: #fff;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  background: #1f2d3d;
}

.admin-menu {
  border-right: none;
  background: #304156;
}

.admin-menu .el-menu-item {
  color: #bfcbd9;
}

.admin-menu .el-menu-item:hover {
  background: #263445;
}

.admin-menu .el-menu-item.is-active {
  background: #409eff;
  color: #fff;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 20px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.main {
  background: #f0f2f5;
  padding: 0px;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: #909399;
  font-size: 14px;
}

.loading-container .is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>


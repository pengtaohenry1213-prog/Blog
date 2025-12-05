<template>
  <div class="frontend-layout">
    <el-header class="header">
      <div class="container">
        <div class="logo">
          <router-link to="/">个人博客</router-link>
        </div>
        <el-menu
          mode="horizontal"
          :default-active="activeMenu"
          class="nav-menu"
        >
          <el-menu-item index="/">
            <router-link to="/">首页</router-link>
          </el-menu-item>
          <el-menu-item index="/search">
            <router-link to="/search">搜索</router-link>
          </el-menu-item>
          <el-menu-item index="/canvasText">
            <router-link to="/canvasText">canvasText</router-link>
          </el-menu-item>
        </el-menu>
      </div>
    </el-header>
    <el-main class="main">
      <div class="container">
        <router-view />
      </div>
    </el-main>
    <el-footer class="footer">
      <div class="container">
        <p>&copy; 2024 个人博客系统. All rights reserved.</p>
      </div>
    </el-footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const activeMenu = computed(() => route.path);
</script>

<style scoped>
.frontend-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0;
}

.header .container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.logo a {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  text-decoration: none;
}

.nav-menu {
  border-bottom: none;
}

.main {
  flex: 1;
  padding: 20px 0;
}

.main .container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.footer {
  background: #f5f7fa;
  text-align: center;
  padding: 20px 0;
}

.footer .container {
  max-width: 1200px;
  margin: 0 auto;
}
</style>


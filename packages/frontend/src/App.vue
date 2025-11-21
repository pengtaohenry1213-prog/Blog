<template>
  <!-- <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider> -->
  <router-view />
</template>

<script setup>
// App 根组件

// 处理全局 locale 配置（可选）: 引入Element Plus 中文语言包
// import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}
</style>


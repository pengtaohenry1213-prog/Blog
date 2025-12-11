import { createApp } from 'vue';
import { createPinia } from 'pinia';

// 移除：import ElementPlus from 'element-plus';
// 移除：import 'element-plus/dist/index.css';

// 优化：按需导入图标，而不是全量导入
// 移除：import * as ElementPlusIconsVue from '@element-plus/icons-vue';
// import zhCn from 'element-plus/dist/locale/zh-cn.mjs';

import App from './App.vue';
import router from './router';

const app = createApp(App);
const pinia = createPinia();


// 优化：只注册实际使用的图标
// 创建一个图标注册函数，按需注册
const registerIcons = (app) => {
  // 只导入实际使用的图标
  // 例如：import { Search, Edit, Delete } from '@element-plus/icons-vue';
  // app.component('Search', Search);
  // 或者使用动态导入
  import('@element-plus/icons-vue').then((icons) => {
    // 只注册需要的图标，而不是全部
    const iconNames = ['Search', 'Edit', 'Delete', 'Plus', 'Close']; // 根据实际使用情况调整
    iconNames.forEach((name) => {
      if (icons[name]) {
        app.component(name, icons[name]);
      }
    });
  });
};

// 注册图标（按需）
registerIcons(app);

// 注册 Element Plus 图标
// 移除：for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
// 移除：  app.component(key, component);
// 移除：}

app.use(pinia);
app.use(router);
// 移除：app.use(ElementPlus, { locale: zhCn });
// 如果需要全局配置 locale，可以在组件使用时单独配置

// 等待路由就绪后再挂载应用, 发现问题: 应用还没等路由准备好就 mount，初次导航被打断，界面表现成刷新/闪一下。
router.isReady().then(() => {
  app.mount('#app');
});

// app.mount('#app');


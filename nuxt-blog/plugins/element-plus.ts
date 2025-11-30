/**
 * Element Plus 插件
 * 在 Nuxt3 中注册 Element Plus 组件和样式
 * 支持 SSR 和客户端
 * 
 * 注意：
 * - Element Plus 2.x 支持 SSR，但需要确保样式正确导入
 * - dayjs 是 Element Plus 的依赖，已在 nuxt.config.ts 中配置 noExternal
 * - Vue 的 use() 方法本身有防止重复注册的机制，但为了更安全，我们使用单例模式
 */
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';

// 使用 WeakSet 来跟踪已注册的应用实例，避免内存泄漏
// WeakSet 允许垃圾回收，不会造成内存泄漏
const registeredApps = new WeakSet();

export default defineNuxtPlugin((nuxtApp) => {
  // 检查当前应用实例是否已经注册过
  // 使用 WeakSet 可以安全地跟踪，不会造成内存泄漏
  if (registeredApps.has(nuxtApp.vueApp)) {
    return;
  }

  // 在 SSR 和客户端都注册 Element Plus
  // Element Plus 会自动处理 SSR 环境
  // Vue 的 use() 方法本身会防止重复注册同一个插件
  nuxtApp.vueApp.use(ElementPlus, {
    locale: zhCn,
  });

  // 标记当前应用实例已注册
  registeredApps.add(nuxtApp.vueApp);
});


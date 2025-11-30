// https://nuxt.com/docs/api/configuration/nuxt-config
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('process.env.NUXT_PUBLIC_API_BASE_URL = ',process.env.NUXT_PUBLIC_API_BASE_URL);

export default defineNuxtConfig({
  // 开发服务器配置
  devServer: {
    port: 3000, // 避免与后端 3001 冲突
  },

  // SSR 配置（默认开启）
  ssr: true,

  // 路由规则：仅首页 SSR，其他 CSR
  routeRules: {
    '/': { ssr: true },           // 首页 SSR
    '/article/**': { ssr: false }, // 文章详情 CSR
    '/category/**': { ssr: false }, // 分类页 CSR
    '/search': { ssr: false },     // 搜索页 CSR
    '/admin/**': { ssr: false }    // 管理后台 CSR
  },

  // 别名配置
  alias: {
    '@': '.',
    '@blog/common': '../common'
  },

  // 模块配置
  modules: [
    '@pinia/nuxt', // Pinia 状态管理
  ],

  // 运行时配置
  runtimeConfig: {
    // 服务端私有配置
    apiSecret: '', // 可以用于服务端 API 密钥
    // 客户端可访问的配置（需要 NUXT_PUBLIC_ 前缀）
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api'
    }
  },

  // CSS 配置
  css: [
    'element-plus/dist/index.css', // Element Plus 样式
  ],

  // 构建配置
  build: {
    // 确保 Element Plus 及其依赖在 SSR 环境下正确转译
    transpile: ['element-plus'],
  },

  // Vite 配置
  vite: {
    // 优化依赖解析，确保 dayjs 及其插件正确加载
    optimizeDeps: {
      include: [
        'dayjs',
        'dayjs/plugin/localeData.js',
        'dayjs/plugin/customParseFormat.js',
        'dayjs/plugin/advancedFormat.js',
      ],
      esbuildOptions: {
        // 确保 dayjs 被正确处理为 ES 模块
        format: 'esm',
      },
    },
    ssr: {
      // 确保 Element Plus 及其依赖（如 dayjs）在 SSR 环境下不被外部化
      // 这样可以避免模块导入问题和内存泄漏
      noExternal: [
        'element-plus',
        'dayjs', // Element Plus 的依赖，需要在 SSR 环境下正确处理
      ],
    },
    plugins: [
      // 修复 dayjs UMD 格式问题：在构建时转换导入
      {
        name: 'fix-dayjs-umd',
        enforce: 'pre',
        async resolveId(id, importer) {
          // 拦截 dayjs 主模块的导入
          if (id === 'dayjs') {
            // 使用 Vite 的 resolve 来查找 dayjs/esm/index.js
            try {
              const resolved = await this.resolve('dayjs/esm/index.js', importer, {
                skipSelf: true,
              });
              if (resolved) {
                return resolved;
              }
            } catch (e) {
              // 如果解析失败，继续使用默认解析
            }
          }
          return null;
        },
      },
    ],
  },

  // Nitro 配置（服务端）, 在 Nuxt 3 中，"Nitro" 是一个非常核心的概念，它是 Nuxt 官方打造的 服务端引擎
  // Nitro 可 运行服务器端渲染（SSR）/ 处理 server/api 路由 / 构建 serverless + 可部署包 / 提供多平台适配器（Nitro Presets）
  nitro: {
    // 开发环境代理
    devProxy: {
      '/api': {
        target: 'http://localhost:3001/api',
        changeOrigin: true,
        prependPath: true
      }
    },
    // 静态导出配置（方案一：静态导出首屏）
    // 如果使用方案一，取消下面的注释；如果使用方案二（动态 SSR），保持注释状态
    // prerender: {
    //   routes: ['/'], // 只预渲染首页
    //   crawlLinks: false // 不爬取链接，只预渲染指定路由
    // }
  }
})


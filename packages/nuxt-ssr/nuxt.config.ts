// https://nuxt.com/docs/api/configuration/nuxt-config
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// console.log('process.env.NUXT_PUBLIC_API_BASE_URL = ',process.env.NUXT_PUBLIC_API_BASE_URL);

export default defineNuxtConfig({
  // 开发服务器配置
  devServer: {
    port: 3000, // 避免与后端 3001 冲突
    host: '0.0.0.0', // 允许局域网访问，设置为 '0.0.0.0' 而不是布尔值
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
      // API 基础地址（客户端可访问，需要 NUXT_PUBLIC_ 前缀）
      apiBase: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',
      
      // SEO 配置：通过环境变量设置站点域名，本地开发默认使用 localhost:3000
      siteBase: process.env.NUXT_PUBLIC_SITE_BASE || 'http://localhost:3000',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || '个人博客'
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
      // 修复 dayjs 插件导入问题：将命名导出转换为默认导出
      {
        name: 'fix-dayjs-plugin-import',
        enforce: 'pre',
        load(id) {
          // 处理 dayjs 插件的导入
          if (id.includes('dayjs/plugin/') && id.endsWith('.js')) {
            try {
              let code = readFileSync(id, 'utf-8');
              
              // 检查是否已经有默认导出
              if (!code.includes('export default')) {
                // 提取插件函数名（dayjs 插件通常是 export default function 或 export function）
                // 先尝试匹配 export default function
                const defaultFunctionMatch = code.match(/export\s+default\s+function\s+(\w+)/);
                if (defaultFunctionMatch) {
                  // 已经有默认导出，不需要修改
                  return null;
                }
                
                // 尝试匹配 export function
                const functionMatch = code.match(/export\s+function\s+(\w+)/);
                if (functionMatch) {
                  const pluginName = functionMatch[1];
                  // 添加默认导出
                  code += `\nexport default ${pluginName};`;
                  return code;
                }
                
                // 尝试匹配 export const
                const constMatch = code.match(/export\s+const\s+(\w+)\s*=/);
                if (constMatch) {
                  const pluginName = constMatch[1];
                  // 添加默认导出
                  code += `\nexport default ${pluginName};`;
                  return code;
                }
              }
            } catch (e) {
              // 如果读取失败，返回 null 使用默认处理
              return null;
            }
          }
          return null;
        },
      },
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
  },

  // 开发环境禁用 hydration 警告（仅用于调试）
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => false,
    },
  },
  
  // 或者使用这个配置来更详细地查看 hydration 错误
  // ssr: true,
  // experimental: {
  //   payloadExtraction: false,
  // },
});
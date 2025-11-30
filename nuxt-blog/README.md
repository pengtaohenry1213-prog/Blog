# Nuxt Blog 项目

这是从 Vue3 + Vite 升级而来的 Nuxt.js 博客项目，仅对首页实现 SSR。

## 核心结论

不需要将整个 Vue3+Vite 项目迁移到 Nuxt3！更轻量、低成本的方案是：**保留原项目架构不变，仅用 Nuxt3 单独实现首屏（Home.vue）的 SSR，再通过「路由转发」或「静态导出+CDN 分发」让首屏走 Nuxt3 的 SSR 服务，其他页面仍沿用原 Vue3+Vite 的 SPA 模式**。

这种方案的优势：
1. 不影响现有项目的线上运行（风险低）；
2. 开发成本低（仅需重构首页，无需迁移全量代码）；
3. 无缝衔接（用户体验上无感知，首屏 SSR 提速，其他页面保持原有逻辑）。

## 技术方案

### 方案一：Nuxt3 静态导出首屏（推荐，无额外服务器成本）

如果你的博客首页**数据更新频率较低**（比如每日/每周更新），可以用 Nuxt3 生成静态化的 SSR 首屏（预渲染），直接部署到 CDN，无需额外维护 Node 服务。

#### 实现步骤：

1. **新建独立 Nuxt3 项目**（与原 Vue3+Vite 项目分离，互不干扰）
2. **在 Nuxt3 中重构首页（Home.vue）**：
   - 复制原项目首页的模板（template）、样式（style）
   - 将原项目的「数据请求逻辑」迁移到 Nuxt3 的 `useAsyncData`（SSR 专用数据获取方法，确保数据在服务端预渲染）
   - 确保依赖一致：如果原项目用了 UI 库（如 Element Plus）、工具库（如 lodash），在 Nuxt3 项目中重新安装并配置
3. **静态导出首屏**：
   ```bash
   npm run generate  # 生成静态文件（dist 目录）
   ```
4. **部署与路由转发**：
   - 将 Nuxt3 生成的 `dist` 文件夹部署到你的 CDN（如阿里云 OSS、Cloudflare）
   - 配置你的域名路由规则：
     - 访问 `www.your-blog.com/`（首页）时，转发到 CDN 上的 Nuxt3 静态首页
     - 访问 `www.your-blog.com/article/xxx`（其他页面）时，仍转发到原 Vue3+Vite 项目的服务器（或其 CDN）

#### 适用场景：
- 首页数据更新不频繁（静态导出后需重新构建部署才能更新）
- 不想维护 Node 服务（静态文件部署成本低、稳定性高）
- 追求极致的首屏加载速度（CDN 分发+预渲染 HTML）

### 方案二：Nuxt3 服务端渲染首屏（动态数据，需 Node 服务）

如果你的博客首页**数据实时更新**（比如实时展示最新评论、访问量），静态导出无法满足，需要用 Nuxt3 的 SSR 服务（Node 运行时）动态渲染首屏。

#### 实现步骤：

1. **新建 Nuxt3 项目**（独立于原项目）
2. **重构首页并配置 SSR 数据请求**（用 `useAsyncData`，确保数据在服务端获取）
3. **配置 Nuxt3 为 SSR 模式**（默认就是 SSR 模式，无需额外配置）
4. **部署 Nuxt3 服务**：
   - 需要部署到支持 Node.js 的服务器（如阿里云 ECS、Vercel、Netlify）
5. **路由转发配置**：
   - 访问 `www.your-blog.com/`（首页）时，转发到 Nuxt3 服务的域名
   - 访问其他页面时，转发到原 Vue3+Vite 项目的服务器/CDN
   - 确保跨域问题：如果 Nuxt3 服务需要调用原项目的接口，需在原项目的接口服务中配置 CORS

#### 状态共享（可选）

如果需要让用户在首页（Nuxt3）登录后，跳转到其他页面（原 Vue3+Vite）仍保持登录状态，需处理「状态同步」：
- 登录逻辑建议放在「原项目」或「独立的后端服务」（如用 JWT 认证）
- Nuxt3 首页通过 `useCookie` 存储 JWT Token（服务端可读取 Cookie，客户端也可访问）
- 原项目通过 `document.cookie` 读取相同的 JWT Token，实现状态共享（确保 Cookie 的 `domain` 配置为顶级域名，如 `.your-blog.com`，让子域名可共享）

#### 适用场景：
- 首页数据实时更新（SSR 服务动态渲染，每次请求都重新获取最新数据）
- 能维护 Node 服务（或使用 Vercel 等无服务器平台托管）
- 需要服务端处理复杂逻辑（如权限校验、动态路由）

### 为什么不推荐「全量迁移到 Nuxt3」？

除非你的项目满足以下条件，否则全量迁移成本高、收益低：
1. 原项目规模小（页面少、逻辑简单）
2. 后续需要对多个页面做 SSR（不只是首页）
3. 原项目的依赖（如 UI 库、插件）完全兼容 Nuxt3

全量迁移的风险：
- 原项目的路由、状态管理（Pinia/Vuex）、自定义插件需要适配 Nuxt3 的规范
- 线上项目中断风险（迁移后需要全量测试，避免功能回归）
- 开发成本高（耗时比单独重构首页多几倍）

### 方案对比

| 方案                | 核心优势                  | 适用场景                          |
|---------------------|---------------------------|-----------------------------------|
| 方案一：静态导出首屏 | 成本最低、稳定性高、无需 Node 服务 | 首页数据更新不频繁                |
| 方案二：SSR 服务首屏 | 支持动态数据、实时渲染    | 首页数据实时更新                  |
| 全量迁移到 Nuxt3    | 统一技术栈、后续扩展方便  | 项目规模小、需多页面 SSR          |

### 方案选择建议

**方案一（静态导出）**适合：
- 首页数据更新不频繁（如每日/每周更新）
- 不需要实时数据展示
- 追求极致的加载速度和稳定性
- 不想维护 Node 服务

**方案二（动态 SSR）**适合：
- 首页需要实时数据（如最新文章、实时统计、动态推荐）
- 有分页、筛选等动态交互功能
- 需要服务端处理复杂逻辑（如权限校验）
- 已有 Node 服务基础设施

**当前项目使用方案二（动态 SSR）**，因为首页包含分页、热门文章等动态功能，需要实时获取最新数据。

当前状态：使用方案二（动态 SSR）
如果要切换到方案一（静态导出）：
* 1. 取消 nuxt.config.ts 中 nitro.prerender 的注释
* 2. 运行 pnpm generate 生成静态文件
* 3. 将生成的 .output/public 目录部署到 CDN

### 两种方案的区别：
| 特性 | 方案一：静态导出 | 方案二：动态 SSR（当前） |
|------|----------------|----------------------|
| 构建命令 | `pnpm generate` | `pnpm build` |
| 部署方式 | CDN（静态文件） | Node 服务器 |
| 数据更新 | 需重新构建部署 | 实时更新 |
| 服务器成本 | 无（CDN） | 需要 Node 服务 |
| 适用场景 | 数据更新不频繁 | 数据实时更新 |


## 项目结构

```
nuxt-blog/
├── assets/          # 静态资源（CSS、图片等）
├── components/      # Vue 组件（自动导入）
├── composables/     # 组合式函数（自动导入）
├── layouts/         # 布局组件
├── middleware/      # 路由中间件
├── pages/           # 页面（文件系统路由）
├── plugins/         # 插件（自动加载）
├── public/          # 公共静态文件
├── server/          # 服务端代码
├── stores/          # Pinia stores
└── utils/           # 工具函数
```

## Pinia 在 Nuxt 3 中的使用

在 Nuxt 3 中使用 Pinia 需要两个包：

### 1. `pinia`（核心库）
- 位置：`dependencies`
- 用途：Pinia 核心功能，运行时需要
- 代码中使用：`import { defineStore } from 'pinia'`

### 2. `@pinia/nuxt`（Nuxt 模块）
- 位置：`dependencies`（已从 `devDependencies` 移过来）
- 用途：集成 Pinia 到 Nuxt，提供：
  - 自动导入（无需手动导入 `defineStore`）
  - SSR 支持
  - 与 Nuxt 的集成
- 配置：在 `nuxt.config.ts` 的 `modules` 中添加 `'@pinia/nuxt'`

## 当前配置

```json
{
  "dependencies": {
    "pinia": "^2.1.7",           // ✅ 核心库
    "@pinia/nuxt": "^0.5.1"      // ✅ Nuxt 模块（已移到 dependencies）
  }
}
```

```typescript
// nuxt.config.ts
modules: [
  '@pinia/nuxt', // ✅ 已配置
]
```

两个包都需要，且都在 `dependencies` 中。配置已正确。


## 路由规则

- `/` - 首页（SSR）
- `/article/**` - 文章详情（CSR）
- `/category/**` - 分类页（CSR）
- `/search` - 搜索页（CSR）
- `/admin/**` - 管理后台（CSR）

## 环境变量

创建 `.env` 文件：

```bash
# API 基础地址（客户端可访问，需要 NUXT_PUBLIC_ 前缀）
NUXT_PUBLIC_API_BASE_URL=http://localhost:3001/api

# 服务端专用配置（不需要 NUXT_PUBLIC_ 前缀）
# NUXT_API_SECRET=your_secret_key
```

**注意事项：**
- Nuxt 3 中，只有以 `NUXT_PUBLIC_` 开头的环境变量才会暴露给客户端
- 服务端可以直接访问所有环境变量（通过 `useRuntimeConfig()`）

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview

# 静态导出（用于方案一）
pnpm generate
```

## 依赖

### 核心依赖

- **Nuxt 3** - 框架（内置 Vue 3、Vue Router、Vite）
- **Pinia + @pinia/nuxt** - 状态管理
- **Element Plus** - UI 框架
- **Axios** - HTTP 请求（可选，推荐使用 Nuxt 内置的 `$fetch`）
- **ECharts** - 图表库
- **Vditor** - Markdown 编辑器

### 不需要安装的依赖

以下依赖由 Nuxt 自动提供，**无需安装**：
- `vue` - Nuxt 内置 Vue 3
- `vue-router` - Nuxt 内置路由
- `@vitejs/plugin-vue` - Nuxt 内置
- `vite` - Nuxt 内置构建工具


## HTTP 请求方案

### 为什么没有使用 @nuxtjs/axios？

1. **Nuxt 3 的变化**：
   - `@nuxtjs/axios` 主要是为 **Nuxt 2** 设计的模块
   - **Nuxt 3** 推荐使用内置的 `$fetch` 或 `ofetch`（基于 fetch API）
   - Nuxt 3 不再维护 `@nuxtjs/axios` 模块

2. **Nuxt 3 的优势**：
   - `$fetch` 是 Nuxt 3 内置的，无需额外安装
   - 自动处理 SSR/CSR 场景
   - 更好的 TypeScript 支持
   - 更小的包体积

### 推荐方案：使用 Nuxt 3 内置的 $fetch

**优点**：
- Nuxt 3 官方推荐
- 自动处理 SSR/CSR
- 无需额外依赖
- 更好的性能

**使用方式**：

```javascript
// 方式一：使用 useFetch（推荐）
const { data } = await useFetch('/api/articles', {
  baseURL: useRuntimeConfig().public.apiBase
})

// 方式二：使用 composable
const request = useRequest()
const data = await request.get('/articles')
```

### 兼容方案：直接使用 axios

如果原项目大量使用 axios 拦截器，可以继续使用 axios：

```javascript
import axios from 'axios'

const request = axios.create({
  baseURL: useRuntimeConfig().public.apiBase
})
```

**当前项目状态**：
- ✅ 已安装 `axios@^1.6.5`（在 dependencies 中）
- ❌ 未安装 `@nuxtjs/axios`（Nuxt 3 不需要）
- ✅ 可以使用 `$fetch`（Nuxt 3 内置）

**建议**：
- 新代码使用 `$fetch` 或 `useRequest()` composable
- 旧代码可以保持使用 axios，逐步迁移

## 项目初始化

### 步骤 1：创建基础项目结构

#### 1.1 创建目录结构

在 `nuxt-blog/` 目录下创建以下目录结构：

```
nuxt-blog/
├── .nuxt/          # Nuxt 自动生成（无需手动创建）
├── .output/         # 构建输出（无需手动创建）
├── assets/          # 静态资源（CSS、图片等）
│   └── css/         # 全局样式文件
├── components/      # Vue 组件（自动导入）
├── composables/     # 组合式函数（自动导入）
│   ├── useArticle.js
│   ├── useRequest.js
├── layouts/         # 布局组件
├── middleware/      # 路由中间件
├── pages/           # 页面（文件系统路由）
│   └── index.vue    # 首页（SSR）
├── plugins/         # 插件（自动加载）
│   └── element-plus.ts
├── public/          # 公共静态文件（直接访问）
│   └── vite.svg
├── server/          # 服务端代码
│   ├── api/         # API 路由（可选）
│   └── middleware/  # 服务端中间件（可选）
└── stores/          # Pinia stores
    └── auth.js
```

#### 1.2 创建 `package.json`

创建 `nuxt-blog/package.json` 文件：

```json
{
  "name": "@blog/nuxt-blog",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "generate": "nuxt generate",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs --fix --ignore-path .gitignore",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@blog/common": "workspace:*",
    "@element-plus/icons-vue": "^2.3.1",
    "@pinia/nuxt": "^0.5.1",
    "dayjs": "^1.11.19",
    "echarts": "^5.5.0",
    "element-plus": "^2.11.9",
    "nuxt": "^3.12.0",
    "path": "^0.12.7",
    "pinia": "^2.1.7",
    "vditor": "^3.11.2"
  },
  "devDependencies": {
    "eslint": "^8.56.0",
    "eslint-plugin-vue": "^9.20.0",
    "prettier": "^3.2.4",
    "sass": "^1.94.1",
    "unplugin-auto-import": "^20.2.0",
    "unplugin-vue-components": "^30.0.0"
  }
}

```

#### 1.3 创建 `nuxt.config.ts`

创建 `nuxt-blog/nuxt.config.ts` 文件：

```typescript
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
```

#### 1.4 创建 `app.vue`

创建 `nuxt-blog/app.vue` 根组件：

```vue
<template>
  <div id="app">
    <NuxtPage />
  </div>
</template>

<script setup>
// 全局配置可以在这里添加
// 例如：Element Plus 的 ConfigProvider
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
```

#### 1.5 创建 `.gitignore`

创建 `nuxt-blog/.gitignore` 文件：

```
# Nuxt 生成的文件
.nuxt
.output
.nitro
.cache

# 依赖
node_modules

# 环境变量
.env
.env.local
.env.*.local

# 日志
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# 编辑器
.idea
.vscode
*.swp
*.swo
*~

# 系统文件
.DS_Store
Thumbs.db
```

### 步骤 2：安装核心依赖

#### 2.1 安装 Nuxt 核心

```bash
cd nuxt-blog
pnpm add nuxt@^3.12.0
```

#### 2.2 安装状态管理

```bash
pnpm add pinia@^2.1.7
pnpm add -D @pinia/nuxt@^0.5.1
```

#### 2.3 安装 UI 框架

```bash
# Element Plus 核心
pnpm add element-plus@^2.5.4

# Element Plus 图标
pnpm add @element-plus/icons-vue@^2.3.1

# 自动导入插件
pnpm add -D unplugin-vue-components@^0.30.0
pnpm add -D unplugin-auto-import@^0.20.0
```

#### 2.4 安装工具库

```bash
# HTTP 请求库（可选，Nuxt 内置 ofetch，但保留 axios 用于兼容）
pnpm add axios@^1.6.5

# 图表库
pnpm add echarts@^5.5.0

# Markdown 编辑器
pnpm add vditor@^3.11.2

# 工作区依赖
pnpm add @blog/common@workspace:*
```

#### 2.5 安装开发依赖

```bash
# 样式预处理
pnpm add -D sass@^1.94.1

# 代码质量工具（可选）
pnpm add -D eslint@^8.56.0
pnpm add -D eslint-plugin-vue@^9.20.0
pnpm add -D prettier@^3.2.4
```

### 步骤 3：验证安装

#### 3.1 检查依赖安装

```bash
cd nuxt-blog
pnpm install
```

#### 3.2 创建首屏页面

创建 `nuxt-blog/pages/index.vue` 作为首屏页面：

```vue
<template>
  <div class="home">
    <el-row :gutter="20">
      <el-col :span="18">
        <div class="article-list">
          <!-- 添加加载状态，避免空状态闪烁 -->
          <el-skeleton v-if="pending" :rows="5" animated />
          <template v-else>
            ...
          </template>
        </div>
      </el-col>
      <el-col :span="6">
        <el-card class="sidebar-card">
          <template #header>
            <h4>热门文章.</h4>
          </template>
          <ul class="hot-articles">
            <li v-for="article in hotArticles" :key="article.id" @click="goToDetail(article.id)">
              {{ article.title }}
            </li>
          </ul>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue';
import { useArticleApi } from '~/composables/useArticleApi';

// Nuxt 3 内置了 useRouter，无需从 vue-router 导入（自动导入）
const router = useRouter();
const articleApi = useArticleApi();

// 分页状态
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
});

// 使用 useAsyncData 在服务端获取文章列表（useAsyncData 是 SSR 专用数据获取方法，确保数据在服务端预渲染）
// 首次加载时使用默认分页参数
const { data: articlesData, pending, refresh: refreshArticles } = await useAsyncData(
  'articles',
  async () => {
    ...
  }
);

// 使用 useAsyncData 在服务端获取热门文章（useAsyncData 是 SSR 专用数据获取方法，确保数据在服务端预渲染）
const { data: hotArticlesData } = await useAsyncData(
  'hot-articles',
  async () => {
    ...
  }
);
...
</script>

<style scoped>
...
</style>
```


#### 3.3 启动开发服务器

```bash
pnpm dev
```

**预期结果：**
- 开发服务器启动在 `http://localhost:3000`
- 浏览器访问后能看到测试页面
- 控制台无错误信息

#### 3.4 检查构建

```bash
pnpm build
```

**预期结果：**
- 构建成功，无错误
- 生成 `.output/` 目录
- 包含服务端和客户端构建产物

#### 3.5 验证预览

```bash
pnpm preview
```

**预期结果：**
- 预览服务器启动
- 可以访问构建后的应用
- 功能正常

## 完成标准

项目初始化完成的标准：

- [x] 所有目录结构已创建
- [x] `package.json` 已创建并配置
- [x] `nuxt.config.ts` 已创建并配置
- [x] `app.vue` 已创建
- [x] `.env` 已创建并配置
- [x] `.gitignore` 已创建
- [x] 所有依赖已安装
- [x] 开发服务器可以正常启动
- [x] 测试页面可以正常访问
- [x] 构建可以正常完成

## 参考

- [Nuxt 3 官方文档](https://nuxt.com/docs)
- [Pinia 文档](https://pinia.vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)

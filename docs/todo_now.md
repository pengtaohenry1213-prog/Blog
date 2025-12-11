## 已完成 PLAN.md 中的实施计划。总结如下：
### 已完成的任务
1. Husky pre-commit 钩子配置
  在 packages/frontend/package.json 中添加了 prepare 脚本和 lint-staged 配置创建了 .husky/pre-commit 钩子文件，实现提交前自动代码校验
2. 环境变量示例文件
  创建了 env.example 文件，包含所有必要的环境变量配置说明
3. 数据库初始化 SQL 脚本完善
  在 docker/scripts/init.sql 中添加了索引创建语句
  包括 users 表的 username 唯一索引
  包括 articles 表的多个索引（联合索引、单独索引）
4. Common 共享模块创建
  创建了 packages/common 模块
  添加了 JSDoc 类型定义（User、Article、Category、ApiResponse 等）
  添加了共享工具函数（日期格式化、分页参数、邮箱验证、slug 生成等）
5. 后端环境配置完善
  创建了 packages/backend/config/index.js 配置中心
  支持开发/测试/生产环境区分
  更新了 database.js、redis.js、jwt.js 和 app.js 使用统一配置
6. Nginx HTTPS 配置模板
  在 docker/nginx/nginx.conf 中添加了 HTTPS 配置模板（注释形式）
  包含 SSL 证书配置和安全设置说明
  所有计划中的任务已完成。项目结构已完善，配置文件已统一管理，代码规范工具已配置。可以开始开发和部署。


## 个人学习内容(不要分析下面的内容)
* 详细介绍一下如何使用 Docker 容器化部署项目


## 修改backend端口为3001
可以，把后端映射端口调到别的值就行。最简单的做法：
1. 编辑 docker/docker-compose.yml，把 backend 的 ports 段改成例如 - "${BACKEND_PORT:-3001}:3001"，或直接写 - "3001:3001"。
2. 如果你用 .env 覆盖变量，记得在 .env 里加上 BACKEND_PORT=3001 或你想用的任意空闲端口。
3. 保存后重新 docker compose up -d backend frontend（或 docker compose up -d）即可。
保存后重新 docker compose up -d backend frontend（或 docker compose up -d）即可。访问 API 时改用新端口，比如 http://localhost:3001/api/...。

只要宿主机上那个端口没被占用，backend 就会启动成功。

## 文章支持markdown格式预览
```
cd /Users/taopeng/Desktop/Blog
pnpm add -w markdown-it
# 或只在 frontend 包里安装
cd packages/frontend
pnpm add markdown-it
pnpm add dompurify
```

## 优化 element-plus 的按需引入 + 打包
**vite.config.js 中添加了 按需引入插件**
**vite.config.js 中添加了 AutoImport 和 Components 插件，实现按需引入 Element Plus 组件和 API。**
```
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
```

## 优化 ESLint 的自动导入
```
AutoImport({
  resolvers: [ElementPlusResolver()],
  // 生成 ESLint 配置文件，解决 ESLint 报错
  eslintrc: {
    enabled: true, // 启用 ESLint 配置生成
    filepath: './.eslintrc-auto-import.json', // 生成的文件路径
    globalsPropValue: true, // 设置为 true 表示这些是全局变量
  },
}),
```

## 优化 Vite 的按需引入 + 打包
```
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
```

```
AutoImport({
  resolvers: [ElementPlusResolver()],
  // 生成 ESLint 配置文件，解决 ESLint 报错
  eslintrc: {
    enabled: true, // 启用 ESLint 配置生成
    filepath: './.eslintrc-auto-import.json', // 生成的文件路径
    globalsPropValue: true, // 设置为 true 表示这些是全局变量
  },
}),
```

```
Components({
  resolvers: [ElementPlusResolver()],
}),
```

## 在 MarkdownEditor 组件中使用 MessageChannel 和 Worker
```
const { start, stop, isRunning } = useAutoPolling(async () => {
  await loadDashboardData()
}, { interval: 30000, immediate: false })
```

```
const { start, stop, isRunning } = useAutoPolling(async () => {
  await loadDashboardData()
}, { interval: 30000, immediate: false })
```

## 在 ArticleForm 组件中使用 MessageChannel 和 Worker
## 在 ArticleDetail 组件中使用 MessageChannel 和 Worker
详见: messageChannel-analysis.md 和 messageChannel-implementation.md

## Admin 后台管理功能 添加dashboard页面
1. 添加 dashboard 页面
2. 添加 dashboard 页面组件

## Nuxt.js 项目迁移到 Vite.js 项目
1. 首屏SSR渲染
2. 其他页面SPR(vue3+vite)渲染
3. nginx处理路由, 部署架构:
   - 首页（`/`）：由 Nuxt 3 SSR 服务渲染，支持服务端渲染或静态导出
   - 其他页面（`/article/**`、`/category/**`、`/admin/**` 等）：由 Vue3 SPA 应用处理
   - 通过 Nginx 路由转发实现无缝切换；生产默认端口：前端 5173、后端 3001、Nuxt 3000（由 Nginx 统一暴露 80/443）

## 使用hooks-useTabVisibility.js 功能处理 页签活跃时自动开始轮询，非活跃时自动暂停
1. 添加 hooks-useTabVisibility.js 文件
2. 添加 useTabVisibility.js 文件
3. 详见: useTabVisibility.md

## packages.json加入常用命令集合

## nuxt-blog项目迁移到 packages 目录下, 符合 monorepo 单体仓库管理
1. 迁移 nuxt-blog 项目到 packages 目录下
2. nginx名称改为 nuxt-ssr

## 添加hooks-composables/useCanvas.js 功能处理 画布绘制、添加components/Canvas.vue组件、添加pages/canvas.vue页面
1. 在 hooks-composables/useCanvas.js 文件中添加 useCanvas 函数
2. 在 components/Canvas.vue 组件中添加 Canvas 组件
3. 在 pages/canvas.vue 页面中添加 Canvas 页面

## 添加hooks-composables/useDebounce.js 功能处理 防抖
1. 在 hooks-composables/useDebounce.js 文件中添加 useDebounce 函数
2. 在 ArticleForm 组件中使用 useDebounce 函数

## 添加hooks-composables/useErrorHandler.js 功能处理 错误处理
1. 在 hooks-composables/useErrorHandler.js 文件中添加 useErrorHandler 函数
2. 在 useDebounce 功能、useCanvas 功能中使用 useErrorHandler 函数

## vite中的CSP配置删除, 迁移到 nginx中配置
1. 删除 vite.config.js 中的 CSP 配置, pnpm remove vite-plugin-csp 
2. 在 nginx.conf 中添加 CSP 配置



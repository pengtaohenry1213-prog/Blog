## Nuxt SSR 博客 SEO 指南（当前实现与执行清单）

### 1. 当前已实现（代码位于 `packages/nuxt-ssr`）
- 首页 SSR (`/`)；文章/分类/搜索/admin 为 CSR（见 `routeRules`）。
- `useHead` 输出：`title`、`meta description`、Open Graph、Twitter Card、`canonical`。
- JSON-LD：在首页输出 `Blog` + `BlogPosting` 列表（前 5 篇），包含标题、作者、时间、链接、封面、mainEntityOfPage。
- `sitemap.xml`：首页、分类 all、示例文章（含 `lastmod`、`changefreq`、`priority`），基于 `public.siteBase`。
- `robots.txt`：允许全部，禁止 `/admin/`，指向 `/sitemap.xml`。

### 2. 环境变量
- `NUXT_PUBLIC_SITE_BASE`：站点基址，开发默认 `http://localhost:3000`，上线必须填生产域名。
- `NUXT_PUBLIC_SITE_NAME`：站点名称，默认“个人博客”。
- `NUXT_PUBLIC_API_BASE_URL`：前后端接口基址。

### 3. 页面与头部策略
- 首页（SSR，`pages/index.vue`）
  - `title`: `${siteName} - 首页`
  - `description`: 取列表前 3 篇标题拼接；无数据则用通用描述。
  - OG/Twitter：`type=website`，`og:image` 默认 `og-default.png`（需存在）。
  - `canonical`: `${siteBase}/`
  - JSON-LD：`Blog` + `BlogPosting`（含作者、时间、mainEntityOfPage）。
- 文章详情页（建议后续补充）
  - `og:type=article`，`og:title/description/url/image`
  - `twitter:card=summary_large_image`
  - `canonical` 指向详情页主 URL
  - JSON-LD `Article`：headline、description、author、datePublished/Modified、image、mainEntityOfPage。

### 4. 站点地图与 robots
- `server/routes/sitemap.xml.ts`：从 `public.siteBase` 拼接 URL；可接入真实文章/分类数据替换占位。
- `server/routes/robots.txt.ts`：禁止 `/admin/`，指向 `Sitemap: {siteBase}/sitemap.xml`。

### 5. 校验与测试
1) 本地启动：`pnpm --filter @blog/nuxt-ssr dev`（`nuxt.config.ts` 已设 `host: 0.0.0.0`，`package.json` 去掉了 `--host`）。
2) 浏览器/命令行查看源代码：
   - 检查 `<title>`、`meta description`、OG/Twitter、`canonical`。
   - 检查 `<script type="application/ld+json">` 是否存在并包含 Blog/BlogPosting。
3) 验证工具：
   - Google Rich Results Test / Schema Validator：校验 JSON-LD。
   - `curl http://localhost:3000/sitemap.xml`，确认 URL、`lastmod`、`changefreq`。
   - `curl http://localhost:3000/robots.txt`，确认禁止 `/admin/` 且指向 sitemap。

### 6. 上线注意事项
- 必填 `NUXT_PUBLIC_SITE_BASE` 为正式域名；同步更新 `canonical` 与 sitemap 输出。
- 确认 `og-default.png` 存在且可访问；最好提供实际封面图。
- 如有多语言，添加 `hreflang`；分页/筛选参数需首选 `canonical`。
- 配置 301（www/非 www、HTTP->HTTPS），避免重复内容。
- 图片加 `alt`，静态资源开启压缩与缓存（Nginx/CDN）。

### 7. 文章页 JSON-LD 模板（示例）
```js
useHead({
  title: `${article.title} - ${siteName}`,
  meta: [
    { name: 'description', content: article.description },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: article.title },
    { property: 'og:description', content: article.description },
    { property: 'og:url', content: article.url },
    { property: 'og:image', content: article.image },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  link: [{ rel: 'canonical', href: article.url }],
  script: [{
    type: 'application/ld+json',
    children: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      image: [article.image],
      author: { '@type': 'Person', name: article.author },
      datePublished: article.publishedAt,
      dateModified: article.updatedAt || article.publishedAt,
      mainEntityOfPage: { '@type': 'WebPage', '@id': article.url },
    }),
  }],
});
```

### 8. 待办与拓展
- 将 sitemap 数据接入真实文章/分类接口。
- 文章详情页补充 Article 级 JSON-LD 与 OG。
- 视需求调整 `/search` 等路径的抓取策略（必要时 `robots` 禁止带参数的搜索页）。
- 标签/分页等带参数页，添加合适的 `canonical`。
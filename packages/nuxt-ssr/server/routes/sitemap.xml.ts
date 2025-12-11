import { defineEventHandler, setHeader } from 'h3';

// 从运行时配置读取站点域名（支持环境变量，本地开发默认 localhost:3000）
// TODO: 改为动态读取文章/分类数据源

// 可选：占位的文章示例，接入真实数据后替换
const placeholderArticles = [
  { id: 1, updatedAt: '2024-01-01' },
  { id: 2, updatedAt: '2024-01-02' },
];

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const siteBase = config.public.siteBase;
  
  const urls: Array<{ loc: string; lastmod?: string; changefreq: string; priority: number }> = [
    { loc: `${siteBase}/`, changefreq: 'daily', priority: 1.0 },
    { loc: `${siteBase}/category/all`, changefreq: 'daily', priority: 0.8 },
    ...placeholderArticles.map((a) => ({
      loc: `${siteBase}/article/${a.id}`,
      lastmod: a.updatedAt,
      changefreq: 'weekly',
      priority: 0.7,
    })),
  ];
  console.log('-------------------------> config = ', config);
  

  // Sitemap文件中的 <urlset> 标签‌：这是一种在搜索引擎优化（SEO）中使用的XML格式，用于
  // 向搜索引擎列表网站上的所有页面。
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => {
      return [
        '<url>',
        `<loc>${u.loc}</loc>`,
        u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : '',
        `<changefreq>${u.changefreq}</changefreq>`,
        `<priority>${u.priority}</priority>`,
        '</url>',
      ].join('');
    }),
    '</urlset>',
  ].join('');

  setHeader(event, 'content-type', 'application/xml');
  return xml;
});


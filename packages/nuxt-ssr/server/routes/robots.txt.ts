import { defineEventHandler, setHeader } from 'h3';

// 从运行时配置读取站点域名（支持环境变量，本地开发默认 localhost:3000）

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const siteBase = config.public.siteBase;
  
  const content = [
    'User-agent: *',
    'Disallow: /admin/',
    'Allow: /',
    `Sitemap: ${siteBase}/sitemap.xml`,
    '',
  ].join('\n');

  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return content;
});


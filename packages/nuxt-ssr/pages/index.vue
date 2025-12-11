<template>
  <!-- JSON-LD 结构化数据 - 使用 Nuxt 的 useHead 注入到 head -->
  <div class="home">
    <el-row :gutter="20">
      <el-col :span="18">
        <div class="article-list">
          <!-- 添加加载状态，避免空状态闪烁 -->
          <el-skeleton v-if="pending" :rows="5" animated />
          <template v-else>
            <el-card v-for="article in articleList" :key="article.id" class="article-card" @click="goToDetail(article.id)">
              <template #header>
                <div class="article-header">
                  <h3>{{ article.title }}</h3>
                  <div class="article-meta">
                    <span>{{ article.author?.username }}</span>
                    <span>{{ formatDate(article.publish_time) }}</span>
                    <span>阅读. {{ article.read_count }}</span>
                  </div>
                </div>
              </template>
              <div class="article-summary">{{ article.summary || article.content?.substring(0, 200) }}...</div>
              <div class="article-footer">
                <el-tag v-if="article.category" size="small">{{ article.category.name }}</el-tag>
              </div>
            </el-card>

            <el-pagination
              v-if="pagination.total > 0"
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :total="pagination.total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
              class="pagination"
            />
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
console.warn('[nuxt-ssr/pages/index.vue 这里是SSR Nuxt首页] index.vue');

import { ref, computed, watchEffect } from 'vue';
import { useArticleApi } from '~/composables/useArticleApi';

console.log('-------------------------> pages/index.vue');

// SEO 配置：从运行时配置读取（支持环境变量，本地开发默认 localhost:3000）

// 在 Nuxt 3 中，useRuntimeConfig() 用来 获取运行时配置（runtime config），这些配置可以在 服务器端或客户端 使用，但它们的可见范围不同。
// nuxt.config.ts: defineNuxtConfig 里有定义 runtimeConfig
const config = useRuntimeConfig();

const siteBase = config.public.siteBase;
const siteName = config.public.siteName;
const defaultOgImage = `${siteBase}/og-default.png`;

// 显式指定使用 default 布局
// definePageMeta({
//   layout: 'default'
// })


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
    // console.log('[Nuxt PT] articlesData', pagination.value.page, pagination.value.pageSize);
    try {
      const result = await articleApi.getList({
        page: pagination.value.page,
        pageSize: pagination.value.pageSize
      });
      return result;
    } catch (error) {
      console.error('Failed to load articles:', error);
      // 在服务端，ElMessage 不可用，只记录错误
      if (process.client) {
        const { ElMessage } = await import('element-plus');
        ElMessage.error('加载文章列表失败');
      }
      return { list: [], total: 0 };
    }
  }
);

// 使用 useAsyncData 在服务端获取热门文章（useAsyncData 是 SSR 专用数据获取方法，确保数据在服务端预渲染）
const { data: hotArticlesData } = await useAsyncData(
  'hot-articles',
  async () => {
    // console.log('[Nuxt PT] hotArticlesData');
    try {
      const result = await articleApi.getHot();
      return result || [];
    } catch (error) {
      console.error('Failed to load hot articles:', error);
      return [];
    }
  }
);

// 计算属性：文章列表
const articleList = computed(() => articlesData.value?.list || []);

// 计算属性：热门文章
const hotArticles = computed(() => hotArticlesData.value || []);

// SEO：根据列表动态生成首页 head、OG、JSON-LD（占位域名，待替换为生产域名）
const pageUrl = computed(() => `${siteBase}/`);
const metaDescription = computed(() => {
  const topTitles = articleList.value.slice(0, 3).map((a) => a.title).filter(Boolean);
  return topTitles.length
    ? `精选文章：${topTitles.join(' / ')}`
    : '技术文章、学习笔记与分享。';
});

// 计算属性：JSON-LD 结构化数据（用于 Head 组件）
const jsonLdScript = computed(() => {
  const ogImage = articleList.value[0]?.cover || defaultOgImage;
  
  // 构建 JSON-LD 结构化数据
  const blogPosts = articleList.value.slice(0, 5)
    .filter((a) => a.title)
    .map((a) => {
      const post = {
        '@type': 'BlogPosting',
        headline: a.title,
        datePublished: a.publish_time,
        dateModified: a.update_time || a.publish_time,
        url: `${siteBase}/article/${a.id}`,
        image: a.cover || defaultOgImage,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${siteBase}/article/${a.id}`,
        },
      };
      if (a.author?.username) {
        post.author = {
          '@type': 'Person',
          name: a.author.username,
        };
      }
      return post;
    });
  
  const ldBlog = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: siteName,
    url: pageUrl.value,
    description: metaDescription.value,
    publisher: {
      '@type': 'Organization',
      name: siteName,
    },
    blogPost: blogPosts,
  };
  
  return JSON.stringify(ldBlog);
});

// 新增 useHead 动态输出 title/description、OG/Twitter、canonical，以及 Blog/BlogPosting JSON-LD（占位域名 https://example.com，默认 OG 图 og-default.png）。
// 注意：使用 useHead 的 script 属性是更安全的方式，避免了 v-html 的 XSS 风险
useHead(() => {
  const ogImage = articleList.value[0]?.cover || defaultOgImage;
  
  // 构建 JSON-LD 结构化数据
  const blogPosts = articleList.value.slice(0, 5)
    .filter((a) => a.title) // 过滤掉没有标题的文章
    .map((a) => {
      const post = {
        '@type': 'BlogPosting',
        headline: a.title,
        datePublished: a.publish_time,
        dateModified: a.update_time || a.publish_time,
        url: `${siteBase}/article/${a.id}`,
        image: a.cover || defaultOgImage,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${siteBase}/article/${a.id}`,
        },
      };
      // 只有当作者存在时才添加 author 字段
      if (a.author?.username) {
        post.author = {
          '@type': 'Person',
          name: a.author.username,
        };
      }
      return post;
    });
  
  const ldBlog = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: siteName,
    url: pageUrl.value,
    description: metaDescription.value,
    publisher: {
      '@type': 'Organization',
      name: siteName,
    },
    blogPost: blogPosts,
  };
  
  return {
    title: `${siteName} - 首页`,
    meta: [
      { name: 'description', content: metaDescription.value },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `${siteName} - 首页` },
      { property: 'og:description', content: metaDescription.value },
      { property: 'og:url', content: pageUrl.value },
      { property: 'og:image', content: ogImage },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: `${siteName} - 首页` },
      { name: 'twitter:description', content: metaDescription.value },
      { name: 'twitter:image', content: ogImage },
    ],
    link: [
      { rel: 'canonical', href: pageUrl.value },
      // { rel: 'alternate', hreflang: 'en', href: `${pageUrl.value}?lang=en` },
    ],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(ldBlog),
        key: 'blog-schema',
      },
    ],
  };
});

// 更新分页总数
watchEffect(() => {
  if (articlesData.value?.total !== undefined) {
    pagination.value.total = articlesData.value.total;
  }
});

function goToDetail(id) {
  // 跳转到原 Vue3 项目的文章详情页
  // 注意：这里需要根据实际路由配置调整
  // if (process.client) {
  //   window.location.href = `/article/${id}`;
  // } else {
  //   router.push(`/article/${id}`);
  // }

  // 统一使用 router，避免服务端和客户端不一致
  router.push(`/article/${id}`);
}

// function formatDate(date) {
//   if (!date) return '';
//   return new Date(date).toLocaleDateString('zh-CN');
// }
function formatDate(date) {
  if (!date) return '';
  // 使用固定的格式，避免服务端和客户端时区差异
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function handleSizeChange(val) {
  pagination.value.pageSize = val;
  pagination.value.page = 1;
  // 重新获取数据
  await refreshArticles();
}

async function handlePageChange(val) {
  pagination.value.page = val;
  // 使用新的分页参数重新获取数据
  try {
    const result = await articleApi.getList({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    });
    // 更新数据
    if (articlesData.value) {
      articlesData.value.list = result.list;
      articlesData.value.total = result.total;
    }
  } catch (error) {
    console.error('Failed to load articles:', error);
    if (process.client) {
      const { ElMessage } = await import('element-plus');
      ElMessage.error('加载文章列表失败');
    }
  }
}

// 控制临时提示的显示
// const showTempTips = ref(true);
// const tempTipsRef = ref(null);
// let timer1 = null;

// onMounted(() => {
//   console.warn('===== 这里是 Nuxt SSR 首页</h1> =====');
//   timer1 = setTimeout(() => {
//     showTempTips.value = false;
//   }, 5 * 1000);
// });

// onUnmounted(() => {
//   if (timer1) {
//     clearTimeout(timer1);
//   }
// });

</script>

<style scoped>
.home {
  padding: 20px 0;
}

.article-list {
  min-height: 400px; /* 设置最小高度，避免布局偏移 */
}

.article-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: box-shadow 0.3s;
}

.article-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.article-header h3 {
  margin: 0 0 10px 0;
  color: #303133;
}

.article-meta {
  font-size: 12px;
  color: #909399;
}

.article-meta span {
  margin-right: 15px;
}

.article-summary {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 10px;
}

.article-footer {
  margin-top: 10px;
}

.pagination {
  margin-top: 20px;
  justify-content: center;
}

.sidebar-card {
  position: sticky;
  top: 20px;
}

.hot-articles {
  list-style: none;
  padding: 0;
}

.hot-articles li {
  padding: 10px 0;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: color 0.3s;
}

.hot-articles li:hover {
  color: #409eff;
}
</style>


<template>
  <div class="category">
    <el-card>
      <h2>分类：{{ categoryName }}</h2>
    </el-card>

    <div class="article-list">
      <el-card v-for="article in articleList" :key="article.id" class="article-card" @click="goToDetail(article.id)">
        <h3>{{ article.title }}</h3>
        <div class="article-meta">
          <span>{{ article.author?.username }}</span>
          <span>{{ formatDate(article.publish_time) }}</span>
        </div>
        <div class="article-summary">{{ article.summary || article.content.substring(0, 200) }}...</div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { articleApi } from '@/api';
// import { ElMessage } from 'element-plus'; // 这些 import 可以移除（插件会自动处理）

const route = useRoute();
const router = useRouter();
const articleList = ref([]);
const categoryName = ref('');

async function loadArticles() {
  try {
    const result = await articleApi.getList({
      categoryId: route.params.id
    });
    articleList.value = result.list;
    if (result.list.length > 0 && result.list[0].category) {
      categoryName.value = result.list[0].category.name;
    }
  } catch (error) {
    ElMessage.error('加载文章失败');
  }
}

function goToDetail(id) {
  router.push(`/article/${id}`);
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN');
}

onMounted(() => {
  loadArticles();
});
</script>

<style scoped>
.category {
  padding: 20px 0;
}

.article-list {
  margin-top: 20px;
}

.article-card {
  margin-bottom: 15px;
  cursor: pointer;
}

.article-meta {
  font-size: 12px;
  color: #909399;
  margin: 10px 0;
}

.article-meta span {
  margin-right: 15px;
}

.article-summary {
  color: #606266;
  line-height: 1.6;
}
</style>


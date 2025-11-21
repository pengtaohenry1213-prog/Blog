<template>
  <div class="search">
    <el-card>
      <el-input
        v-model="keyword"
        placeholder="请输入搜索关键词"
        clearable
        @keyup.enter="handleSearch"
      >
        <template #append>
          <el-button @click="handleSearch">搜索</el-button>
        </template>
      </el-input>
    </el-card>

    <div v-if="results.length > 0" class="search-results">
      <el-card v-for="article in results" :key="article.id" class="result-card" @click="goToDetail(article.id)">
        <h3>{{ article.title }}</h3>
        <div class="result-meta">
          <span>{{ article.author?.username }}</span>
          <span>{{ formatDate(article.publish_time) }}</span>
        </div>
        <div class="result-summary">{{ article.summary || article.content.substring(0, 150) }}...</div>
      </el-card>
    </div>

    <el-empty v-else-if="searched && results.length === 0" description="未找到相关文章" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { articleApi } from '@/api';
// import { ElMessage } from 'element-plus'; // 这些 import 可以移除（插件会自动处理）

const route = useRoute();
const router = useRouter();
const keyword = ref(route.query.keyword || '');
const results = ref([]);
const searched = ref(false);

async function handleSearch() {
  if (!keyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词');
    return;
  }

  try {
    const result = await articleApi.getList({ keyword: keyword.value });
    results.value = result.list;
    searched.value = true;
  } catch (error) {
    ElMessage.error('搜索失败');
  }
}

function goToDetail(id) {
  router.push(`/article/${id}`);
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN');
}

if (keyword.value) {
  handleSearch();
}
</script>

<style scoped>
.search {
  padding: 20px 0;
}

.search-results {
  margin-top: 20px;
}

.result-card {
  margin-bottom: 15px;
  cursor: pointer;
  transition: box-shadow 0.3s;
}

.result-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.result-meta {
  font-size: 12px;
  color: #909399;
  margin: 10px 0;
}

.result-meta span {
  margin-right: 15px;
}

.result-summary {
  color: #606266;
  line-height: 1.6;
}
</style>


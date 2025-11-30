<template>
  <div class="home">
    <el-row :gutter="20">
      <el-col :span="18">
        <div class="article-list">
          <!-- 添加加载状态，避免空状态闪烁 -->
          <el-skeleton v-if="loading" :rows="5" animated />
          <template v-else>
            <el-card v-for="article in articleList" :key="article.id" class="article-card" @click="goToDetail(article.id)">
              <template #header>
                <div class="article-header">
                  <h3>{{ article.title }}</h3>
                  <div class="article-meta">
                    <span>{{ article.author?.username }}</span>
                    <span>{{ formatDate(article.publish_time) }}</span>
                    <span>阅读 {{ article.read_count }}</span>
                  </div>
                </div>
              </template>
              <div class="article-summary">{{ article.summary || article.content.substring(0, 200) }}...</div>
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
            <h4>热门文章</h4>
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
console.warn('===== 这里是SPA Vue3 首页 =====');
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { articleApi } from '@/api';
// import { ElMessage } from 'element-plus'; // 这些 import 可以移除（插件会自动处理）

import { isValidEmail } from '@blog/common';
console.log('@blog/common isValidEmail: ', typeof isValidEmail);

const router = useRouter();
const articleList = ref([]);
const hotArticles = ref([]);
const loading = ref(true); // 添加加载状态
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
});

console.log('[frontend/src/views/frontend/Home.vue] router: ', router);

async function loadArticles() {
  try {
    const result = await articleApi.getList({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    });
    articleList.value = result.list;
    pagination.value.total = result.total;
  } catch (error) {
    ElMessage.error('加载文章列表失败');
  } finally {
    loading.value = false; // 加载完成
  }
}

async function loadHotArticles() {
  try {
    hotArticles.value = await articleApi.getHot();
  } catch (error) {
    console.error('Load hot articles error:', error);
  }
}

function goToDetail(id) {
  router.push(`/article/${id}`);
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN');
}

function handleSizeChange(val) {
  pagination.value.pageSize = val;
  pagination.value.page = 1;
  loadArticles();
}

function handlePageChange(val) {
  pagination.value.page = val;
  loadArticles();
}

onMounted(() => {
  loadArticles();
  loadHotArticles();
});
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


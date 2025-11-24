<template>
  <div class="article-detail">
    <el-card v-if="article">
      <template #header>
        <h1>{{ article.title }}</h1>
        <div class="article-meta">
          <span>作者：{{ article.author?.username }}</span>
          <span>发布时间：{{ formatDate(article.publish_time) }}</span>
          <span>阅读量：{{ article.read_count }}</span>
          <el-tag v-if="article.category" size="small">{{ article.category.name }}</el-tag>
        </div>
      </template>
      <!-- <div class="article-content" v-html="article.content"></div> -->
      <div class="article-content">
        <MarkdownEditor 
          v-model="article.content" 
          :readonly="true"
          :enable-analysis="false"
        />
      </div>
    </el-card>
    <el-empty v-else description="文章不存在" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { articleApi } from '@/api';
// import { ElMessage } from 'element-plus'; // 这些 import 可以移除（插件会自动处理）

// import MarkdownEditor from '@/components/MarkdownEditor.vue'
import { defineAsyncComponent } from 'vue';
// 只在需要时展示的弹窗/大型组件, 也用懒加载：
const MarkdownEditor = defineAsyncComponent(() =>
  import('@/components/MarkdownEditor.vue')
)

const route = useRoute();
const article = ref(null);

async function loadArticle() {
  try {
    article.value = await articleApi.getDetail(route.params.id);
  } catch (error) {
    ElMessage.error('加载文章失败');
  }
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
}

onMounted(() => {
  loadArticle();
});
</script>

<style scoped>
.article-detail {
  max-width: 900px;
  margin: 0 auto;
}

.article-meta {
  margin-top: 15px;
  font-size: 14px;
  color: #909399;
}

.article-meta span {
  margin-right: 15px;
}

.article-content {
  line-height: 1.8;
  color: #303133;
  padding: 20px 0;
}
</style>


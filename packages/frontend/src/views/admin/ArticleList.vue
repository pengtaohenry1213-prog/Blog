<template>
  <div class="article-list">
    <el-card>
      <template #header>
        <div class="header">
          <span>文章管理</span>
          <el-button type="primary" @click="handleCreate">新建文章</el-button>
        </div>
      </template>

      <el-table :data="articleList" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="author.username" label="作者" width="120" />
        <el-table-column prop="category.name" label="分类" width="100" />
        <el-table-column prop="read_count" label="阅读量" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publish_time" label="发布时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.publish_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row.id)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
        class="el-pagination"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { articleApi } from '@/api';
import { useAutoPolling } from '@/composables/useTabVisibility';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const articleList = ref([]);
const loading = ref(false);
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
});

/**
 * 加载文章列表
 */
async function loadArticles() {
  loading.value = true;
  try {
    console.log('loadArticles 加载文章列表');  
    const result = await articleApi.getList({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      status: '' // 'published' // 获取所有状态的文章
    });
    articleList.value = result.list;
    pagination.value.total = result.total;
  } catch (error) {
    ElMessage.error('加载文章列表失败');
  } finally {
    loading.value = false;
  }
}

/**
 * 文章列表自动轮询配置：
 * - 仅在当前标签页处于活跃状态时才执行轮询
 * - 默认每 30 秒刷新一次列表数据
 */
const articleListPollingOptions = {
  interval: 30 * 1000, // 轮询间隔：30 秒
  immediate: false,    // 不在启动时立刻执行，由 onMounted 首次加载
  autoStart: true,     // 根据标签页可见性自动启动 / 暂停
  visibilityOptions: {
    componentName: 'ArticleList.vue/useAutoPolling',
    // 默认使用 isCurrentTabActive：多开同一页面/多窗口时，只保留一个主轮询者
    enableMultiTab: true,
    // 使用专用 storageKey，保证文章列表轮询有自己的一套“多页签竞争”通道
    storageKey: '__admin_article_list_polling__'
  }
};

// 文章列表自动轮询
// 每次你在一个组件的 setup() 里调用 useAutoPolling(...)，它内部会在
// 同一个组件实例上再注册一套 useTabVisibility（带你传进来的 visibilityOptions）。
const { 
  start: startArticleListPolling, 
  stop: stopArticleListPolling
} = useAutoPolling(
  () => loadArticles(),
  articleListPollingOptions
);

/**
 * 新建文章
 */
function handleCreate() {
  router.push('/admin/articles/create');
}

/**
 * 编辑文章
 */
function handleEdit(id) {
  router.push(`/admin/articles/edit/${id}`);
}

/**
 * 删除文章
 */
async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定要删除这篇文章吗？', '提示', {
      type: 'warning'
    });
    
    await articleApi.delete(id);
    ElMessage.success('删除成功');
    loadArticles();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
}

/**
 * 获取状态类型
 */
function getStatusType(status) {
  const map = {
    draft: 'info',
    published: 'success',
    archived: 'warning'
  };
  return map[status] || 'info';
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
  const map = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档'
  };
  return map[status] || status;
}

/**
 * 格式化日期
 */
function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
}

/**
 * 改变每页显示条数
 */
function handleSizeChange(val) {
  pagination.value.pageSize = val;
  pagination.value.page = 1;
  loadArticles();
}

/**
 * 改变页码
 */
function handlePageChange(val) {
  pagination.value.page = val;
  loadArticles();
}

onMounted(() => {
  // 首次进入页面加载一次数据
  loadArticles();
  // 然后开启自动轮询（仅在当前标签页活跃时触发）
  startArticleListPolling();
});

onBeforeUnmount(() => {
  // 组件销毁前停止轮询，避免内存泄漏
  stopArticleListPolling(true);
});
</script>

<style scoped>
.article-list {
  padding: 20px;
}


.el-pagination {
  margin-top: 20px; justify-content: flex-end;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>


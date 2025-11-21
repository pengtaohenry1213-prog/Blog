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
        style="margin-top: 20px; justify-content: flex-end;"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { articleApi } from '@/api';
// import { ElMessage, ElMessageBox } from 'element-plus'; // 这些 import 可以移除（插件会自动处理）

const router = useRouter();
const articleList = ref([]);
const loading = ref(false);
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
});

async function loadArticles() {
  loading.value = true;
  try {
    console.log('loadArticles');  
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

function handleCreate() {
  router.push('/admin/articles/create');
}

function handleEdit(id) {
  router.push(`/admin/articles/edit/${id}`);
}

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

function getStatusType(status) {
  const map = {
    draft: 'info',
    published: 'success',
    archived: 'warning'
  };
  return map[status] || 'info';
}

function getStatusText(status) {
  const map = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档'
  };
  return map[status] || status;
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
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
});
</script>

<style scoped>
.article-list {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>


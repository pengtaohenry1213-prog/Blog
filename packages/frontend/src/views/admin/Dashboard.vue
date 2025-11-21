<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-value">{{ stats.totalArticles }}</div>
            <div class="stat-label">文章总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">用户总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-value">{{ stats.publishedArticles }}</div>
            <div class="stat-label">已发布文章</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-value">{{ stats.totalViews }}</div>
            <div class="stat-label">总阅读量</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { articleApi, userApi } from '@/api';

const stats = ref({
  totalArticles: 0,
  totalUsers: 0,
  publishedArticles: 0,
  totalViews: 0
});

async function loadStats() {
  try {
    // 这里可以调用统计接口，暂时使用列表接口获取数据
    const [articles, users] = await Promise.all([
      articleApi.getList({ page: 1, pageSize: 1 }),
      userApi.getList({ page: 1, pageSize: 1 })
    ]);
    
    stats.value.totalArticles = articles.total || 0;
    stats.value.totalUsers = users.total || 0;
    // 实际项目中应该有专门的统计接口
  } catch (error) {
    console.error('Load stats error:', error);
  }
}

onMounted(() => {
  loadStats();
});
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}
</style>


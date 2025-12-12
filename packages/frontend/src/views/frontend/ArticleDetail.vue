<template>
  <div class="article-detail">
    <el-card v-if="article" class="article-card" shadow="hover">
      <template #header>
        <div class="article-header">
          <h1 class="article-title">{{ article.title }}</h1>
          <div class="article-meta">
            <div class="meta-item">
              <el-icon><User /></el-icon>
              <span>{{ article.author?.username || '未知作者' }}</span>
            </div>
            <div class="meta-item">
              <el-icon><Clock /></el-icon>
              <span>{{ formatDate(article.publish_time) }}</span>
            </div>
            <div class="meta-item">
              <el-icon><View /></el-icon>
              <span>{{ article.read_count || 0 }} 次阅读</span>
            </div>
            <el-tag v-if="article.category" type="info" size="small" class="category-tag">
              {{ article.category.name }}
            </el-tag>
          </div>
        </div>
      </template>
      
      <div class="article-content">
        <MarkdownEditor 
          v-model="article.content" 
          :readonly="true"
          :enable-analysis="false"
        />
      </div>
      
      <!-- 点赞和投票操作区 -->
      <div class="article-actions">
        <div class="action-group like-group">
          <el-button 
            :loading="likeLoading" 
            :type="liked ? 'primary' : 'default'"
            :class="{ 'is-liked': liked }"
            @click="handleLikeClick"
            size="large"
            round
          >
            <el-icon class="like-icon" :class="{ 'is-liked': liked }">
              <StarFilled v-if="liked" />
              <Star v-else />
            </el-icon>
            <span class="like-text">{{ liked ? '已点赞' : '点赞' }}</span>
            <span class="like-count" :class="{ 'has-likes': likeCount > 0 }">{{ likeCount }}</span>
          </el-button>
        </div>
        
        <div class="action-group vote-group">
          <div class="vote-buttons">
            <el-button 
              :loading="voteLoading" 
              :type="vote === 1 ? 'primary' : 'default'"
              :class="{ 'is-active': vote === 1 }"
              @click="doVote(1)"
              size="large"
              round
            >
              <el-icon><ArrowUp /></el-icon>
              <span>赞成</span>
              <span v-if="up > 0" class="vote-count">{{ up }}</span>
            </el-button>
            <el-button 
              :loading="voteLoading" 
              :type="vote === -1 ? 'danger' : 'default'"
              :class="{ 'is-active': vote === -1 }"
              @click="doVote(-1)"
              size="large"
              round
            >
              <el-icon><ArrowDown /></el-icon>
              <span>反对</span>
              <span v-if="down > 0" class="vote-count">{{ down }}</span>
            </el-button>
          </div>
          <div class="vote-score" :class="{ 'positive': voteScore > 0, 'negative': voteScore < 0 }">
            <span class="score-label">得分</span>
            <span class="score-value">{{ voteScore > 0 ? '+' : '' }}{{ voteScore }}</span>
          </div>
        </div>
      </div>
    </el-card>
    <el-empty v-else description="文章不存在" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { articleApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { 
  User, 
  Clock, 
  View, 
  Star,
  StarFilled,
  ArrowUp, 
  ArrowDown 
} from '@element-plus/icons-vue';
import { defineAsyncComponent } from 'vue';

// 只在需要时展示的弹窗/大型组件, 也用懒加载：
const MarkdownEditor = defineAsyncComponent(() =>
  import('@/components/MarkdownEditor.vue')
)

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const article = ref(null);

// 点赞相关状态
const liked = ref(false);
const likeCount = ref(0);
const likeLoading = ref(false);

// 投票相关状态
const vote = ref(0); // 1(赞成) | -1(反对) | 0(未投票)
const voteScore = ref(0);
const up = ref(0);
const down = ref(0);
const voteLoading = ref(false);

// 是否已登录
const isAuthenticated = computed(() => authStore.isAuthenticated);

async function loadArticle() {
  try {
    article.value = await articleApi.getDetail(route.params.id);
    // 初始化点赞和投票状态（如果后端返回了这些字段）
    if (article.value.liked !== undefined) {
      liked.value = article.value.liked;
    }
    if (article.value.likeCount !== undefined) {
      likeCount.value = article.value.likeCount;
    }
    if (article.value.vote !== undefined) {
      vote.value = article.value.vote;
    }
    if (article.value.voteScore !== undefined) {
      voteScore.value = article.value.voteScore;
    }
    if (article.value.up !== undefined) {
      up.value = article.value.up;
    }
    if (article.value.down !== undefined) {
      down.value = article.value.down;
    }
  } catch (error) {
    ElMessage.error('加载文章失败');
  }
}

// 处理点赞点击
function handleLikeClick() {
  if (!isAuthenticated.value) {
    ElMessage.warning('请先登录后再点赞');
    router.push({ name: 'Login', query: { redirect: route.fullPath } });
    return;
  }
  toggleLike();
}

// 生成基于操作的幂等键（同一操作使用相同键）
function generateIdempotencyKey(action, articleId) {
  // 使用操作类型 + 文章ID + 用户ID（如果有）生成稳定的幂等键
  const userId = authStore.user?.id || 'guest';
  return `${action}:${articleId}:${userId}`;
}

// 切换点赞状态
async function toggleLike() {
  if (likeLoading.value) return;
  likeLoading.value = true;
  const optimisticLiked = liked.value;
  const optimisticCount = likeCount.value;
  
  // 乐观更新
  liked.value = !optimisticLiked;
  likeCount.value += liked.value ? 1 : -1;
  
  try {
    const action = liked.value ? 'like' : 'unlike';
    const idempotencyKey = generateIdempotencyKey(action, route.params.id);
    
    if (liked.value) {
      await articleApi.likeArticle(route.params.id, idempotencyKey);
    } else {
      await articleApi.unlikeArticle(route.params.id, idempotencyKey);
    }
  } catch (error) {
    // 处理幂等性错误（409 - 请求已处理）
    if (error.response?.status === 409) {
      // 409 表示请求已处理，刷新数据以获取最新状态
      ElMessage.info('操作已完成，正在刷新数据...');
      await loadArticle();
      return;
    }
    
    // 回滚
    liked.value = optimisticLiked;
    likeCount.value = optimisticCount;
    ElMessage.error(liked.value ? '点赞失败' : '取消点赞失败');
  } finally {
    likeLoading.value = false;
  }
}

// 投票
async function doVote(val) {
  if (!isAuthenticated.value) {
    ElMessage.warning('请先登录后再投票');
    router.push({ name: 'Login', query: { redirect: route.fullPath } });
    return;
  }
  
  if (voteLoading.value) return;
  voteLoading.value = true;
  const prevVote = vote.value;
  const prevScore = voteScore.value;
  const prevUp = up.value;
  const prevDown = down.value;
  
  // 计算乐观更新：如果点击相同方向则取消，否则切换
  let newVote = val;
  if (val === prevVote) {
    newVote = 0; // 取消投票
  }
  
  // 计算得分和数量变化
  let delta = 0;
  let upDelta = 0;
  let downDelta = 0;
  
  if (prevVote === 1) {
    delta -= 1;
    upDelta -= 1;
  } else if (prevVote === -1) {
    delta += 1;
    downDelta -= 1;
  }
  
  if (newVote === 1) {
    delta += 1;
    upDelta += 1;
  } else if (newVote === -1) {
    delta -= 1;
    downDelta += 1;
  }
  
  vote.value = newVote;
  voteScore.value = prevScore + delta;
  up.value = prevUp + upDelta;
  down.value = prevDown + downDelta;
  
  try {
    // 生成基于投票值的幂等键
    const idempotencyKey = generateIdempotencyKey(`vote:${newVote}`, route.params.id);
    const result = await articleApi.voteArticle(route.params.id, newVote, idempotencyKey);
    
    // 使用服务器返回的最新数据
    if (result) {
      vote.value = result.vote ?? newVote;
      voteScore.value = result.voteScore ?? voteScore.value;
      up.value = result.up ?? up.value;
      down.value = result.down ?? down.value;
    }
  } catch (error) {
    // 处理幂等性错误（409 - 请求已处理）
    if (error.response?.status === 409) {
      // 409 表示请求已处理，刷新数据以获取最新状态
      ElMessage.info('操作已完成，正在刷新数据...');
      await loadArticle();
      return;
    }
    
    // 回滚
    vote.value = prevVote;
    voteScore.value = prevScore;
    up.value = prevUp;
    down.value = prevDown;
    ElMessage.error('投票失败');
  } finally {
    voteLoading.value = false;
  }
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
}

onMounted(() => {
  loadArticle();
});

onUnmounted(() => {
  // 清空变量, 避免内存泄漏
  article.value = null;
});
</script>

<style scoped>
.article-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
}

.article-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.article-header {
  padding: 8px 0;
}

.article-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
  line-height: 1.4;
  word-break: break-word;
}

.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 12px;
  font-size: 14px;
  color: #909399;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-item .el-icon {
  font-size: 16px;
}

.category-tag {
  margin-left: auto;
}

.article-content {
  line-height: 1.8;
  color: #303133;
  padding: 0;
  min-height: 200px;
}

.article-content :deep(.v_loading) {
  width: 100%;
}

.article-actions {
  margin-top: 0;
  padding-top: 12px;
  border-top: 2px solid #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.like-group {
  flex: 0 0 auto;
}

.like-icon {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.like-icon.is-liked {
  animation: like-bounce 0.5s ease;
}

@keyframes like-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

.like-text {
  margin: 0 4px;
}

.like-count {
  margin-left: 8px;
  padding: 2px 8px;
  background: #f0f2f5;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.like-count.has-likes {
  background: #ecf5ff;
  color: #409eff;
}

.is-liked .like-count {
  background: #ecf5ff;
  color: #409eff;
}

.vote-group {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: flex-end;
}

.vote-buttons {
  display: flex;
  gap: 8px;
}

.vote-buttons .el-button {
  position: relative;
  transition: all 0.3s ease;
}

.vote-buttons .el-button.is-active {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.vote-count {
  margin-left: 6px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.vote-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  min-width: 80px;
  transition: all 0.3s ease;
}

.vote-score.positive {
  background: #f0f9ff;
  color: #409eff;
}

.vote-score.negative {
  background: #fef0f0;
  color: #f56c6c;
}

.score-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.score-value {
  font-size: 20px;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .article-detail {
    padding: 12px;
  }
  
  .article-title {
    font-size: 22px;
  }
  
  .article-meta {
    gap: 12px;
    font-size: 13px;
  }
  
  .article-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .vote-group {
    justify-content: center;
    width: 100%;
  }
  
  .vote-buttons {
    flex: 1;
  }
  
  .vote-buttons .el-button {
    flex: 1;
  }
}

/* 按钮 hover 效果 */
.like-group .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.vote-buttons .el-button:hover:not(.is-active) {
  transform: translateY(-2px);
}
</style>


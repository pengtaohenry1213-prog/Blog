<template>
  <div class="dashboard">
    <el-row :gutter="20" class="chart-row debug-row">
      <el-col :span="24">
        <el-card>
          <div class="card-header">
            <span>调试面板 · 浏览时长 (服务端汇总)</span>
          </div>
          <div class="debug-panel">
            <div class="debug-item">
              <span class="debug-label">累计总浏览时长</span>
              <span class="debug-value">{{ serverBrowsingSummary.totalSessionTime.toFixed(1) }} s</span>
            </div>
            <div class="debug-item">
              <span class="debug-label">历史会话上报总时长</span>
              <span class="debug-value">{{ serverBrowsingSummary.totalReportedTime.toFixed(1) }} s</span>
            </div>
            <div class="debug-item">
              <span class="debug-label">上报次数</span>
              <span class="debug-value">{{ serverBrowsingSummary.reportCount }} 次</span>
            </div>
            <div class="debug-item">
              <span class="debug-label">最后上报时间</span>
              <span class="debug-value">
                <span v-if="serverBrowsingSummary.lastReportedAt">
                  {{ new Date(serverBrowsingSummary.lastReportedAt).toLocaleString() }}
                </span>
                <span v-else>--</span>
              </span>
            </div>
            <div class="debug-item debug-tip">
              <span class="debug-label">提示</span>
              <span class="debug-value">实时统计已提升至 Layout.vue，通过路由范围共享</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="kpi-row">
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-value">
              {{ stats.totalArticles }}
            </div>
            <div class="stat-label">文章总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-value">
              {{ stats.totalUsers }}
            </div>
            <div class="stat-label">用户总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-value">
              {{ stats.publishedArticles }}
            </div>
            <div class="stat-label">已发布文章</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-value">
              {{ stats.totalViews }}
            </div>
            <div class="stat-label">总阅读量</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="16">
        <el-card>
          <div class="card-header">
            <span>最近 7 天访问趋势</span>
          </div>
          <div class="chart-container">
            <BaseEChart :options="visitTrendOptions" :loading="isLoading1" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div class="card-header">
            <span>流量来源分布</span>
          </div>
          <div class="chart-container">
            <BaseEChart 
              :options="sourcePieOptions" 
              :loading="isLoading1" 
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card>
          <div class="card-header">
            <span>热门文章 Top 5</span>
          </div>
          <div class="chart-container">
            <BaseEChart 
              :options="topArticlesOptions" 
              :loading="isLoading1" 
            />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <div class="card-header">
            <span>访问时间分布</span>
          </div>
          <div class="chart-container">
            <BaseEChart 
              :options="visitHeatmapOptions" 
              :loading="isLoading1" 
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue';
import BaseEChart from '@/components/BaseEChart.vue';
import { articleApi, userApi, statsApi } from '@/api';
import { useAutoPolling } from '@/composables/useTabVisibility';

// 加载状态
const isLoading1 = ref(false);

// 统计数据
const stats = ref({
  totalArticles: 0,
  totalUsers: 0,
  publishedArticles: 0,
  totalViews: 0
});

// 图表数据
const visitTrendOptions = ref({});
const sourcePieOptions = ref({});
const topArticlesOptions = ref({});
const visitHeatmapOptions = ref({});

// 服务端汇总数据
const serverBrowsingSummary = ref({
  totalSessionTime: 0,
  totalReportedTime: 0,
  reportCount: 0,
  lastReportedAt: null
});

/**
 * 构建访问趋势图配置
 * @param {Object} data 访问趋势数据
 * @returns {Object} 访问趋势图配置
 */
function buildVisitTrendOptions(data) {
  // 如果后端返回了真实数据，使用真实数据；否则使用 mock 数据
  const days = data?.days || Array.from({ length: 7 }).map((_, i) => `第 ${i + 1} 天`);
  const pvData = data?.pv || [120, 200, 150, 80, 70, 110, 130];
  const uvData = data?.uv || [60, 100, 90, 50, 40, 70, 80];

  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['PV', 'UV'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: days },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'PV',
        type: 'line',
        areaStyle: {},
        smooth: true,
        data: pvData
      },
      {
        name: 'UV',
        type: 'line',
        smooth: true,
        data: uvData
      }
    ]
  };
}

/**
 * 构建流量来源分布图配置
 * @param {Object} data 流量来源分布数据
 * @returns {Object} 流量来源分布图配置
 */
function buildSourcePieOptions(data) {
  // 如果后端返回了真实数据，使用真实数据；否则使用 mock 数据
  const pieData = data || [
    { value: 400, name: '_搜索引擎' },
    { value: 335, name: '_直接访问' },
    { value: 310, name: '_社交媒体' },
    { value: 274, name: '_外部推荐' },
    { value: 235, name: '_其他' }
  ];

  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: '来源',
        type: 'pie',
        radius: '60%',
        data: pieData
      }
    ]
  };
}

/**
 * 构建热门文章 Top 5 配置
 * @param {Object} data 热门文章数据
 * @returns {Object} 热门文章 Top 5 图配置
 */
function buildTopArticlesOptions(data) {
  // 如果后端返回了真实数据，使用真实数据；否则使用 mock 数据
  const articleNames = data?.names || ['文章 A', '文章 B', '文章 C', '文章 D', '文章 E'];
  const articleViews = data?.views || [520, 432, 401, 334, 290];

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: articleNames },
    series: [
      {
        name: '阅读量',
        type: 'bar',
        data: articleViews,
        itemStyle: {
          color: '#409EFF'
        }
      }
    ]
  };
}

/**
 * 构建访问时间分布图配置
 * @param {Object} data 访问时间分布数据
 * @returns {Object} 访问时间分布图配置
 */
function buildVisitHeatmapOptions(data) {
  const hours = Array.from({ length: 24 }).map((_, i) => `${i}:00`);
  const daysOfWeek = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  // 如果后端返回了真实数据，使用真实数据；否则使用 mock 数据
  let heatmapData = [];
  if (data && Array.isArray(data)) {
    heatmapData = data;
  } else {
    daysOfWeek.forEach((_, dayIndex) => {
      hours.forEach((_, hourIndex) => {
        const value = Math.round(Math.random() * 200);
        heatmapData.push([hourIndex, dayIndex, value]);
      });
    });
  }

  return {
    tooltip: {
      position: 'top'
    },
    grid: {
      height: '70%',
      top: '10%'
    },
    xAxis: {
      type: 'category',
      data: hours,
      splitArea: { show: true }
    },
    yAxis: {
      type: 'category',
      data: daysOfWeek,
      splitArea: { show: true }
    },
    visualMap: {
      min: 0,
      max: 200,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%'
    },
    series: [
      {
        name: '访问量',
        type: 'heatmap',
        data: heatmapData,
        label: { show: false },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };
}

/**
 * 加载所有数据
 */
async function loadAllData() {
  try {
    // 并行加载所有API数据
    const [articlesRes, usersRes, overviewRes, browsingSummaryRes] = await Promise.all([
      articleApi.getList({ page: 1, pageSize: 1 }),
      userApi.getList({ page: 1, pageSize: 1 }),
      statsApi.getOverview().catch(() => null), // 如果 API 不存在，返回 null
      statsApi.getBrowsingTimeSummary({ page: 'admin-dashboard' }).catch(() => null)
    ]);
    // 如果后端有 overview API，使用真实数据；否则使用其他 API 的数据
    if (overviewRes) {
      /**
       * overviewRes: {
       *   totalArticles: 总文章数,
       *   publishedArticles: 已发布文章数,
       *   totalUsers: 总用户数,
       *   totalViews: 总浏览量,
       *   visitTrend: 访问趋势,
       *   sourcePie: 流量来源分布,
       *   topArticles: 热门文章 Top 5,
       *   visitHeatmap: 访问时间分布
       */
      const overview = overviewRes;

      // 使用 overview 中的统计数据
      stats.value.totalArticles = overview.totalArticles || 0;
      stats.value.totalUsers = overview.totalUsers || 0;
      stats.value.publishedArticles = overview.publishedArticles || 0;
      stats.value.totalViews = overview.totalViews || 0;
      
      // 设置图表数据
      visitTrendOptions.value = buildVisitTrendOptions(overview.visitTrend);
      // console.log('overview.sourcePie = ', overview.sourcePie)
      sourcePieOptions.value = buildSourcePieOptions(overview.sourcePie);
      topArticlesOptions.value = buildTopArticlesOptions(overview.topArticles);
      visitHeatmapOptions.value = buildVisitHeatmapOptions(overview.visitHeatmap);
    }

    // 服务端汇总数据
    if (browsingSummaryRes) {
      const summary = browsingSummaryRes;
      serverBrowsingSummary.value.totalSessionTime = summary.totalSessionTime || 0;
      serverBrowsingSummary.value.totalReportedTime = summary.totalReportedTime || 0;
      serverBrowsingSummary.value.reportCount = summary.reportCount || 0;
      serverBrowsingSummary.value.lastReportedAt = summary.lastReportedAt || null;
    }
    else {
      debugger;
      // 使用其他 API 的数据作为 fallback
      stats.value.totalArticles = articlesRes.total || 0;
      stats.value.totalUsers = usersRes.total || 0;
      stats.value.publishedArticles = articlesRes.total || 0;
      stats.value.totalViews = (articlesRes.total || 0) * 100;

      // await new Promise(r => setTimeout(r, 3000));

      // 使用 mock 数据
      visitTrendOptions.value = buildVisitTrendOptions();
      sourcePieOptions.value = buildSourcePieOptions();
      topArticlesOptions.value = buildTopArticlesOptions();
      visitHeatmapOptions.value = buildVisitHeatmapOptions();
    }
  } catch (error) {
    console.error('Load dashboard data error:', error);
    // 出错时使用 mock 数据
    visitTrendOptions.value = buildVisitTrendOptions();
    sourcePieOptions.value = buildSourcePieOptions();
    topArticlesOptions.value = buildTopArticlesOptions();
    visitHeatmapOptions.value = buildVisitHeatmapOptions();
  } 
  // finally {
    
  // }
}

async function refreshDashboard(showLoading = false) {
  if (showLoading) {
    isLoading1.value = true;
  }
  try {
    await loadAllData();
  } finally {
    if (showLoading) {
      isLoading1.value = false;
    }
  }
}

/**
 * 轮询配置
 */
const options = {
  interval: 30 * 1000, // 轮询间隔，默认 30 秒
  immediate: false, // 是否立即执行，默认不立即执行
  autoStart: false, // 是否自动启动，默认自动启动
  visibilityOptions: {
    componentName: 'Dashboard.vue/useAutoPolling',
    // 默认使用 isCurrentTabActive：全局只保留一个主轮询者
    enableMultiTab: true,
    // Dashboard 使用独立的 storageKey 做多页签竞争，不和其它轮询混在一起
    storageKey: '__admin_dashboard_polling__'
  }
};

// Dashboard 需要每 30 秒刷新一次统计数据，但页签不活跃时应暂停
const { start: startPolling, stop: stopPolling } = useAutoPolling(
  () => refreshDashboard(false), // poller 轮询任务函数
  options // options 轮询配置
);

await refreshDashboard(true);
startPolling();

onBeforeUnmount(() => {
  // 清空变量, 避免内存泄漏
  // loading.value = null;
  isLoading1.value = null;
  stats.value = null;
  visitTrendOptions.value = null;
  sourcePieOptions.value = null;
  topArticlesOptions.value = null;
  visitHeatmapOptions.value = null;

  stopPolling(true);
});
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.kpi-row {
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.chart-row {
  margin-bottom: 20px;
}

.card-header {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
}
  
.chart-row { 
  margin-bottom: 20px;
}
.card-header {  
  font-size: 14px;  font-weight: 500;  margin-bottom: 10px;
}
.chart-container {
  height: 280px;
}
.debug-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.debug-item {
  min-width: 220px;
  display: flex;
  justify-content: start;
  font-size: 13px;
}
.debug-item:last-child {
  width: 100vw;
}
.debug-label {
  color: #909399;
}
.debug-value {
  font-size: 1.0rem;
  font-weight: 500;
  text-indent: 0.5rem;
  color: #409eff;
}
.debug-tip .debug-value {
  color: #67c23a;
}
</style>

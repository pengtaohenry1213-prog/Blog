<template>
  <div class="chart-wrapper">
    <!-- 图表容器 -->
    <div
      ref="chartRef"
      class="base-echart"
    />

    <!-- 加载中遮罩（内置，通过 props 控制显隐） -->
    <div 
      v-if="loading" 
      class="loading-container"
    >
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      <span>{{ loadingText }}</span>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { Loading } from '@element-plus/icons-vue'

const props = defineProps({
  options: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  // 新增：加载文案（可选，支持自定义）
  loadingText: {
    type: String,
    default: '加载中...'
  },

  theme: {
    type: [String, Object],
    default: null
  },
  autoResize: {
    type: Boolean,
    default: true
  }
})

const chartRef = ref(null)
let chartInstance = null
let resizeObserver = null

function initChart() {
  if (!chartRef.value) return

  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }

  chartInstance = echarts.init(chartRef.value, props.theme || undefined)
  if (props.options) {
    chartInstance.setOption(props.options, true)
  }


}

function resizeChart() {
  if (chartInstance) {
    chartInstance.resize()
  }
}

onMounted(async () => {
  await nextTick()
  initChart()

  if (props.autoResize && chartRef.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeChart()
    })
    resizeObserver.observe(chartRef.value)
  }

  window.addEventListener('resize', resizeChart)
})

watch(
  () => props.options,
  (newOptions) => {
    if (!chartInstance) {
      initChart()
      return
    }
    if (newOptions) {
      chartInstance.setOption(newOptions, true)
    }
  },
  { deep: true }
)

// 组件卸载前执行(清理资源, 避免内存泄漏)
onBeforeUnmount(() => {
  // 移除窗口大小调整事件监听
  window.removeEventListener('resize', resizeChart)
  
  // 清空变量, 避免内存占用

  // 移除图表实例的观察者
  if (resizeObserver && chartRef.value) {
    resizeObserver.unobserve(chartRef.value)
    resizeObserver.disconnect()
    resizeObserver = null
  }

  chartRef.value = null

  // 销毁图表实例
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped>
.chart-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.base-echart {
  width: 100%;
  height: 100%;
}

.loading-container {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 8px;
  background-color: rgba(255, 255, 255, 0.75);
  color: #909399;
  font-size: 14px;
  z-index: 1;
}

.loading-container .is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>



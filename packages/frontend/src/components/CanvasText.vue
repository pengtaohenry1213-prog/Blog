<template>
  <div ref="rootEl">
    <h3 v-if="title">
      {{ props.title }}
    </h3>
    <div class="canvas-wrapper">
      <canvas
        v-if="props.options?.source"
        ref="canvas_text"
        :width="props.options.source.width"
        :height="props.options.source.height"
        :aria-label="props.options.ariaLabel"
      />
      
      <!-- 加载中遮罩（内置，通过 props 控制显隐） -->
      <div 
        v-if="isLoading" 
        class="loading-container"
      >
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>加载中...</span>
      </div>
    </div>

    <!-- 视频容器：支持响应式尺寸，添加加载状态提示 -->
    <!-- <div class="video-container">
      <video
        ref="videoRef"
        :src="videoUrl"
        class="video-player"
        controls
        preload="none"
        loop
        muted
        playsinline
        loading="lazy"
      />
      <div 
        v-if="isLoading" 
        class="loading-mask"
      >
        视频加载中...
      </div>
    </div> -->
  </div>
</template>

<script setup>
import { ref, defineProps, onMounted, nextTick, watch, onBeforeUnmount } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import { useCanvasText } from '@/composables/useCanvasText.js'

const props = defineProps({
  title: {
    type: String,
    default: '',
    required: false,
  },
  options: {
    type: [Object , null],
    default: null,
    required: true
  }
})

const timer1 = ref(null);
const rootEl = ref(null);
const canvas_text = ref(null);
const canvasHook = ref(null);
const isLoading = ref(true);

onMounted(async ()=>{
  await nextTick();
});

async function init() {
  const { options } = props;
  if (!options) return;

  const { type } = options;

  // 等待 页面 成功加载 & 渲染, (主要是: canvas 节点的 成功加载 & 渲染)
  await nextTick();
  
  // 获取 canvas 元素
  const canvasElement = canvas_text.value;
  if (!canvasElement) {
    console.warn('Canvas 节点未找到!');
    return;
  }

  // 合并options + canvas 节点
  const canvasOptions = {
    ...options,
    canvas: canvasElement
  };

  if (type === 'text') {
    try {
      isLoading.value = true;
      canvasHook.value = useCanvasText(canvasOptions);
      // syncLoadingState();
      await canvasHook.value.init();
    } catch(err){
      console.error(err?.message || String(err));
    }
    finally {
      isLoading.value = false;
    }
  } else if (type === 'image') {
    try {
      isLoading.value = true;
      
      // 2. 延迟初始化 canvas2（图片绘制），避免阻塞首屏
      // 非关键内容利用空闲时间初始化
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          canvasHook.value = useCanvasText(canvasOptions);
          // syncLoadingState();
          canvasHook.value.init();
        }, { timeout: 1000 });
      } else {
        timer1.value = setTimeout(() => {
          canvasHook.value = useCanvasText(canvasOptions);
          // syncLoadingState();
          canvasHook.value.init();
        }, 500);
      }
    } catch(err) {
      console.error(err?.message || String(err));
    } finally {
      isLoading.value = false;
    }
  } else if (type === 'video') {
    try {
      isLoading.value = true;
      canvasHook.value = useCanvasText(canvasOptions);
      // syncLoadingState();
      canvasHook.value.init();
    } catch(err) {
      console.error(err?.message || String(err));
    } finally {
      isLoading.value = false;
    }
  }
}

watch(
  () => props.options,
  (newOptions) => {
    if (!newOptions) return;
    init();
  }
);

onBeforeUnmount(()=>{
  if(timer1?.value) {
    clearTimeout(timer1.value);
    timer1.value = null;
  }
  
  // 清理 canvas hook
  if (canvasHook.value?.destroy) {
    canvasHook.value.destroy();
  }
  canvasHook.value = null;
})

// 暴漏rootEl(Element)给调用组件方
defineExpose({
  rootEl,
});
</script>

<style scoped>
.canvas-wrapper {
  position: relative;
  display: inline-block;
}

/* 为视频容器设置占位尺寸 */
.video-container {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 56.25%; /* 16:9 比例占位 */
}

.video-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  object-fit: cover;
}

.loading-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
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
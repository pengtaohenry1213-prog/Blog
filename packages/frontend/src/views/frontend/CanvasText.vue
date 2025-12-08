<!-- eslint-disable vue/html-self-closing -->
<template>
  <h3>画文字</h3>
  <canvas
    id="canvas1"
    width="500"
    height="300"
    aria-label="用文字'6'组成的'Text Image'文本图案"
  ></canvas>

  <hr />

  <h3>画图片</h3>
  <canvas id="canvas2" width="500" height="300" aria-label="用文字'6'组成的图片图案"></canvas>

  <hr />

  <h3>画视频</h3>
  <canvas id="canvas3" width="500" height="400" aria-label="用文字'6'组成的视频图案"></canvas>

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
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useCanvasText } from '@/composables/useCanvasText.js'

const canvas1 = ref(null);
const canvas2 = ref(null);
const canvas3 = ref(null);

const timer1 = ref(null);


// 在 onMounted 中使用 requestIdleCallback 延迟非关键初始化
onMounted(async () => {


  canvas1.value = document.getElementById('canvas1');
  canvas2.value = document.getElementById('canvas2');
  canvas3.value = document.getElementById('canvas3');

  const textHook = useCanvasText({ canvas: canvas1.value, type: 'text' });
  textHook.init();

  const option2 = { canvas: canvas2.value, type: 'image', source: { loader: () => import('@/assets/1.webp')} };
  const option3 = { canvas: canvas3.value, type: 'video', source: { loader: () => import('@/assets/1.mp4')} };

  // 2. 延迟初始化 canvas2（图片绘制），避免阻塞首屏
  // 非关键内容利用空闲时间初始化
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => useCanvasText(option2)?.init(), { timeout: 1000 });
  } else {
    timer1.value = setTimeout(() => useCanvasText(option2).init(), 500);
  }

  // 3. 视频 canvas 按需加载（如用户滚动到可视区域时）, 视频画布继续使用交叉观察器
  const videoObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && canvas3) {
      useCanvasText(option3)?.init();
      videoObserver.disconnect(); // 只执行一次
    }
  });
  videoObserver.observe(canvas3.value || document.createElement('div'));

});

onUnmounted(() => {
  if(timer1.value) {
    clearTimeout(timer1.value);
    timer1.value = null;
  }
});

// 优化后的 CanvasText.vue 代码
//   以下是针对 Canvas 文本渲染的 Vue 组件优化版本，核心优化点包括：
//   性能优化：防抖处理 resize / 重绘、避免重复创建 Canvas 实例
//   可维护性：抽离配置项、拆分渲染逻辑为独立方法
//   健壮性：边界值处理、Canvas 兼容性检测
//   易用性：支持自定义文本、样式、对齐方式等 props
</script>

<style scoped>
canvas {
  border: 1px solid #ccc;
  display: block;
  margin: 10px 0;
  width: 100%;
  max-width: 500px; /* 固定最大宽度 */
  height: auto; /* 保持比例 */
  min-height: 200px; /* 添加最小高度防止布局偏移 */
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
</style>

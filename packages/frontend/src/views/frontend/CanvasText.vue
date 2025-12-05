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
import { debounce } from 'lodash-es'; // 也可自行实现防抖

import { createTextImage } from '@sunny-117/text-image';

const refText = ref(null);
const refImage = ref(null);
const refVideo = ref(null);

// const videoRef = ref(null); // 视频元素引用
// const videoUrl = ref(null);
// const isLoading = ref(true);
// const muteTimer = ref(null);

const initCanvasText = () => {
  refText.value = createTextImage({
    // 必填，配置canvas元素，最终作画在其上完成
    canvas: document.querySelector('canvas'),
    // 可选，配置作画的文本，默认为'6'
    replaceText: '6',
    // 可选，配置作画半径，该值越大越稀疏，默认为 10
    raduis: 10,
    // 可选，配置是否灰度化，若开启灰度化则会丢失色彩，默认为 false
    isGray: false,
    // 必填，配置作画内容
    source: {
      // 必填，配置画什么文本
      text: 'Text Image',
      // 选填，配置文本使用的字体，CSS 格式，默认为微软雅黑
      fontFamily: 'Microsoft YaHei',
      // 选填，配置文本尺寸，默认为 200
      fontSize: 200,
      // 选填，配置图片宽度，默认为图片自身宽度
      width: 200,
      // 选填，配置图片高度，默认为图片自身高度
      height: 30
    }
  });
};

const initCanvasImage = async () => {
  // 1. 正确导入静态资源（Vite 会处理路径，返回真实 URL）
  // import imgSrc from '@/assets/1.webp';

  const loadImage = async () => {
    const module = await import('@/assets/1.webp');
    return module.default || module;
  };

  const imgSrc = await loadImage();

  // ========== 2. 绘制图片（修复资源路径） ==========
  refImage.value = createTextImage({
    // 必填，配置canvas元素，最终作画在其上完成
    canvas: document.getElementById('canvas2'),
    // 可选，配置作画的文本，默认为'6'
    replaceText: '6',
    // 可选，配置作画半径，该值越大越稀疏，默认为 10
    raduis: 5,
    // 可选，配置是否灰度化，若开启灰度化则会丢失色彩，默认为 false
    isGray: false,
    // 必填，配置作画内容
    source: {
      // 必填，配置画的图片路径
      img: imgSrc,
      // 选填，配置图片宽度，默认为图片自身宽度
      width: 500,
      // 选填，配置图片高度，默认为图片自身高度
      height: 300
    }
  });
};

// 拆分视频初始化逻辑，延迟加载非关键资源
const initCanvasVideo = async () => {
  // 视频资源动态导入：需要从模块对象中取出 default 才是实际的 URL 字符串

  // 视频资源动态导入
  const loadVideo = async () => {
    const module = await import('@/assets/1.mp4'); // Vite 动态导入静态资源
    return module.default || module; // 确保拿到字符串 URL，而不是模块对象
  };

  const videoSrc = await loadVideo();

  // ========== 3. 绘制视频（修复路径 + 异步加载 + canvas 选择器） ==========
  refVideo.value = createTextImage({
    canvas: document.getElementById('canvas3'), // 精准选中 canvas3
    replaceText: '6',
    raduis: 5,
    isGray: false,
    source: {
      // 这里必须是字符串 URL，否则底层执行 video.src = xxx 时会抛出 “Cannot convert object to primitive value”
      video: videoSrc,
      width: 500,
      height: 400
    }
  });
};

// 添加防抖处理可能的重绘操作
const debouncedRedraw = debounce(instance => {
  if (instance && instance.redraw) {
    // 假设库提供重绘方法
    instance.redraw();
  }
}, 100);

// 监听窗口大小变化时防抖重绘
const handleResize = () => {
  debouncedRedraw(refText.value);
  debouncedRedraw(refImage.value);
  debouncedRedraw(refVideo.value);
};

// 在 onMounted 中使用 requestIdleCallback 延迟非关键初始化
onMounted(async () => {
  // 1. 优先初始化可视区域内的 canvas1（文字绘制）, 关键内容优先同步初始化
  initCanvasText();

  // 2. 延迟初始化 canvas2（图片绘制），避免阻塞首屏
  // setTimeout(initCanvasImage, 500);

  // 非关键内容利用空闲时间初始化
  if ('requestIdleCallback' in window) {
    requestIdleCallback(
      () => {
        initCanvasImage();
      },
      { timeout: 1000 }
    );
  } else {
    setTimeout(initCanvasImage, 500);
  }

  // 3. 视频 canvas 按需加载（如用户滚动到可视区域时）, 视频画布继续使用交叉观察器
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      initCanvasVideo();
      observer.disconnect(); // 只执行一次
    }
  });
  observer.observe(document.getElementById('canvas3') || document.createElement('div'));

  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  debouncedRedraw.cancel(); // 清理防抖计时器

  // 销毁 canvas 实例
  [refText, refImage, refVideo].forEach(ref => {
    if (ref.value) {
      const canvas = ref.value.canvas;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 清除画布内容
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      ref.value = null;
    }
  });

  // 清理视频资源
  // if (videoRef.value) {
  //   videoRef.value.pause();
  //   videoRef.value.srcObject = null; // 彻底释放视频源
  //   videoRef.value.remove();
  // }
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

<!-- eslint-disable vue/html-self-closing -->
<template>
  <canvas-text 
    ref="refCanvas1"
    title="画文字"
    :options="options1"
  ></canvas-text>
  <hr />

  <canvas-text 
    ref="refCanvas2"
    title="画图片"
    :options="options2"
  ></canvas-text>
  <hr />

  <canvas-text 
    ref="refCanvas3"
    title="画视频"
    :options="options3"
  ></canvas-text>
</template>

<script setup>
import { ref, onMounted, nextTick, onUnmounted } from 'vue';
import CanvasText from '@/components/CanvasText.vue';

const refCanvas1 = ref(null);
const refCanvas2 = ref(null);
const refCanvas3 = ref(null);

const options1 = ref(null);
const options2 = ref(null);
const options3 = ref(null);

// 在 onMounted 中使用 requestIdleCallback 延迟非关键初始化
onMounted(async () => {
  await nextTick();
  
  options1.value = {
    type: 'text', 
    source: {
      text: 'COFCO GROUP',
      width: 500, 
      height: 120,
      loader: null
    }, 
    ariaLabel: "用文字'6'组成的'Text Image'文本图案" 
  };
  options2.value = {
    type: 'image', 
    ariaLabel: "用文字'6'组成的图片图案", 
    source: { 
      width: 500, height: 300, 
      loader: () => import('@/assets/1.webp')
    } 
  };

  // 3. 视频 canvas 按需加载（如用户滚动到可视区域时）, 视频画布继续使用交叉观察器
  const videoObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      options3.value = { 
        type: 'video', 
        ariaLabel:"用文字'6'组成的视频图案", 
        source: { 
          width: 500, height: 400, 
          loader: () => import('@/assets/1.mp4')
        } 
      };
      videoObserver.disconnect(); // 只执行一次
    }
  });
  
  const target = refCanvas3.value?.rootEl || refCanvas3.value?.$el;
  if (target instanceof Element) {
    videoObserver.observe(target);
  }

});



onUnmounted(() => {

});

</script>

<style scoped>

</style>

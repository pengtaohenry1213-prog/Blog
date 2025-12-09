import {ref } from 'vue';
import { debounce } from 'lodash-es'; // 也可自行实现防抖
import { createTextImage } from '@sunny-117/text-image';

// 优化：monkey-patch HTMLCanvasElement.getContext 以确保所有 canvas 都使用 willReadFrequently
// 这是因为 @sunny-117/text-image 库内部创建了自己的 canvas，我们无法直接控制
// 库在 BaseSource 类中创建了内部 canvas 用于处理源数据，并频繁调用 getImageData
if (typeof HTMLCanvasElement !== 'undefined' && HTMLCanvasElement.prototype) {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
    if (contextType === '2d') {
      // 如果调用者没有提供选项，或者提供了选项但没有 willReadFrequently，则添加它
      const options = args[0] || {};
      // hasOwnProperty: ESLint 推荐写法（标准解法）
      if (Object.prototype.hasOwnProperty.call(options, 'willReadFrequently')===false) {
        args[0] = { ...options, willReadFrequently: true };
      }
    }
    return originalGetContext.apply(this, [contextType, ...args]);
  };
}

// 优化后的 CanvasText.vue 代码
//   以下是针对 Canvas 文本渲染的 Vue 组件优化版本，核心优化点包括：
//   性能优化：防抖处理 resize / 重绘、避免重复创建 Canvas 实例
//   可维护性：抽离配置项、拆分渲染逻辑为独立方法
//   健壮性：边界值处理、Canvas 兼容性检测
//   易用性：支持自定义文本、样式、对齐方式等 props

export function useCanvasText({
  canvas,                // HTMLCanvasElement (required)
  type = 'text',         // 'text' | 'image' | 'video'
  replaceText = '6',
  radius = 10,
  isGray = false,
  source = {},           // { text?, fontFamily?, fontSize?, width?, height?, img?, video?, loader? }
  listenResize = true,
  debounceMs = 120
}) {
  const instance = ref(null);
  const isReady = ref(false);
  // const isLoading = ref(false);
  const error = ref(null);
  const hasWindow = typeof window !== 'undefined';
  const hasDocument = typeof document !== 'undefined';

  // 添加防抖处理可能的重绘操作
  const redraw = debounce(()=>{
    if (instance.value?.redraw) {
      instance.value.redraw();
    }
  }, debounceMs);

  // 断言有canvas
  function assertCanvas() {
    if (!canvas) {
      throw new Error('useCanvasText: canvas is required.');
    }
  }

  // 加载断言
  async function loadAsset(loader) {
    if (typeof loader !== 'function') return null;
    const module = await loader();
    return module?.default ?? module;
  }

  // 创建基础配置
  function buildCommonConfig() {
    return {
      canvas,
      replaceText,
      raduis: radius,
      isGray
    };
  }

  // Render Text in Canvas
  const initText = async () => {
    const targetWidth = source.width ?? 200;
    const targetHeight = source.height ?? 30;
    
    // 在调用 createTextImage 之前设置 canvas 尺寸
    // 这样库在初始化时就会使用正确的尺寸，而不是自动计算
    if (canvas) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    
    const result = await createTextImage({
      ...buildCommonConfig(),
      source: {
        text: source.text ?? 'Text Image',
        fontFamily: source.fontFamily ?? 'Microsoft YaHei',
        fontSize: source.fontSize ?? 200,
        width: targetWidth,
        height: targetHeight,
      }
    });
    
    instance.value = result;

    // 库渲染完成后，检查并修正 canvas 尺寸
    // 如果库修改了尺寸，我们需要将内容缩放并重新绘制到目标尺寸
    if (canvas && (canvas.width !== targetWidth || canvas.height !== targetHeight)) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 保存当前渲染的内容
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 创建临时 canvas 保存原始内容
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        // 设置目标尺寸
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // 将内容缩放绘制到目标尺寸
        ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
      }
    }
  };

  // Render Image in Canvas
  const initImage = async () => {
    const img = source.img ?? (await loadAsset(source.loader));
    if(!img) throw new Error('useCanvasText: image src is missing.');

    const width = source.width ?? 500;
    const height = source.height ?? 300;
    
    // 在调用 createTextImage 之前设置 canvas 尺寸
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }

    instance.value = createTextImage({
      ...buildCommonConfig(),
      source: {
        img,
        width,
        height
      }
    })    
  };

  // 拆分视频初始化逻辑，延迟加载非关键资源
  const initVideo = async () => {
    const width = source.width ?? 500;
    const height = source.height ?? 400;
    
    // 在调用 createTextImage 之前设置 canvas 尺寸
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }

    const video = source.video ?? (await loadAsset(source.loader));
    if (!video) throw new Error('useCanvasText: video src is missing.');

    instance.value = await createTextImage({
      ...buildCommonConfig(),
      source: {
        video,
        width,
        height
      }
    });
  };

  async function init() {
    try {
      assertCanvas();
      if (!hasWindow || !hasDocument) {
        throw new Error('useCanvasText: requires browser environment.');
      }

      // isLoading.value = true;
      error.value = null;

      if (type === 'text') await initText();
      else if (type === 'image') await initImage();
      else if (type === 'video') await initVideo();
      else throw new Error(`useCanvasText: unsupported type "${type}".`);

      isReady.value = true;
    } catch(err) {
      error.value = err?.message || String(err);
      console.error(err);
    } 
    // finally {
    //   isLoading.value = false;
    // }
  }

  function destroy() {
    if(listenResize && hasWindow) {
      window.removeEventListener('resize', redraw);
    }
    redraw.cancel();

    if(instance.value?.canvas) {
      const ctx = instance.value.canvas.getContext('2d');
      if(ctx) {
        ctx.clearRect(0, 0, instance.value.canvas.width, instance.value.canvas.height);
      }
    }
    instance.value = null;
    isReady.value = false;
  }

  if(listenResize && hasWindow) {
    window.addEventListener('resize', redraw);
  }
  
  // 已在组件层面 通过 onBeforeUnmount 调用 destroy
  // 清除缓存
  // onUnmounted(destroy);
  
  return {
    instance,
    isReady,
    // isLoading,
    error,
    init,
    redraw,
    destroy
  }
}
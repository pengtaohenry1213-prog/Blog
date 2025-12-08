import {ref, onUnmounted } from 'vue';
import { debounce } from 'lodash-es'; // 也可自行实现防抖
import { createTextImage } from '@sunny-117/text-image';

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
  const isLoading = ref(false);
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
    instance.value = createTextImage({
      ...buildCommonConfig(),
      source: {
        text: source.text ?? 'Text Image',
        fontFamily: source.fontFamily ?? 'Microsoft YaHei',
        fontSize: source.fontSize ?? 200,
        width: source.width ?? 200,
        height: source.height ?? 30,
      }
    });
  };

  // Render Image in Canvas
  const initImage = async () => {
    const img = source.img ?? (await loadAsset(source.loader));
    if(!img) throw new Error('useCanvasText: image src is missing.');

    instance.value = createTextImage({
      ...buildCommonConfig(),
      source: {
        img,
        width: source.width ?? 500,
        height: source.height ?? 300
      }
    })    
  };

  // 拆分视频初始化逻辑，延迟加载非关键资源
  const initVideo = async () => {
    const video = source.video ?? (await loadAsset(source.loader));
    if (!video) throw new Error('useCanvasText: video src is missing.');
    instance.value = createTextImage({
      ...buildCommonConfig(),
      source: {
        video,
        width: source.width ?? 500,
        height: source.height ?? 400
      }
    });
  };

  async function init() {
    try {
      assertCanvas();
      if (!hasWindow || !hasDocument) {
        throw new Error('useCanvasText: requires browser environment.');
      }
      isLoading.value = true;
      error.value = null;

      if (type === 'text') await initText();
      else if (type === 'image') await initImage();
      else if (type === 'video') await initVideo();
      else throw new Error(`useCanvasText: unsupported type "${type}".`);

      isReady.value = true;
    } catch(err) {
      error.value = err?.message || String(err);
      console.error(err);
    } finally {
      isLoading.value = false;
    }
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
  
  // 清除缓存
  onUnmounted(destroy);
  
  return {
    instance,
    isReady,
    isLoading,
    error,
    init,
    redraw,
    destroy
  }
}
// 封装异步请求 Hook（useRequest.js

import { ref, onUnmounted } from 'vue';

/**
 * 异步请求Hook
 * @params (string) url - 请求地址
 * @returns (Object) - { data: 响应数据, loading: 加载状态, error: 错误信息, refresh: 刷新方法 }
 */
export function useRequest(url, {onSuccess, onError} = {}) {
  if(!url) {
    throw Error('URL is wrong!');
  }

  // 1. Define Responsive Status
  const data = ref(null);
  const loading = ref(false);
  const error = ref(null);
  let abortController = null; // Use for Cancel Request (Clean Side Effects)

  // 2. Encapsulation Request Logic
  const fetchData = async ()=> {
    loading.value = true;
    error.value = null;
    abortController = new AbortController(); // Init Cancel Controller

    try {
      const response = await fetch(url, {
        signal: abortController.signal // Relate Cancel Signal
      })
      if(!response.ok) { throw new Error('Request Failed!'); }
      data.value = await response.json();

      onSuccess && onSuccess({
        data, loading, error, refresh
      }); // invoke success callback function when it's available
    } catch(err) {
      if(err.name !== 'AbortError') {
        error.value = err.message;
      }
      onError && onError(err.message);
    } finally {
      loading.value = false;
    }
  }

  // 3. Init Request (Auto Execute when Component Invoke Hook)
  fetchData();

  // 4. Encapsulation Refresh Method (Manual Invoke for Component)
  const refresh = ()=> fetchData();

  // 5. Cancel Request in component unloading.
  onUnmounted(()=>{
    console.warn('useRequest.js -> onUnmounted -> abortController: ', abortController)
    if(abortController) { abortController.abort(); }
  });

  // 6. Expose Status & Methods for component
  return {
    data, loading, error, refresh
  }
}

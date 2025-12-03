<template>
  <div class="request-demo">
    <h2>请求示例</h2>
    <div v-if="refInfo.loading" class="loading">加载中...</div>
    <div v-else-if="refInfo.error" class="error">错误: {{ refInfo.error }}</div>
    <div v-else class="data">
      <div>id: {{ refInfo.random_id }}</div>
      响应数据: <pre>{{ refInfo.data }}</pre>
      <button @click="refInfo.refresh">刷新数据</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import { useRequest } from '@/composables/useRequest.js';
import { useAutoPolling } from '@/composables/useTabVisibility.js';

const refInfo = ref({
  data: null,
  loading: false,
  error: null,
  refresh: null,
  random_id: null
});

function refreshRequest(){
  useRequest('http://jsonplaceholder.typicode.com/todos/1', {
    onSuccess: (res)=>{
      console.log(res);
      const {data, loading, error, refresh } = res;
      refInfo.value.data = data;
      refInfo.value.loading = loading;
      refInfo.value.error = error;
      refInfo.value.refresh = refresh;
      refInfo.value.random_id = `id_${new Date().getTime()}`
    },
    onError: (res)=>{
      console.error('请求失败: res = ', res);
    }
  })
}

console.error('Test.vue -> useTabVisibility -> useAutoPolling');

const { start: startPolling, stop: stopPolling } = useAutoPolling(
  () => refreshRequest(), // polling task function
  {
    interval: 5 * 1000,
    immediate: true,
    autoStart: true,
    visibilityOptions: {
      componentName: 'Test.vue/useAutoPolling',
      // 测试页的轮询也走多页签竞争逻辑，但使用单独的 storageKey，避免干扰正式页面
      enableMultiTab: true,
      storageKey: '__admin_test_polling__'
    }
  } 
);
startPolling();

onUnmounted(()=>{
  stopPolling();
})
</script>

<style scoped>
.loading {color:#666;}
.error{color:red;}
.data{ margin-top: .125rem;}
pre {background-color: #f5f5f5; padding: .125rem;}
</style>
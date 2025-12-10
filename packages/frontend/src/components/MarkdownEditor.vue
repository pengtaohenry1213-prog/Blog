<template>
  <div ref="editorRef" />
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount, watch, defineProps, defineEmits, nextTick } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'

import { useTabVisibility } from '@/composables/useTabVisibility'

const editorRef = ref(null)
let vditor = ref(null)
// 额外标记编辑器是否已销毁，避免销毁后仍然去调用实例方法
const isEditorDestroyed = ref(false)
// 标记编辑器是否已完全初始化（after 回调执行后）- 改为响应式
const isEditorReady = ref(false)
// 标记是否正在同步值，避免循环更新
const isSyncing = ref(false)

// MessageChannel 和 Worker 相关
let markdownWorker = null
let messageChannel = null
let workerPort = null
let analysisTimer = null // 防抖定时器
let isWorkerInitialized = false // 标记 Worker 是否已初始化

console.log('MarkdownEditor.vue -> useTabVisibility');

// 页签可见性：当标签页不活跃时暂停内容分析（防抖 500ms）
const { isActive } = useTabVisibility({
  componentName: 'MarkdownEditor.vue/isActive',
  // Markdown 编辑器一般只在单个后台管理标签使用，但保持多标签支持配置
  enableMultiTab: true,
  onInactive: () => {
    // 标签页切到后台时，清除未触发的分析定时器，避免无意义的计算
    if (analysisTimer) {
      clearTimeout(analysisTimer)
      analysisTimer = null
    }
  }
})

// 图表相关：用于插入 ECharts 配置代码块
const defaultChartBlock = `\`\`\`echarts
{
  "title": {
    "text": "示例折线图"
  },
  "xAxis": {
    "type": "category",
    "data": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  },
  "yAxis": {
    "type": "value"
  },
  "series": [
    {
      "type": "line",
      "data": [150, 230, 224, 218, 135, 147, 260]
    }
  ]
}
\`\`\`
`

// 组件内部通过 defineProps 接收 modelValue（v-model 的默认绑定值）
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  readonly: {  // 新增：只读模式开关
    type: Boolean,
    default: false
  },
  enableAnalysis: {  // 是否启用内容分析（通过 Worker）
    type: Boolean,
    default: true
  }
})

// 组件对外emit
const emit = defineEmits([
  'update:modelValue', 
  'change',
  'analysis',  // 内容分析结果
  'validation'  // 内容验证结果
])

// 处理只读状态切换的纯函数（分离逻辑）
const handleReadonlyChange = (val) => {
  if (vditor.value) {
    const _options = { hide: val };
    vditor.value.updateToolbarConfig(_options)
  }
}

// 将 readonly 的 watch 移到组件顶层，而不是在 after 回调中注册
let stopReadonlyWatch = null

/**
 * 延迟初始化 MessageChannel 和 Worker（按需加载）
 */
function initMessageChannel() {
  // 如果已初始化或不需要分析，直接返回
  if (isWorkerInitialized || !props.enableAnalysis) {
    return
  }

  try {
    // 创建 MessageChannel
    messageChannel = new MessageChannel()
    workerPort = messageChannel.port1

    // 创建 Worker
    markdownWorker = new Worker(
      new URL('../workers/markdown-processor.worker.js', import.meta.url),
      { type: 'module' }
    )

    // 监听 Worker 消息
    markdownWorker.onmessage = (event) => { console.log('markdownWorker.onmessage -> event: ', event); }

    // 监听 Worker 错误
    markdownWorker.onerror = (error) => {
      console.error('[MarkdownEditor] Worker error:', error)
    }

    // 初始化 Worker，传递 MessageChannel 的 port2
    markdownWorker.postMessage(
      {
        type: 'init',
        port: messageChannel.port2
      },
      [messageChannel.port2]
    )

    // 监听 MessageChannel 端口消息
    workerPort.onmessage = (event) => {
      if (!event || !event.data) {
        console.warn('[MarkdownEditor] Received invalid message:', event)
        return
      }
      const { type, data } = event.data
      if (!type) {
        console.warn('[MarkdownEditor] Message missing type:', event.data)
        return
      }
      handleWorkerMessage(type, data)
    }

    workerPort.onmessageerror = (error) => {
      console.error('[MarkdownEditor] Port message error:', error)
    }

    isWorkerInitialized = true
    console.log('[MarkdownEditor] MessageChannel and Worker initialized')
  } catch (error) {
    console.error('[MarkdownEditor] Failed to initialize Worker:', error)
  }
}

/**
 * 处理 Worker 返回的消息
 */
function handleWorkerMessage(type, data) {
  switch (type) {
    case 'ready':
      console.log('[MarkdownEditor] Worker ready:', data?.message || 'Worker initialized')
      break

    case 'analysis':
      // 发送分析结果给父组件
      emit('analysis', data)
      break

    case 'validation':
      // 发送验证结果给父组件
      emit('validation', data)
      break

    case 'keywords':
      // 关键词提取结果
      emit('analysis', { keywords: data })
      break

    case 'error':
      console.error('[MarkdownEditor] Worker error:', data)
      break

    default:
      console.warn('[MarkdownEditor] Unknown message type:', type)
  }
}

/**
 * 发送内容到 Worker 进行分析（带防抖）
 */
function analyzeContent(content) {
  console.warn('analyzeContent content = ', content.length);

  // 若当前页签不可见，则不执行内容分析，等重新变为可见后再由输入/初始化触发
  if (!isActive.value) {
    return
  }

  // 延迟初始化 Worker（按需加载）
  if (!isWorkerInitialized) {
    initMessageChannel()
  }

  if (!props.enableAnalysis || !workerPort || !markdownWorker) {
    return
  }

  // 清除之前的定时器
  if (analysisTimer) {
    clearTimeout(analysisTimer)
  }

  // 防抖：500ms 后发送分析请求
  analysisTimer = setTimeout(() => {
    if (content && content.trim().length > 0) {
      // 通过 MessageChannel 发送消息 port1 -> port2(workerPort)
      workerPort.postMessage({
        type: 'analyze',
        data: { content }
      })
    }
  }, 500)
}

/**
 * 验证内容（供外部调用）
 * @param {string} content - 要验证的内容
 */
function validateContent(content) {
  // 延迟初始化 Worker（按需加载）
  if (!isWorkerInitialized) {
    initMessageChannel()
  }

  if (!props.enableAnalysis || !workerPort || !markdownWorker) {
    return
  }

  workerPort.postMessage({
    type: 'validate',
    data: { content }
  })
}

/**
 * 提取关键词（供外部调用）
 * @param {string} content - 要分析的内容
 * @param {number} topN - 返回前 N 个关键词，默认 10
 */
function extractKeywords(content, topN = 10) {
  // 延迟初始化 Worker（按需加载）
  if (!isWorkerInitialized) {
    initMessageChannel()
  }

  if (!props.enableAnalysis || !workerPort || !markdownWorker) {
    return
  }

  workerPort.postMessage({
    type: 'extractKeywords',
    data: { content, topN }
  })
}

// 导出方法供外部使用（通过 ref）
defineExpose({
  validateContent,
  extractKeywords,
  analyzeContent
})

/**
 * 清理 Worker 和 MessageChannel
 */
function cleanupWorker() {
  if (analysisTimer) {
    clearTimeout(analysisTimer)
    analysisTimer = null
  }

  if (workerPort) {
    workerPort.close()
    workerPort = null
  }

  if (markdownWorker) {
    markdownWorker.terminate()
    markdownWorker = null
  }

  messageChannel = null
  isWorkerInitialized = false
}

onMounted(async () => {

  // 使用 nextTick 确保 DOM 就绪
  await nextTick()

  // 不再在挂载时初始化 Worker，改为按需加载
  // initMessageChannel() // 移除这行

  // 注册只读状态监听（在组件顶层注册，确保可以正确清理）
  stopReadonlyWatch = watch(
    () => props.readonly,
    (val) => {
      // 只有在编辑器就绪后才处理
      if (isEditorReady.value) {
        handleReadonlyChange(val)
      }
    },
    { immediate: false } // 不在初始化时执行，等 after 回调中手动处理
  )

  // new Vditor(id, {options...})
  vditor.value = new Vditor(editorRef.value, {
    mode: 'wysiwyg', // 所见即所得模式
    width: '100%',
    height: 500,
    toolbarConfig: {
      pin: true
    },
    toolbar: [
      'headings',
      'bold',
      'italic',
      'strike',
      'link',
      '|',
      'list',
      'ordered-list',
      'check',
      '|',
      'quote',
      'code',
      'inline-code',
      'table',
      'upload',
      '|',
      'undo',
      'redo',
      'fullscreen',
      '|',
      {
        name: 'insert-echarts',
        tip: '插入图表（ECharts）',
        icon: '<svg viewBox="0 0 1024 1024" width="16" height="16"><path d="M192 832h640v64H192zM256 576h96v192h-96zM464 416h96v352h-96zM672 256h96v512h-96z" fill="currentColor"/></svg>',
        click: () => {
          if (!vditor.value || props.readonly) return
          try {
            vditor.value.insertValue(`\n${defaultChartBlock}\n`)
          } catch (e) {
            console.error('[MarkdownEditor] 插入图表代码块失败：', e)
          }
        }
      }
    ],
    // 明确设置为空字符串，完全禁用 CDN 加载（包括语言包）
    // cdn: '',
    customWysiwygToolbar: (toolbar) => {
      return toolbar;
    },
    cache: {
      enable: false,
    },
    value: props.modelValue || '',
    keydown: () => {
      // 只读模式下不触发更新
      if (props.readonly) {
        // 只读, 不更新输入内容
        vditor.value.setValue(props.modelValue);
      }
    },
    input: (value) => {
      if (!props.readonly && !isSyncing.value) {
        // 当编辑器内容变化时，通过 input 事件触发 emit('update:modelValue', value)，这会自动更新父组件的 form.content
        emit('update:modelValue', value)
        emit('change', value)
        
        // 发送内容到 Worker 进行分析（防抖处理，会自动初始化 Worker）
        analyzeContent(value)
      }
    },
    // 实例化完成的回调（关键：确保实例就绪后再处理）
    // 注: after 回调的目的是将父组件传入的值同步到编辑器，而不是更新父组件
    after: () => {
      // 标记编辑器已完全初始化
      isEditorReady.value = true
      
      // console.log('after 1: isEditorReady = ', isEditorReady.value);

      // 初始化时同步只读状态
      handleReadonlyChange(props.readonly)

      // 确保 props.modelValue 的内容同步到编辑器
      // 设置 isSyncing 标志，避免触发 input 事件导致循环更新
      if (vditor.value && props.modelValue) {
        try {
          isSyncing.value = true
          const currentValue = vditor.value.getValue()
          if (currentValue !== props.modelValue) {
            vditor.value.setValue(props.modelValue)
            console.log('[MarkdownEditor] 在 after 回调中同步了 modelValue 到编辑器')
          }
        } catch (e) {
          console.error('[MarkdownEditor] 在 after 回调中设置值失败，尝试直接设置：', e)
          try {
            vditor.value.setValue(props.modelValue)
          } catch (innerErr) {
            console.error('[MarkdownEditor] 直接设置值也失败：', innerErr)
          }
        } finally {
          // 使用 nextTick 确保 setValue 完成后再重置标志
          nextTick(() => {
            isSyncing.value = false
          })
        }
      }
    }
  })
})

// 同时监听了 props.modelValue 的变化，当父组件主动修改 form.content 时，会通过 vditor.value.setValue(val) 同步到编辑器
watch(
  () => props.modelValue,
  (val) => {
    console.warn('watch modelValue val = ', val.length, ', props.enableAnalysis = ', props.enableAnalysis);
    console.warn('isEditorReady = ', isEditorReady.value);
    console.warn('isEditorDestroyed = ', isEditorDestroyed.value);
    console.warn('isSyncing = ', isSyncing.value);

    // 编辑器尚未初始化、未就绪或已被销毁时，不再同步
    if (!vditor.value || !isEditorReady.value || isEditorDestroyed.value) {
      return
    }

    // 如果正在同步，跳过（避免循环更新）
    if (isSyncing.value) {
      return
    }

    try {
      // 只有在编辑器完全就绪后才调用 getValue()，避免内部依赖未初始化导致的错误
      const currentValue = vditor.value.getValue()
      
      // 只有当值真正不同时才更新
      if (currentValue !== val) {
        isSyncing.value = true
        vditor.value.setValue(val || '')
        // 使用 nextTick 确保 setValue 完成后再重置标志
        nextTick(() => {
          isSyncing.value = false
        })
      }
    } catch (e) {
      // 某些情况下 Vditor 内部依赖（如 VditorDOM2Md）可能尚未就绪或已被清理
      // 避免直接抛错导致 Uncaught (in promise)，这里做一次兜底同步
      console.error('[MarkdownEditor] 更新内容时发生错误，已跳过比较直接设置值：', e)
      try {
        isSyncing.value = true
        vditor.value.setValue(val || '')
        nextTick(() => {
          isSyncing.value = false
        })
      } catch (innerErr) {
        console.error('[MarkdownEditor] 设置内容失败：', innerErr)
        isSyncing.value = false
      }
    }
  }
)

// 监听编辑器就绪状态，执行初始化逻辑
watch(
  () => isEditorReady.value,
  (ready) => {
    if (ready && props.modelValue && props.enableAnalysis) {
      // 编辑器就绪后，分析初始内容
      nextTick(() => {
        analyzeContent(props.modelValue)
      })
    }
  }
)

onBeforeUnmount(() => {
  isEditorDestroyed.value = true
  isEditorReady.value = false
  
  // 停止 readonly 的 watch
  if (stopReadonlyWatch) {
    stopReadonlyWatch()
    stopReadonlyWatch = null
  }
  
  // 清理 Worker 和 MessageChannel
  cleanupWorker()
  
  // 销毁编辑器
  vditor.value?.destroy()
  vditor.value = null
})
</script>

<style scoped>
</style>
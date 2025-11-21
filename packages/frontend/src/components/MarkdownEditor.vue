<template>
  <div ref="editorRef" />
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount, watch, defineProps, defineEmits } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'

const editorRef = ref(null)
let vditor = ref(null)
// 额外标记编辑器是否已销毁，避免销毁后仍然去调用实例方法
let isEditorDestroyed = false
// 标记编辑器是否已完全初始化（after 回调执行后）
let isEditorReady = false

// 组件内部通过 defineProps 接收 modelValue（v-model 的默认绑定值）
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  readonly: {  // 新增：只读模式开关
    type: Boolean,
    default: false
  }
})

// 组件对外emit
const emit = defineEmits([
  'update:modelValue', 'change'
])

// 处理只读状态切换的纯函数（分离逻辑）
const handleReadonlyChange = (val) => {
  if (vditor.value) {
    // 设置编辑器为只读
    // vditor.value.disabled();

    const _options = { hide: val };
    vditor.value.updateToolbarConfig(_options)
  }
}

onMounted(() => {
  // new Vditor(id, {options...})
  vditor.value = new Vditor(editorRef.value, {
    mode: 'wysiwyg', // 所见即所得模式
    height: 500,
    readonly: props.readonly,  // 核心：设置只读模式
    toolbarConfig: {
      pin: true
    },
    // lang: 'zh-CN',
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
      if (!props.readonly) {
        console.log(38, ', ', value);
        // 当编辑器内容变化时，通过 input 事件触发 emit('update:modelValue', value)，这会自动更新父组件的 form.content
        emit('update:modelValue', value)
        emit('change', value)
      }
    },
    // 实例化完成的回调（关键：确保实例就绪后再处理）
    after: () => {
      // 标记编辑器已完全初始化
      isEditorReady = true
      // 注册只读状态监听（仅在实例化后执行）
      watch(
        () => props.readonly,
        handleReadonlyChange,
        { immediate: true } // 初始化时同步一次
      )
    }
  })
})

// 同时监听了 props.modelValue 的变化，当父组件主动修改 form.content 时，会通过 vditor.value.setValue(val) 同步到编辑器
watch(
  () => props.modelValue,
  (val) => {
    // 编辑器尚未初始化、未就绪或已被销毁时，不再同步
    if (!vditor.value || !isEditorReady || isEditorDestroyed) return

    try {
      // 只有在编辑器完全就绪后才调用 getValue()，避免内部依赖未初始化导致的错误
      const currentValue = vditor.value.getValue()
      if (currentValue !== val) {
        vditor.value.setValue(val || '')
      }
    } catch (e) {
      // 某些情况下 Vditor 内部依赖（如 VditorDOM2Md）可能尚未就绪或已被清理
      // 避免直接抛错导致 Uncaught (in promise)，这里做一次兜底同步
      console.error('[MarkdownEditor] 更新内容时发生错误，已跳过比较直接设置值：', e)
      try {
        vditor.value.setValue(val || '')
      } catch (innerErr) {
        console.error('[MarkdownEditor] 设置内容失败：', innerErr)
      }
    }
  }
)

onBeforeUnmount(()=>{
  isEditorDestroyed = true
  isEditorReady = false
  vditor.value?.destroy()
  vditor.value = null
})
</script>

<style scoped>
</style>
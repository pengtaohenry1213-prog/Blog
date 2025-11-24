# MessageChannel 实现文档

## 概述

已在博客项目中成功实现 **MessageChannel + Web Worker** 架构，用于优化 Markdown 编辑器的性能。

## 实现内容

### 1. Web Worker 文件
**位置**: `packages/frontend/src/workers/markdown-processor.worker.js`

**功能**:
- ✅ 内容分析（字数统计、段落数、标题数等）
- ✅ 内容验证（检查格式错误、警告）
- ✅ 关键词提取
- ✅ 使用 MessageChannel 进行双向通信

### 2. MarkdownEditor 组件增强
**位置**: `packages/frontend/src/components/MarkdownEditor.vue`

**新增功能**:
- ✅ 自动初始化 MessageChannel 和 Worker
- ✅ 内容变化时自动分析（防抖 500ms）
- ✅ 通过事件向父组件传递分析结果
- ✅ 支持手动调用验证和关键词提取

### 3. ArticleForm 组件集成
**位置**: `packages/frontend/src/views/admin/ArticleForm.vue`

**新增功能**:
- ✅ 实时显示内容分析统计
- ✅ 显示内容验证错误和警告
- ✅ 显示关键词列表

## 技术架构

```
┌─────────────────┐
│  MarkdownEditor │
│    (主线程)      │
└────────┬────────┘
         │ MessageChannel
         │ (双向通信)
         ▼
┌─────────────────┐
│  Web Worker     │
│ (markdown-      │
│  processor)     │
└─────────────────┘
```

### 通信流程

1. **初始化阶段**:
   ```
   主线程 → Worker: { type: 'init', port: port2 }
   Worker → 主线程: { type: 'ready', message: '...' }
   ```

2. **内容分析**:
   ```
   主线程 → Worker (via port): { type: 'analyze', data: { content } }
   Worker → 主线程 (via port): { type: 'analysis', data: { ... } }
   ```

3. **内容验证**:
   ```
   主线程 → Worker (via port): { type: 'validate', data: { content } }
   Worker → 主线程 (via port): { type: 'validation', data: { ... } }
   ```

## 使用方法

### 基础使用

```vue
<template>
  <MarkdownEditor 
    v-model="content" 
    @analysis="handleAnalysis"
    @validation="handleValidation"
  />
</template>

<script setup>
import { ref } from 'vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'

const content = ref('')

function handleAnalysis(data) {
  console.log('内容分析:', data)
  // data 包含: wordCount, charCount, paragraphCount, headingCount 等
}

function handleValidation(data) {
  console.log('内容验证:', data)
  // data 包含: valid, errors, warnings
}
</script>
```

### 禁用分析功能

```vue
<MarkdownEditor 
  v-model="content" 
  :enable-analysis="false"
/>
```

### 手动调用方法

```vue
<template>
  <MarkdownEditor 
    ref="editorRef"
    v-model="content" 
  />
  <el-button @click="validate">验证内容</el-button>
  <el-button @click="extract">提取关键词</el-button>
</template>

<script setup>
import { ref } from 'vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'

const editorRef = ref(null)
const content = ref('')

function validate() {
  editorRef.value?.validateContent(content.value)
}

function extract() {
  editorRef.value?.extractKeywords(content.value, 10)
}
</script>
```

## API 参考

### MarkdownEditor Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | String | `''` | v-model 绑定的内容 |
| `readonly` | Boolean | `false` | 是否只读模式 |
| `enableAnalysis` | Boolean | `true` | 是否启用内容分析 |

### MarkdownEditor Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `update:modelValue` | `(value: string)` | 内容更新事件 |
| `change` | `(value: string)` | 内容变化事件 |
| `analysis` | `(data: AnalysisData)` | 内容分析结果 |
| `validation` | `(data: ValidationData)` | 内容验证结果 |

### MarkdownEditor Methods (通过 ref 调用)

| 方法名 | 参数 | 说明 |
|--------|------|------|
| `validateContent` | `(content: string)` | 验证内容 |
| `extractKeywords` | `(content: string, topN?: number)` | 提取关键词 |
| `analyzeContent` | `(content: string)` | 分析内容 |

### AnalysisData 结构

```typescript
interface AnalysisData {
  wordCount: number          // 字数（中文+英文单词）
  charCount: number          // 字符数（含空格）
  charCountNoSpaces: number  // 字符数（不含空格）
  paragraphCount: number     // 段落数
  headingCount: number       // 标题数
  linkCount: number          // 链接数
  imageCount: number         // 图片数
  codeBlockCount: number     // 代码块数
  listCount: number          // 列表数
  readingTime: number        // 预计阅读时间（分钟）
  keywords?: Array<{         // 关键词（如果调用提取）
    word: string
    count: number
  }>
  timestamp: number          // 时间戳
}
```

### ValidationData 结构

```typescript
interface ValidationData {
  valid: boolean            // 是否有效
  errors: string[]          // 错误列表
  warnings: string[]        // 警告列表
  timestamp: number         // 时间戳
}
```

## 性能优化

### 防抖处理
内容分析使用 **500ms 防抖**，避免频繁计算：

```javascript
// 用户输入时，500ms 后才发送分析请求
analyzeContent(value) // 防抖处理
```

### Worker 隔离
所有耗时操作在 Worker 中执行，不会阻塞主线程：
- ✅ 主线程保持流畅
- ✅ UI 不会卡顿
- ✅ 用户体验更好

## 浏览器兼容性

- ✅ Chrome 4+
- ✅ Firefox 3.5+
- ✅ Safari 4+
- ✅ Edge 12+
- ❌ IE 10 及以下不支持

## 注意事项

1. **数据传输限制**: MessageChannel 只能传递可序列化的数据（不能传递函数、DOM 元素等）

2. **Worker 调试**: Worker 中的 `console.log` 会在浏览器控制台显示，但调试相对困难

3. **错误处理**: Worker 中的错误会自动捕获并传递给主线程

4. **资源清理**: 组件卸载时会自动清理 Worker 和 MessageChannel

## 未来扩展

可以考虑添加以下功能：

1. **Markdown 预览**: 在 Worker 中渲染 HTML 预览
2. **语法高亮**: 在 Worker 中进行代码语法高亮
3. **内容搜索**: 在 Worker 中进行全文搜索
4. **自动保存**: 使用 Worker 处理自动保存逻辑
5. **内容导出**: 在 Worker 中处理各种格式导出

## 测试

启动开发服务器后，在文章编辑页面输入内容，会自动显示：
- 字数统计
- 段落数、标题数等统计
- 内容验证结果
- 关键词提取（如果调用）

所有分析都在 Worker 中异步执行，不会阻塞主线程。


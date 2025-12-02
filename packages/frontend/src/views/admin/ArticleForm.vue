<template>
  <div class="article-form">
    <el-card>
      <template #header>
        <h3>{{ isEdit ? '编辑文章' : '新建文章' }}</h3>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入文章标题" />
        </el-form-item>
        <el-form-item label="摘要" prop="summary">
          <el-input
            v-model="form.summary"
            type="textarea"
            :rows="3"
            placeholder="请输入文章摘要"
          />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <MarkdownEditor 
            v-show="form.content.length > 0"
            v-model="form.content" 
            @analysis="handleAnalysis"
            @validation="handleValidation"
          />

          <!-- 内容分析结果展示 -->
          <div v-if="contentAnalysis" class="content-analysis">
            <!-- <el-divider content-position="left">内容分析</el-divider> -->
            <div class="analysis-stats">
              <el-tag size="small">字数: {{ contentAnalysis.wordCount }}</el-tag>
              <el-tag size="small">字符: {{ contentAnalysis.charCount }}</el-tag>
              <el-tag size="small">段落: {{ contentAnalysis.paragraphCount }}</el-tag>
              <el-tag size="small">标题: {{ contentAnalysis.headingCount }}</el-tag>
              <el-tag size="small">链接: {{ contentAnalysis.linkCount }}</el-tag>
              <el-tag size="small">图片: {{ contentAnalysis.imageCount }}</el-tag>
              <el-tag size="small">代码块: {{ contentAnalysis.codeBlockCount }}</el-tag>
              <el-tag size="small" type="info">预计阅读: {{ contentAnalysis.readingTime }} 分钟</el-tag>
            </div>
            <div v-if="contentAnalysis.keywords && contentAnalysis.keywords.length > 0" class="keywords">
              <strong>关键词：</strong>
              <el-tag 
                v-for="kw in contentAnalysis.keywords" 
                :key="kw.word" 
                size="small" 
                type="success"
                style="margin-left: 5px;"
              >
                {{ kw.word }} ({{ kw.count }})
              </el-tag>
            </div>
          </div>
          <!-- 内容验证结果展示 -->
          <div v-if="contentValidation" class="content-validation">
            <el-alert
              v-if="!contentValidation.valid"
              :title="`发现 ${contentValidation.errors.length} 个错误`"
              type="error"
              :closable="false"
              style="margin-top: 10px;"
            >
              <ul style="margin: 5px 0; padding-left: 20px;">
                <li v-for="(error, index) in contentValidation.errors" :key="index">{{ error }}</li>
              </ul>
            </el-alert>
            <el-alert
              v-if="contentValidation.warnings && contentValidation.warnings.length > 0"
              :title="`发现 ${contentValidation.warnings.length} 个警告`"
              type="warning"
              :closable="false"
              style="margin-top: 10px;"
            >
              <ul style="margin: 5px 0; padding-left: 20px;">
                <li v-for="(warning, index) in contentValidation.warnings" :key="index">{{ warning }}</li>
              </ul>
            </el-alert>
          </div>
        </el-form-item>
        <el-form-item label="分类" prop="category_id">
          <el-select v-model="form.category_id" placeholder="请选择分类" clearable>
            <el-option label="技术" value="1" />
            <el-option label="生活" value="2" />
            <el-option label="随笔" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="draft">草稿</el-radio>
            <el-radio label="published">发布</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { articleApi } from '@/api';
// import { ElMessage } from 'element-plus'; 这些 import 可以移除（插件会自动处理）
import MarkdownEditor from '@/components/MarkdownEditor.vue'

const route = useRoute();
const router = useRouter();
const formRef = ref(null);
const loading = ref(false);
const isEdit = computed(() => !!route.params.id);

const form = reactive({
  title: '',
  summary: '',
  content: '',
  category_id: null,
  status: 'draft'
});

// 内容分析结果
const contentAnalysis = ref(null);
const contentValidation = ref(null);

const rules = {
  title: [{ required: true, message: '请输入文章标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入文章内容', trigger: 'blur' }]
};

async function loadArticle() {
  if (!isEdit.value) return;

  try {
    const article = await articleApi.getDetail(route.params.id);
    Object.assign(form, {
      title: article.title,
      summary: article.summary || '',
      content: article.content,
      category_id: article.category_id,
      status: article.status
    });
    // console.log('form', form);
  } catch (error) {
    ElMessage.error('加载文章失败');
    router.push('/admin/articles');
  }
}

async function handleSubmit() {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        if (isEdit.value) {
          await articleApi.update(route.params.id, form);
          ElMessage.success('更新成功');
        } else {
          await articleApi.create(form);
          ElMessage.success('创建成功');
        }
        router.push('/admin/articles');
      } catch (error) {
        ElMessage.error(isEdit.value ? '更新失败' : '创建失败');
      } finally {
        loading.value = false;
      }
    }
  });
}

function handleCancel() {
  router.push('/admin/articles');
}

// 处理内容分析结果
function handleAnalysis(data) {
  console.warn('handleAnalysis', data);
  contentAnalysis.value = data;
}

// 处理内容验证结果
function handleValidation(data) {
  contentValidation.value = data;
}

onMounted(() => {
  loadArticle();
});
</script>

<style scoped>
.article-form {
  padding: 20px;
}

.content-analysis {
  margin-top: 5px;
  padding: 5px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.analysis-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keywords {
  margin-top: 10px;
  font-size: 14px;
}

.content-validation {
  margin-top: 10px;
}
</style>


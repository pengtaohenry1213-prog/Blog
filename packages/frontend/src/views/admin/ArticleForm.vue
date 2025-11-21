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
          <MarkdownEditor v-model="form.content" />
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

onMounted(() => {
  loadArticle();
});
</script>

<style scoped>
.article-form {
  padding: 20px;
}
</style>


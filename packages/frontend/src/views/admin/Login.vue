<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2>后台登录</h2>
      </template>
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleLogin" style="width: 100%">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
// import { ElMessage } from 'element-plus'; // 这些 import 可以移除（插件会自动处理）

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const loginFormRef = ref(null);
const loading = ref(false);

const loginForm = reactive({
  username: '',
  password: ''
});

const rules = {
  username: [{ required: true, message: '请输入用户名.', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码.', trigger: 'blur' }]
};

async function handleLogin() {
  if (!loginFormRef.value) return;

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        await authStore.login(loginForm.username, loginForm.password);
        ElMessage.success('登录成功');
        const redirect = route.query.redirect || '/admin/dashboard';
        router.push(redirect);
      } catch (error) {
        ElMessage.error(error.message || '登录失败');
      } finally {
        loading.value = false;
      }
    }
  });
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f0f2f5;
}

.login-card {
  width: 400px;
}
</style>


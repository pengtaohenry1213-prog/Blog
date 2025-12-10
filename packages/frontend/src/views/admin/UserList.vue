<template>
  <div class="user-list">
    <el-card>
      <template #header>
        <div class="header">
          <span>用户管理</span>
          <el-button type="primary" @click="handleCreate">新建用户</el-button>
        </div>
      </template>

      <el-table :data="userList" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="email" label="邮箱" width="200" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'">
              {{ row.role === 'admin' ? '管理员' : '用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)"> 编辑 </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row.id)"> 删除 </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        class="el-pagination"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </el-card>

    <!-- 编辑用户对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form ref="userFormRef" :model="userForm" :rules="userRules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="userForm.password" type="password" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role">
            <el-option label="用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="userForm.status">
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { userApi } from '@/api';
import { ElMessage, ElMessageBox } from 'element-plus'; // 这些 import 可以移除（插件会自动处理）

const userList = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const submitLoading = ref(false);
const userFormRef = ref(null);
const currentEditId = ref(null);

const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
});

const userForm = reactive({
  username: '',
  email: '',
  password: '',
  role: 'user',
  status: 'active'
});

const isEdit = computed(() => !!currentEditId.value);
const dialogTitle = computed(() => (isEdit.value ? '编辑用户' : '新建用户'));

const userRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱', trigger: 'blur' }],
  password: [
    { required: !isEdit.value, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
};

async function loadUsers() {
  loading.value = true;
  try {
    const result = await userApi.getList({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    });
    userList.value = result.list;
    pagination.value.total = result.total;
  } catch (error) {
    ElMessage.error('加载用户列表失败');
  } finally {
    loading.value = false;
  }
}

function handleCreate() {
  currentEditId.value = null;
  Object.assign(userForm, {
    username: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active'
  });
  dialogVisible.value = true;
}

function handleEdit(user) {
  currentEditId.value = user.id;
  Object.assign(userForm, {
    username: user.username,
    email: user.email || '',
    password: '',
    role: user.role,
    status: user.status
  });
  dialogVisible.value = true;
}

async function handleSubmit() {
  if (!userFormRef.value) return;

  await userFormRef.value.validate(async valid => {
    if (valid) {
      submitLoading.value = true;
      try {
        const data = { ...userForm };
        if (isEdit.value && !data.password) {
          delete data.password;
        }

        if (isEdit.value) {
          await userApi.update(currentEditId.value, data);
          ElMessage.success('更新成功');
        } else {
          await userApi.create(data);
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadUsers();
      } catch (error) {
        ElMessage.error(isEdit.value ? '更新失败' : '创建失败');
      } finally {
        submitLoading.value = false;
      }
    }
  });
}

async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定要删除这个用户吗？', '提示', {
      type: 'warning'
    });

    await userApi.delete(id);
    ElMessage.success('删除成功');
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
}

function handleSizeChange(val) {
  pagination.value.pageSize = val;
  pagination.value.page = 1;
  loadUsers();
}

function handlePageChange(val) {
  pagination.value.page = val;
  loadUsers();
}

loadUsers();
</script>

<style scoped>
.user-list {
  padding: 20px;
}

.el-pagination {
  margin-top: 20px;
  justify-content: flex-end;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

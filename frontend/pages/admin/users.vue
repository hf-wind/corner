<template>
  <div class="users-admin admin-page-shell">
    <header class="admin-page-head"><div><span>ACCESS CONTROL</span><h1>用户管理</h1><p>管理账号角色、启用状态与内容归属。</p></div></header>
    <div class="users-toolbar table-toolbar">
      <a-input
        v-model:value="search"
        class="user-search"
        placeholder="搜索用户名或邮箱"
        allow-clear
        @press-enter="resetAndLoad"
      ><template #prefix><Icon name="ph:magnifying-glass" /></template></a-input>
      <a-select v-model:value="role" class="filter-select" :options="roleOptions" />
      <a-select v-model:value="status" class="filter-select" :options="statusOptions" />
      <a-button type="primary" @click="resetAndLoad"><Icon name="ph:magnifying-glass-bold" /> 搜索</a-button>
      <a-button @click="resetFilters"><Icon name="ph:arrow-counter-clockwise-bold" /> 重置</a-button>
      <span class="toolbar-spacer" />
      <AdminRefreshButton :loading="loading" @click="loadUsers" />
    </div>

    <div class="admin-table-shell"><a-table
      :data-source="users"
      :columns="columns"
      :loading="loading"
      :pagination="false"
      :scroll="{ x: 980 }"
      row-key="id"
      size="small"
      :locale="{ emptyText: '暂无用户' }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'user'">
          <div class="user-cell">
            <img v-if="record.avatar" :src="mediaUrl(record.avatar)" alt="" class="avatar">
            <div v-else class="avatar avatar-placeholder"><Icon name="ph:user-bold" /></div>
            <div class="identity">
              <strong>{{ record.username }}</strong>
              <span>{{ record.email }}</span>
            </div>
            <a-tag v-if="record.id === currentUser?.id" color="blue">当前</a-tag>
          </div>
        </template>
        <template v-else-if="column.key === 'role'">
          <a-select
            :value="record.role"
            size="small"
            class="role-select"
            :disabled="record.id === currentUser?.id || savingIds.has(record.id)"
            @change="(value: 'admin' | 'user') => updateUser(record, { role: value })"
          >
            <a-select-option value="user">普通用户</a-select-option>
            <a-select-option value="admin">管理员</a-select-option>
          </a-select>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-switch
            :checked="record.isActive"
            :disabled="record.id === currentUser?.id || savingIds.has(record.id)"
            checked-children="启用"
            un-checked-children="禁用"
            @change="(checked: boolean) => updateUser(record, { isActive: checked })"
          />
        </template>
        <template v-else-if="column.key === 'content'">
          <span class="count-cell">文 {{ record._count?.posts || 0 }}</span>
          <span class="count-cell">瞬 {{ record._count?.moments || 0 }}</span>
          <span class="count-cell">评 {{ record._count?.comments || 0 }}</span>
        </template>
        <template v-else-if="column.key === 'createdAt'">{{ formatDate(record.createdAt) }}</template>
        <template v-else-if="column.key === 'actions'">
          <a-button
            size="small"
            danger
            :disabled="record.id === currentUser?.id || savingIds.has(record.id)"
            @click="confirmDelete(record)"
          >
            <Icon name="ph:trash-bold" /> 删除
          </a-button>
        </template>
      </template>
    </a-table>
    <AdminPagination v-model:current="page" :total="total" :page-size="pageSize" :show-size-changer="false" @change="loadUsers" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'

const api = useApi()
const toast = useToast()
const { user: currentUser } = useAuth()
const { mediaUrl } = useMediaUrl()
const users = ref<any[]>([])
const loading = ref(false)
const search = ref('')
const role = ref<'all' | 'admin' | 'user'>('all')
const status = ref<'all' | 'active' | 'disabled'>('all')
const page = ref(1)
const pageSize = 10
const total = ref(0)
const savingIds = ref(new Set<string>())

const roleOptions = [
  { label: '全部角色', value: 'all' },
  { label: '管理员', value: 'admin' },
  { label: '普通用户', value: 'user' },
]
const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '已启用', value: 'active' },
  { label: '已禁用', value: 'disabled' },
]
const columns = [
  { title: '用户', key: 'user', width: 300 },
  { title: '角色', key: 'role', width: 130 },
  { title: '状态', key: 'status', width: 110 },
  { title: '内容', key: 'content', width: 190 },
  { title: '注册时间', key: 'createdAt', width: 150 },
  { title: '操作', key: 'actions', width: 96, fixed: 'right' },
]

async function loadUsers() {
  loading.value = true
  try {
    const result = await api.get<any>('/users/admin', {
      page: page.value,
      limit: pageSize,
      search: search.value.trim() || undefined,
      role: role.value,
      status: status.value,
    })
    users.value = result.items || []
    total.value = result.total || 0
  } catch (error: any) {
    toast.error(error?.message || '用户列表加载失败')
  } finally {
    loading.value = false
  }
}

function resetAndLoad() {
  page.value = 1
  void loadUsers()
}
function resetFilters() { search.value = ''; role.value = 'all'; status.value = 'all'; resetAndLoad() }

async function updateUser(record: any, changes: { role?: 'admin' | 'user'; isActive?: boolean }) {
  savingIds.value = new Set(savingIds.value).add(record.id)
  try {
    const updated = await api.put<any>(`/users/admin/${record.id}`, changes)
    Object.assign(record, updated)
    toast.success('用户状态已更新')
  } catch (error: any) {
    toast.error(error?.message || '更新失败')
  } finally {
    const next = new Set(savingIds.value)
    next.delete(record.id)
    savingIds.value = next
  }
}

function confirmDelete(record: any) {
  Modal.confirm({
    title: `删除用户「${record.username}」？`,
    content: '账号、登录能力和个人互动数据将永久删除；其文章、瞬间、相册、旅行与故事会转交给当前管理员。此操作无法恢复。',
    okText: '确认删除',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      savingIds.value = new Set(savingIds.value).add(record.id)
      try {
        await api.delete(`/users/admin/${record.id}`)
        toast.success('用户已删除，创作内容已转交')
        if (users.value.length === 1 && page.value > 1) page.value -= 1
        await loadUsers()
      } catch (error: any) {
        toast.error(error?.message || '删除失败')
        throw error
      } finally {
        const next = new Set(savingIds.value)
        next.delete(record.id)
        savingIds.value = next
      }
    },
  })
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'
}

onMounted(loadUsers)
</script>

<style scoped>
.users-admin { display:flex; flex-direction:column; gap:14px; }
.users-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }.toolbar-spacer{flex:1}
.user-search { width:min(320px, 100%); }
.filter-select { width:130px; }
.user-cell { display:flex; align-items:center; gap:10px; min-width:250px; }
.avatar { width:36px; height:36px; border-radius:50%; object-fit:cover; flex:0 0 auto; }
.avatar-placeholder { display:flex; align-items:center; justify-content:center; background:var(--c-bg-2); color:var(--c-text-3); font-size:18px; }
.identity { display:flex; flex-direction:column; min-width:0; flex:1; }
.identity strong { color:var(--c-text); font-size:0.86rem; overflow:hidden; text-overflow:ellipsis; }
.identity span { color:var(--c-text-3); font-size:0.72rem; overflow:hidden; text-overflow:ellipsis; }
.role-select { width:108px; }
.count-cell { display:inline-block; margin-right:10px; color:var(--c-text-2); font-size:0.76rem; }
.users-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; color:var(--c-text-3); font-size:0.76rem; }

@media (max-width: 640px) {
  .user-search { width:100%; }
  .filter-select { flex:1; min-width:120px; }
  .users-footer { align-items:flex-start; flex-direction:column; }
}
</style>

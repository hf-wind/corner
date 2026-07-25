<template>
  <div>
    <div class="table-toolbar">
      <a-button type="primary" @click="openAddFriend"><PlusOutlined /> 添加友链</a-button>
    </div>

    <a-card :bordered="false" class="list-card" size="small">
      <a-table :dataSource="friends" :columns="columns" rowKey="_key" size="small" :pagination="false" :locale="{ emptyText: '暂无友链' }">
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'url'">
            <a :href="record.url" target="_blank" class="friend-link">{{ record.url }}</a>
          </template>
          <template v-if="column.key === 'rssUrl'">
            <a v-if="record.rssUrl" :href="record.rssUrl" target="_blank" class="friend-link" style="font-size:0.72rem;">RSS</a>
            <span v-else style="color:var(--c-text-2)">-</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a-button type="link" size="small" @click="editFriend(index)"><EditOutlined /> 编辑</a-button>
            <a-button type="link" size="small" danger @click="removeFriend(index, record.name)"><DeleteOutlined /> 删除</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal v-model:open="dialog.open" :title="dialog.isEdit?'编辑友链':'添加友链'" width="480px" @ok="saveFriend" @cancel="dialog.open = false">
      <a-form :model="dialog.form" labelAlign="left" size="middle">
        <a-form-item label="名称"><a-input v-model:value="dialog.form.name" /></a-form-item>
        <a-form-item label="URL"><a-input v-model:value="dialog.form.url" placeholder="https://" /></a-form-item>
        <a-form-item label="头像"><a-input v-model:value="dialog.form.avatar" placeholder="头像 URL" /></a-form-item>
        <a-form-item label="描述"><a-textarea v-model:value="dialog.form.description" :rows="2" /></a-form-item>
        <a-form-item label="RSS URL"><a-input v-model:value="dialog.form.rssUrl" placeholder="RSS/Atom feed URL (可选)" /></a-form-item>
        <a-form-item label="站长名"><a-input v-model:value="dialog.form.webmasterName" placeholder="站长名称 (可选)" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const friends = ref<any[]>([])
const dialog = reactive({ open: false, isEdit: false, editIndex: -1, form: { name: '', url: '', avatar: '', description: '', rssUrl: '', webmasterName: '' } })

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 90 },
  { title: 'URL', key: 'url', minWidth: 140 },
  { title: '描述', dataIndex: 'description', key: 'description', width: 150, ellipsis: true },
  { title: 'RSS', key: 'rssUrl', width: 80 },
  { title: '站长', dataIndex: 'webmasterName', key: 'webmasterName', width: 80 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' as const },
]

onMounted(loadFriends)

async function loadFriends() {
  try {
    const res = await api.get<any>('/settings')
    friends.value = Array.isArray(res?.friends) ? res.friends.map((f:any,i:number)=>({...f,_key:`friend_${i}`})) : []
  } catch { friends.value = [] }
}

async function persistFriends() {
  try { await api.put('/settings', { key: 'friends', value: friends.value }) } catch { toast.error('保存失败') }
}

function openAddFriend() { dialog.isEdit = false; dialog.editIndex = -1; dialog.form = { name: '', url: '', avatar: '', description: '', rssUrl: '', webmasterName: '' }; dialog.open = true }
function editFriend(i: number) { dialog.isEdit = true; dialog.editIndex = i; dialog.form = { ...friends.value[i] }; dialog.open = true }

async function saveFriend() {
  if (!dialog.form.name || !dialog.form.url) { toast.warning('名称和 URL 不能为空'); return }
  if (dialog.isEdit && dialog.editIndex >= 0) friends.value[dialog.editIndex] = { ...dialog.form, _key: `friend_${dialog.editIndex}` }
  else friends.value.push({ ...dialog.form, _key: `friend_${Date.now()}` })
  dialog.open = false; await persistFriends(); toast.success('已保存')
}

async function removeFriend(i: number, name: string) {
  Modal.confirm({
    title: '删除确认',
    content: `确认移除友链「${name}」？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => { friends.value.splice(i, 1); await persistFriends(); toast.success('已删除') },
  })
}
</script>

<style scoped>
.table-toolbar { margin-bottom:12px; }
.list-card { border-radius:8px; }
.friend-link { color:var(--c-primary); font-size:0.78rem; text-decoration:none; }
.friend-link:hover { text-decoration:underline; }
</style>

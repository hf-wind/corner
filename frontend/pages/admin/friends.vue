<template>
  <div class="friends-admin">
    <a-tabs v-model:activeKey="tab" size="small">
      <a-tab-pane key="links" tab="友链列表" />
      <a-tab-pane key="site" tab="本站信息" />
    </a-tabs>

    <div v-show="tab === 'links'">
      <div class="table-toolbar">
        <a-space>
          <a-button type="primary" @click="openAddFriend"><PlusOutlined /> 添加友链</a-button>
          <a-button :loading="loading" @click="loadFriends">刷新</a-button>
        </a-space>
      </div>

      <a-card :bordered="false" class="list-card" size="small">
        <a-table
          :loading="loading"
          :dataSource="friends"
          :columns="columns"
          rowKey="_key"
          size="small"
          :pagination="false"
          :locale="{ emptyText: '暂无友链' }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'avatar'">
              <a-avatar :src="record.avatar" :size="32">{{ record.name?.slice(0, 1) }}</a-avatar>
            </template>
            <template v-else-if="column.key === 'url'">
              <a :href="record.url" target="_blank" class="friend-link">{{ record.url }}</a>
            </template>
            <template v-else-if="column.key === 'rssUrl'">
              <a v-if="record.rssUrl" :href="record.rssUrl" target="_blank" class="friend-link">RSS</a>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button type="link" size="small" @click="editFriend(index)"><EditOutlined /> 编辑</a-button>
              <a-button type="link" size="small" danger @click="removeFriend(index, record.name)"><DeleteOutlined /> 删除</a-button>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <a-card v-show="tab === 'site'" :bordered="false" class="list-card site-card" size="small">
      <a-form layout="vertical" :model="siteForm">
        <a-form-item label="站点名称" required>
          <a-input v-model:value="siteForm.name" />
        </a-form-item>
        <a-form-item label="站点地址" required>
          <a-input v-model:value="siteForm.url" placeholder="https://" />
        </a-form-item>
        <a-form-item label="站点头像">
          <a-input v-model:value="siteForm.avatar" placeholder="头像 URL" />
        </a-form-item>
        <a-form-item label="站点描述">
          <a-textarea v-model:value="siteForm.description" :rows="3" />
        </a-form-item>
        <a-form-item label="RSS 地址">
          <a-input v-model:value="siteForm.rssUrl" placeholder="RSS/Atom feed URL" />
        </a-form-item>
        <a-form-item label="联系邮箱">
          <a-input v-model:value="siteForm.contactEmail" type="email" placeholder="用于本站资料展示" />
        </a-form-item>
        <a-button type="primary" :loading="siteSaving" @click="saveSiteInfo">保存本站信息</a-button>
      </a-form>
    </a-card>

    <a-modal v-model:open="dialog.open" :title="dialog.isEdit ? '编辑友链' : '添加友链'" width="520px" @ok="saveFriend" @cancel="dialog.open = false">
      <a-form :model="dialog.form" layout="vertical" size="middle">
        <a-form-item label="名称" required><a-input v-model:value="dialog.form.name" /></a-form-item>
        <a-form-item label="URL" required><a-input v-model:value="dialog.form.url" placeholder="https://" /></a-form-item>
        <a-form-item label="头像"><a-input v-model:value="dialog.form.avatar" placeholder="头像 URL" /></a-form-item>
        <a-form-item label="描述"><a-textarea v-model:value="dialog.form.description" :rows="2" /></a-form-item>
        <a-form-item label="RSS URL"><a-input v-model:value="dialog.form.rssUrl" placeholder="RSS/Atom feed URL（可选）" /></a-form-item>
        <a-form-item label="站长名"><a-input v-model:value="dialog.form.webmasterName" placeholder="站长名称（可选）" /></a-form-item>
        <a-form-item label="联系邮箱"><a-input v-model:value="dialog.form.contactEmail" placeholder="用于申请移除验证（可选）" /></a-form-item>
        <a-form-item label="对方友链页面"><a-input v-model:value="dialog.form.friendPageUrl" placeholder="https://example.com/friends" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

type FriendForm = {
  name: string;
  url: string;
  avatar: string;
  description: string;
  rssUrl: string;
  webmasterName: string;
  contactEmail: string;
  friendPageUrl: string;
}

const emptyFriend = (): FriendForm => ({
  name: '',
  url: '',
  avatar: '',
  description: '',
  rssUrl: '',
  webmasterName: '',
  contactEmail: '',
  friendPageUrl: '',
})

const api = useApi()
const toast = useToast()
const tab = ref('links')
const loading = ref(true)
const friends = ref<any[]>([])
const dialog = reactive({ open: false, isEdit: false, editIndex: -1, form: emptyFriend() })
const siteSaving = ref(false)
const siteForm = reactive({ name: '', url: '', avatar: '', description: '', rssUrl: '', contactEmail: '1833079849@qq.com' })

const columns = [
  { title: '', key: 'avatar', width: 54 },
  { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
  { title: 'URL', key: 'url', minWidth: 180 },
  { title: '描述', dataIndex: 'description', key: 'description', width: 180, ellipsis: true },
  { title: 'RSS', key: 'rssUrl', width: 80 },
  { title: '站长', dataIndex: 'webmasterName', key: 'webmasterName', width: 90 },
  { title: '操作', key: 'actions', width: 170, fixed: 'right' as const },
]

onMounted(async () => {
  await Promise.all([loadFriends(), loadSiteInfo()])
})

function normalizeFriend(friend: any, index: number) {
  return {
    _key: `friend_${index}_${friend.url || friend.siteUrl || Date.now()}`,
    name: friend.name || friend.siteName || '',
    url: friend.url || friend.siteUrl || '',
    avatar: friend.avatar || friend.siteAvatar || '',
    description: friend.description || friend.siteDescription || friend.desc || '',
    rssUrl: friend.rssUrl || friend.siteRssUrl || '',
    webmasterName: friend.webmasterName || '',
    contactEmail: friend.contactEmail || '',
    friendPageUrl: friend.friendPageUrl || '',
    approvedAt: friend.approvedAt || '',
  }
}

function serializeFriend(friend: any) {
  const { _key, ...rest } = friend
  return rest
}

async function loadFriends() {
  loading.value = true
  try {
    const res = await api.get<any>('/settings')
    friends.value = Array.isArray(res?.friends)
      ? res.friends.map((friend: any, index: number) => normalizeFriend(friend, index))
      : []
  } catch (e: any) {
    friends.value = []
    toast.error(e?.message || '加载友链失败')
  } finally {
    loading.value = false
  }
}

async function persistFriends() {
  await api.put('/settings', {
    key: 'friends',
    value: friends.value.map(serializeFriend),
  })
}

async function loadSiteInfo() {
  try {
    const res = await api.get<any>('/friend-link/my-site')
    Object.assign(siteForm, {
      name: res?.name || '',
      url: res?.url || '',
      avatar: res?.avatar || '',
      description: res?.description || '',
      rssUrl: res?.rssUrl || '',
      contactEmail: res?.contactEmail || '1833079849@qq.com',
    })
  } catch {
    Object.assign(siteForm, { name: '', url: '', avatar: '', description: '', rssUrl: '', contactEmail: '1833079849@qq.com' })
  }
}

async function saveSiteInfo() {
  if (!siteForm.name?.trim() || !siteForm.url?.trim()) {
    toast.warning('站点名称和地址不能为空')
    return
  }
  siteSaving.value = true
  try {
    const res = await api.put<any>('/friend-link/my-site', { ...siteForm })
    Object.assign(siteForm, res)
    toast.success('本站信息已保存')
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  } finally {
    siteSaving.value = false
  }
}

function openAddFriend() {
  dialog.isEdit = false
  dialog.editIndex = -1
  dialog.form = emptyFriend()
  dialog.open = true
}

function editFriend(index: number) {
  dialog.isEdit = true
  dialog.editIndex = index
  dialog.form = { ...friends.value[index] }
  dialog.open = true
}

async function saveFriend() {
  if (!dialog.form.name?.trim() || !dialog.form.url?.trim()) {
    toast.warning('名称和 URL 不能为空')
    return
  }
  const next = { ...dialog.form, _key: dialog.isEdit ? friends.value[dialog.editIndex]?._key : `friend_${Date.now()}` }
  if (dialog.isEdit && dialog.editIndex >= 0) friends.value[dialog.editIndex] = next
  else friends.value.push(next)

  try {
    await persistFriends()
    dialog.open = false
    toast.success('已保存')
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  }
}

async function removeFriend(index: number, name: string) {
  Modal.confirm({
    title: '删除确认',
    content: `确认移除友链「${name}」？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      const removed = friends.value.splice(index, 1)
      try {
        await persistFriends()
        toast.success('已删除')
      } catch (e: any) {
        friends.value.splice(index, 0, ...removed)
        toast.error(e?.message || '删除失败')
      }
    },
  })
}
</script>

<style scoped>
.friends-admin { width: 100%; }
.table-toolbar { margin-bottom: 12px; }
.list-card { border-radius: 8px; }
.site-card { max-width: 640px; margin-top: 8px; }
.friend-link { color: var(--c-primary); font-size: 0.78rem; text-decoration: none; }
.friend-link:hover { text-decoration: underline; }
.muted { color: var(--c-text-3); }
</style>

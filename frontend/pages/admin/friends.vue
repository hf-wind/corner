<template>
  <div class="friends-admin admin-page-shell">
    <header class="admin-page-head"><div><span>CONTENT RESOURCES</span><h1>友链管理</h1><p>维护前台友链、展示状态并处理互链资料。</p></div><a-button type="primary" @click="openAddFriend"><PlusOutlined /> 新增友链</a-button></header>

    <div class="table-toolbar">
        <a-input v-model:value="keywordInput" allow-clear placeholder="搜索名称、URL、站长或描述" @press-enter="applyFilters"><template #prefix><Icon name="ph:magnifying-glass" /></template></a-input>
        <a-select v-model:value="statusInput" style="width:130px"><a-select-option value="all">全部状态</a-select-option><a-select-option value="enabled">已启用</a-select-option><a-select-option value="disabled">已停用</a-select-option></a-select>
        <a-button type="primary" @click="applyFilters"><Icon name="ph:magnifying-glass-bold" /> 搜索</a-button>
        <a-button @click="resetFilters"><Icon name="ph:arrow-counter-clockwise-bold" /> 重置</a-button>
        <span class="toolbar-spacer" />
        <AdminRefreshButton :loading="loading" @click="loadFriends" />
      </div>

      <div class="admin-table-shell">
        <a-table
          :loading="loading"
          :dataSource="pagedFriends"
          :columns="columns"
          rowKey="_key"
          size="small"
          :pagination="false"
          :locale="{ emptyText: '暂无友链' }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'avatar'">
              <span class="friend-logo"><img v-if="record.avatar" :src="record.avatar" :alt="`${record.name} Logo`" loading="lazy" @error="onLogoError" /><Icon v-else name="ph:globe-simple-bold" /></span>
            </template>
            <template v-else-if="column.key === 'url'">
              <a :href="record.url" target="_blank" class="friend-link">{{ record.url }}</a>
            </template>
            <template v-else-if="column.key === 'rssUrl'">
              <a v-if="record.rssUrl" :href="record.rssUrl" target="_blank" class="friend-link">RSS</a>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'enabled'"><a-switch :checked="record.enabled !== false" checked-children="启用" un-checked-children="停用" @change="toggleStatus(index, record, $event)" /></template>
            <template v-else-if="column.key === 'actions'">
              <div class="admin-row-actions">
                <a-button type="link" size="small" @click="editFriend(record)"><EditOutlined /> 编辑</a-button>
                <a-button type="link" size="small" danger @click="removeFriend(record)"><DeleteOutlined /> 删除</a-button>
              </div>
            </template>
          </template>
        </a-table>
        <AdminPagination v-model:current="page" :page-size="pageSize" :total="filteredFriends.length" :show-size-changer="false" @change="page = $event" />
      </div>

    <a-modal v-model:open="dialog.open" :title="dialog.isEdit ? '编辑友链' : '添加友链'" width="520px" @ok="saveFriend" @cancel="dialog.open = false">
      <a-form :model="dialog.form" layout="vertical" size="middle">
        <a-form-item label="URL" required><div class="inspect-field"><a-input v-model:value="dialog.form.url" placeholder="https://" @input="markFriendField('url')" @blur="inspectFriendSite(false)" @press-enter.prevent="inspectFriendSite(true)" /><a-button :loading="dialog.inspecting" @click="inspectFriendSite(true)"><Icon v-if="!dialog.inspecting" name="ph:magic-wand-bold" /> 自动识别</a-button></div><small class="inspect-hint">输入站点地址后自动识别名称、Logo 与 RSS。</small><div v-if="dialog.message" class="inspect-message" :class="dialog.messageType"><Icon :name="dialog.messageType === 'success' ? 'ph:check-circle-bold' : 'ph:warning-circle-bold'" /> {{ dialog.message }}</div></a-form-item>
        <a-form-item label="站点名称" required><a-input v-model:value="dialog.form.name" @input="markFriendField('name')" /></a-form-item>
        <a-form-item label="站点 Logo"><a-input v-model:value="dialog.form.avatar" placeholder="Logo URL" @input="markFriendField('avatar')" /></a-form-item>
        <a-form-item label="描述"><a-textarea v-model:value="dialog.form.description" :rows="2" /></a-form-item>
        <a-form-item label="RSS URL"><a-input v-model:value="dialog.form.rssUrl" placeholder="RSS/Atom feed URL（可选）" @input="markFriendField('rssUrl')" /></a-form-item>
        <a-form-item label="站长名"><a-input v-model:value="dialog.form.webmasterName" placeholder="站长名称（可选）" /></a-form-item>
        <a-form-item label="联系邮箱"><a-input v-model:value="dialog.form.contactEmail" placeholder="用于申请移除验证（可选）" /></a-form-item>
        <a-form-item label="对方友链页面"><a-input v-model:value="dialog.form.friendPageUrl" placeholder="https://example.com/friends" /></a-form-item>
        <a-form-item label="展示状态"><a-switch v-model:checked="dialog.form.enabled" checked-children="启用" un-checked-children="停用" /></a-form-item>
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
  enabled: boolean;
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
  enabled: true,
})

const api = useApi()
const toast = useToast()
const loading = ref(true)
const friends = ref<any[]>([])
const keyword = ref('')
const keywordInput = ref('')
const statusFilter = ref<'all' | 'enabled' | 'disabled'>('all')
const statusInput = ref<'all' | 'enabled' | 'disabled'>('all')
const page = ref(1)
const pageSize = 10
const dialog = reactive({ open: false, isEdit: false, editIndex: -1, inspecting: false, message: '', messageType: 'success' as 'success' | 'error', form: emptyFriend(), touched: new Set<string>(), autofilled: {} as Record<string, string> })
const filteredFriends = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return friends.value.filter((friend) => {
    const matchesKeyword = !query || `${friend.name} ${friend.url} ${friend.webmasterName} ${friend.description}`.toLowerCase().includes(query)
    const matchesStatus = statusFilter.value === 'all' || (statusFilter.value === 'enabled' ? friend.enabled !== false : friend.enabled === false)
    return matchesKeyword && matchesStatus
  })
})
const pagedFriends = computed(() => filteredFriends.value.slice((page.value - 1) * pageSize, page.value * pageSize))

const columns = [
  { title: '', key: 'avatar', width: 54 },
  { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
  { title: 'URL', key: 'url', minWidth: 180 },
  { title: '描述', dataIndex: 'description', key: 'description', width: 180, ellipsis: true },
  { title: 'RSS', key: 'rssUrl', width: 80 },
  { title: '站长', dataIndex: 'webmasterName', key: 'webmasterName', width: 90 },
  { title: '状态', key: 'enabled', width: 110 },
  { title: '操作', key: 'actions', width: 170, fixed: 'right' as const },
]

onMounted(async () => {
  await loadFriends()
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
    enabled: friend.enabled !== false,
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

function openAddFriend() {
  dialog.isEdit = false
  dialog.editIndex = -1
  dialog.form = emptyFriend()
  dialog.touched = new Set()
  dialog.autofilled = {}
  dialog.message = ''
  dialog.open = true
}

function applyFilters() { keyword.value = keywordInput.value.trim(); statusFilter.value = statusInput.value; page.value = 1 }
function resetFilters() { keywordInput.value = ''; keyword.value = ''; statusInput.value = 'all'; statusFilter.value = 'all'; page.value = 1 }

function editFriend(record: any) {
  const index = friends.value.findIndex((item) => item._key === record._key)
  if (index < 0) return
  dialog.isEdit = true
  dialog.editIndex = index
  dialog.form = { ...friends.value[index] }
  dialog.touched = new Set(['name', 'url', 'avatar', 'rssUrl', 'description', 'friendPageUrl'])
  dialog.autofilled = {}
  dialog.message = ''
  dialog.open = true
}

function markFriendField(field: string) { if (field !== 'url') dialog.touched.add(field) }
function normalizeHttpUrl(value: string) { const raw = value.trim(); if (!raw) return ''; return /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}` }
function onLogoError(event: Event) { const image = event.target as HTMLImageElement; if (image.dataset.fallback) image.style.display = 'none'; else { image.dataset.fallback = '1'; image.src = '/logo_64.png' } }
async function inspectFriendSite(forceRequest: boolean) {
  const value = normalizeHttpUrl(dialog.form.url)
  if (!value) { if (forceRequest) toast.warning('请先填写站点 URL'); return }
  try { new URL(value) } catch { if (forceRequest) toast.warning('请输入有效的站点 URL'); return }
  if (dialog.inspecting) return
  dialog.form.url = value; dialog.inspecting = true; dialog.message = ''
  try {
    const result = await api.post<any>('/friend-link/inspect-site', { url: value })
    const incoming = { name: String(result?.name || '').trim(), avatar: String(result?.avatar || '').trim(), rssUrl: String(result?.rssUrl || '').trim(), description: String(result?.description || '').trim(), friendPageUrl: String(result?.friendPageUrl || '').trim() }
    let filled = 0
    for (const field of ['name', 'avatar', 'rssUrl', 'description', 'friendPageUrl'] as const) {
      const current = String(dialog.form[field] || '').trim()
      const previous = dialog.autofilled[field] || ''
      if (incoming[field] && (!current || current === previous) && !dialog.touched.has(field)) { dialog.form[field] = incoming[field]; dialog.autofilled[field] = incoming[field]; filled += 1 }
    }
    if (result?.url) dialog.form.url = result.url
    dialog.messageType = 'success'; dialog.message = filled ? `已自动填充 ${filled} 项信息，可继续手动修改。` : '站点可访问，未发现可补充的空字段。'
  } catch (error: any) { dialog.messageType = 'error'; dialog.message = error?.message || '自动识别失败，请手动填写。' }
  finally { dialog.inspecting = false }
}

async function saveFriend() {
  if (!dialog.form.name?.trim() || !dialog.form.url?.trim()) {
    toast.warning('名称和 URL 不能为空')
    return
  }
  const previous = friends.value.map((item) => ({ ...item }))
  const next = { ...dialog.form, _key: dialog.isEdit ? friends.value[dialog.editIndex]?._key : `friend_${Date.now()}` }
  if (dialog.isEdit && dialog.editIndex >= 0) friends.value[dialog.editIndex] = next
  else friends.value.push(next)

  try {
    await persistFriends()
    dialog.open = false
    toast.success('已保存')
  } catch (e: any) {
    friends.value = previous
    toast.error(e?.message || '保存失败')
  }
}

async function toggleStatus(_visibleIndex: number, record: any, enabled: boolean) {
  const original = record.enabled !== false
  record.enabled = enabled
  try { await persistFriends(); toast.success(enabled ? '友链已启用' : '友链已停用') }
  catch (error: any) { record.enabled = original; toast.error(error?.message || '状态更新失败') }
}

async function removeFriend(record: any) {
  const index = friends.value.findIndex((item) => item._key === record._key)
  if (index < 0) return
  Modal.confirm({
    title: '删除确认',
    content: `确认移除友链「${record.name}」？`,
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
.table-toolbar { margin-bottom: 12px; justify-content:flex-start; }.table-toolbar :deep(.ant-input-affix-wrapper){width:min(360px,100%)}.toolbar-spacer{flex:1}
.site-card { max-width: 640px; margin-top: 8px; }
.friend-link { color: var(--c-primary); font-size: 0.78rem; text-decoration: none; }
.friend-link:hover { text-decoration: underline; }
.muted { color: var(--c-text-3); }
.friend-logo { display:grid; width:32px; height:32px; overflow:hidden; border:1px solid var(--border); border-radius:9px; background:var(--c-bg-2); color:var(--c-primary); place-items:center; }
.friend-logo img { width:100%; height:100%; object-fit:cover; }
.inspect-field { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; }
.inspect-hint { display:block; margin-top:7px; color:var(--c-text-3); font-size:.6rem; line-height:1.5; }
.inspect-message { display:flex; align-items:center; gap:5px; margin-top:7px; font-size:.62rem; line-height:1.5; }
.inspect-message.success { color:#2b8b71; }
.inspect-message.error { color:#c65468; }
</style>

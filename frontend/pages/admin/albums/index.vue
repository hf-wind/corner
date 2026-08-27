<template>
  <div class="album-admin admin-page-shell">
    <header class="admin-page-head">
      <div><span>CONTENT MANAGEMENT</span><h1>相册管理</h1><p>编排照片并管理保存版本与公开版本。</p></div>
      <a-button type="primary" @click="router.push('/admin/albums/create')"><Icon name="ph:plus-bold" /> 新建相册</a-button>
    </header>

    <div class="album-toolbar table-toolbar">
      <a-input v-model:value="filter.search" allow-clear placeholder="搜索相册名称或说明" class="album-search" @press-enter="resetAndLoad"><template #prefix><Icon name="ph:magnifying-glass" /></template></a-input>
      <a-select v-model:value="filter.status" :options="statusOptions" style="width:132px" />
      <a-button type="primary" @click="resetAndLoad"><Icon name="ph:magnifying-glass-bold" /> 搜索</a-button>
      <a-button @click="resetFilters"><Icon name="ph:arrow-counter-clockwise-bold" /> 重置</a-button>
      <span class="toolbar-spacer" />
      <AdminRefreshButton :loading="loading" @click="load" />
    </div>

    <div class="table-shell">
      <a-table :loading="loading" :data-source="items" :columns="columns" row-key="id" :pagination="false" :scroll="{ x: 980 }" :locale="{ emptyText: '暂无相册' }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'album'">
            <div class="album-cell">
              <div class="album-thumb"><img v-if="record.coverMedia?.path" :src="mediaUrl(record.coverMedia.path)" alt=""><Icon v-else name="ph:images-square" /></div>
              <i v-if="record.needsPublish" class="change-dot" />
              <div class="album-copy"><div><strong>{{ record.title }}</strong><a-tag v-if="record.needsPublish" color="orange">{{ record.status === 'published' ? '已更新' : '有新内容' }}</a-tag></div><span>{{ record.description || '这一册还没有说明。' }}</span></div>
            </div>
          </template>
          <template v-else-if="column.key === 'status'"><a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag></template>
          <template v-else-if="column.key === 'date'">{{ formatDate(record.happenedAt || record.updatedAt) }}</template>
          <template v-else-if="column.key === 'actions'">
            <AdminRowActions
              :record="record"
              preview-only-published
              @edit="router.push(`/admin/albums/${record.id}`)"
              @preview="router.push(`/albums/${record.slug}`)"
              @publish="publish(record)"
              @settings="openSettings(record)"
              @delete="remove(record)"
            />
          </template>
        </template>
      </a-table>
    </div>
    <AdminPagination v-model:current="page" :total="total" :page-size="limit" :show-size-changer="false" @change="load" />
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })
const api = useApi()
const toast = useToast()
const router = useRouter()
const { mediaUrl } = useMediaUrl()
const loading = ref(true)
const items = ref<any[]>([])
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const limit = 10
const filter = reactive({ status: 'all', search: '' })
const statusOptions = [
  { label: '全部', value: 'all' }, { label: '已发布', value: 'published' },
  { label: '草稿', value: 'draft' }, { label: '私密', value: 'private' }, { label: '有新内容', value: 'pending' },
]
const columns = [
  { title: '相册', key: 'album', minWidth: 320 }, { title: '状态', key: 'status', width: 100 },
  { title: '照片', dataIndex: ['_count', 'items'], key: 'count', width: 80, align: 'center' as const },
  { title: '日期', key: 'date', width: 120 }, { title: '操作', key: 'actions', width: 290, fixed: 'right' as const },
]

function formatDate(value?: string) { return value ? value.slice(0, 10) : '未设时间' }
function statusText(status: string) { return status === 'published' ? '已发布' : status === 'private' ? '私密' : '草稿' }
function statusColor(status: string) { return status === 'published' ? 'green' : status === 'private' ? 'purple' : 'default' }
function resetAndLoad() { page.value = 1; void load() }
function resetFilters() { Object.assign(filter, { status: 'all', search: '' }); resetAndLoad() }
async function load() {
  loading.value = true
  try {
    const res = await api.get<any>('/albums/admin', {
      page: page.value, limit, search: filter.search,
      status: filter.status === 'pending' ? 'all' : filter.status,
      needsPublish: filter.status === 'pending' ? true : undefined,
    })
    items.value = res.items || []; total.value = res.total || 0; totalPages.value = res.totalPages || 1
  } catch { items.value = []; total.value = 0 }
  finally { loading.value = false }
}
function publish(album: any) {
  Modal.confirm({ title: '确认发布', content: `将「${album.title}」的当前保存版本发布到前台？`, okText: '发布', cancelText: '取消', onOk: async () => {
    try { await api.post(`/albums/${album.id}/publish`); toast.success('相册已发布'); await load() }
    catch (error: any) { toast.error(error?.message || '发布失败') }
  } })
}
function openSettings(album: any) {
  const restoring = album.status === 'private'
  Modal.confirm({ title: restoring ? '恢复公开这个相册？' : '将这个相册设为私密？', content: restoring ? '将发布当前已保存版本。' : '前台会立即隐藏，照片和保存内容不会删除。', okText: restoring ? '恢复公开' : '设为私密', cancelText: '取消', onOk: async () => {
    try { await api.post(`/albums/${album.id}/${restoring ? 'publish' : 'private'}`); toast.success(restoring ? '相册已恢复公开' : '相册已设为私密'); await load() }
    catch (error: any) { toast.error(error?.message || '设置失败') }
  } })
}
function remove(album: any) {
  Modal.confirm({ title: '删除相册', content: `确认删除「${album.title}」？媒体库中的原图不会被删除。`, okType: 'danger', okText: '删除', cancelText: '取消', onOk: async () => {
    try { await api.delete(`/albums/${album.id}`); toast.success('相册已删除'); await load() }
    catch (error: any) { toast.error(error?.message || '删除失败') }
  } })
}
onMounted(load)
useHead({ title: '相册管理' })
</script>

<style scoped>
.album-admin { width:100%; margin:0 auto; }.admin-heading { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:20px; }.admin-heading h1 { margin:0 0 3px; color:var(--c-text); font-size:1.5rem; }.admin-heading p { margin:0; color:var(--c-text-3); font-size:.76rem; }.album-toolbar { display:flex; align-items:center; gap:8px; margin-bottom:14px; }.album-search { width:min(360px,100%); }.table-shell { overflow:hidden; border:1px solid var(--border); border-radius:8px; background:var(--ld-bg-card); }.album-cell { display:flex; min-width:0; align-items:center; gap:10px; }.album-thumb { display:grid; width:64px; height:46px; flex:0 0 64px; overflow:hidden; border-radius:6px; background:var(--c-bg-2); color:var(--c-primary); place-items:center; }.album-thumb img { width:100%; height:100%; object-fit:cover; }.change-dot { width:8px; height:8px; flex:0 0 auto; border-radius:50%; background:#22c55e; box-shadow:0 0 0 3px color-mix(in srgb,#22c55e 18%,transparent); }.album-copy { display:flex; min-width:0; flex-direction:column; gap:4px; }.album-copy>div { display:flex; align-items:center; gap:7px; }.album-copy strong,.album-copy span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.album-copy strong { color:var(--c-text); font-size:.82rem; }.album-copy span { color:var(--c-text-3); font-size:.68rem; }.table-actions { display:flex; flex-wrap:nowrap; white-space:nowrap; }.pagination { display:flex; justify-content:center; margin-top:18px; }
@media(max-width:680px){.admin-heading,.album-toolbar{align-items:stretch;flex-direction:column}.album-search{width:100%}}
</style>

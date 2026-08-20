<template>
  <div class="library-admin admin-page-shell">
    <header class="admin-page-head">
      <div><span>CONTENT MANAGEMENT</span><h1>书影管理</h1><p>管理阅读与观影收藏、体会、摘录和个人排名。</p></div>
      <a-button type="primary" @click="router.push('/admin/library/create')"><Icon name="ph:plus-bold" /> 新增记录</a-button>
    </header>

    <div class="table-toolbar">
      <a-segmented v-model:value="filter.type" :options="typeOptions" @change="resetAndLoad" />
      <a-select v-model:value="filter.status" style="width:112px" @change="resetAndLoad">
        <a-select-option value="all">全部状态</a-select-option>
        <a-select-option value="published">已发布</a-select-option>
        <a-select-option value="draft">草稿</a-select-option>
        <a-select-option value="private">私密</a-select-option>
        <a-select-option value="pending">有新内容</a-select-option>
      </a-select>
      <a-input v-model:value="filter.search" allow-clear placeholder="搜索名称、作者、导演..." class="search-input" @pressEnter="resetAndLoad">
        <template #prefix><Icon name="ph:magnifying-glass" /></template>
      </a-input>
      <a-button @click="resetAndLoad">搜索</a-button>
    </div>

    <a-spin :spinning="loading">
      <div class="admin-table-shell">
        <a-table :data-source="items" :columns="columns" row-key="id" :pagination="false" :locale="{ emptyText: '还没有收藏记录' }" :scroll="{ x: 860 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'work'">
              <div class="work-cell">
                <div class="mini-cover">
                  <img v-if="record.coverImage" :src="mediaUrl(record.coverImage)" alt="">
                  <Icon v-else :name="record.type === 'book' ? 'ph:book-open-text' : 'ph:film-strip'" />
                </div>
                <i v-if="record.needsPublish" class="change-dot" />
                <div><div class="work-title"><strong>{{ record.title }}</strong><a-tag v-if="record.needsPublish" color="orange">{{ record.publishStatus === 'published' ? '已更新' : '有新内容' }}</a-tag></div><span>{{ record.originalTitle || creatorLabel(record) }}</span></div>
              </div>
            </template>
            <template v-else-if="column.key === 'type'">
              <a-tag :color="record.type === 'book' ? 'geekblue' : 'purple'">{{ record.type === 'book' ? '书籍' : '影视' }}</a-tag>
            </template>
            <template v-else-if="column.key === 'rating'">
              <span v-if="record.rating != null" class="rating"><Icon name="ph:star-fill" /> {{ Number(record.rating).toFixed(1) }}</span>
              <span v-else class="muted">—</span>
            </template>
            <template v-else-if="column.key === 'rank'">
              <span v-if="record.type === 'film' && record.rank">#{{ record.rank }}</span><span v-else class="muted">—</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusColor(record.publishStatus)">{{ statusText(record.publishStatus) }}</a-tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <AdminRowActions
                :record="record"
                preview-only-published
                @edit="router.push(`/admin/library/${record.id}`)"
                @preview="router.push(`/library/${record.slug}`)"
                @publish="publish(record)"
                @settings="openSettings(record)"
                @delete="remove(record)"
              />
            </template>
          </template>
        </a-table>
        <AdminPagination v-model:current="page" :total="total" :page-size="limit" :show-size-changer="false" @change="load" />
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
import type { LibraryItem } from '~/types/library'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })
const api = useApi()
const toast = useToast()
const router = useRouter()
const { mediaUrl } = useMediaUrl()
const loading = ref(true)
const items = ref<LibraryItem[]>([])
const page = ref(1)
const limit = 10
const total = ref(0)
const totalPages = ref(1)
const filter = reactive({ type: 'all', status: 'all', search: '' })
const typeOptions = [{ label: '全部', value: 'all' }, { label: '书籍', value: 'book' }, { label: '影视', value: 'film' }]
const columns = [
  { title: '作品', key: 'work', width: 290 }, { title: '类型', key: 'type', width: 80 },
  { title: '评分', key: 'rating', width: 76 }, { title: '排名', key: 'rank', width: 68 },
  { title: '状态', key: 'status', width: 92 }, { title: '浏览', dataIndex: 'viewCount', key: 'views', width: 65 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 120, customRender: ({ text }: any) => text?.slice(0, 10) || '—' },
  { title: '操作', key: 'actions', width: 300, fixed: 'right' as const },
]

function creatorLabel(item: LibraryItem) { return item.type === 'book' ? item.creator || '未知作者' : item.director || '未知导演' }
function resetAndLoad() { page.value = 1; load() }
function statusText(status: string) { return status === 'published' ? '已发布' : status === 'private' ? '私密' : '草稿' }
function statusColor(status: string) { return status === 'published' ? 'green' : status === 'private' ? 'purple' : 'default' }

async function load() {
  loading.value = true
  try {
    const res = await api.get<any>('/library/admin', {
      page: page.value, limit, type: filter.type,
      status: filter.status === 'pending' ? 'all' : filter.status,
      needsPublish: filter.status === 'pending' ? true : undefined,
      search: filter.search,
    })
    items.value = res.items || []; total.value = res.total || 0; totalPages.value = res.totalPages || 1
  } catch { items.value = []; total.value = 0 }
  finally { loading.value = false }
}

function publish(item: LibraryItem) {
  Modal.confirm({ title: '确认发布', content: `将「${item.title}」的当前保存版本发布到前台？`, okText: '发布', cancelText: '取消', onOk: async () => {
    try { await api.post(`/library/${item.id}/publish`); toast.success('书影记录已发布'); await load() }
    catch (error: any) { toast.error(error?.message || '发布失败') }
  } })
}

function openSettings(item: LibraryItem) {
  const restoring = item.publishStatus === 'private'
  Modal.confirm({ title: restoring ? '恢复公开这条记录？' : '将这条记录设为私密？', content: restoring ? '将发布当前已保存版本。' : '前台会立即隐藏，保存内容不会删除。', okText: restoring ? '恢复公开' : '设为私密', cancelText: '取消', onOk: async () => {
    try { await api.post(`/library/${item.id}/${restoring ? 'publish' : 'private'}`); toast.success(restoring ? '记录已恢复公开' : '记录已设为私密'); await load() }
    catch (error: any) { toast.error(error?.message || '设置失败') }
  } })
}

function remove(item: LibraryItem) {
  Modal.confirm({
    title: '删除收藏记录', content: `确认删除「${item.title}」？删除后不可恢复。`, okText: '删除', cancelText: '取消', okType: 'danger',
    onOk: async () => {
      try { await api.delete(`/library/${item.id}`); toast.success('已删除'); await load() }
      catch (error: any) { toast.error(error?.message || '删除失败') }
    },
  })
}

onMounted(load)
useHead({ title: '书影管理' })
</script>

<style scoped>
.library-admin { width:min(1180px,100%); margin:0 auto; }
.admin-heading { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:20px; }
.admin-heading h1 { margin:0 0 3px; color:var(--c-text); font-size:1.5rem; }
.admin-heading p { color:var(--c-text-3); font-size:.76rem; }
.table-toolbar { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
.search-input { width:240px; }
.list-card { overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 72%,transparent); border-radius:13px; background:var(--ld-bg-card); }
.work-cell { display:flex; align-items:center; gap:11px; min-width:0; }
.change-dot { width:8px; height:8px; flex:0 0 auto; border-radius:50%; background:#22c55e; box-shadow:0 0 0 3px color-mix(in srgb,#22c55e 18%,transparent); }
.work-title { display:flex; align-items:center; gap:7px; }
.work-cell > div:last-child { display:flex; min-width:0; flex-direction:column; gap:3px; }
.work-cell strong,.work-cell span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.work-cell strong { color:var(--c-text); font-size:.82rem; }
.work-cell span { color:var(--c-text-3); font-size:.68rem; }
.mini-cover { display:grid!important; width:38px; height:54px; flex:0 0 38px; overflow:hidden!important; border-radius:5px; background:var(--c-bg-2); color:var(--c-primary); place-items:center; }
.mini-cover img { width:100%; height:100%; object-fit:cover; }
.rating { color:#d99528; font-weight:700; }.muted { color:var(--c-text-3); }
.pagination { display:flex; justify-content:center; padding:18px 0 2px; }
@media (max-width:600px) { .admin-heading { align-items:flex-start; flex-direction:column; }.table-toolbar>* { flex:1; min-width:130px; }.search-input { width:auto; } }
</style>

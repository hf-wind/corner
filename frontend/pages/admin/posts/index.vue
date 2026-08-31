<template>
  <div class="admin-page-shell">
    <header class="admin-page-head">
      <div><span>CONTENT MANAGEMENT</span><h1>文章管理</h1><p>管理文章草稿、发布状态与公开版本。</p></div>
      <a-button type="primary" @click="$router.push('/admin/posts/create')"><Icon name="ph:plus-bold" /> 写文章</a-button>
    </header>
    <div class="table-toolbar post-toolbar">
      <a-input v-model:value="filter.search" placeholder="搜索文章标题" allow-clear class="post-search" @press-enter="onFilterChange"><template #prefix><Icon name="ph:magnifying-glass" /></template></a-input>
      <a-select v-model:value="filter.status" :options="statusOptions" style="width:132px" />
      <a-button type="primary" @click="onFilterChange"><Icon name="ph:magnifying-glass-bold" /> 搜索</a-button>
      <a-button @click="resetFilters"><Icon name="ph:arrow-counter-clockwise-bold" /> 重置</a-button>
      <span class="toolbar-spacer" />
      <AdminRefreshButton :loading="loading" @click="loadPosts" />
    </div>

    <a-spin :spinning="loading" class="table-spin">
      <div class="admin-table-shell">
        <a-table :dataSource="posts" :columns="columns" rowKey="slug" size="small" :pagination="false" :scroll="{ x: 1300 }" :locale="{ emptyText: '暂无文章' }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'title'">
              <div class="post-title">
                <i v-if="record.needsPublish" class="change-dot" />
                <span>{{ record.title }}</span>
                <a-tag v-if="record.needsPublish" color="orange" class="pending-badge">{{ record.published ? '已更新' : '有新内容' }}</a-tag>
                <a-tag v-if="record.scheduledAt" color="blue" class="pending-badge">已定时</a-tag>
              </div>
            </template>
            <template v-if="column.key === 'tags'">
              <a-tag v-for="t in record.tags" :key="t" style="margin:0 2px 2px 0">{{ t }}</a-tag>
            </template>
            <template v-if="column.key === 'status'">
              <div class="status-switch"><a-switch :checked="record.status === 'published'" :loading="publishingSlug === record.slug" checked-children="公开" un-checked-children="下架" @change="(checked: boolean) => togglePublished(record, checked)" /><a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag></div>
            </template>
            <template v-if="column.key === 'actions'">
              <AdminRowActions
                :record="record"
                settings-menu
                :show-unpublish="false"
                :publishing="publishingSlug === record.slug"
                @edit="$router.push('/admin/posts/' + record.slug)"
                @preview="preview(record.slug)"
                @publish="publish(record)"
                @unpublish="unpublish(record)"
                @versions="openVersions(record)"
                @schedule="openSchedule(record)"
                @privacy="changePrivacy(record)"
                @delete="remove(record.slug, record.title)"
              />
            </template>
          </template>
        </a-table>
        <AdminPagination v-model:current="page" :page-size="limit" :total="total" :show-size-changer="false" @change="loadPosts" />
      </div>
    </a-spin>

    <a-modal v-model:open="settingDialog.open" title="定时发布" :footer="null" width="460px">
      <div class="setting-form">
        <label>定时发布<a-date-picker v-model:value="settingDialog.scheduledAt" show-time style="width:100%" placeholder="不设置则取消定时发布" /></label>
        <p>定时发布只适用于文章，到达时间后会发布当前已保存版本。</p>
        <div class="setting-actions">
          <a-button @click="settingDialog.open = false"><Icon name="ph:x-bold" /> 取消</a-button>
          <a-button type="primary" :loading="settingDialog.saving" @click="saveSchedule"><Icon name="ph:floppy-disk-bold" /> 保存设置</a-button>
        </div>
      </div>
    </a-modal>

    <a-modal v-model:open="versionsDialog.open" :title="`版本记录 · ${versionsDialog.record?.title || ''}`" width="760px" :footer="null">
      <a-spin :spinning="versionsDialog.loading">
        <div v-if="versionsDialog.items.length" class="version-list">
          <article v-for="item in versionsDialog.items" :key="item.id">
            <span class="version-index">V{{ item.version }}</span>
            <div class="version-copy">
              <header><strong>{{ item.title || '未命名版本' }}</strong><a-tag color="blue">{{ versionSource(item.source) }}</a-tag></header>
              <p>{{ item.excerpt || '该版本未填写摘要' }}</p>
              <small>{{ formatVersionTime(item.createdAt) }} · {{ item.createdBy?.username || '系统' }} · 正文 {{ item.contentLength }} 字符</small>
            </div>
            <a-button size="small" @click="previewVersion(item)"><Icon name="ph:eye-bold" /> 预览</a-button>
            <a-button size="small" :loading="versionsDialog.restoring === item.id" @click="confirmRestoreVersion(item)"><Icon name="ph:arrow-counter-clockwise-bold" /> 回退</a-button>
          </article>
        </div>
        <a-empty v-else-if="!versionsDialog.loading" description="暂无版本记录" />
      </a-spin>
    </a-modal>

    <a-modal v-model:open="versionPreview.open" :title="versionPreview.item ? `V${versionPreview.item.version} · ${versionPreview.item.title || '未命名版本'}` : '版本预览'" width="min(860px, calc(100vw - 24px))" :footer="null">
      <div v-if="versionPreview.item" class="version-preview">
        <div><span>{{ versionSource(versionPreview.item.source) }}</span><small>{{ formatVersionTime(versionPreview.item.createdAt) }} · {{ versionPreview.item.createdBy?.username || '系统' }}</small></div>
        <p v-if="versionPreview.item.excerpt">{{ versionPreview.item.excerpt }}</p>
        <pre>{{ versionPreview.item.content || '该版本没有正文内容' }}</pre>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const router = useRouter()
const loading = ref(true)
const posts = ref<any[]>([])
const page = ref(1)
const limit = 10
const total = ref(0)
const totalPages = ref(1)
const filter = ref({ status: 'all', search: '' })
const publishingSlug = ref('')
const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '已发布', value: 'published' },
  { label: '草稿', value: 'draft' },
  { label: '已下架', value: 'unpublished' },
  { label: '私密', value: 'private' },
  { label: '有新内容', value: 'pending' },
]

const columns = [
  { title: '标题', dataIndex: 'title', key: 'title', width: 360 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 90 },
  { title: '标签', key: 'tags', width: 140 },
  { title: '状态', key: 'status', width: 100 },
  { title: '阅读', dataIndex: 'views', key: 'views', width: 60, align: 'center' as const },
  { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
  { title: '操作', key: 'actions', width: 370, fixed: 'right' as const },
]
const settingDialog = reactive<{ open: boolean; saving: boolean; record: any | null; scheduledAt: Dayjs | null }>({ open: false, saving: false, record: null, scheduledAt: null })
const versionsDialog = reactive({ open: false, loading: false, restoring: '', record: null as any, items: [] as any[] })
const versionPreview = reactive({ open: false, item: null as any })

function statusText(status: string) { return status === 'published' ? '已发布' : status === 'unpublished' ? '已下架' : status === 'private' ? '私密' : '草稿' }
function statusColor(status: string) { return status === 'published' ? 'green' : status === 'unpublished' ? 'orange' : status === 'private' ? 'purple' : 'default' }

function onFilterChange() {
  page.value = 1
  loadPosts()
}

function resetFilters() {
  filter.value = { status: 'all', search: '' }
  onFilterChange()
}

async function loadPosts() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit, status: 'all' }
    if (['published', 'unpublished', 'draft', 'private'].includes(filter.value.status)) {
      params.status = filter.value.status
    } else if (filter.value.status === 'pending') {
      params.status = 'all'
      params.needsPublish = true
    }
    if (filter.value.search) params.search = filter.value.search
    const res = await api.get<any>('/posts', params)
    posts.value = (res.items ?? []).map((p: any) => ({
      slug: p.slug,
      title: p.title,
      categoryName: p.category?.name ?? '',
      tags: p.tags?.map((t: any) => t.name) ?? [],
      published: p.status === 'published',
      status: p.status,
      needsPublish: !!p.needsPublish,
      scheduledAt: p.scheduledAt || null,
      views: p.viewCount ?? 0,
      date: (p.publishedAt || p.createdAt || '').slice(0, 10),
    }))
    total.value = res.total ?? 0
    totalPages.value = res.totalPages ?? 1
  } catch {
    posts.value = []
    total.value = 0
    totalPages.value = 0
  }
  loading.value = false
}

function openSchedule(record: any) {
  settingDialog.record = record
  settingDialog.scheduledAt = record.scheduledAt ? dayjs(record.scheduledAt) : null
  settingDialog.open = true
}

function changePrivacy(record: any) {
  settingDialog.record = record
  const restoring = record.status === 'private'
  Modal.confirm({
    title: restoring ? '恢复公开文章' : '将文章设为私密',
    content: restoring ? `确认将「${record.title}」的当前保存版本发布并恢复公开？` : `确认将「${record.title}」设为私密？前台会立即隐藏，草稿与版本不会删除。`,
    okText: restoring ? '恢复公开' : '设为私密',
    cancelText: '取消',
    okType: restoring ? 'primary' : 'danger',
    onOk: restoring ? restorePublic : setPrivate,
  })
}

async function saveSchedule() {
  if (!settingDialog.record) return
  settingDialog.saving = true
  try {
    if (settingDialog.scheduledAt) await api.post(`/posts/${settingDialog.record.slug}/schedule`, { scheduledAt: settingDialog.scheduledAt.toISOString() })
    else await api.delete(`/posts/${settingDialog.record.slug}/schedule`)
    toast.success(settingDialog.scheduledAt ? '定时发布已设置' : '定时发布已取消')
    settingDialog.open = false
    await loadPosts()
  } catch (error: any) { toast.error(error?.message || '设置失败') }
  finally { settingDialog.saving = false }
}

async function setPrivate() {
  if (!settingDialog.record) return
  settingDialog.saving = true
  try { await api.post(`/posts/${settingDialog.record.slug}/private`); toast.success('文章已设为私密'); settingDialog.open = false; await loadPosts() }
  catch (error: any) { toast.error(error?.message || '设置失败') }
  finally { settingDialog.saving = false }
}

async function restorePublic() {
  if (!settingDialog.record) return
  settingDialog.saving = true
  try { await api.post(`/posts/${settingDialog.record.slug}/publish`); toast.success('文章已恢复公开'); settingDialog.open = false; await loadPosts() }
  catch (error: any) { toast.error(error?.message || '恢复失败') }
  finally { settingDialog.saving = false }
}

function preview(slug: string) {
  router.push(`/article/${encodeURIComponent(slug)}?preview=1`)
}

async function openVersions(record: any) {
  versionsDialog.open = true
  versionsDialog.loading = true
  versionsDialog.record = record
  versionsDialog.items = []
  try { versionsDialog.items = await api.get<any[]>(`/posts/${record.slug}/versions`) }
  catch (error: any) { toast.error(error?.message || '版本记录加载失败') }
  finally { versionsDialog.loading = false }
}

function versionSource(source: string) {
  return source === 'publish' ? '发布快照' : source === 'draft-preserve' ? '回退前发布快照' : '历史版本'
}

function formatVersionTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function previewVersion(item: any) {
  versionPreview.item = item
  versionPreview.open = true
}

function confirmRestoreVersion(item: any) {
  const record = versionsDialog.record
  if (!record) return
  Modal.confirm({
    title: `回退到 V${item.version}？`,
    content: record.needsPublish
      ? '当前保存内容还未发布。系统会先发布并形成新版本，再回退到所选版本，当前修改不会丢失。回退结果会作为待发布草稿。'
      : '所选版本会载入为新的待发布草稿，当前线上版本暂时保持不变。',
    okText: '确认回退',
    cancelText: '取消',
    onOk: async () => {
      versionsDialog.restoring = item.id
      try {
        const restored = await api.post<any>(`/posts/${record.slug}/versions/${item.id}/restore`)
        versionsDialog.open = false
        toast.success(record.needsPublish ? '当前修改已发布留档，历史版本已回退为草稿' : '历史版本已回退为草稿')
        await loadPosts()
        await router.push(`/admin/posts/${encodeURIComponent(restored.slug || record.slug)}`)
      } catch (error: any) { toast.error(error?.message || '版本回退失败') }
      finally { versionsDialog.restoring = '' }
    },
  })
}

async function publish(record: any) {
  Modal.confirm({
    title: '确认发布',
    content: `将「${record.title}」的当前修改发布到前台？`,
    okText: '发布',
    cancelText: '取消',
    onOk: async () => {
      publishingSlug.value = record.slug
      try {
        await api.post(`/posts/${record.slug}/publish`)
        toast.success('发布成功')
        await loadPosts()
      } catch (e: any) {
        toast.error('发布失败: ' + (e.message || ''))
      }
      publishingSlug.value = ''
    },
  })
}

async function unpublish(record: any) {
  Modal.confirm({
    title: '确认下架',
    content: `下架「${record.title}」后，前台、RSS、搜索、相关推荐与站点文风画像都会立即停止引用；文章和版本记录仍会保留。`,
    okText: '下架',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      publishingSlug.value = record.slug
      try {
        await api.post(`/posts/${record.slug}/unpublish`)
        toast.success('文章已下架')
        await loadPosts()
      } catch (e: any) {
        toast.error('下架失败: ' + (e.message || ''))
      }
      publishingSlug.value = ''
    },
  })
}

async function togglePublished(record: any, checked: boolean) {
  if (checked && record.status !== 'published') await publish(record)
  else if (!checked && record.status === 'published') await unpublish(record)
}

async function remove(slug: string, title: string) {
  Modal.confirm({
    title: '删除确认',
    content: `确认删除「${title}」？此操作不可撤销。`,
    okText: '删除',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        await api.delete(`/posts/${slug}`)
        toast.success('已删除')
        posts.value = posts.value.filter((p: any) => p.slug !== slug)
      } catch {
        toast.error('删除失败')
      }
    },
  })
}

onMounted(loadPosts)
</script>

<style scoped>
.status-switch { display:flex; align-items:center; gap:6px; }
.table-toolbar { display:flex; gap:8px; margin-bottom:12px; align-items:center; }
.post-search { width:260px; }
.list-card { border-radius:8px; }
.post-title { font-weight:500; font-size:0.85rem; display:inline-flex; align-items:center; gap:8px; }
.pending-badge { transform: scale(0.85); }
.change-dot { width:8px; height:8px; flex:0 0 auto; border-radius:50%; background:#22c55e; box-shadow:0 0 0 3px color-mix(in srgb,#22c55e 18%,transparent); }
.table-actions { display:flex; align-items:center; flex-wrap:nowrap; white-space:nowrap; }
.setting-form { display:grid; gap:12px; }.setting-form label { display:grid; gap:7px; color:var(--c-text-2); font-size:.76rem; }.setting-form p { margin:0; color:var(--c-text-3); font-size:.7rem; }.setting-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
.version-list { display:grid; max-height:62vh; overflow:auto; }
.version-list article { display:grid; grid-template-columns:44px minmax(0,1fr) auto auto; align-items:center; gap:10px; padding:13px 2px; border-bottom:1px solid var(--border); }
.version-index { display:grid; width:40px; height:32px; border-radius:8px; background:var(--c-primary-soft); color:var(--c-primary); font-size:.64rem; font-weight:700; place-items:center; }
.version-copy { min-width:0; }.version-copy header { display:flex; align-items:center; gap:7px; }.version-copy strong { font-size:.7rem; }.version-copy p { overflow:hidden; margin:5px 0; color:var(--c-text-3); font-size:.58rem; text-overflow:ellipsis; white-space:nowrap; }.version-copy small { color:var(--c-text-4); font-size:.52rem; }
.version-preview { display:grid; gap:14px; }.version-preview > div { display:flex; align-items:center; justify-content:space-between; gap:12px; color:var(--c-primary); font-size:.64rem; }.version-preview small { color:var(--c-text-3); font-size:.56rem; }.version-preview p { margin:0; padding:11px 13px; border-left:3px solid var(--c-primary); background:var(--c-bg-1); color:var(--c-text-2); font-size:.7rem; line-height:1.7; }.version-preview pre { max-height:min(62vh,620px); margin:0; padding:16px; overflow:auto; border:1px solid var(--border); border-radius:8px; background:var(--c-bg-1); color:var(--c-text-1); font:.72rem/1.85 var(--font-body); white-space:pre-wrap; word-break:break-word; }
.table-pagination { display:flex; justify-content:center; padding:16px 0 4px; }
@media (max-width:700px) {
  .post-toolbar { align-items:stretch; flex-direction:column; }
  .post-search { width:auto; flex:1; }
  .version-list article { grid-template-columns:40px minmax(0,1fr); }
  .version-list article > :deep(.ant-btn) { grid-column:1 / -1; }
}
</style>

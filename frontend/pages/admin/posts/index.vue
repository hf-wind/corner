<template>
  <div>
    <div class="table-toolbar post-toolbar">
      <a-segmented v-model:value="filter.status" :options="statusOptions" @change="onFilterChange" />
      <div class="post-toolbar-actions">
        <a-input-search v-model:value="filter.search" placeholder="搜索文章标题..." allow-clear class="post-search" @search="onFilterChange" />
        <a-button type="primary" @click="$router.push('/admin/posts/create')"><Icon name="ph:plus-bold" /> 写文章</a-button>
      </div>
    </div>

    <a-spin :spinning="loading" class="table-spin">
      <a-card :bordered="false" class="list-card" size="small">
        <a-table :dataSource="posts" :columns="columns" rowKey="slug" size="small" :pagination="false" :locale="{ emptyText: '暂无文章' }">
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
              <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
            </template>
            <template v-if="column.key === 'actions'">
              <div class="table-actions">
              <a-button type="link" size="small" @click="$router.push('/admin/posts/' + record.slug)">
                <EditOutlined /> 编辑
              </a-button>
              <a-button type="link" size="small" @click="preview(record.slug)">
                <EyeOutlined /> 预览
              </a-button>
              <a-button
                v-if="record.needsPublish"
                type="link"
                size="small"
                :loading="publishingSlug === record.slug"
                @click="publish(record)"
              >
                <SendOutlined /> 发布
              </a-button>
              <a-button type="link" size="small" danger @click="remove(record.slug, record.title)">
                <DeleteOutlined /> 删除
              </a-button>
              <a-button type="link" size="small" @click="openSettings(record)"><Icon name="ph:gear-six-bold" /> 设置</a-button>
              </div>
            </template>
          </template>
        </a-table>
        <div class="table-pagination" v-if="totalPages > 1">
          <a-pagination v-model:current="page" :pageSize="limit" :total="total" size="small" @change="loadPosts" />
        </div>
      </a-card>
    </a-spin>

    <a-modal v-model:open="settingDialog.open" title="文章设置" :footer="null" width="460px">
      <div class="setting-form">
        <label>定时发布<a-date-picker v-model:value="settingDialog.scheduledAt" show-time style="width:100%" placeholder="不设置则取消定时发布" /></label>
        <p>定时发布只适用于文章，到达时间后会发布当前已保存版本。</p>
        <div class="setting-actions">
          <a-button v-if="settingDialog.record?.status !== 'private'" danger :loading="settingDialog.saving" @click="setPrivate">设为私密</a-button>
          <a-button v-else :loading="settingDialog.saving" @click="restorePublic">恢复公开</a-button>
          <a-button type="primary" :loading="settingDialog.saving" @click="saveSchedule">保存设置</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import { EditOutlined, DeleteOutlined, EyeOutlined, SendOutlined } from '@ant-design/icons-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const router = useRouter()
const loading = ref(true)
const posts = ref<any[]>([])
const page = ref(1)
const limit = 15
const total = ref(0)
const totalPages = ref(1)
const filter = ref({ status: 'all', search: '' })
const publishingSlug = ref('')
const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '已发布', value: 'published' },
  { label: '草稿', value: 'draft' },
  { label: '私密', value: 'private' },
  { label: '有新内容', value: 'pending' },
]

const columns = [
  { title: '标题', dataIndex: 'title', key: 'title', minWidth: 200 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 90 },
  { title: '标签', key: 'tags', width: 140 },
  { title: '状态', key: 'status', width: 100 },
  { title: '阅读', dataIndex: 'views', key: 'views', width: 60, align: 'center' as const },
  { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
  { title: '操作', key: 'actions', width: 400, fixed: 'right' as const },
]
const settingDialog = reactive<{ open: boolean; saving: boolean; record: any | null; scheduledAt: Dayjs | null }>({ open: false, saving: false, record: null, scheduledAt: null })

function statusText(status: string) { return status === 'published' ? '已发布' : status === 'private' ? '私密' : '草稿' }
function statusColor(status: string) { return status === 'published' ? 'green' : status === 'private' ? 'purple' : 'default' }

function onFilterChange() {
  page.value = 1
  loadPosts()
}

async function loadPosts() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit, status: 'all' }
    if (['published', 'draft', 'private'].includes(filter.value.status)) {
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

function openSettings(record: any) {
  settingDialog.record = record
  settingDialog.scheduledAt = record.scheduledAt ? dayjs(record.scheduledAt) : null
  settingDialog.open = true
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
  router.push(`/admin/posts/preview?slug=${encodeURIComponent(slug)}`)
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
.table-toolbar { display:flex; gap:8px; margin-bottom:12px; align-items:center; }
.post-toolbar { justify-content:space-between; }
.post-toolbar-actions { display:flex; gap:8px; }
.post-search { width:260px; }
.list-card { border-radius:8px; }
.post-title { font-weight:500; font-size:0.85rem; display:inline-flex; align-items:center; gap:8px; }
.pending-badge { transform: scale(0.85); }
.change-dot { width:8px; height:8px; flex:0 0 auto; border-radius:50%; background:#22c55e; box-shadow:0 0 0 3px color-mix(in srgb,#22c55e 18%,transparent); }
.table-actions { display:flex; align-items:center; flex-wrap:nowrap; white-space:nowrap; }
.setting-form { display:grid; gap:12px; }.setting-form label { display:grid; gap:7px; color:var(--c-text-2); font-size:.76rem; }.setting-form p { margin:0; color:var(--c-text-3); font-size:.7rem; }.setting-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
.table-pagination { display:flex; justify-content:center; padding:16px 0 4px; }
@media (max-width:700px) {
  .post-toolbar { align-items:stretch; flex-direction:column; }
  .post-toolbar-actions { width:100%; }
  .post-search { width:auto; flex:1; }
}
</style>

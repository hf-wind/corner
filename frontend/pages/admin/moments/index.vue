<template>
  <div class="moment-admin-page">
    <div class="toolbar">
      <a-segmented
        v-model:value="filter.status"
        :options="statusOptions"
        @change="onFilterChange"
      />
      <div class="toolbar-actions">
        <a-input-search
          v-model:value="filter.search"
          placeholder="搜索标题、摘要或内容..."
          allow-clear
          class="search-input"
          @search="onFilterChange"
        />
        <a-button type="primary" @click="$router.push('/admin/moments/create')">
          <Icon name="ph:plus-bold" />
          写瞬间
        </a-button>
      </div>
    </div>

    <a-card :bordered="false" class="moment-table-card">
      <a-table
        :loading="loading"
        :columns="columns"
        :data-source="moments"
        :pagination="false"
        row-key="slug"
        :scroll="{ x: 980 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <div class="moment-row-content">
              <i v-if="record.needsPublish" class="change-dot" aria-label="有未发布修改" />
              <div class="moment-row-title">
                <div><strong>{{ record.title }}</strong><a-tag v-if="record.needsPublish" color="orange">{{ record.published ? '已更新' : '有新内容' }}</a-tag></div>
                <span>{{ record.excerpt || '这条瞬间还没写摘要。' }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">
              {{ statusText(record.status) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <div class="table-actions">
              <a-button type="link" size="small" @click="$router.push(`/admin/moments/${record.slug}`)">
                编辑
              </a-button>
              <a-button
                v-if="record.needsPublish"
                type="link"
                size="small"
                :loading="publishingSlug === record.slug"
                @click="publish(record)"
              >
                发布
              </a-button>
              <a-button type="link" size="small" @click="$router.push(`/admin/moments/preview?slug=${encodeURIComponent(record.slug)}`)">
                预览
              </a-button>
              <a-button type="link" size="small" @click="openSettings(record)">设置</a-button>
              <a-button type="link" size="small" danger @click="remove(record)">删除</a-button>
            </div>
          </template>
        </template>
      </a-table>

      <div v-if="totalPages > 1" class="pagination-wrap">
        <a-pagination
          v-model:current="page"
          :page-size="limit"
          :total="total"
          show-less-items
          @change="loadMoments"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const loading = ref(true)
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const limit = 12
const publishingSlug = ref('')
const moments = ref<any[]>([])

const filter = reactive({
  status: 'all',
  search: '',
})

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '已发布', value: 'published' },
  { label: '草稿', value: 'draft' },
  { label: '私密', value: 'private' },
  { label: '有修改', value: 'pending' },
]

const columns = [
  { title: '标题', dataIndex: 'title', key: 'title', minWidth: 300 },
  { title: '状态', key: 'status', width: 110 },
  { title: '点赞', dataIndex: 'likes', key: 'likes', width: 90, align: 'center' as const },
  { title: '评论', dataIndex: 'comments', key: 'comments', width: 90, align: 'center' as const },
  { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
  { title: '操作', key: 'actions', width: 350, fixed: 'right' as const },
]
function statusText(status: string) { return status === 'published' ? '已发布' : status === 'private' ? '私密' : '草稿' }
function statusColor(status: string) { return status === 'published' ? 'green' : status === 'private' ? 'purple' : 'default' }

function onFilterChange() {
  page.value = 1
  void loadMoments()
}

async function loadMoments() {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      limit,
      status: filter.status === 'pending' ? 'all' : filter.status,
    }
    if (filter.status === 'pending') params.needsPublish = true
    if (filter.search) params.search = filter.search

    const res = await api.get<any>('/moments', params)
    moments.value = (res.items ?? []).map((item: any) => ({
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt || '',
      published: item.status === 'published',
      status: item.status,
      needsPublish: !!item.needsPublish,
      likes: item.likeCount ?? 0,
      comments: item.commentCount ?? item._count?.comments ?? 0,
      date: (item.publishedAt || item.createdAt || '').slice(0, 10),
    }))
    total.value = res.total ?? 0
    totalPages.value = res.totalPages ?? 1
  } catch {
    moments.value = []
    total.value = 0
    totalPages.value = 1
  } finally {
    loading.value = false
  }
}

function openSettings(record: any) {
  const restoring = record.status === 'private'
  Modal.confirm({
    title: restoring ? '恢复公开这条瞬间？' : '将这条瞬间设为私密？',
    content: restoring ? '将发布当前已保存版本。' : '前台会立即隐藏，保存内容不会删除。',
    okText: restoring ? '恢复公开' : '设为私密',
    cancelText: '取消',
    onOk: async () => {
      try {
        await api.post(`/moments/${record.slug}/${restoring ? 'publish' : 'private'}`)
        toast.success(restoring ? '瞬间已恢复公开' : '瞬间已设为私密')
        await loadMoments()
      } catch (error: any) { toast.error(error?.message || '设置失败') }
    },
  })
}

function publish(record: any) {
  Modal.confirm({
    title: '确认发布这条瞬间？',
    content: `发布后前台会立刻可见：《${record.title}》`,
    okText: '发布',
    cancelText: '取消',
    onOk: async () => {
      publishingSlug.value = record.slug
      try {
        await api.post(`/moments/${record.slug}/publish`)
        toast.success('瞬间已发布')
        await loadMoments()
      } catch (error: any) {
        toast.error(`发布失败：${error?.message || ''}`)
      } finally {
        publishingSlug.value = ''
      }
    },
  })
}

function remove(record: any) {
  Modal.confirm({
    title: '删除这条瞬间？',
    content: '删除后无法恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await api.delete(`/moments/${record.slug}`)
        toast.success('已删除')
        await loadMoments()
      } catch {
        toast.error('删除失败')
      }
    },
  })
}

onMounted(() => {
  void loadMoments()
})
</script>

<style scoped>
.moment-admin-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 14px;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
}

.search-input {
  max-width: 320px;
}

.moment-table-card {
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow: hidden;
}

.moment-row-content {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.moment-row-title {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.moment-row-title strong {
  color: var(--c-text);
}
.moment-row-title > div { display:flex; align-items:center; gap:8px; }

.change-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  margin-top: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 3px color-mix(in srgb, #22c55e 18%, transparent);
}

.moment-row-title span {
  color: var(--c-text-3);
  font-size: 0.8rem;
}

.table-actions {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

@media (max-width: 760px) {
  .toolbar {
    flex-direction: column;
  }

  .toolbar-actions { width: 100%; }
  .search-input { max-width: none; flex: 1; }
}
</style>

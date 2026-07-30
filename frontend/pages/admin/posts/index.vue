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
              <span class="post-title">
                {{ record.title }}
                <a-tag v-if="record.needsPublish" color="orange" class="pending-badge">待发布</a-tag>
              </span>
            </template>
            <template v-if="column.key === 'tags'">
              <a-tag v-for="t in record.tags" :key="t" style="margin:0 2px 2px 0">{{ t }}</a-tag>
            </template>
            <template v-if="column.key === 'status'">
              <a-tag :color="record.published ? 'green' : 'orange'">{{ record.published ? '已发布' : '草稿' }}</a-tag>
            </template>
            <template v-if="column.key === 'actions'">
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
            </template>
          </template>
        </a-table>
        <div class="table-pagination" v-if="totalPages > 1">
          <a-pagination v-model:current="page" :pageSize="limit" :total="total" size="small" @change="loadPosts" />
        </div>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
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
  { label: '待发布', value: 'pending' },
]

const columns = [
  { title: '标题', dataIndex: 'title', key: 'title', minWidth: 200 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 90 },
  { title: '标签', key: 'tags', width: 140 },
  { title: '状态', key: 'status', width: 80 },
  { title: '阅读', dataIndex: 'views', key: 'views', width: 60, align: 'center' as const },
  { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
  { title: '操作', key: 'actions', width: 280, fixed: 'right' as const },
]

function onFilterChange() {
  page.value = 1
  loadPosts()
}

async function loadPosts() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit, status: 'all' }
    if (filter.value.status === 'published' || filter.value.status === 'draft') {
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
      needsPublish: !!p.needsPublish,
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
.table-pagination { display:flex; justify-content:center; padding:16px 0 4px; }
@media (max-width:700px) {
  .post-toolbar { align-items:stretch; flex-direction:column; }
  .post-toolbar-actions { width:100%; }
  .post-search { width:auto; flex:1; }
}
</style>

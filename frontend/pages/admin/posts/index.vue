<template>
  <div>
    <div class="table-toolbar">
      <a-select v-model:value="filter.status" placeholder="状态" style="width:110px" @change="loadPosts" allow-clear>
        <a-select-option value="all">全部</a-select-option>
        <a-select-option value="published">已发布</a-select-option>
        <a-select-option value="draft">草稿</a-select-option>
      </a-select>
      <a-input v-model:value="filter.search" placeholder="搜索文章标题..." style="width:220px" @pressEnter="loadPosts" allow-clear />
      <a-button @click="loadPosts">搜索</a-button>
      <a-button type="primary" @click="$router.push('/admin/posts/create')">写文章</a-button>
    </div>

    <a-spin :spinning="loading" class="table-spin">
      <a-card :bordered="false" class="list-card" size="small">
        <a-table :dataSource="posts" :columns="columns" rowKey="slug" size="small" :pagination="false" :locale="{ emptyText: '暂无文章' }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'title'"><span class="post-title">{{ record.title }}</span></template>
            <template v-if="column.key === 'tags'">
              <a-tag v-for="t in record.tags" :key="t" style="margin:0 2px 2px 0">{{ t }}</a-tag>
            </template>
            <template v-if="column.key === 'status'">
              <a-tag :color="record.published ? 'green' : 'orange'">{{ record.published ? '发布' : '草稿' }}</a-tag>
            </template>
            <template v-if="column.key === 'actions'">
              <a-button type="link" size="small" @click="$router.push('/admin/posts/' + record.slug)"><EditOutlined /> 编辑</a-button>
              <a-button type="link" size="small" danger @click="remove(record.slug, record.title)"><DeleteOutlined /> 删除</a-button>
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
import { message, Modal } from 'ant-design-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const router = useRouter()
const loading = ref(true)
const posts = ref<any[]>([])
const page = ref(1)
const limit = 15
const total = ref(0)
const totalPages = ref(1)
const filter = ref({ status: 'all', search: '' })

const columns = [
  { title: '标题', dataIndex: 'title', key: 'title', minWidth: 200 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 90 },
  { title: '标签', key: 'tags', width: 140 },
  { title: '状态', key: 'status', width: 70 },
  { title: '阅读', dataIndex: 'views', key: 'views', width: 60, align: 'center' as const },
  { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' as const },
]

async function loadPosts() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit, status: filter.value.status }
    if (filter.value.search) params.search = filter.value.search
    const res = await api.get<any>('/posts', params)
    posts.value = (res.items ?? []).map((p: any) => ({
      slug: p.slug, title: p.title,
      categoryName: p.category?.name ?? '',
      tags: p.tags?.map((t: any) => t.name) ?? [],
      published: p.status === 'published',
      views: p.viewCount ?? 0,
      date: (p.publishedAt || p.createdAt || '').slice(0, 10),
    }))
    total.value = res.total ?? 0
    totalPages.value = res.totalPages ?? 1
  } catch { posts.value = []; total.value = 0; totalPages.value = 0 }
  loading.value = false
}

async function remove(slug: string, title: string) {
  Modal.confirm({
    title: '删除确认',
    content: `确认删除「${title}」？此操作不可撤销。`,
    okText: '删除',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try { await api.delete(`/posts/${slug}`); message.success('已删除'); posts.value = posts.value.filter((p: any) => p.slug !== slug) }
      catch { message.error('删除失败') }
    },
  })
}

onMounted(loadPosts)
</script>

<style scoped>
.table-toolbar { display:flex; gap:8px; margin-bottom:12px; align-items:center; }
.list-card { border-radius:8px; }
.post-title { font-weight:500; font-size:0.85rem; }
.table-pagination { display:flex; justify-content:center; padding:16px 0 4px; }
</style>

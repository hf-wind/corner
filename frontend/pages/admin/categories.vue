<template>
  <div class="admin-page-shell">
    <header class="admin-page-head"><div><span>CONTENT TAXONOMY</span><h1>分类管理</h1><p>维护文章的主分类、视觉标识与内容归属。</p></div><a-button type="primary" @click="openAdd"><PlusOutlined /> 添加分类</a-button></header>
    <div class="table-toolbar">
      <a-input v-model:value="keywordInput" allow-clear placeholder="搜索分类名称或 Slug" style="width:min(300px,100%)" @press-enter="applySearch"><template #prefix><Icon name="ph:magnifying-glass" /></template></a-input>
      <a-button type="primary" @click="applySearch"><Icon name="ph:magnifying-glass-bold" /> 搜索</a-button>
      <a-button @click="resetSearch"><Icon name="ph:arrow-counter-clockwise-bold" /> 重置</a-button>
      <span class="toolbar-spacer" />
      <AdminRefreshButton :loading="loading" @click="load" />
    </div>

    <a-spin :spinning="loading" class="table-spin">
      <div class="admin-table-shell">
        <a-table :dataSource="pagedCategories" :columns="columns" rowKey="slug" size="small" :pagination="false" :locale="{ emptyText: keyword ? '没有匹配的分类' : '暂无分类' }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'icon'">
              <Icon :name="record.icon || 'ph:folder-open-bold'" :style="{ color: record.color || 'var(--c-text-3)', fontSize: '16px' }" />
            </template>
            <template v-if="column.key === 'color'">
              <span v-if="record.color" class="table-color-pill"><span class="table-color-dot" :style="{ background: record.color }" />{{ record.color }}</span>
              <span v-else class="table-color-pill table-color-none">—</span>
            </template>
            <template v-if="column.key === 'actions'">
              <a-button type="link" size="small" @click="viewPosts(record)"><EyeOutlined /> 查看文章</a-button>
              <a-button type="link" size="small" @click="openAssign(record)"><SwapOutlined /> 分配文章</a-button>
              <a-button type="link" size="small" @click="openEdit(record)"><EditOutlined /> 编辑</a-button>
              <a-button type="link" size="small" danger @click="remove(record.slug, record.name)"><DeleteOutlined /> 删除</a-button>
            </template>
          </template>
        </a-table><AdminPagination v-model:current="page" :page-size="pageSize" :total="filteredCategories.length" :show-size-changer="false" />
      </div>
    </a-spin>

    <a-modal v-model:open="addDialog.open" :title="addDialog.editing ? '编辑分类' : '添加分类'" width="460px" @ok="confirmSave" @cancel="addDialog.open = false">
      <div class="add-field">
        <label class="add-label">名称</label>
        <a-input v-model:value="addDialog.name" placeholder="分类名称" />
      </div>
      <div class="add-field">
        <label class="add-label">Slug</label>
        <a-input v-model:value="addDialog.slug" placeholder="自动生成或手动填写" />
      </div>
      <div class="add-field">
        <label class="add-label">图标</label>
        <a-button @click="openIconPickerAdd" class="icon-pick-btn">
          <Icon :name="addDialog.icon" :style="{ color: addDialog.color || '#1677ff', fontSize: '18px' }" />
        </a-button>
      </div>
      <div class="add-field">
        <label class="add-label">颜色</label>
        <ColorPicker v-model="addDialog.color" />
      </div>
    </a-modal>

    <a-modal v-model:open="viewDialog.open" :title="viewDialog.title" width="640px" :footer="null" @cancel="viewDialog.open = false">
      <a-spin :spinning="viewDialog.loading" class="table-spin">
        <a-table :dataSource="viewDialog.posts" :columns="viewColumns" rowKey="id" size="small" :pagination="false" :locale="{ emptyText: '暂无文章' }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="record.status==='published'?'green':'orange'">{{ record.status==='published'?'已发布':'草稿' }}</a-tag>
            </template>
            <template v-if="column.key === 'date'">{{ (record.publishedAt||record.createdAt||'').slice(0,10) }}</template>
          </template>
        </a-table>
        <AdminPagination v-model:current="viewDialog.page" :page-size="10" :total="viewDialog.total" :show-size-changer="false" @change="loadViewPosts" />
      </a-spin>
    </a-modal>

    <a-modal v-model:open="assignDialog.open" title="分配文章" width="640px" @ok="confirmAssign" :ok-button-props="{ disabled: !assignDialog.dirty }" @cancel="assignDialog.open = false; assignDialog.selected = []; assignDialog.search = ''; assignDialog.dirty = false">
      <div class="assign-toolbar">
        <a-input v-model:value="assignDialog.search" placeholder="搜索文章标题…" size="small" allow-clear style="flex:1" @input="() => {}" />
        <span class="assign-count">已选 {{ assignDialog.selected.length }}/{{ filteredAssignPosts.length }}</span>
      </div>
      <div class="assign-list" v-if="filteredAssignPosts.length">
        <a-checkbox-group v-model:value="assignDialog.selected" @change="onAssignChange" class="assign-group">
          <div v-for="p in filteredAssignPosts" :key="p.id" class="assign-item" :class="{ assigned: assignDialog.selected.includes(p.id) }">
            <a-checkbox :value="p.id">
              <span class="assign-title">{{ p.title }}</span>
              <a-tag v-if="p.status === 'published'" color="green" style="margin-left:6px">已发布</a-tag>
              <a-tag v-else color="orange" style="margin-left:6px">草稿</a-tag>
            </a-checkbox>
          </div>
        </a-checkbox-group>
      </div>
      <div class="assign-empty" v-else>无匹配文章</div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const loading = ref(true)
const categories = ref<any[]>([])
const keyword = ref('')
const keywordInput = ref('')
const page = ref(1)
const pageSize = 10
const addDialog = reactive({ open: false, name: '', slug: '', icon: 'ph:folder-open-bold', color: '', editing: false, editingSlug: '' })
const filteredCategories = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return query ? categories.value.filter(item => `${item.name} ${item.slug}`.toLowerCase().includes(query)) : categories.value
})
const pagedCategories = computed(() => filteredCategories.value.slice((page.value - 1) * pageSize, page.value * pageSize))
watch(keyword, () => { page.value = 1 })

function applySearch() { keyword.value = keywordInput.value.trim(); page.value = 1 }
function resetSearch() { keywordInput.value = ''; keyword.value = ''; page.value = 1 }

const columns = [
  { title: '', key: 'icon', width: 36, align: 'center' as const },
  { title: '', key: 'color', width: 90, align: 'center' as const },
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: 'Slug', dataIndex: 'slug', key: 'slug' },
  { title: '文章', dataIndex: 'postCount', key: 'postCount', width: 60, align: 'center' as const },
  { title: '操作', key: 'actions', width: 390, fixed: 'right' as const },
]

const viewColumns = [
  { title: '标题', dataIndex: 'title', key: 'title', minWidth: 200 },
  { title: '状态', key: 'status', width: 70 },
  { title: '日期', key: 'date', width: 100 },
]

const viewDialog = reactive({ open: false, title: '', slug: '', posts: [] as any[], loading: false, page: 1, total: 0, totalPages: 1 })
const assignDialog = reactive({
  open: false, slug: '', search: '', loading: false,
  selected: [] as string[],
  initialSelected: [] as string[],
  allPosts: [] as any[],
  dirty: false,
})

const filteredAssignPosts = computed(() => {
  if (!assignDialog.search) return assignDialog.allPosts
  const q = assignDialog.search.toLowerCase()
  return assignDialog.allPosts.filter((p: any) => p.title.toLowerCase().includes(q))
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await api.get<any>('/categories')
    categories.value = Array.isArray(res) ? res : []
  } catch { categories.value = [] }
  loading.value = false
}

function openAdd() {
  addDialog.name = ''; addDialog.slug = ''; addDialog.icon = 'ph:folder-open-bold'; addDialog.color = ''
  addDialog.editing = false; addDialog.editingSlug = ''
  addDialog.open = true
}

function openEdit(record: any) {
  addDialog.name = record.name; addDialog.slug = record.slug
  addDialog.icon = record.icon || 'ph:folder-open-bold'; addDialog.color = record.color || ''
  addDialog.editing = true; addDialog.editingSlug = record.slug
  addDialog.open = true
}

async function openIconPickerAdd() {
  const { open } = useIconPicker()
  const icon = await open(addDialog.icon)
  if (icon) addDialog.icon = icon
}

async function confirmSave() {
  if (!addDialog.name) { toast.warning('请填写名称'); return }
  const slug = addDialog.slug || addDialog.name.toLowerCase().replace(/\s+/g, '-')
  const payload = { name: addDialog.name, slug, icon: addDialog.icon || null, color: addDialog.color || null }
  try {
    if (addDialog.editing) {
      await api.put(`/categories/${addDialog.editingSlug}`, payload)
      toast.success('保存成功')
    } else {
      await api.post('/categories', payload)
      toast.success('添加成功')
    }
    addDialog.open = false; load()
  } catch { toast.error(addDialog.editing ? '保存失败' : '添加失败') }
}

async function remove(slug: string, name: string) {
  Modal.confirm({
    title: '删除确认',
    content: `确认删除分类「${name}」？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try { await api.delete(`/categories/${slug}`); toast.success('已删除'); load() }
      catch { toast.error('删除失败') }
    },
  })
}

async function viewPosts(cat: any) {
  viewDialog.slug = cat.slug; viewDialog.title = `「${cat.name}」的文章`; viewDialog.page = 1; viewDialog.open = true
  await loadViewPosts()
}

async function loadViewPosts() {
  viewDialog.loading = true
  try {
        const res = await api.get<any>(`/categories/${viewDialog.slug}/posts`, { page: viewDialog.page, limit: 10 })
    viewDialog.posts = res.items ?? []; viewDialog.total = res.total ?? 0; viewDialog.totalPages = res.totalPages ?? 1
  } catch { viewDialog.posts = []; viewDialog.total = 0; viewDialog.totalPages = 0 }
  viewDialog.loading = false
}

async function openAssign(cat: any) {
  assignDialog.slug = cat.slug; assignDialog.search = ''; assignDialog.open = true; assignDialog.dirty = false
  try {
    const res = await api.get<any>('/posts', { limit: 500, status: 'all' })
    assignDialog.allPosts = res.items ?? []
    const catRes = await api.get<any>(`/categories/${cat.slug}/posts`, { limit: 500 })
    const assignedIds = (catRes.items ?? []).map((p: any) => p.id)
    assignDialog.selected = [...assignedIds]
    assignDialog.initialSelected = [...assignedIds]
  } catch { assignDialog.allPosts = []; assignDialog.selected = []; assignDialog.initialSelected = [] }
}

function onAssignChange() {
  if (!assignDialog.open) return
  const s = new Set(assignDialog.selected)
  const init = new Set(assignDialog.initialSelected)
  assignDialog.dirty = s.size !== init.size || [...s].some(x => !init.has(x))
}

async function confirmAssign() {
  try {
    await api.post(`/categories/${assignDialog.slug}/posts`, { postIds: assignDialog.selected })
    toast.success('分配成功'); assignDialog.open = false; assignDialog.selected = []; assignDialog.search = ''; assignDialog.dirty = false; load()
  } catch { toast.error('分配失败') }
}
</script>

<style scoped>
.table-toolbar { display:flex; gap:8px; margin-bottom:12px; align-items:center; }
.list-card { border-radius:8px; }
.list-card :deep(td:last-child) { white-space:nowrap; }
.assign-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
.assign-count { font-size:0.78rem; color:var(--c-text-3); white-space:nowrap; }
.assign-list { max-height:400px; overflow-y:auto; border:1px solid var(--border); border-radius:6px; padding:4px; }
.assign-group { width:100%; }
.assign-item { display:flex; align-items:center; padding:6px 10px; border-radius:4px; cursor:pointer; transition:background 0.15s; }
.assign-item:hover { background:var(--c-primary-soft); }
.assign-item.assigned { background:color-mix(in srgb, var(--c-primary) 6%, transparent); }
.assign-title { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.assign-empty { text-align:center; padding:32px; font-size:0.85rem; color:var(--c-text-3); }
.table-color-pill { display:inline-flex; align-items:center; gap:5px; font-size:0.75rem; font-family:var(--font-mono); color:var(--c-text-2); }
.table-color-pill.table-color-none { color:var(--c-text-4); }
.table-color-dot { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
.add-field { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
.add-field:last-child { margin-bottom:0; }
.add-label { width:52px; font-size:0.82rem; color:var(--c-text-2); flex-shrink:0; text-align:right; }
.icon-pick-btn { width:42px; height:42px; display:flex; align-items:center; justify-content:center; border-radius:8px; border:2px dashed var(--border); }

</style>

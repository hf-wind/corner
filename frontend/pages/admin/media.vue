<template>
  <div class="media-page">
    <div class="media-body">
      <div class="media-sidebar">
        <a-menu
          :selectedKeys="[activeFolder]"
          mode="inline"
          style="border-inline-end:none;background:transparent"
          @click="onFolderClick"
        >
          <a-menu-item key="all"><FolderOutlined /> 全部文件</a-menu-item>
          <a-menu-item key="__none__"><InboxOutlined /> 未分类</a-menu-item>
          <a-menu-item v-for="f in folders" :key="f.key">
            <FolderFilled /> {{ f.label }}
            <span v-if="f.preset" class="preset-tag">预设</span>
          </a-menu-item>
          <a-menu-item key="__add__" class="menu-add-folder" @click.stop="showNewFolder = true">
            <FolderAddOutlined /> 新建文件夹
          </a-menu-item>
        </a-menu>
      </div>
      <div class="media-main">
        <div class="media-toolbar">
          <a-radio-group v-model:value="typeFilter" @change="loadMedia">
            <a-radio-button value="all">全部</a-radio-button>
            <a-radio-button value="image">图片</a-radio-button>
            <a-radio-button value="video">视频</a-radio-button>
            <a-radio-button value="document">文档</a-radio-button>
          </a-radio-group>
          <a-upload :showUploadList="false" accept="image/*,video/*,.pdf,.doc,.docx,.txt" :beforeUpload="beforeUpload">
            <a-button type="primary"><UploadOutlined /> 上传</a-button>
          </a-upload>
        </div>

        <div v-if="selectedIds.size" class="selection-bar">
          <span class="selection-count">已选中 {{ selectedIds.size }} 项</span>
          <a-button size="small" @click="openMoveDialog"><FolderAddOutlined /> 移动到</a-button>
          <a-button size="small" danger @click="handleBatchRemove"><DeleteOutlined /> 删除</a-button>
          <a-button size="small" @click="selectedIds.clear()">取消选择</a-button>
        </div>

        <a-spin :spinning="loading" class="table-spin">
          <a-card :bordered="false" class="list-card" size="small">
            <div class="media-grid" v-if="items.length">
              <div
                v-for="(item, i) in items" :key="item.id"
                class="media-item"
                :class="{ selected: selectedIds.has(item.id) }"
                @click="toggleSelect(item.id, i, $event)"
              >
                <div class="media-check" @click.stop>
                  <a-checkbox :checked="selectedIds.has(item.id)" @change="toggleSelect(item.id, i)" />
                </div>
                <div v-if="isImage(item)" class="media-img-wrap">
                  <a-image :src="mediaUrl(item.path)" style="width:100%;height:120px;object-fit:cover" />
                </div>
                <div v-else class="media-icon"><FileOutlined style="font-size:28px" /></div>
                <div class="media-meta">
                  <span class="media-name" :title="item.filename">{{ item.filename }}</span>
                  <a-button type="link" size="small" danger @click.stop="handleRemove(item)">删除</a-button>
                </div>
              </div>
            </div>
            <a-empty v-else description="暂无文件" />
          </a-card>
        </a-spin>

        <div class="media-pagination" v-if="totalPages > 1">
          <a-pagination v-model:current="page" :pageSize="limit" :total="total" size="small" @change="loadMedia" />
        </div>
      </div>
    </div>

    <a-modal v-model:open="showNewFolder" title="新建文件夹" @ok="createFolder" @cancel="showNewFolder = false">
      <a-input v-model:value="newFolderName" placeholder="文件夹名称（如 gallery）" />
    </a-modal>

    <a-modal v-model:open="moveDialog.open" title="移动到文件夹" width="420px" @ok="confirmMove" @cancel="moveDialog.open = false">
      <a-radio-group v-model:value="moveDialog.target" direction="vertical" style="width:100%">
        <a-radio v-for="f in moveDialog.folders" :key="f.key" :value="f.key" style="display:flex;padding:6px 0">
          <FolderFilled style="margin-right:6px" /> {{ f.label }}
        </a-radio>
      </a-radio-group>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const { mediaUrl } = useMediaUrl()
const loading = ref(true)
const items = ref<any[]>([])
const total = ref(0)
const totalPages = ref(1)
const page = ref(1)
const limit = 30
const typeFilter = ref('all')
const folders = ref<{ key: string; label: string; preset?: boolean }[]>([])
const activeFolder = ref('all')
const showNewFolder = ref(false)
const newFolderName = ref('')
const selectedIds = reactive(new Set<string>())
let lastClickedIndex = -1

const moveDialog = reactive({
  open: false,
  target: '',
  folders: [] as { key: string; label: string }[],
})

const isImage = (item: any) => item.mimeType?.startsWith('image/')

const uploadFolder = computed(() => {
  if (activeFolder.value === 'all' || activeFolder.value === '__none__') return 'general'
  return activeFolder.value
})

function toggleSelect(id: string, index: number, event?: MouseEvent) {
  if (event?.shiftKey && lastClickedIndex >= 0) {
    const start = Math.min(lastClickedIndex, index)
    const end = Math.max(lastClickedIndex, index)
    for (let i = start; i <= end; i++) {
      const item = items.value[i]
      if (item) {
        if (selectedIds.has(item.id)) selectedIds.delete(item.id)
        else selectedIds.add(item.id)
      }
    }
    lastClickedIndex = index
    return
  }
  if (selectedIds.has(id)) selectedIds.delete(id)
  else selectedIds.add(id)
  lastClickedIndex = index
}

function onFolderClick({ key }: { key: string }) {
  if (key === '__add__') {
    showNewFolder.value = true
    return
  }
  activeFolder.value = key
  page.value = 1
  selectedIds.clear()
  loadMedia()
}

async function loadMedia() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit, type: typeFilter.value }
    if (activeFolder.value === '__none__') params.folder = ''
    else if (activeFolder.value !== 'all') params.folder = activeFolder.value
    const res = await api.get<any>('/media', params)
    items.value = res.items ?? []
    total.value = res.total ?? 0
    totalPages.value = res.totalPages ?? 1
  } catch {
    items.value = []
    total.value = 0
    totalPages.value = 0
  }
  selectedIds.clear()
  loading.value = false
}

async function loadFolders() {
  try {
    const res = await api.get<any[]>('/media/folders')
    folders.value = Array.isArray(res) ? res : []
  } catch {
    folders.value = []
  }
}

function beforeUpload(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('folder', uploadFolder.value)
  api.upload('/media/upload', fd)
    .then(() => { toast.success('上传成功'); loadMedia(); loadFolders() })
    .catch(() => toast.error('上传失败'))
  return false
}

async function handleRemove(item: any) {
  Modal.confirm({
    title: '删除确认',
    content: `确认删除「${item.filename}」？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await api.delete(`/media/${item.id}`)
        toast.success('已删除')
        loadMedia()
        loadFolders()
      } catch {
        toast.error('删除失败')
      }
    },
  })
}

async function handleBatchRemove() {
  if (!selectedIds.size) return
  const names = [...selectedIds].map(id => items.value.find(i => i.id === id)?.filename || '').filter(Boolean).slice(0, 5)
  const suffix = selectedIds.size > 5 ? ` 等 ${selectedIds.size} 项` : ''
  Modal.confirm({
    title: '批量删除',
    content: `确认删除以下文件？\n${names.join('、')}${suffix}`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await api.post('/media/batch/delete', { ids: [...selectedIds] })
        toast.success(`已删除 ${selectedIds.size} 项`)
        loadMedia()
        loadFolders()
      } catch {
        toast.error('删除失败')
      }
    },
  })
}

function openMoveDialog() {
  if (!selectedIds.size) return
  moveDialog.folders = folders.value.filter(f => f.key !== activeFolder.value && f.key !== '__none__')
  moveDialog.target = moveDialog.folders[0]?.key || ''
  moveDialog.open = true
}

async function confirmMove() {
  if (!moveDialog.target) { toast.warning('请选择目标文件夹'); return }
  try {
    await api.put('/media/batch/move', { ids: [...selectedIds], folder: moveDialog.target })
    toast.success(`已移动 ${selectedIds.size} 项`)
    moveDialog.open = false
    loadMedia()
    loadFolders()
  } catch {
    toast.error('移动失败')
  }
}

async function createFolder() {
  if (!newFolderName.value.trim()) {
    toast.warning('请输入文件夹名称')
    return
  }
  try {
    await api.post('/media/folders', { name: newFolderName.value.trim() })
    toast.success('已创建')
    showNewFolder.value = false
    newFolderName.value = ''
    loadFolders()
  } catch {
    toast.error('创建失败')
  }
}

onMounted(() => { loadMedia(); loadFolders() })
</script>

<style scoped>
.media-page { height:100%; }
.media-body { display:flex; gap:16px; height:100%; }
.media-sidebar { width:200px; flex-shrink:0; }
.media-main { flex:1; display:flex; flex-direction:column; min-width:0; }
.media-toolbar { display:flex; gap:12px; align-items:center; margin-bottom:12px; }
.selection-bar { display:flex; gap:10px; align-items:center; padding:8px 12px; margin-bottom:10px; background:var(--c-primary-soft); border-radius:6px; border:1px solid var(--c-primary); }
.selection-count { font-size:0.82rem; color:var(--c-text); margin-right:auto; }
.list-card { border-radius:8px; }
.media-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }
.media-item { position:relative; border:2px solid var(--border); border-radius:6px; overflow:hidden; transition:border-color 0.2s; display:flex; flex-direction:column; cursor:pointer; }
.media-item:hover { border-color:var(--c-primary); }
.media-item.selected { border-color:var(--c-primary); background:var(--c-primary-soft); }
.media-check { position:absolute; top:6px; left:6px; z-index:2; }
.media-img-wrap { display:flex; align-items:center; justify-content:center; width:100%; height:120px; overflow:hidden; background:var(--c-bg-1); }
.media-icon { width:100%; height:120px; display:flex; align-items:center; justify-content:center; color:var(--c-text-3); background:var(--c-bg-1); }
.media-meta { display:flex; align-items:center; padding:4px 6px; gap:4px; }
.media-name { font-size:0.7rem; color:var(--c-text-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
.media-pagination { display:flex; justify-content:center; margin-top:16px; }
.preset-tag {
  margin-left: 4px;
  font-size: 0.62rem;
  color: var(--c-primary);
  background: var(--c-primary-soft);
  padding: 0 5px;
  border-radius: 4px;
}
</style>
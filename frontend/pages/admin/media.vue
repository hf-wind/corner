<template>
  <div class="media-page admin-page-shell">
    <header class="admin-page-head"><div><span>CONTENT RESOURCES</span><h1>媒体库</h1><p>按文件夹整理图片、视频、音频和文档。</p></div><div class="head-actions"><AdminRefreshButton :loading="loading" @click="loadAll" /><a-upload :show-upload-list="false" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" :before-upload="beforeUpload"><a-button type="primary"><UploadOutlined /> 上传文件</a-button></a-upload></div></header>
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
          </a-menu-item>
          <a-menu-item key="__add__" class="menu-add-folder" @click.stop="showNewFolder = true">
            <FolderAddOutlined /> 新建文件夹
          </a-menu-item>
        </a-menu>
      </div>
      <div class="media-main">
        <div class="media-toolbar">
          <a-radio-group v-model:value="typeFilter" @change="changeType">
            <a-radio-button value="all">全部</a-radio-button>
            <a-radio-button value="image">图片</a-radio-button>
            <a-radio-button value="video">视频</a-radio-button>
            <a-radio-button value="audio">音频</a-radio-button>
            <a-radio-button value="document">文档</a-radio-button>
          </a-radio-group>
        </div>

        <div v-if="selectedIds.size" class="selection-bar">
          <span class="selection-count">已选中 {{ selectedIds.size }} 项</span>
          <a-button size="small" @click="openMoveDialog"><FolderAddOutlined /> 移动到</a-button>
          <a-button size="small" danger @click="handleBatchRemove"><DeleteOutlined /> 删除</a-button>
          <a-button size="small" @click="selectedIds.clear()">取消选择</a-button>
        </div>

        <div class="media-content-scroll">
          <a-spin :spinning="loading">
            <div class="media-content-inner">
              <div class="media-grid" v-if="items.length">
              <div
                v-for="(item, i) in items" :key="item.id"
                class="media-item"
                :class="{ selected: selectedIds.has(item.id) }"
                @click="toggleSelect(item.id, i, $event)"
                @dblclick.stop="previewItem(item)"
              >
                <div class="media-check" @click.stop>
                  <a-checkbox :checked="selectedIds.has(item.id)" @change="toggleSelect(item.id, i)" />
                </div>
                <div v-if="isImage(item)" class="media-img-wrap">
                  <img :src="mediaUrl(item.path)" :alt="item.originalName || item.filename" />
                </div>
                <div v-else-if="isAudio(item)" class="media-audio-wrap" @click.stop>
                  <Icon name="ph:waveform-bold" />
                  <audio :src="mediaUrl(item.path)" controls preload="metadata" />
                </div>
                <div v-else class="media-icon"><FileOutlined style="font-size:28px" /></div>
                <div class="media-meta">
                  <span class="media-name" :title="item.filename">{{ item.filename }}</span>
                  <a-button type="link" size="small" @click.stop="previewItem(item)"><Icon name="ph:eye-bold" /> 预览</a-button>
                  <a-button type="link" size="small" danger @click.stop="handleRemove(item)">删除</a-button>
                </div>
              </div>
              </div>
              <a-empty v-else description="暂无文件" />
            </div>
          </a-spin>
        </div>

        <AdminPagination v-model:current="page" v-model:page-size="pageSize" :total="total" @change="changePage" />
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
    <ImageLightbox v-model="preview.open" v-model:index="preview.index" :images="previewItems" label="媒体库预览" />
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
const pageSize = ref(10)
const typeFilter = ref('all')
const folders = ref<{ key: string; label: string; preset?: boolean }[]>([])
const activeFolder = ref('all')
const showNewFolder = ref(false)
const newFolderName = ref('')
const selectedIds = reactive(new Set<string>())
const preview = reactive({ open: false, index: 0 })
const previewItems = computed(() => items.value.map(item => ({
  id: item.id,
  src: item.path,
  name: item.originalName || item.filename,
  caption: item.originalName || item.filename,
  mimeType: item.mimeType,
})))
let lastClickedIndex = -1

const moveDialog = reactive({
  open: false,
  target: '',
  folders: [] as { key: string; label: string }[],
})

const isImage = (item: any) => item.mimeType?.startsWith('image/')
const isAudio = (item: any) => item.mimeType?.startsWith('audio/')

function previewItem(item: any) {
  const index = items.value.findIndex(entry => entry.id === item.id)
  if (index < 0) return
  preview.index = index
  preview.open = true
}

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
    const params: any = { page: page.value, limit: pageSize.value, type: typeFilter.value }
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

function changeType() {
  page.value = 1
  void loadMedia()
}

function changePage(next: number) {
  page.value = next
  void loadMedia()
}
async function loadAll() { await Promise.all([loadMedia(), loadFolders()]) }

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
.media-page { display:flex; height:100%; min-height:0; flex-direction:column; overflow:hidden!important; }
.head-actions { display:flex; align-items:center; gap:8px; }
.media-body { display:flex; min-height:0; flex:1; gap:0; overflow:hidden; border:1px solid var(--border); border-radius:8px; background:var(--ld-bg-card); }
.media-sidebar { width:200px; min-height:0; flex-shrink:0; overflow-y:auto; padding:8px 0; border-right:1px solid var(--border); }
.media-main { flex:1; display:flex; flex-direction:column; min-width:0; min-height:0; overflow:hidden; }
.media-toolbar { display:flex; gap:12px; align-items:center; margin-bottom:12px; }
.selection-bar { display:flex; gap:10px; align-items:center; padding:8px 12px; margin-bottom:10px; background:var(--c-primary-soft); border-radius:6px; border:1px solid var(--c-primary); }
.selection-count { font-size:0.82rem; color:var(--c-text); margin-right:auto; }
.media-content-scroll { min-height:0; flex:1; overflow:hidden; }.media-content-scroll :deep(.ant-spin-nested-loading),.media-content-scroll :deep(.ant-spin-container){height:100%;min-height:0}.media-content-scroll :deep(.ant-spin-container){overflow-y:auto}.media-content-inner{min-height:100%;padding:12px}
.media-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }
.media-item { position:relative; border:2px solid var(--border); border-radius:6px; overflow:hidden; transition:border-color 0.2s; display:flex; flex-direction:column; cursor:pointer; }
.media-item:hover { border-color:var(--c-primary); }
.media-item.selected { border-color:var(--c-primary); background:var(--c-primary-soft); }
.media-check { position:absolute; top:6px; left:6px; z-index:2; }
.media-img-wrap { display:flex; align-items:center; justify-content:center; width:100%; height:120px; overflow:hidden; background:var(--c-bg-1); }
.media-img-wrap img { width:100%; height:100%; object-fit:cover; }
.media-audio-wrap { display:flex; width:100%; height:120px; box-sizing:border-box; align-items:center; justify-content:center; flex-direction:column; gap:10px; padding:18px 10px 10px; overflow:hidden; background:var(--c-bg-1); color:var(--c-primary); font-size:1.5rem; }
.media-audio-wrap audio { display:block; width:100%; max-width:220px; height:32px; }
.media-icon { width:100%; height:120px; display:flex; align-items:center; justify-content:center; color:var(--c-text-3); background:var(--c-bg-1); }
.media-meta { display:flex; align-items:center; min-height:38px; padding:4px 6px; gap:4px; }
.media-name { font-size:0.7rem; color:var(--c-text-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
@media(max-width:700px){.media-body{flex-direction:column}.media-sidebar{width:100%;max-height:150px;border-right:0;border-bottom:1px solid var(--border)}.head-actions{align-items:stretch;flex-wrap:wrap}}
</style>

<template>
  <a-modal v-model:open="visible" title="媒体库" width="80%" :footer="null" :closable="true" @cancel="handleClose" destroyOnClose>
    <div class="media-layout">
      <div class="media-sidebar">
        <a-menu :selectedKeys="[activeMenu]" mode="inline" @click="handleMenuSelect" class="mlib-menu">
          <a-menu-item key="all"><FolderOutlined /> 全部</a-menu-item>
          <a-menu-item v-for="f in folders" :key="`folder:${f.key}`">
            <FolderFilled /> {{ f.label }}
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="type:image"><PictureOutlined /> 图片</a-menu-item>
          <a-menu-item key="type:video"><PlaySquareOutlined /> 视频</a-menu-item>
          <a-menu-item key="type:document"><FileTextOutlined /> 文档</a-menu-item>
        </a-menu>
      </div>
      <div class="media-main">
        <div class="media-toolbar">
          <a-upload
            :showUploadList="false"
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            :beforeUpload="handleUpload"
          >
            <a-button size="small" type="primary"><UploadOutlined /> 上传</a-button>
          </a-upload>
          <a-popconfirm title="确认删除？" @confirm="handleDelete">
            <a-button size="small" danger :disabled="!selected.length"><DeleteOutlined /> 删除</a-button>
          </a-popconfirm>
          <div class="toolbar-spacer" />
          <a-button v-if="!readonly" type="primary" size="small" :disabled="!selected.length" @click="handleConfirm">
            <CheckOutlined /> 确认 ({{ selected.length }})
          </a-button>
        </div>

        <a-spin :spinning="loading" class="media-spin">
          <div class="media-grid">
            <div
              v-for="item in items" :key="item.id"
              class="media-card"
              :class="{ selected: selectedIds.has(item.id) }"
              @click="toggleSelect(item)"
            >
              <div class="media-card-preview">
                <img v-if="isImage(item)" :src="mediaUrl(item.path)" class="media-card-img" />
                <div v-else class="media-card-icon"><FileOutlined /></div>
                <div class="media-card-selected" v-if="selectedIds.has(item.id)">
                  <CheckOutlined />
                </div>
              </div>
              <div class="media-card-footer">
                <span class="media-card-name">{{ item.filename }}</span>
              </div>
            </div>
          </div>
          <a-empty v-if="!items.length && !loading" description="暂无文件" style="margin:48px 0" />
        </a-spin>

        <div class="media-pagination" v-if="totalPages > 1">
          <a-pagination v-model:current="page" :pageSize="limit" :total="total" size="small" @change="loadMedia" />
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  multiple?: boolean
  readonly?: boolean
  folder?: string
  compressAnimated?: boolean
  returnItems?: boolean
}>(), { multiple: false, readonly: false, folder: '', compressAnimated: false, returnItems: false })

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', payload: any[]): void
  (e: 'cancel'): void
}>()

const api = useApi()
const toast = useToast()
const { mediaUrl } = useMediaUrl()

const visible = ref(props.modelValue)
const loading = ref(false)
const items = ref<any[]>([])
const folders = ref<{ key: string; label: string; preset?: boolean }[]>([])
const total = ref(0)
const totalPages = ref(1)
const page = ref(1)
const limit = 30
const activeMenu = ref('all')
const selectedIds = ref(new Set<string>())
const selected = computed(() => items.value.filter((i) => selectedIds.value.has(i.id)))
const uploadFolder = computed(() => {
  if (activeMenu.value.startsWith('folder:')) return activeMenu.value.slice(7)
  return props.folder || 'general'
})

watch(() => props.modelValue, (v) => { visible.value = v })
watch(() => props.folder, (f) => {
  if (f) activeMenu.value = `folder:${f}`
})

const isImage = (item: any) => item.mimeType?.startsWith('image/')

function toggleSelect(item: any) {
  if (!props.multiple) {
    selectedIds.value.clear()
    selectedIds.value.add(item.id)
    return
  }
  if (selectedIds.value.has(item.id)) selectedIds.value.delete(item.id)
  else selectedIds.value.add(item.id)
}

async function loadFolders() {
  try {
    const res = await api.get<any[]>('/media/folders')
    folders.value = Array.isArray(res) ? res : []
  } catch {
    folders.value = []
  }
}

async function loadMedia() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit }
    if (activeMenu.value.startsWith('type:')) {
      params.type = activeMenu.value.slice(5)
    } else if (activeMenu.value.startsWith('folder:')) {
      params.folder = activeMenu.value.slice(7)
    } else if (props.folder) {
      params.folder = props.folder
    }
    const res = await api.get<any>('/media', params)
    items.value = res.items ?? []
    total.value = res.total ?? 0
    totalPages.value = res.totalPages ?? 1
  } catch {
    items.value = []
    total.value = 0
    totalPages.value = 1
  }
  loading.value = false
}

function handleMenuSelect({ key }: { key: string }) {
  activeMenu.value = key
  page.value = 1
  selectedIds.value.clear()
  loadMedia()
}

function handleUpload(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('folder', uploadFolder.value)
  if (props.compressAnimated) {
    fd.append('compressAnimated', 'true')
  }
  api.upload('/media/upload', fd)
    .then(() => { toast.success('上传成功'); loadMedia() })
    .catch(() => toast.error('上传失败'))
  return false
}

async function handleDelete() {
  const ids = [...selectedIds.value]
  try {
    await Promise.all(ids.map((id) => api.delete(`/media/${id}`)))
    toast.success(`已删除 ${ids.length} 个文件`)
    selectedIds.value.clear()
    loadMedia()
  } catch {
    toast.error('删除失败')
  }
}

function handleConfirm() {
  emit('confirm', props.returnItems ? selected.value : selected.value.map((i) => i.path))
  visible.value = false
}

function handleClose() {
  selectedIds.value.clear()
  emit('cancel')
  emit('update:modelValue', false)
}

watch(visible, (v) => {
  if (v) {
    selectedIds.value.clear()
    if (props.folder) activeMenu.value = `folder:${props.folder}`
    loadFolders()
    loadMedia()
  }
})
</script>

<style scoped>
.media-layout { display:flex; gap:16px; height:60vh; }
.media-sidebar { width:150px; flex-shrink:0; overflow-y:auto; }
.mlib-menu { border-inline-end:none !important; background:transparent; }
.mlib-menu :deep(.ant-menu-item) { height:34px; line-height:34px; margin:2px 0; border-radius:6px; font-size:0.82rem; }
.mlib-menu :deep(.ant-menu-item-selected) { background:var(--c-primary-soft); font-weight:600; }
.media-main { flex:1; display:flex; flex-direction:column; min-width:0; min-height:0; }
.media-toolbar { display:flex; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
.toolbar-spacer { flex:1; }
.media-spin { flex:1; display:flex; min-height:0; }
.media-spin :deep(.ant-spin-nested-loading),.media-spin :deep(.ant-spin-container) { display:flex; flex:1; min-height:0; flex-direction:column; }
.media-grid { display:grid; flex:1; min-height:0; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:10px; overflow-y:auto; overscroll-behavior:contain; padding:4px; }
.media-card { border-radius:8px; overflow:hidden; border:2px solid transparent; cursor:pointer; transition:all 0.15s; background:var(--ld-bg-card); }
.media-card:hover { border-color:var(--c-primary); }
.media-card.selected { border-color:var(--c-primary); }
.media-card-preview { position:relative; width:100%; height:110px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--c-bg-1); }
.media-card-img { width:100%; height:100%; object-fit:cover; display:block; }
.media-card-icon { font-size:32px; color:var(--c-text-3); }
.media-card-selected { position:absolute; top:6px; right:6px; width:22px; height:22px; border-radius:50%; background:var(--c-primary); display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; }
.media-card-footer { padding:6px 8px; }
.media-card-name { display:block; font-size:0.7rem; color:var(--c-text-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.media-pagination { display:flex; justify-content:center; padding-top:12px; }
</style>

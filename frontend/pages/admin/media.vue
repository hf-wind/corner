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

        <a-spin :spinning="loading" class="table-spin">
          <a-card :bordered="false" class="list-card" size="small">
            <div class="media-grid" v-if="items.length">
              <div v-for="item in items" :key="item.id" class="media-item">
                <div v-if="isImage(item)" class="media-img-wrap">
                  <a-image :src="mediaUrl(item.path)" style="width:100%;height:120px;object-fit:cover" />
                </div>
                <div v-else class="media-icon"><FileOutlined style="font-size:28px" /></div>
                <div class="media-meta">
                  <span class="media-name" :title="item.originalName || item.filename">{{ item.originalName || item.filename }}</span>
                  <a-button type="link" size="small" danger @click="handleRemove(item)">删除</a-button>
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
  </div>
</template>

<script setup lang="ts">
import { message, Modal } from 'ant-design-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
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

const isImage = (item: any) => item.mimeType?.startsWith('image/')

const uploadFolder = computed(() => {
  if (activeFolder.value === 'all' || activeFolder.value === '__none__') return 'general'
  return activeFolder.value
})

function onFolderClick({ key }: { key: string }) {
  if (key === '__add__') {
    showNewFolder.value = true
    return
  }
  activeFolder.value = key
  page.value = 1
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
    .then(() => { message.success('上传成功'); loadMedia(); loadFolders() })
    .catch(() => message.error('上传失败'))
  return false
}

async function handleRemove(item: any) {
  Modal.confirm({
    title: '删除确认',
    content: `确认删除「${item.originalName || item.filename}」？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await api.delete(`/media/${item.id}`)
        message.success('已删除')
        loadMedia()
        loadFolders()
      } catch {
        message.error('删除失败')
      }
    },
  })
}

async function createFolder() {
  if (!newFolderName.value.trim()) {
    message.warning('请输入文件夹名称')
    return
  }
  try {
    await api.post('/media/folders', { name: newFolderName.value.trim() })
    message.success('已创建')
    showNewFolder.value = false
    newFolderName.value = ''
    loadFolders()
  } catch {
    message.error('创建失败')
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
.list-card { border-radius:8px; }
.media-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px; }
.media-item { border:1px solid var(--border); border-radius:4px; overflow:hidden; transition:border-color 0.2s; display:flex; flex-direction:column; }
.media-item:hover { border-color:var(--c-primary); }
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

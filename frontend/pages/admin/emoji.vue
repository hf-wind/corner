<template>
  <div>
    <div class="table-toolbar">
      <a-button type="primary" @click="openAddPack"><PlusOutlined /> 添加表情包</a-button>
    </div>

    <div class="emoji-body" v-if="!loading">
      <a-spin :spinning="saving" class="table-spin">
        <div v-for="pack in packs" :key="pack.id" class="emoji-pack-card">
          <div class="pack-header" @click="togglePackExpand(pack.id)">
            <div class="pack-info">
              <Icon :name="expandedPacks[pack.id] ? 'ph:caret-down-bold' : 'ph:caret-right-bold'" class="pack-collapse-icon" />
              <span class="pack-name">{{ pack.name }}</span>
              <span class="pack-type" :class="pack.type">{{ pack.type === 'animated' ? '动态' : '静态' }}</span>
              <span class="pack-count">{{ pack.items?.length || 0 }} 个表情</span>
              <a-switch v-model:checked="pack.enabled" size="small" @click.stop @change="togglePack(pack)" checked-children="启" un-checked-children="关" />
            </div>
            <div class="pack-actions" @click.stop>
              <a-button type="link" size="small" @click="openAddItem(pack)"><PlusOutlined /> 添加表情</a-button>
              <a-button type="link" size="small" @click="openEditPack(pack)"><EditOutlined /></a-button>
              <a-button type="link" size="small" danger @click="removePack(pack)"><DeleteOutlined /></a-button>
            </div>
          </div>
          <div v-show="expandedPacks[pack.id]" class="pack-items">
            <div v-for="item in pack.items" :key="item.id" class="emoji-item-card" @click="openEditItem(pack, item)">
              <div v-if="pack.type === 'animated' && item.imageUrl" class="emoji-item-img">
                <img :src="mediaUrl(item.imageUrl)" :alt="item.label" loading="lazy" :data-fallback="item.char || '?'" @error="onImgError" />
              </div>
              <div v-else-if="item.char" class="emoji-item-char">{{ item.char }}</div>
              <div v-else class="emoji-item-char">❓</div>
              <div class="emoji-item-label">{{ item.label || item.char }}</div>
            </div>
          </div>
        </div>
      </a-spin>
    </div>

    <a-modal v-model:open="packDialog.open" :title="packDialog.editing ? '编辑表情包' : '添加表情包'" width="420px" @ok="confirmPack">
      <div class="add-field">
        <label class="add-label">名称</label>
        <a-input v-model:value="packDialog.name" placeholder="如：笑脸·静态" />
      </div>
      <div class="add-field">
        <label class="add-label">类型</label>
        <a-select v-model:value="packDialog.type" style="width:100%">
          <a-select-option value="static">静态（Unicode 字符）</a-select-option>
          <a-select-option value="animated">动态（图片 URL）</a-select-option>
        </a-select>
      </div>
      <div class="add-field" v-if="packDialog.type === 'animated'">
        <label class="add-label">GIF 压缩</label>
        <a-switch v-model:checked="packDialog.compressAnimated" checked-children="开" un-checked-children="关" />
        <div class="add-hint">上传 GIF 时自动压缩为动画 WebP</div>
      </div>
      <div class="add-field">
        <label class="add-label">排序</label>
        <a-input-number v-model:value="packDialog.sort" :min="0" style="width:100%" />
      </div>
    </a-modal>

    <a-modal v-model:open="itemDialog.open" :title="itemDialog.editing ? '编辑表情' : '添加表情'" width="480px" @ok="confirmItem">
      <div class="add-field">
        <label class="add-label">标签</label>
        <a-input v-model:value="itemDialog.label" placeholder="表情描述文字" />
      </div>
      <template v-if="selectedPackType === 'static'">
        <div class="add-field">
          <label class="add-label">字符</label>
          <a-input v-model:value="itemDialog.char" placeholder="如：😀" maxlength="4" />
          <div class="add-hint">输入 Unicode 表情字符</div>
        </div>
      </template>
      <template v-else>
        <div class="add-field">
          <label class="add-label">图片 URL</label>
          <a-input v-model:value="itemDialog.imageUrl" placeholder="https://..." />
        </div>
        <div class="add-field">
          <label class="add-label">或从媒体库选择</label>
          <a-button @click="openMediaLibrary"><FolderOutlined /> 选择图片</a-button>
        </div>
        <div v-if="itemDialog.imageUrl" class="emoji-item-preview">
          <img :src="mediaUrl(itemDialog.imageUrl)" alt="preview" loading="lazy" :data-fallback="itemDialog.char || '?'" @error="onImgError" />
        </div>
      </template>
      <div class="add-field">
        <label class="add-label">排序</label>
        <a-input-number v-model:value="itemDialog.sort" :min="0" style="width:100%" />
      </div>
      <div v-if="itemDialog.editing" class="dialog-footer">
        <a-button danger @click="deleteItemFromDialog"><DeleteOutlined /> 删除</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const { mediaUrl } = useMediaUrl()
const loading = ref(true)
const saving = ref(false)
const packs = ref<any[]>([])
const expandedPacks = ref<Record<string, boolean>>({})

const packDialog = reactive({ open: false, editing: false, id: '', name: '', type: 'static', sort: 0, compressAnimated: false })
const itemDialog = reactive({ open: false, editing: false, id: '', packId: '', label: '', char: '', imageUrl: '', sort: 0 })
const selectedPackType = ref('static')

async function loadPacks() {
  try {
    const data = await api.get<any[]>('/emoji-packs/all')
    packs.value = data
  } catch { toast.error('加载表情包失败') }
  loading.value = false
}

function togglePackExpand(id: string) {
  expandedPacks.value[id] = !expandedPacks.value[id]
}

function openAddPack() {
  packDialog.editing = false
  packDialog.id = ''
  packDialog.name = ''
  packDialog.type = 'static'
  packDialog.sort = 0
  packDialog.compressAnimated = true
  packDialog.open = true
}

function openEditPack(pack: any) {
  packDialog.editing = true
  packDialog.id = pack.id
  packDialog.name = pack.name
  packDialog.type = pack.type
  packDialog.sort = pack.sort
  packDialog.compressAnimated = pack.compressAnimated ?? true
  packDialog.open = true
}

async function confirmPack() {
  if (!packDialog.name.trim()) { toast.warning('请输入名称'); return }
  saving.value = true
  try {
      if (packDialog.editing) {
        await api.put(`/emoji-packs/${packDialog.id}`, {
          name: packDialog.name,
          type: packDialog.type,
          sort: packDialog.sort,
          compressAnimated: packDialog.compressAnimated,
        })
        toast.success('已更新')
      } else {
        await api.post('/emoji-packs', {
          name: packDialog.name,
          type: packDialog.type,
          sort: packDialog.sort,
          compressAnimated: packDialog.compressAnimated && packDialog.type === 'animated',
        })
        toast.success('已创建')
      }
    packDialog.open = false
    await loadPacks()
  } catch { toast.error('操作失败') }
  saving.value = false
}

async function togglePack(pack: any) {
  try {
    await api.put(`/emoji-packs/${pack.id}`, { enabled: pack.enabled })
  } catch { pack.enabled = !pack.enabled }
}

async function removePack(pack: any) {
  try {
    await api.delete(`/emoji-packs/${pack.id}`)
    toast.success('已删除')
    await loadPacks()
  } catch { toast.error('删除失败') }
}

function openAddItem(pack: any) {
  selectedPackType.value = pack.type
  itemDialog.editing = false
  itemDialog.id = ''
  itemDialog.packId = pack.id
  itemDialog.label = ''
  itemDialog.char = ''
  itemDialog.imageUrl = ''
  itemDialog.sort = 0
  itemDialog.open = true
}

function openEditItem(pack: any, item: any) {
  selectedPackType.value = pack.type
  itemDialog.editing = true
  itemDialog.id = item.id
  itemDialog.packId = pack.id
  itemDialog.label = item.label || ''
  itemDialog.char = item.char || ''
  itemDialog.imageUrl = item.imageUrl || ''
  itemDialog.sort = item.sort || 0
  itemDialog.open = true
}

async function confirmItem() {
  if (selectedPackType.value === 'static' && !itemDialog.char.trim()) { toast.warning('请输入表情字符'); return }
  if (selectedPackType.value === 'animated' && !itemDialog.imageUrl.trim()) { toast.warning('请输入图片 URL'); return }
  saving.value = true
  try {
    if (itemDialog.editing) {
      await api.put(`/emoji-packs/items/${itemDialog.id}`, {
        label: itemDialog.label,
        char: itemDialog.char,
        imageUrl: itemDialog.imageUrl,
        sort: itemDialog.sort,
      })
      toast.success('已更新')
    } else {
      await api.post('/emoji-packs/items', {
        packId: itemDialog.packId,
        label: itemDialog.label,
        char: itemDialog.char,
        imageUrl: itemDialog.imageUrl,
        sort: itemDialog.sort,
      })
      toast.success('已添加')
    }
    itemDialog.open = false
    await loadPacks()
  } catch { toast.error('操作失败') }
  saving.value = false
}

async function deleteItemFromDialog() {
  const pack = packs.value.find((p) => p.id === itemDialog.packId)
  if (!pack) return
  try {
    await api.delete(`/emoji-packs/items/${itemDialog.id}`)
    pack.items = pack.items.filter((i: any) => i.id !== itemDialog.id)
    itemDialog.open = false
    toast.success('已删除')
  } catch { toast.error('删除失败') }
}

async function removeItem(pack: any, item: any) {
  try {
    await api.delete(`/emoji-packs/items/${item.id}`)
    pack.items = pack.items.filter((i: any) => i.id !== item.id)
    toast.success('已删除')
  } catch { toast.error('删除失败') }
}

async function openMediaLibrary() {
  const { open } = useMediaLibrary()
  const currentPack = packs.value.find((p) => p.id === itemDialog.packId)
  const compressAnimated = currentPack?.compressAnimated && currentPack?.type === 'animated'
  const urls = await open({ folder: 'emoji', compressAnimated: !!compressAnimated })
  if (urls.length) {
    itemDialog.imageUrl = urls[0]
  }
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  const fallback = img.getAttribute('data-fallback')
  if (fallback) {
    const span = document.createElement('span')
    span.className = 'emoji-char-fallback'
    span.textContent = fallback
    img.parentNode?.replaceChild(span, img)
  } else {
    img.style.display = 'none'
  }
}

onMounted(loadPacks)
</script>

<style scoped>
.table-toolbar { margin-bottom: 14px; }

.emoji-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.emoji-pack-card {
  background: var(--ld-bg-card);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 14px var(--ld-shadow);
}

.pack-collapse-icon {
  font-size: 0.75rem;
  color: var(--c-text-3);
  flex-shrink: 0;
  transition: transform 0.2s;
}

.pack-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.pack-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pack-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--c-text);
}

.pack-type {
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.pack-type.static {
  background: var(--c-primary-soft);
  color: var(--c-primary);
}

.pack-type.animated {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.pack-count {
  font-size: 0.7rem;
  color: var(--c-text-3);
  font-weight: 500;
}

.pack-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.pack-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  overflow: hidden;
}

.pack-items-enter-active,
.pack-items-leave-active {
  transition: all 0.2s ease;
}

.emoji-item-card {
  width: 88px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px 6px;
  border-radius: 10px;
  background: var(--c-bg-1);
  position: relative;
  transition: background 0.15s;
  cursor: pointer;
}

.emoji-item-card:hover {
  background: var(--c-bg-2);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--border);
  padding-top: 12px;
  margin-top: 8px;
}

.emoji-item-img img {
  width: 48px;
  height: 48px;
  display: block;
}

.emoji-item-img .emoji-char-fallback {
  font-size: 1.6rem;
  line-height: 48px;
  text-align: center;
  display: block;
}

.emoji-item-char {
  font-size: 1.6rem;
  line-height: 1;
}

.emoji-item-label {
  font-size: 0.55rem;
  color: var(--c-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 64px;
  text-align: center;
}

.add-field {
  margin-bottom: 14px;
}

.add-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--c-text);
  margin-bottom: 4px;
}

.add-hint {
  font-size: 0.65rem;
  color: var(--c-text-3);
  margin-top: 3px;
}

.emoji-item-preview {
  margin-top: 8px;
  padding: 12px;
  background: var(--c-bg-1);
  border-radius: 8px;
  display: flex;
  justify-content: center;
}

.emoji-item-preview img {
  max-width: 128px;
  max-height: 128px;
}
</style>

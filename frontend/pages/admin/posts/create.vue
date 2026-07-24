<template>
  <div class="editor-page">
    <div class="editor-layout">
      <div class="editor-main">
        <div class="editor-field">
          <a-input v-model:value="form.title" placeholder="输入文章标题…" class="title-input" :bordered="false"
            @input="onTitleInput" />
        </div>

        <div class="editor-field editor-field-grow">
          <client-only>
            <MdEditor :key="editorKey" v-model="form.content" language="zh-CN" :toolbars="toolbars" :theme="editorTheme"
              @upload-img="onUploadImg" class="md-editor" />
          </client-only>
        </div>
      </div>

      <div class="editor-sidebar">
        <a-card :bordered="false" class="meta-card" size="small" title="发布设置">
          <div class="meta-row">
            <label>Slug</label>
            <a-input v-model:value="form.slug" placeholder="自动生成" size="small" @input="slugManual = true" />
          </div>
          <div class="meta-row">
            <label>状态</label>
            <a-select v-model:value="form.status" size="small" style="width:100%">
              <a-select-option value="draft">草稿</a-select-option>
              <a-select-option value="published">发布</a-select-option>
            </a-select>
          </div>
          <div class="meta-row meta-row-inline">
            <label>推荐</label>
            <a-switch v-model:checked="form.featured" />
            <a-button type="primary" size="small" @click="publish" :loading="saving" style="margin-left:auto">
              {{ saving ? '发布中…' : '发布' }}
            </a-button>
          </div>
        </a-card>

        <a-card :bordered="false" class="meta-card" size="small" title="分类">
          <a-tree-select v-model:value="form.categoryId" :tree-data="categoryTree"
            :fieldNames="{ label: 'name', value: 'id', children: 'children' }" placeholder="选择分类" allow-clear
            size="small" style="width:100%" />
        </a-card>

        <a-card :bordered="false" class="meta-card" size="small" title="标签">
          <a-select v-model:value="form.tagIds" mode="multiple" size="small" style="width:100%" placeholder="选择标签">
            <a-select-option v-for="t in tags" :key="t.id" :value="t.id">{{ t.name }}</a-select-option>
          </a-select>
        </a-card>

        <a-card :bordered="false" class="meta-card" size="small" title="摘要">
          <a-textarea v-model:value="form.excerpt" :rows="4" placeholder="文章摘要（可选，可 AI 生成）" />
          <a-button block size="small" class="gen-excerpt-btn" :loading="generatingExcerpt" @click="generateExcerpt">
            <template v-if="!generatingExcerpt">
              <ThunderboltOutlined /> 生成摘要
            </template>
            <template v-else>生成中…</template>
          </a-button>
        </a-card>

        <a-card :bordered="false" class="meta-card" size="small" title="封面图">
          <div class="cover-setter" @click="coverOpen = true">
            <div v-if="form.coverImage" class="cover-preview">
              <img :src="mediaUrl(form.coverImage)" class="cover-img" />
              <div class="cover-overlay">点击修改</div>
            </div>
            <div v-else class="cover-placeholder">
              <PictureOutlined /> 点击设置封面
            </div>
          </div>
        </a-card>
      </div>
    </div>

    <a-modal v-model:open="coverOpen" title="设置封面" width="420px" :footer="null" @cancel="coverOpen = false"
      destroyOnClose>
      <div class="cover-modal-body">
        <a-button block size="large" @click="coverUpload" class="cover-modal-btn">
          <UploadOutlined /> 上传图片
        </a-button>
        <div class="cover-modal-divider"><span>或</span></div>
        <div class="cover-modal-url">
          <a-input v-model:value="coverUrlInput" placeholder="输入图片 URL" allow-clear @keyup.enter="coverConfirmUrl" />
          <a-button type="primary" :disabled="!coverUrlInput.trim()" @click="coverConfirmUrl">确定</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { message, Modal } from 'ant-design-vue'
import { ThunderboltOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { buildSlug, ensureSlug } from '~/utils/postMeta'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const { mediaUrl } = useMediaUrl()
const router = useRouter()
const saving = ref(false)
const generatingExcerpt = ref(false)
const categories = ref<any[]>([])
const tags = ref<any[]>([])
const form = ref({
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  coverImage: '',
  categoryId: undefined as string | undefined,
  status: 'draft',
  tagIds: [] as string[],
  featured: false,
})
const editorKey = ref(0)
const coverOpen = ref(false)
const coverUrlInput = ref('')
const slugManual = ref(false)
const createdSlug = ref('')

const categoryTree = computed(() => buildTree(categories.value))

function buildTree(items: any[]): any[] {
  return items.map((c: any) => ({ ...c, children: c.children?.length ? buildTree(c.children) : undefined }))
}

const toolbars = [
  'bold', 'underline', 'italic', 'strikeThrough', 'title', 'sub', 'sup',
  'quote', 'unorderedList', 'orderedList', 'task', 'codeRow', 'code',
  'link', 'image', 'table', 'mermaid', 'katex', 'revoke', 'next',
  'save', 'pageFullscreen', 'fullscreen', 'preview',
]

const editorTheme = computed(() => {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
})

let autoSaveTimer: ReturnType<typeof setInterval> | null = null
let hasUnsaved = false
let originalContent = ''

function onTitleInput() {
  if (!slugManual.value) {
    form.value.slug = buildSlug(form.value.title)
  }
}

onMounted(async () => {
  const [catRes, tagRes] = await Promise.all([
    api.get<any>('/categories').catch(() => []),
    api.get<any>('/tags').catch(() => []),
  ])
  categories.value = Array.isArray(catRes) ? catRes : []
  tags.value = Array.isArray(tagRes) ? tagRes : []
  const obs = new MutationObserver(() => { editorKey.value++ })
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  originalContent = JSON.stringify(form.value)
  autoSaveTimer = setInterval(autoSave, 30000)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  if (autoSaveTimer) clearInterval(autoSaveTimer)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

watch(() => form.value, () => { hasUnsaved = JSON.stringify(form.value) !== originalContent }, { deep: true })

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (hasUnsaved) { e.preventDefault(); e.returnValue = '' }
}

async function autoSave() {
  if (!hasUnsaved || !form.value.title) return
  form.value.slug = ensureSlug(form.value.slug, form.value.title)
  try {
    if (createdSlug.value) {
      await api.put(`/posts/${createdSlug.value}`, { ...form.value, status: 'draft' })
      if (form.value.slug && form.value.slug !== createdSlug.value) {
        createdSlug.value = form.value.slug
      }
    } else {
      const res = await api.post<any>('/posts', { ...form.value, status: 'draft' })
      createdSlug.value = res?.slug || form.value.slug
      if (res?.slug) form.value.slug = res.slug
    }
    originalContent = JSON.stringify(form.value)
    hasUnsaved = false
  } catch { /* silent */ }
}

function coverConfirmUrl() {
  const v = coverUrlInput.value.trim()
  if (v) { form.value.coverImage = v; coverOpen.value = false; coverUrlInput.value = '' }
}

async function coverUpload() {
  const { open } = useMediaLibrary()
  const urls = await open({ multiple: false, folder: 'cover' })
  if (urls.length) { form.value.coverImage = urls[0]; coverOpen.value = false }
}

async function onUploadImg(files: File[], callback: (urls: string[]) => void) {
  try {
    const urls: string[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'article')
      const res = await api.upload<any>('/media/upload', fd)
      urls.push(res.path || '')
    }
    callback(urls)
  } catch {
    message.error('上传失败')
  }
}

async function generateExcerpt() {
  if (!form.value.content?.trim() || form.value.content.trim().length < 20) {
    message.warning('请先写一些正文再生成摘要')
    return
  }
  const run = async () => {
    generatingExcerpt.value = true
    try {
      const res = await api.post<{ excerpt: string; source?: string }>('/ai/summarize', {
        title: form.value.title,
        content: form.value.content,
      })
      form.value.excerpt = res.excerpt || ''
      message.success(res.source === 'ai' ? '摘要已生成' : '已用本地方式生成摘要')
    } catch (e: any) {
      message.error('生成失败: ' + (e.message || ''))
    }
    generatingExcerpt.value = false
  }

  if (form.value.excerpt?.trim()) {
    Modal.confirm({
      title: '覆盖现有摘要？',
      content: '将用 AI 重新生成摘要并覆盖当前内容。',
      okText: '覆盖',
      cancelText: '取消',
      onOk: run,
    })
  } else {
    await run()
  }
}

async function publish() {
  if (!form.value.title) { message.warning('标题不能为空'); return }
  form.value.slug = ensureSlug(form.value.slug, form.value.title)
  form.value.status = 'published'
  saving.value = true
  try {
    if (createdSlug.value) {
      const res = await api.put<any>(`/posts/${createdSlug.value}`, form.value)
      if (res?.slug) form.value.slug = res.slug
    } else {
      const res = await api.post<any>('/posts', form.value)
      createdSlug.value = res?.slug || form.value.slug
    }
    message.success('发布成功')
    hasUnsaved = false
    router.push('/admin/posts')
  } catch (e: any) {
    message.error('发布失败: ' + (e.message || ''))
  }
  saving.value = false
}
</script>

<style scoped>
.editor-field-grow :deep(.md-editor) {
  position: absolute;
  inset: 0;
  height: auto;
  /* ← 覆盖 md-editor-v3 的 height: 500px */
  overflow: hidden;
}

.editor-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: transparent;
}

.editor-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding-right: 16px;
}

.editor-sidebar {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.editor-field-grow {
  flex: 1;
  min-height: 0;
  position: relative;
}

.editor-field-grow :deep(.md-editor) {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.title-input {
  font-size: 1.15rem;
  font-weight: 600;
  padding-left: 0;
}

.meta-card {
  border-radius: 8px;
}

.meta-row {
  margin-bottom: 10px;
}

.meta-row label {
  display: block;
  font-size: 0.72rem;
  color: var(--c-text-3);
  margin-bottom: 4px;
}

.meta-row-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0;
}

.meta-row-inline label {
  margin-bottom: 0;
}

.gen-excerpt-btn {
  margin-top: 8px;
}

.cover-setter {
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  transition: border-color 0.2s;
}

.cover-setter:hover {
  border-color: var(--c-primary);
}

.cover-preview {
  position: relative;
}

.cover-img {
  display: block;
  width: 100%;
  height: 100px;
  object-fit: cover;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 0.82rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.cover-preview:hover .cover-overlay {
  opacity: 1;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 80px;
  color: var(--c-text-3);
  font-size: 0.82rem;
}

.cover-modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cover-modal-btn {
  height: 44px;
}

.cover-modal-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--c-text-4);
  font-size: 0.78rem;
}

.cover-modal-divider::before,
.cover-modal-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.cover-modal-url {
  display: flex;
  gap: 8px;
}
</style>

<style>
.editor-field-grow :deep(.md-editor) {
  position: absolute;
  inset: 0;
  height: auto;
  overflow: hidden;
}

:root .md-editor {
  --md-bk-color: #fff;
  --md-bk-color-outstand: #f6f8fa;
  --md-bk-color-hover: #f0f2f5;
  --md-bk-color-block: #fafbfc;
  --md-bk-color-code: #f0f2f5;
  --md-border-color: #e8eaed;
  --md-color: #1f2328;
  --md-color-secondary: #656d76;
  --md-primary-color: #1677ff;
}

:root.dark .md-editor {
  --md-bk-color: #161b22;
  --md-bk-color-outstand: #1c2333;
  --md-bk-color-hover: #1f2838;
  --md-bk-color-block: #1c2333;
  --md-bk-color-code: #1c2333;
  --md-border-color: #30363d;
  --md-color: #e6edf3;
  --md-color-secondary: #8b949e;
  --md-primary-color: #58a6ff;
}
</style>

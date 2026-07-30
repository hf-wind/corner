<template>
  <div class="editor-page">
    <a-spin :spinning="loading" class="table-spin">
      <div class="editor-layout" v-if="!loading">
        <div class="editor-main">
          <a-alert
            v-if="needsPublish"
            type="warning"
            show-icon
            class="pending-alert"
            message="有未发布修改，请到文章列表点击「发布」后前台才会更新"
          />
          <div class="editor-field">
            <a-input v-model:value="form.title" placeholder="输入文章标题…" class="title-input" :bordered="false" />
          </div>

          <div class="editor-field editor-field-grow">
            <client-only>
              <MdEditor :key="editorKey" v-model="form.content" language="zh-CN" :toolbars="toolbars"
                :theme="editorTheme" @upload-img="onUploadImg" class="md-editor" />
            </client-only>
          </div>
        </div>

        <div class="editor-sidebar">
          <a-card :bordered="false" class="meta-card" size="small" title="草稿设置">
            <div class="meta-row">
              <label>Slug</label>
              <a-input v-model:value="form.slug" placeholder="URL 标识" size="small" />
            </div>
            <div class="meta-row meta-row-inline">
              <label>推荐</label>
              <a-switch v-model:checked="form.featured" />
              <a-button type="primary" size="small" @click="save" :loading="saving" style="margin-left:auto">
                {{ saving ? '保存中…' : '保存' }}
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
    </a-spin>

    <a-modal v-model:open="coverOpen" title="设置封面" width="420px" :footer="null" @cancel="coverOpen = false"
      destroyOnClose>
      <div class="cover-modal-body">
        <a-button block size="large" @click="coverUpload" class="cover-modal-btn">
          <UploadOutlined /> 上传图片
        </a-button>
        <a-button block size="large" :loading="pickingCover" @click="pickWallpaper" class="cover-modal-btn">
          换一张壁纸
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
import { Modal } from 'ant-design-vue'
import { ThunderboltOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { ensureSlug } from '~/utils/postMeta'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const { mediaUrl } = useMediaUrl()
const route = useRoute()
const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const generatingExcerpt = ref(false)
const pickingCover = ref(false)
const needsPublish = ref(false)
const categories = ref<any[]>([])
const tags = ref<any[]>([])
const form = ref({
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  coverImage: '',
  categoryId: undefined as string | undefined,
  tagIds: [] as string[],
  featured: false,
})
const editorKey = ref(0)
const coverOpen = ref(false)
const coverUrlInput = ref('')

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

function postPayload() {
  return {
    title: form.value.title,
    slug: form.value.slug,
    content: form.value.content,
    excerpt: form.value.excerpt,
    coverImage: form.value.coverImage,
    categoryId: form.value.categoryId,
    tagIds: [...form.value.tagIds],
    featured: form.value.featured,
  }
}

onMounted(async () => {
  const slug = route.params.slug as string
  const [post, catRes, tagRes] = await Promise.all([
    api.get<any>(`/posts/${slug}/preview`).catch(() => null),
    api.get<any>('/categories').catch(() => []),
    api.get<any>('/tags').catch(() => []),
  ])
  categories.value = Array.isArray(catRes) ? catRes : []
  tags.value = Array.isArray(tagRes) ? tagRes : []
  if (post) {
    form.value = {
      title: post.title || '',
      slug: post.slug || '',
      content: post.content || '',
      excerpt: post.excerpt || '',
      coverImage: post.coverImage || '',
      categoryId: post.categoryId || undefined,
      tagIds: post.tagIds || [],
      featured: post.featured || false,
    }
    needsPublish.value = !!post.needsPublish
    originalContent = JSON.stringify(form.value)
  }
  loading.value = false

  const obs = new MutationObserver(() => { editorKey.value++ })
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

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
  if (!hasUnsaved || !form.value.title || !form.value.slug) return
  try {
    const res = await api.put<any>(`/posts/${route.params.slug}`, postPayload())
    needsPublish.value = res?.needsPublish ?? true
    originalContent = JSON.stringify(form.value)
    hasUnsaved = false
    if (res?.slug && res.slug !== route.params.slug) {
      await router.replace(`/admin/posts/${res.slug}`)
    }
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

async function pickWallpaper() {
  pickingCover.value = true
  try {
    const list = await api.get<any>('/ai/wallpapers', { page: 1, rows: 9 })
    const items = list?.items || []
    if (!items.length) {
      toast.warning('暂无可用壁纸，请手动上传')
      return
    }
    const pick = items[Math.floor(Math.random() * items.length)]
    const media = await api.post<any>('/media/import-url', { url: pick.url, folder: 'cover' })
    if (media?.path) {
      form.value.coverImage = media.path
      coverOpen.value = false
      toast.success('封面已更新')
    }
  } catch (e: any) {
    toast.error('获取壁纸失败: ' + (e.message || ''))
  }
  pickingCover.value = false
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
    toast.error('上传失败')
  }
}

async function generateExcerpt() {
  if (!form.value.content?.trim() || form.value.content.trim().length < 20) {
    toast.warning('请先写一些正文再生成摘要')
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
      toast.success(res.source === 'ai' ? '摘要已生成' : '已用本地方式生成摘要')
    } catch (e: any) {
      toast.error('生成失败: ' + (e.message || ''))
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

async function save() {
  if (!form.value.title) { toast.warning('标题不能为空'); return }
  form.value.slug = ensureSlug(form.value.slug, form.value.title)
  saving.value = true
  try {
    const res = await api.put<any>(`/posts/${route.params.slug}`, postPayload())
    needsPublish.value = res?.needsPublish ?? true
    toast.success('保存成功')
    originalContent = JSON.stringify(form.value)
    hasUnsaved = false
    if (res?.slug && res.slug !== route.params.slug) {
      await router.replace(`/admin/posts/${res.slug}`)
    }
  } catch (e: any) {
    toast.error('保存失败: ' + (e.message || ''))
  }
  saving.value = false
}
</script>

<style scoped>
.pending-alert {
  margin-bottom: 8px;
}

.md-editor-preview :deep(pre) {
  border-radius: 0px;
}

:deep(.md-editor-code) {
  background-color: var(--md-theme-code-inline-bg-color);
}

.editor-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.table-spin {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.table-spin :deep(.ant-spin-container) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
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

.gen-excerpt-btn {
  margin-top: 8px;
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
  --md-bk-color: hsl(220deg 0% 7%);
  --md-bk-color-outstand: hsl(220deg 10% 10%);
  --md-bk-color-hover: hsl(220deg 10% 14%);
  --md-bk-color-block: hsl(220deg 10% 10%);
  --md-bk-color-code: hsl(220deg 10% 16%);
  --md-border-color: hsl(220deg 10% 20%);
  --md-color: hsl(220deg 0% 100%);
  --md-color-secondary: hsl(220deg 0% 70%);
  --md-primary-color: hsl(220deg 100% 70%);
}
</style>

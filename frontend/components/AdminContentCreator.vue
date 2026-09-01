<template>
  <div class="content-creator admin-page-shell">
    <header class="creator-bar">
      <div class="creator-brand">
        <button class="back-link" type="button" @click="backToList">
          <Icon name="ph:arrow-left" /> 返回
        </button>
        <div class="page-title">
          <div class="title-row">
            <span v-if="autoSaveFlash" class="status-dot green" />
            <span v-else-if="needsPublish" class="status-dot orange" title="草稿已保存但未发布" />
            <span class="title-text">{{ form.title || (isEdit ? `编辑${config.label}` : `新${config.label}`) }}</span>
          </div>
        </div>
      </div>
      <div class="creator-actions">
        <template v-if="mode === 'moment'">
          <button type="button" class="action-btn icon-only" title="插入表情" @click="pickerOpen = !pickerOpen">
            <Icon name="ph:smiley-bold" />
          </button>
          <button type="button" class="action-btn icon-only" title="插入图片" @click="pickImages">
            <Icon name="ph:image-bold" />
          </button>
          <EmojiPalette :open="pickerOpen" @select="insertEmoji" @close="pickerOpen = false" />
        </template>
        <button type="button" class="action-btn" :disabled="!currentSlug" @click="openPreview">
          <Icon name="ph:eye-bold" /><span>预览</span>
        </button>
        <button type="button" class="action-btn" :disabled="aiBusy || !form.content.trim()" @click="transformStyle">
          <Icon name="ph:signature-bold" /><span>文风优化</span>
        </button>
        <button type="button" class="action-btn primary" @click="drawerOpen = true">
          <Icon name="ph:sidebar-simple-bold" /><span>内容设置</span>
        </button>
      </div>
    </header>

    <main class="writing-stage">
      <Loading v-if="!editorReady || loadingText" fullscreen :title="loadingText || '加载中…'" :text="loadingText ? '' : '正在准备编辑器'" />
      <div v-show="editorReady" class="stage-editor">
        <AdminMarkdownEditor
          v-if="editorReady"
          ref="editorRef"
          v-model="form.content"
          mode="edit"
          :theme="editorTheme"
          :preview-theme="mode === 'moment' ? 'default' : 'smart-blue'"
          :class="{ 'md-moment': mode === 'moment' }"
          @upload-img="onUploadImg"
          @save="handleSave"
        />
      </div>
    </main>

    <a-drawer
      v-model:open="drawerOpen"
      title="内容设置"
      placement="right"
      :width="drawerWidth"
      :destroy-on-close="false"
      class="creator-drawer"
    >
      <div class="drawer-content">
        <section class="drawer-section">
          <div class="section-heading"><h3>标题</h3></div>
          <a-input v-model:value="form.title" :placeholder="config.titlePlaceholder" size="large" />
        </section>

        <section class="drawer-section">
          <div class="section-heading"><h3>封面图</h3></div>
          <div class="cover-setter" @click="coverOpen = true">
            <img v-if="form.coverImage" :src="form.coverImage" class="cover-preview" alt="封面" />
            <div v-else class="cover-placeholder">
              <Icon name="ph:image-bold" /><span>点击设置封面</span>
            </div>
          </div>
        </section>

        <section class="drawer-section">
          <div class="section-heading"><h3>基础信息</h3></div>
          <div class="field-grid">
            <div class="field">
              <label>Slug</label>
              <a-input v-model:value="form.slug" placeholder="留空则自动生成" />
            </div>
            <div class="field" v-if="mode === 'article'">
              <label>推荐</label>
              <a-switch v-model:checked="form.featured" size="small" />
            </div>
          </div>
          <div class="field">
            <label>摘要</label>
            <a-textarea v-model:value="form.excerpt" :rows="3" placeholder="可选，前台摘要" />
            <a-button :loading="excerptBusy" :disabled="form.content.trim().length < 20" @click="generateExcerpt">
              <Icon name="ph:magic-wand-bold" /> 生成摘要
            </a-button>
          </div>
        </section>

        <section v-if="mode === 'article'" class="drawer-section">
          <div class="section-heading"><h3>分类与标签</h3></div>
          <div class="field">
            <label>分类</label>
            <a-tree-select
              v-model:value="form.categoryId"
              :tree-data="categoryTree"
              :field-names="{ label: 'name', value: 'id', children: 'children' }"
              allow-clear
              placeholder="选择分类，或输入新建"
              show-search
              :filter-tree-node="(input: string, node: any) => node.name?.toLowerCase().includes(input.toLowerCase())"
              @search="onCategorySearch"
              @keydown="onCategoryKeydown"
            />
          </div>
          <div class="field">
            <label>标签</label>
            <a-select
              v-model:value="form.tagIds"
              mode="multiple"
              placeholder="选择标签，或输入新建"
              :options="tags.map((t: any) => ({ label: t.name, value: t.id }))"
              @search="onTagSearch"
              @keydown="onTagKeydown"
            />
          </div>
        </section>

        <section class="drawer-section">
          <div class="section-heading"><h3>时间与地点</h3></div>
          <MomentLocationEditor
            v-model:happened-at="form.happenedAt"
            v-model:place="form.place"
            v-model:visibility="form.locationVisibility"
            v-model:precision="form.locationPrecision"
            :date-label="mode === 'article' ? '故事发生时间' : '发生时间'"
            @source="form.locationSource = $event"
          />
        </section>

        <section class="drawer-section ai-section">
          <div class="ai-toolbox" :class="{ expanded: aiToolboxExpanded }">
            <button type="button" class="ai-toggle" @click="aiToolboxExpanded = !aiToolboxExpanded">
              <Icon name="ph:sparkle-bold" />
              <span>AI 工具箱</span>
              <Icon :name="aiToolboxExpanded ? 'ph:caret-up' : 'ph:caret-down'" class="chevron" />
            </button>
            <div v-if="aiToolboxExpanded" class="ai-body">
              <a-textarea v-model:value="inspiration" :rows="3" :placeholder="config.inspirationPlaceholder" />
              <div class="ai-row">
                <a-button :disabled="!inspiration.trim()" @click="insertInspiration">
                  <Icon name="ph:arrow-down-bold" /> 带入正文
                </a-button>
                <a-button type="primary" :disabled="!inspiration.trim()" @click="generateDraft" :loading="aiBusy">
                  <Icon name="ph:sparkle-bold" /> {{ config.aiAction }}
                </a-button>
              </div>
              <a-button block :disabled="form.content.trim().length < 50" @click="analyzeContent" :loading="analyzeBusy">
                <Icon name="ph:magic-wand-bold" /> 一键智能填充
              </a-button>
            </div>
          </div>
        </section>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <a-button @click="drawerOpen = false">取消</a-button>
          <a-button type="primary" :loading="saving" @click="save">
            <Icon name="ph:floppy-disk-bold" /> 保存 <span class="shortcut">Ctrl+S</span>
          </a-button>
        </div>
      </template>
    </a-drawer>

    <a-modal v-model:open="coverOpen" title="设置封面" width="420px" :footer="null" @cancel="coverOpen = false" destroy-on-close>
      <div class="cover-modal">
        <a-button block size="large" @click="pickCover">
          <Icon name="ph:image-bold" /> 从媒体库选择
        </a-button>
        <div class="cover-divider"><span>或</span></div>
        <div class="cover-url-row">
          <a-input v-model:value="coverUrlInput" placeholder="输入图片 URL" allow-clear @keyup.enter="confirmCoverUrl" />
          <a-button type="primary" :disabled="!coverUrlInput.trim()" @click="confirmCoverUrl">
            <Icon name="ph:check-bold" />
          </a-button>
        </div>
      </div>
    </a-modal>

    <a-modal v-model:open="diffOpen" title="AI 文风优化" width="860px" :confirm-loading="aiBusy" ok-text="应用建议" cancel-text="取消" @ok="applyTransform">
      <div class="diff-grid">
        <section><strong>原文</strong><pre>{{ aiOriginal }}</pre></section>
        <section><strong>建议稿</strong><pre>{{ aiOutput }}</pre></section>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
import { ensureSlug } from '@/utils/postMeta'
import { buildMomentTitle } from '@/utils/moment'
import type { Place } from '@/types/place'
import { configureMarkdownEditor } from '@/utils/configureMarkdownEditor'

type Mode = 'article' | 'moment'
const props = withDefaults(defineProps<{ mode?: Mode; slug?: string }>(), { mode: 'article', slug: '' })
const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!props.slug)
const mode = computed(() => props.mode)
const config = computed(() => mode.value === 'article'
  ? { label: '文章', titlePlaceholder: '输入文章标题…', inspirationPlaceholder: '输入主题或片段，AI 会帮你组织成文章。', aiAction: '生成文章草稿' }
  : { label: '瞬间', titlePlaceholder: '给这条瞬间一个标题（可选）', inspirationPlaceholder: '写下一个念头或感受。', aiAction: '整理瞬间草稿' })

const drawerWidth = ref<number | string>(420)
const drawerOpen = ref(false)
const editorReady = ref(false)
const editorDark = ref(false)
const saving = ref(false)
const aiBusy = ref(false)
const excerptBusy = ref(false)
const analyzeBusy = ref(false)
const loadingText = ref('')
const dirty = ref(false)
const needsPublish = ref(false)
const pickerOpen = ref(false)
const aiToolboxExpanded = ref(false)
const autoSaveFlash = ref(false)
const coverOpen = ref(false)
const coverUrlInput = ref('')

const inspiration = ref('')
const currentSlug = ref('')
const confirmedLocationKey = ref('')
const diffOpen = ref(false)
const aiOriginal = ref('')
const aiOutput = ref('')

const categories = ref<any[]>([])
const tags = ref<any[]>([])
const momentEditorRef = ref<any>(null)
const editorRef = ref<any>(null)
const { open: openMedia } = useMediaLibrary()

const form = reactive({
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  coverImage: '',
  categoryId: undefined as string | undefined,
  tagIds: [] as string[],
  featured: false,
  happenedAt: '',
  place: null as Place | null,
  locationVisibility: 'private' as 'public' | 'blurred' | 'private',
  locationPrecision: 'place' as 'exact' | 'place' | 'city' | 'province',
  locationSource: 'manual' as 'manual' | 'map'
})

const categoryTree = computed(() => categories.value.map((c: any) => ({ ...c, children: c.children?.length ? c.children : undefined })))
const editorTheme = computed(() => editorDark.value ? 'dark' : 'light')

let originalContent = ''
let themeObserver: MutationObserver | null = null
let autoSaveTimer: ReturnType<typeof setInterval> | null = null
let lastSaveTime = 0

function locationKey() {
  return `${form.place?.id || ''}|${form.locationVisibility}|${form.locationPrecision}`
}

function payload(confirmExactLocation = false) {
  const title = form.title.trim() || (mode.value === 'moment' ? buildMomentTitle(form.content) : '未命名文章')
  const common = { title, slug: ensureSlug(form.slug, title), content: form.content, excerpt: form.excerpt }
  const location = { placeId: form.place?.id || null, locationVisibility: form.place ? form.locationVisibility : 'private', locationPrecision: form.locationPrecision, locationSource: form.place ? form.locationSource : null, confirmExactLocation }
  if (mode.value === 'article') return { ...common, coverImage: form.coverImage, categoryId: form.categoryId, tagIds: [...new Set(form.tagIds)], featured: form.featured, occurredAt: form.happenedAt ? new Date(form.happenedAt).toISOString() : null, ...location }
  return { ...common, happenedAt: form.happenedAt ? new Date(form.happenedAt).toISOString() : null, ...location }
}

function backToList() {
  router.push(mode.value === 'article' ? '/admin/posts' : '/admin/moments')
}

function openPreview() {
  if (!currentSlug.value) return
  const path = mode.value === 'article' ? `/admin/posts/preview?slug=${currentSlug.value}` : `/admin/moments/preview?slug=${currentSlug.value}`
  window.open(path, '_blank')
}

function insertInspiration() {
  if (!inspiration.value.trim()) return
  form.content = form.content.trim() ? `${form.content}\n\n${inspiration.value.trim()}` : inspiration.value.trim()
  dirty.value = true
  nextTick(() => momentEditorRef.value?.focus())
}

function insertEmoji(payload: { char?: string; imageUrl?: string; label?: string }) {
  momentEditorRef.value?.insertToken(payload.imageUrl ? `[[emoji:${payload.imageUrl}|${payload.label || '表情'}]]` : payload.char || '')
  pickerOpen.value = false
}

async function pickImages() {
  const urls = await openMedia({ multiple: true, folder: 'moment' })
  if (!urls.length) return
  const images = urls.map((url, index) => `![瞬间图片 ${index + 1}](${url})`).join('\n')
  momentEditorRef.value?.insertToken(`${form.content.trim() ? '\n\n' : ''}${images}\n`)
  dirty.value = true
}

async function pickCover() {
  const urls = await openMedia({ multiple: false, folder: 'cover' })
  if (urls.length) {
    form.coverImage = urls[0]
    coverOpen.value = false
    dirty.value = true
  }
}

function confirmCoverUrl() {
  const v = coverUrlInput.value.trim()
  if (v) {
    form.coverImage = v
    coverOpen.value = false
    coverUrlInput.value = ''
    dirty.value = true
  }
}

async function generateDraft() {
  const text = inspiration.value.trim()
  if (!text) return
  aiBusy.value = true
  loadingText.value = '正在生成草稿…'
  try {
    const result = mode.value === 'article'
      ? await api.post<any>('/ai/generate-article', { outline: text })
      : await api.post<any>('/ai/polish-moment', { inspiration: text })
    form.title = String(result.title || form.title)
    form.slug = String(result.slug || form.slug)
    form.content = String(result.content || text)
    form.excerpt = String(result.excerpt || form.excerpt)
    if (result.coverImage) form.coverImage = result.coverImage
    dirty.value = true
    toast.success('AI 草稿已带入编辑器')
  } catch (error: any) {
    toast.error(error?.message || 'AI 生成失败')
  } finally {
    aiBusy.value = false
    loadingText.value = ''
  }
}

function transformStyle() {
  if (!form.content.trim()) return
  Modal.confirm({
    title: '确认发送文风优化？',
    content: '将把整篇正文发送给 AI 分析并生成改写建议，不会自动覆盖原文。',
    okText: '开始优化',
    cancelText: '取消',
    onOk: () => doTransformStyle()
  })
}

async function doTransformStyle() {
  aiBusy.value = true
  loadingText.value = '正在文风优化…'
  try {
    const result = await api.post<any>('/ai/write/transform', { text: form.content, action: 'style' })
    aiOriginal.value = form.content
    aiOutput.value = result.output || ''
    diffOpen.value = true
  } catch (error: any) {
    toast.error(error?.message || 'AI 改写失败')
  } finally {
    aiBusy.value = false
    loadingText.value = ''
  }
}

function applyTransform() {
  form.content = aiOutput.value
  dirty.value = true
  diffOpen.value = false
  toast.success('已应用 AI 建议')
}

async function generateExcerpt() {
  if (form.content.trim().length < 20) return
  excerptBusy.value = true
  loadingText.value = '正在生成摘要…'
  try {
    const result = await api.post<any>('/ai/summarize', { title: form.title, content: form.content })
    form.excerpt = result.excerpt || ''
    dirty.value = true
    toast.success('摘要已生成')
  } catch (error: any) {
    toast.error(error?.message || '摘要生成失败')
  } finally {
    excerptBusy.value = false
    loadingText.value = ''
  }
}

async function analyzeContent() {
  if (form.content.trim().length < 50) return
  analyzeBusy.value = true
  loadingText.value = '正在智能分析…'
  try {
    const result = await api.post<any>('/ai/analyze-content', { title: form.title, content: form.content })
    if (result.slug) form.slug = result.slug
    if (result.excerpt) form.excerpt = result.excerpt
    if (result.category) {
      const category = categories.value.find((c: any) => c.name === result.category.name)
      if (category) form.categoryId = category.id
    }
    if (result.tags && Array.isArray(result.tags)) {
      const tagIds: string[] = []
      for (const tagResult of result.tags) {
        const tag = tags.value.find((t: any) => t.name === tagResult.name)
        if (tag) tagIds.push(tag.id)
      }
      if (tagIds.length) form.tagIds = tagIds
    }
    dirty.value = true
    toast.success('智能填充完成')
  } catch (error: any) {
    toast.error(error?.message || '智能填充失败')
  } finally {
    analyzeBusy.value = false
    loadingText.value = ''
  }
}

async function save() {
  const now = Date.now()
  if (now - lastSaveTime < 2000) return
  lastSaveTime = now
  if (mode.value === 'moment' && !form.content.trim()) {
    toast.warning('瞬间正文不能为空')
    return
  }
  const exact = form.place && form.locationVisibility === 'public' && form.locationPrecision === 'exact' && confirmedLocationKey.value !== locationKey()
  if (exact) {
    Modal.confirm({
      title: '确认公开精确位置？',
      content: `保存后，访客可获得「${form.place?.name}」的精确坐标。`,
      okText: '确认并保存',
      cancelText: '取消',
      onOk: () => persist(true, true)
    })
    return
  }
  await persist(false, true)
}

function handleSave() { void save() }

async function persist(confirmExactLocation: boolean, manual = false) {
  if (saving.value) return
  loadingText.value = '正在保存…'
  saving.value = true
  try {
    const data = payload(confirmExactLocation)
    const result = mode.value === 'article'
      ? await (currentSlug.value ? api.put<any>(`/posts/${currentSlug.value}`, data) : api.post<any>('/posts', data))
      : await (currentSlug.value ? api.put<any>(`/moments/${currentSlug.value}`, data) : api.post<any>('/moments', data))
    currentSlug.value = result.slug || currentSlug.value || data.slug
    form.slug = currentSlug.value
    form.title = result.title || form.title || data.title
    needsPublish.value = !!result.needsPublish
    confirmedLocationKey.value = confirmExactLocation ? locationKey() : confirmedLocationKey.value
    originalContent = JSON.stringify(form)
    dirty.value = false
    clearDraft()
    showAutoSaveFlash()
    if (manual) toast.success('已保存')
    drawerOpen.value = false
  } catch (error: any) {
    toast.error(error?.message || '保存失败')
  } finally {
    saving.value = false
    loadingText.value = ''
  }
}

function showAutoSaveFlash() {
  autoSaveFlash.value = true
  setTimeout(() => { autoSaveFlash.value = false }, 5000)
}

async function autoSave() {
  if (!dirty.value || saving.value) return
  saveDraft()
  showAutoSaveFlash()
}

function randomColor() {
  const h = Math.floor(Math.random() * 360)
  const s = 65 + Math.floor(Math.random() * 20)
  const l = 50 + Math.floor(Math.random() * 15)
  return `hsl(${h}, ${s}%, ${l}%)`
}

function autoSlug(name: string) {
  return name.toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `item-${Date.now()}`
}

const DRAFT_KEY = 'content-drafts'

function getAllDrafts(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') } catch { return {} }
}

function saveDraft() {
  const drafts = getAllDrafts()
  const index = `${mode.value}:${currentSlug.value || 'new'}`
  drafts[index] = { form: { ...form }, savedAt: Date.now() }
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts)) } catch {}
}

function clearDraft() {
  const drafts = getAllDrafts()
  const index = `${mode.value}:${currentSlug.value || 'new'}`
  delete drafts[index]
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts)) } catch {}
}

const tagSearchValue = ref('')
const categorySearchValue = ref('')

async function createTag(name: string) {
  if (!name.trim()) return
  const slug = autoSlug(name)
  try {
    const result = await api.post<any>('/tags', { name: name.trim(), slug, color: randomColor() })
    tags.value.push(result)
    form.tagIds.push(result.id)
    toast.success(`标签「${name.trim()}」已创建`)
  } catch (error: any) {
    toast.error(error?.message || '标签创建失败')
  }
}

async function createCategory(name: string) {
  if (!name.trim()) return
  const slug = autoSlug(name)
  try {
    const result = await api.post<any>('/categories', { name: name.trim(), slug, color: randomColor() })
    categories.value.push(result)
    form.categoryId = result.id
    toast.success(`分类「${name.trim()}」已创建`)
  } catch (error: any) {
    toast.error(error?.message || '分类创建失败')
  }
}

function onTagSearch(value: string) {
  tagSearchValue.value = value
}

function onTagKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && tagSearchValue.value.trim()) {
    const exists = tags.value.some((t: any) => t.name === tagSearchValue.value.trim())
    if (!exists) {
      e.preventDefault()
      createTag(tagSearchValue.value)
      tagSearchValue.value = ''
    }
  }
}

function onCategorySearch(value: string) {
  categorySearchValue.value = value
}

function onCategoryKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && categorySearchValue.value.trim()) {
    const exists = categories.value.some((c: any) => c.name === categorySearchValue.value.trim())
    if (!exists) {
      e.preventDefault()
      createCategory(categorySearchValue.value)
      categorySearchValue.value = ''
    }
  }
}

async function onUploadImg(files: File[], callback: (urls: string[]) => void) {
  try {
    const urls: string[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'article/pending')
      const result = await api.upload<any>('/media/upload', fd)
      urls.push(result.path || '')
    }
    callback(urls)
  } catch {
    toast.error('上传失败')
  }
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void save()
  }
}

watch(form, () => {
  dirty.value = JSON.stringify(form) !== originalContent
}, { deep: true })

async function loadExistingPost() {
  if (!props.slug) return
  try {
    const endpoint = mode.value === 'article' ? `/posts/${props.slug}/preview` : `/moments/${props.slug}/preview`
    const p = await api.get<any>(endpoint)
    if (!p) return
    currentSlug.value = p.slug || props.slug
    form.title = p.title || ''
    form.slug = p.slug || ''
    form.content = p.content || ''
    form.excerpt = p.excerpt || ''
    form.coverImage = p.coverImage || ''
    form.categoryId = p.categoryId || undefined
    form.tagIds = p.tagIds || []
    form.featured = p.featured || false
    const timeField = mode.value === 'article' ? 'occurredAt' : 'happenedAt'
    form.happenedAt = p[timeField] ? toLocalDateTime(p[timeField]) : ''
    form.place = p.place || null
    form.locationVisibility = p.locationVisibility || 'private'
    form.locationPrecision = p.locationPrecision || 'place'
    form.locationSource = p.locationSource || 'manual'
    confirmedLocationKey.value = p.locationExactConfirmedAt ? locationKey() : ''
    needsPublish.value = !!p.needsPublish
  } catch {
    toast.error(mode.value === 'article' ? '加载文章失败' : '加载瞬间失败')
  }
}

function toLocalDateTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

onMounted(async () => {
  editorDark.value = document.documentElement.classList.contains('dark')
  drawerWidth.value = window.innerWidth < 640 ? '100%' : Math.min(window.innerWidth * 0.5, 720)
  themeObserver = new MutationObserver(() => {
    editorDark.value = document.documentElement.classList.contains('dark')
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  window.addEventListener('keydown', handleKeydown)
  if (mode.value === 'article') await configureMarkdownEditor()
  const [catRes, tagRes] = await Promise.all([
    api.get<any>('/categories').catch(() => []),
    api.get<any>('/tags').catch(() => [])
  ])
  categories.value = Array.isArray(catRes) ? catRes : []
  tags.value = Array.isArray(tagRes) ? tagRes : []
  if (isEdit.value) await loadExistingPost()
  editorReady.value = true
  originalContent = JSON.stringify(form)
  if (isEdit.value) autoSaveTimer = setInterval(autoSave, 30000)
})

onUnmounted(() => {
  themeObserver?.disconnect()
  window.removeEventListener('keydown', handleKeydown)
  if (autoSaveTimer) clearInterval(autoSaveTimer)
  if (dirty.value) saveDraft()
})
</script>

<style scoped>
.content-creator {
  display: flex;
  height: 100dvh;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: var(--c-bg-1);
}

/* ── Creator Bar ── */
.creator-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 54px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  background: var(--ld-bg-card);
  flex-shrink: 0;
}

.creator-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-3);
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.back-link:hover {
  color: var(--c-text);
  background: var(--c-bg-2);
}

.page-title {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-text {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--c-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.green {
  background: #34d399;
  box-shadow: 0 0 6px #34d399;
  animation: dot-breathe-green 5s ease forwards;
}

.status-dot.orange {
  background: #e8a838;
  box-shadow: 0 0 6px #e8a838;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes dot-breathe-green {
  0%   { opacity: 0; transform: scale(0.6); }
  10%  { opacity: 1; transform: scale(1); }
  60%  { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

/* ── Actions ── */
.creator-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--c-bg);
  color: var(--c-text-2);
  font: inherit;
  font-size: 0.68rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  white-space: nowrap;
}

.action-btn:hover:not(:disabled) {
  border-color: var(--c-primary);
  color: var(--c-primary);
}

.action-btn.primary {
  border-color: var(--c-primary);
  background: var(--c-primary);
  color: #fff;
}

.action-btn.primary:hover {
  background: color-mix(in srgb, var(--c-primary) 88%, #000);
  border-color: color-mix(in srgb, var(--c-primary) 88%, #000);
  color: #fff;
}

.action-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.action-btn.icon-only {
  width: 32px;
  padding: 0;
  justify-content: center;
}

/* ── Writing Stage ── */
.writing-stage {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.stage-editor {
  width: 100%;
  min-height: 0;
  flex: 1;
}

.stage-editor :deep(.admin-md-editor) { height: 100%; }

.moment-editor {
  min-height: 100%;
  padding: 18px 4px;
  outline: 0;
  color: var(--c-text);
  font-size: 1rem;
  line-height: 1.95;
}

/* ── Drawer ── */
.creator-drawer :deep(.ant-drawer-content-wrapper) {
  border-left: 1px solid var(--border);
  box-shadow: -8px 0 32px rgb(0 0 0 / 6%);
}

.creator-drawer :deep(.ant-drawer-header) {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

.creator-drawer :deep(.ant-drawer-title) {
  font-size: 0.84rem;
  font-weight: 600;
}

.creator-drawer :deep(.ant-drawer-body) {
  padding: 16px 20px;
  background: var(--c-bg);
}

.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.drawer-section {
  padding: 20px 0;
  border-bottom: 1px solid var(--border);
}

.drawer-section:last-child { border-bottom: 0; }

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-heading h3 {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--c-text);
}

.section-heading small {
  font-size: 0.6rem;
  color: var(--c-text-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.field:last-child { margin-bottom: 0; }

.field label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--c-text-3);
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: end;
  margin-bottom: 16px;
}

.field-grid .field { margin-bottom: 0; }

/* Cover */
.cover-setter {
  cursor: pointer;
  border: 1px dashed var(--border);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.cover-setter:hover { border-color: var(--c-primary); }

.cover-preview {
  display: block;
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100px;
  color: var(--c-text-3);
  font-size: 0.76rem;
}

/* AI Toolbox */
.ai-section { padding-top: 0; }

.ai-toolbox {
  border: 1px solid color-mix(in srgb, var(--c-primary) 15%, var(--border));
  border-radius: 12px;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--c-primary-soft) 8%, var(--c-bg)),
    var(--c-bg));
  overflow: hidden;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--c-primary) 5%, transparent);
}

.ai-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: 0;
  background: transparent;
  color: var(--c-primary);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.ai-toggle:hover {
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--c-primary-soft) 12%, var(--c-bg)),
    var(--c-bg-1));
}

.ai-toggle .chevron {
  margin-left: auto;
  font-size: 0.6rem;
  color: var(--c-text-3);
}

.ai-body {
  padding: 14px;
  border-top: 1px solid color-mix(in srgb, var(--c-primary) 10%, var(--border));
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-row {
  display: flex;
  gap: 8px;
}

/* Drawer Footer */
.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.shortcut {
  margin-left: 4px;
  opacity: 0.55;
  font-size: 0.56rem;
}

/* Cover Modal */
.cover-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cover-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--c-text-3);
  font-size: 0.72rem;
}

.cover-divider::before,
.cover-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.cover-url-row {
  display: flex;
  gap: 8px;
}

/* Diff Grid */
.diff-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.diff-grid section { min-width: 0; }

.diff-grid strong {
  display: block;
  margin-bottom: 6px;
  color: var(--c-text-2);
  font-size: 0.72rem;
}

.diff-grid pre {
  max-height: 52vh;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--c-bg-2);
  color: var(--c-text-2);
  font: 0.68rem/1.7 var(--font-body);
  white-space: pre-wrap;
}

/* Responsive */
@media (max-width: 640px) {
  .creator-bar { padding: 0 10px; height: 50px; }
  .action-btn span { display: none; }
  .action-btn.icon-only { width: 32px; padding: 0; }
  .diff-grid { grid-template-columns: 1fr; }
}
</style>

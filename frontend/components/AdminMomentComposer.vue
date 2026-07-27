<template>
  <div class="moment-studio">
    <section class="studio-hero">
      <div class="hero-copy">
        <p class="hero-eyebrow">Moment Studio</p>
        <h1>{{ isEdit ? '继续打磨这条瞬间' : '写一条新的瞬间' }}</h1>
        <p>
          瞬间不是文章，它更像一张刚写完就想贴到冰箱门上的生活便签。先把灵感丢进容器里，
          再决定要不要请 AI 帮你顺一顺语气、补一层画面感。
        </p>
      </div>
      <div class="hero-side">
        <span>第一人称</span>
        <span>表情弹窗</span>
        <span>图片插入</span>
        <span>预览发布</span>
      </div>
    </section>

    <a-spin :spinning="loading" class="studio-spin">
      <div v-if="!loading" class="studio-grid">
        <section class="panel panel-main">
          <header class="panel-head">
            <div>
              <p class="panel-eyebrow">Inspiration</p>
              <h2>灵感容器</h2>
            </div>
            <span>{{ inspiration.length }} 字</span>
          </header>

          <div class="inspiration-wrap">
            <textarea
              ref="editorRef"
              v-model="inspiration"
              class="inspiration-input"
              rows="12"
              placeholder="比如：今晚的风有点轻，楼下那家店把歌放得刚刚好，我顺手把这一天捡了回来。"
            />

            <div class="composer-toolbar">
              <button
                type="button"
                class="tool-btn"
                :class="{ active: pickerOpen }"
                @click="pickerOpen = !pickerOpen"
              >
                <Icon name="ph:smiley-bold" />
                <span>表情</span>
              </button>
              <button type="button" class="tool-btn" @click="pickImages">
                <Icon name="ph:image-bold" />
                <span>图片</span>
              </button>
              <button
                type="button"
                class="tool-btn"
                :disabled="!inspiration.trim()"
                @click="syncDraft"
              >
                <Icon name="ph:arrow-line-down-bold" />
                <span>同步到发布稿</span>
              </button>
              <button
                type="button"
                class="tool-btn tool-btn-primary"
                :disabled="!inspiration.trim()"
                @click="polish"
              >
                <Icon
                  :name="polishing ? 'ph:spinner-gap-bold' : 'ph:sparkle-bold'"
                  :class="{ spinning: polishing }"
                />
                <span>{{ polishing ? '润色中...' : 'AI 帮我润一下' }}</span>
              </button>

              <EmojiPalette :open="pickerOpen" @select="insertEmoji" />
            </div>

            <p class="toolbar-note">
              动图表情会按评论区同款弹窗插入为 `[[emoji:url|label]]`，预览和前台都会渲染成图片表情。
              AI 使用后台「AI 配置」里的瞬间提示语；如果没开 AI，就会按本地规则整理成可发布版本。
            </p>
          </div>
        </section>

        <section class="panel panel-side">
          <header class="panel-head">
            <div>
              <p class="panel-eyebrow">Publish Draft</p>
              <h2>发布稿</h2>
            </div>
            <span>{{ mediaCount }} 张图</span>
          </header>

          <div class="field-grid">
            <label class="field span-two">
              <span>标题</span>
              <a-input
                v-model:value="form.title"
                placeholder="可以留空，我会从正文里自动挑一句。"
              />
            </label>
            <label class="field">
              <span>Slug</span>
              <a-input v-model:value="form.slug" placeholder="moment-2026" />
            </label>
            <label class="field">
              <span>摘要</span>
              <a-textarea
                v-model:value="form.excerpt"
                :rows="3"
                placeholder="可选。留空时，AI 会按后台配置补一条带点哆啦A梦碎碎念的摘要。"
              />
            </label>
            <label class="field span-two">
              <span>正文</span>
              <a-textarea
                v-model:value="form.content"
                :rows="15"
                class="content-input"
                placeholder="这里放最终准备发布的内容，你也可以继续手动微调。"
              />
            </label>
          </div>

          <div class="actions-row">
            <a-button size="large" :loading="saving" @click="saveDraft">保存草稿</a-button>
            <a-button type="primary" size="large" :loading="publishing" @click="publishMoment">
              预览后发布
            </a-button>
          </div>

          <div class="meta-row">
            <span>状态：{{ currentSlug ? '已创建草稿' : '还没落库' }}</span>
            <NuxtLink v-if="publicLink" :to="publicLink">查看前台页面</NuxtLink>
          </div>
        </section>
      </div>
    </a-spin>

    <section v-if="!loading" class="panel preview-panel">
      <header class="panel-head">
        <div>
          <p class="panel-eyebrow">Live Preview</p>
          <h2>发布后的样子</h2>
        </div>
        <span>{{ previewDate }}</span>
      </header>

      <article class="preview-card">
        <div class="preview-meta">
          <span class="preview-dot" />
          <span>我的瞬间</span>
        </div>
        <h3>{{ displayTitle }}</h3>
        <p v-if="displayExcerpt" class="preview-excerpt">{{ displayExcerpt }}</p>
        <MomentContent :content="displayContent" />
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { buildSlug } from '~/utils/postMeta'
import { buildMomentTitle, extractMomentImages, momentPreviewText } from '~/utils/moment'

const props = defineProps<{
  slug?: string
}>()

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()
const { open } = useMediaLibrary()

const editorRef = ref<HTMLTextAreaElement | null>(null)
const loading = ref(Boolean(props.slug))
const saving = ref(false)
const publishing = ref(false)
const polishing = ref(false)
const pickerOpen = ref(false)
const inspiration = ref('')
const currentSlug = ref(props.slug || '')
const publicLink = ref('')

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
})

const isEdit = computed(() => Boolean(currentSlug.value))
const displayContent = computed(() => form.content.trim() || normalizeContent(inspiration.value))
const displayTitle = computed(() => form.title.trim() || buildMomentTitle(displayContent.value))
const displayExcerpt = computed(() => form.excerpt.trim() || momentPreviewText(displayContent.value, 120))
const mediaCount = computed(() => extractMomentImages(displayContent.value).length)
const previewDate = computed(() => new Date().toISOString().slice(0, 10))

function normalizeContent(value: string) {
  const lines = String(value || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const blocks: string[] = []
  let paragraph: string[] = []

  const flush = () => {
    if (!paragraph.length) return
    blocks.push(paragraph.join(' '))
    paragraph = []
  }

  for (const line of lines) {
    if (/^!\[[^\]]*]\([^)]+\)$/.test(line)) {
      flush()
      blocks.push(line)
      continue
    }
    paragraph.push(line)
  }

  flush()
  return blocks.join('\n\n').trim()
}

function insertAtCursor(token: string) {
  const textarea = editorRef.value
  if (!textarea) {
    inspiration.value += token
    return
  }

  const start = textarea.selectionStart ?? inspiration.value.length
  const end = textarea.selectionEnd ?? inspiration.value.length
  inspiration.value = `${inspiration.value.slice(0, start)}${token}${inspiration.value.slice(end)}`

  nextTick(() => {
    textarea.focus()
    const caret = start + token.length
    textarea.setSelectionRange(caret, caret)
  })
}

function insertEmoji(payload: { char?: string; imageUrl?: string; label?: string }) {
  if (payload.imageUrl) {
    insertAtCursor(`[[emoji:${payload.imageUrl}|${payload.label || '表情'}]]`)
  } else if (payload.char) {
    insertAtCursor(payload.char)
  }
  pickerOpen.value = false
}

async function pickImages() {
  const urls = await open({ multiple: true, folder: 'moment' })
  if (!urls.length) return
  const block = urls.map((url, index) => `![瞬间图片 ${index + 1}](${url})`).join('\n')
  insertAtCursor(`${inspiration.value.trim() ? '\n\n' : ''}${block}\n`)
}

function syncDraft() {
  if (!inspiration.value.trim()) {
    toast.warning('先写一点内容再同步')
    return
  }

  const normalized = normalizeContent(inspiration.value)
  form.content = normalized
  if (!form.title.trim()) form.title = buildMomentTitle(normalized)
  if (!form.slug.trim()) form.slug = buildSlug(form.title)
  toast.success('已经同步到发布稿')
}

async function polish() {
  if (!inspiration.value.trim()) {
    toast.warning('先写一点灵感再润色')
    return
  }

  polishing.value = true
  try {
    const result = await api.post<any>('/ai/polish-moment', {
      inspiration: inspiration.value.trim(),
    })
    form.title = result.title || buildMomentTitle(result.content || inspiration.value)
    form.content = result.content || normalizeContent(inspiration.value)
    form.excerpt = result.excerpt || ''
    if (!form.slug.trim()) form.slug = buildSlug(form.title)
    toast.success(result.source === 'ai' ? '这条瞬间已经润好了' : '已经按本地规则整理成发布稿')
  } catch (error: any) {
    toast.error(`润色失败：${error?.message || ''}`)
  } finally {
    polishing.value = false
  }
}

async function ensureSaved() {
  const content = displayContent.value.trim()
  if (!content) {
    toast.warning('请先写一点内容')
    return null
  }

  const title = form.title.trim() || buildMomentTitle(content)
  const payload = {
    title,
    slug: form.slug.trim() || buildSlug(title),
    excerpt: form.excerpt.trim() || undefined,
    content,
  }

  const response = currentSlug.value
    ? await api.put<any>(`/moments/${currentSlug.value}`, payload)
    : await api.post<any>('/moments', payload)

  currentSlug.value = response.slug
  form.title = response.title || payload.title
  form.slug = response.slug || payload.slug
  form.excerpt = response.excerpt || payload.excerpt || ''
  form.content = response.content || payload.content
  publicLink.value = response.status === 'published' ? `/moments/${response.slug || payload.slug}` : ''

  if (!props.slug && route.params.slug !== currentSlug.value) {
    await router.replace(`/admin/moments/${currentSlug.value}`)
  }

  return response
}

async function saveDraft() {
  saving.value = true
  try {
    await ensureSaved()
    toast.success('瞬间草稿已保存')
  } catch (error: any) {
    toast.error(`保存失败：${error?.message || ''}`)
  } finally {
    saving.value = false
  }
}

async function publishMoment() {
  publishing.value = true
  try {
    const saved = await ensureSaved()
    const targetSlug = saved?.slug || currentSlug.value
    if (!targetSlug) return
    await api.post(`/moments/${targetSlug}/publish`)
    publicLink.value = `/moments/${targetSlug}`
    toast.success('瞬间已发布')
  } catch (error: any) {
    toast.error(`发布失败：${error?.message || ''}`)
  } finally {
    publishing.value = false
  }
}

async function loadExisting() {
  if (!props.slug) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    const moment = await api.get<any>(`/moments/${props.slug}/preview`)
    currentSlug.value = moment.slug
    publicLink.value = moment.status === 'published' ? `/moments/${moment.slug}` : ''
    form.title = moment.title || ''
    form.slug = moment.slug || ''
    form.excerpt = moment.excerpt || ''
    form.content = moment.content || ''
    inspiration.value = moment.content || ''
  } catch {
    toast.error('读取瞬间失败')
    await router.replace('/admin/moments')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadExisting()
})
</script>

<style scoped>
.moment-studio {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.studio-hero,
.panel {
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, #ffb347 16%, transparent), transparent 36%),
    radial-gradient(circle at bottom right, color-mix(in srgb, var(--c-primary) 11%, transparent), transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--ld-bg-card) 97%, white 3%), color-mix(in srgb, var(--ld-bg-card) 88%, var(--c-bg-2) 12%));
  box-shadow: 0 24px 56px color-mix(in srgb, var(--ld-shadow) 20%, transparent);
}

.studio-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 28px;
}

.hero-copy {
  max-width: 680px;
}

.hero-eyebrow,
.panel-eyebrow {
  margin: 0 0 8px;
  color: var(--c-text-3);
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-copy h1,
.panel-head h2 {
  margin: 0;
  color: var(--c-text);
}

.hero-copy p:last-child {
  margin: 12px 0 0;
  color: var(--c-text-2);
  line-height: 1.85;
}

.hero-side {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.hero-side span {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgb(255 255 255 / 68%);
  color: var(--c-text-2);
  font-size: 0.8rem;
  backdrop-filter: blur(10px);
}

.studio-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(320px, 0.88fr);
  gap: 18px;
}

.panel {
  padding: 22px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-head span {
  color: var(--c-text-3);
  font-size: 0.78rem;
}

.inspiration-wrap,
.field-grid {
  margin-top: 18px;
}

.inspiration-wrap {
  position: relative;
}

.inspiration-input,
.content-input {
  width: 100%;
  padding: 16px 18px;
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  border-radius: 22px;
  background: color-mix(in srgb, var(--c-bg) 82%, transparent);
  color: var(--c-text);
  font: inherit;
  line-height: 1.85;
  resize: vertical;
}

.composer-toolbar {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  border: 0;
  border-radius: 999px;
  background: var(--c-bg-2);
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  transition: transform 0.16s ease, background 0.16s ease;
}

.tool-btn:hover,
.tool-btn.active {
  transform: translateY(-1px);
  color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary) 10%, var(--c-bg-2));
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.tool-btn-primary {
  background: linear-gradient(135deg, #ff8f5a, color-mix(in srgb, var(--c-primary) 74%, #111827 6%));
  color: #fff;
  box-shadow: 0 14px 30px color-mix(in srgb, #ff8f5a 24%, transparent);
}

.tool-btn-primary:hover {
  color: #fff;
}

.toolbar-note {
  margin: 12px 2px 0;
  color: var(--c-text-3);
  font-size: 0.76rem;
  line-height: 1.7;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span {
  color: var(--c-text-3);
  font-size: 0.8rem;
}

.span-two {
  grid-column: 1 / -1;
}

.actions-row {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  color: var(--c-text-3);
  font-size: 0.78rem;
}

.meta-row a {
  color: var(--c-primary);
  text-decoration: none;
}

.preview-card {
  margin-top: 18px;
  padding: 24px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, #ffd56b 18%, transparent), transparent 38%),
    linear-gradient(160deg, color-mix(in srgb, var(--ld-bg-card) 98%, white 2%), color-mix(in srgb, var(--c-bg-2) 76%, transparent));
}

.preview-meta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--c-text-3);
  font-size: 0.78rem;
}

.preview-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff8f5a;
  box-shadow: 0 0 0 6px color-mix(in srgb, #ff8f5a 14%, transparent);
}

.preview-card h3 {
  margin: 16px 0 0;
  color: var(--c-text);
  font-size: 1.7rem;
}

.preview-excerpt {
  margin: 10px 0 18px;
  color: var(--c-text-3);
  line-height: 1.75;
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1100px) {
  .studio-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .studio-hero,
  .panel {
    padding: 18px;
    border-radius: 22px;
  }

  .studio-hero {
    flex-direction: column;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }

  .span-two {
    grid-column: auto;
  }

  .actions-row,
  .meta-row {
    flex-direction: column;
  }

  .preview-card {
    padding: 18px;
    border-radius: 18px;
  }
}
</style>

<template>
  <div class="moment-editor">
    <a-spin :spinning="loading">
      <template v-if="!loading && !isEdit">
        <header class="studio-header">
          <div class="studio-heading">
            <span class="studio-icon"><Icon name="ph:sparkle-bold" /></span>
            <div>
              <p>Quick Moment</p>
              <h1>写下一条瞬间</h1>
            </div>
          </div>
          <a-button @click="router.push('/admin/moments')">返回列表</a-button>
        </header>

        <section class="quick-create-shell">
          <header class="quick-head">
            <div><i /><strong>随手记录</strong></div>
            <span>{{ inspiration.trim().length }} 字</span>
          </header>

          <MomentRichEditor
            ref="editorRef"
            v-model="inspiration"
            class="quick-input"
            :autofocus="true"
            placeholder="此刻在想什么？一句话、一张图，或一个还没想明白的念头都可以。"
          />

          <div class="starter-row">
            <span>试着写</span>
            <button v-for="starter in starters" :key="starter.label" type="button" @click="applyStarter(starter.text)">
              <Icon :name="starter.icon" />{{ starter.label }}
            </button>
          </div>

          <MomentLocationEditor
            v-model:happened-at="form.happenedAt"
            v-model:place="form.place"
            v-model:visibility="form.locationVisibility"
            v-model:precision="form.locationPrecision"
            class="quick-location"
            @source="form.locationSource = $event"
          />

          <footer class="quick-footer">
            <div class="composer-tools">
              <button type="button" class="icon-action" :class="{ active: pickerOpen }" title="插入表情" @click="pickerOpen = !pickerOpen">
                <Icon name="ph:smiley-bold" />
              </button>
              <button type="button" class="icon-action" title="插入图片" @click="pickImages">
                <Icon name="ph:image-bold" />
              </button>
              <EmojiPalette :open="pickerOpen" @select="insertEmoji" @close="pickerOpen = false" />
              <span>保存为草稿后可预览发布</span>
            </div>
            <a-button type="primary" :loading="creating" :disabled="!inspiration.trim()" @click="createFromInspiration">
              <Icon :name="creating ? 'ph:spinner-gap-bold' : 'ph:magic-wand-bold'" :class="{ spinning: creating }" />
              {{ creating ? '整理中...' : '整理为草稿' }}
            </a-button>
          </footer>
        </section>
      </template>

      <template v-else-if="!loading">
        <header class="studio-header">
          <div class="studio-heading">
            <span class="studio-icon"><Icon name="ph:pencil-simple-line-bold" /></span>
            <div>
              <p>Moment Editor</p>
              <h1>{{ form.title || '编辑瞬间' }}</h1>
            </div>
          </div>
          <div class="header-actions">
            <a-button @click="router.push('/admin/moments')">返回列表</a-button>
            <a-button @click="openPreview">预览</a-button>
            <a-button type="primary" :loading="saving" @click="save">保存</a-button>
          </div>
        </header>

        <div class="edit-layout">
          <section class="writing-surface">
            <label class="field-label" for="moment-title">标题</label>
            <a-input id="moment-title" v-model:value="form.title" class="title-input" placeholder="给这条记录一个标题" :bordered="false" />

            <label class="field-label" for="moment-content">正文</label>
            <MomentRichEditor
              id="moment-content"
              ref="editorRef"
              v-model="form.content"
              class="moment-input edit-input"
              placeholder="写下这一刻。"
            />
            <div class="composer-tools">
              <button type="button" class="icon-action" :class="{ active: pickerOpen }" title="插入表情" @click="pickerOpen = !pickerOpen">
                <Icon name="ph:smiley-bold" />
              </button>
              <button type="button" class="icon-action" title="插入图片" @click="pickImages">
                <Icon name="ph:image-bold" />
              </button>
              <EmojiPalette :open="pickerOpen" @select="insertEmoji" @close="pickerOpen = false" />
            </div>
          </section>

          <aside class="edit-rail">
            <label class="field-label" for="moment-slug">Slug</label>
            <a-input id="moment-slug" v-model:value="form.slug" placeholder="自动生成" />

            <label class="field-label" for="moment-excerpt">摘要</label>
            <a-textarea id="moment-excerpt" v-model:value="form.excerpt" :rows="6" placeholder="可选。前台会以摘要样式展示，不会和正文混在一起。" />

            <MomentLocationEditor
              v-model:happened-at="form.happenedAt"
              v-model:place="form.place"
              v-model:visibility="form.locationVisibility"
              v-model:precision="form.locationPrecision"
              @source="form.locationSource = $event"
            />

            <div class="publish-block">
              <span>{{ published ? '已发布的修改需要再次发布才会同步到前台。' : '保存后是草稿，可在列表中发布。' }}</span>
              <a-button v-if="needsPublish" block type="primary" :loading="publishing" @click="publish">发布更新</a-button>
            </div>
          </aside>
        </div>
      </template>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
import { buildSlug } from '~/utils/postMeta'
import { buildMomentTitle } from '~/utils/moment'
import type { Place } from '~/types/place'

const props = defineProps<{ slug?: string }>()

const api = useApi()
const toast = useToast()
const router = useRouter()
const { open } = useMediaLibrary()
const editorRef = ref<{
  focus: () => void
  insertText: (text: string) => void
  insertToken: (token: string) => void
} | null>(null)
const loading = ref(Boolean(props.slug))
const creating = ref(false)
const saving = ref(false)
const publishing = ref(false)
const pickerOpen = ref(false)
const inspiration = ref('')
const currentSlug = ref(props.slug || '')
const published = ref(false)
const needsPublish = ref(false)

const form = reactive<{
  title: string
  slug: string
  excerpt: string
  content: string
  happenedAt: string
  place: Place | null
  locationVisibility: 'public' | 'blurred' | 'private'
  locationPrecision: 'exact' | 'place' | 'city' | 'province'
  locationSource: 'manual' | 'map'
}>({
  title: '', slug: '', excerpt: '', content: '', happenedAt: '', place: null,
  locationVisibility: 'private', locationPrecision: 'place', locationSource: 'manual',
})
const isEdit = computed(() => Boolean(props.slug))
const starters = [
  { label: '日常片段', icon: 'ph:coffee-bold', text: '今天最想留下来的一个小片段是：' },
  { label: '一张照片', icon: 'ph:image-bold', text: '这张照片是在记录：' },
  { label: '此刻心情', icon: 'ph:heart-straight-bold', text: '我现在想说的是：' },
]

function applyStarter(text: string) {
  inspiration.value = inspiration.value.trim() ? `${inspiration.value}\n\n${text}` : text
  nextTick(() => editorRef.value?.focus())
}

function currentText() {
  return isEdit.value ? form.content : inspiration.value
}

function setCurrentText(value: string) {
  if (isEdit.value) form.content = value
  else inspiration.value = value
}

function insertAtCursor(token: string) {
  if (editorRef.value) editorRef.value.insertToken(token)
  else setCurrentText(`${currentText()}${token}`)
}

function insertEmoji(payload: { char?: string; imageUrl?: string; label?: string }) {
  if (payload.imageUrl) insertAtCursor(`[[emoji:${payload.imageUrl}|${payload.label || '表情'}]]`)
  else if (payload.char) insertAtCursor(payload.char)
  pickerOpen.value = false
}

async function pickImages() {
  const urls = await open({ multiple: true, folder: 'moment' })
  if (!urls.length) return
  const images = urls.map((url, index) => `![瞬间图片 ${index + 1}](${url})`).join('\n')
  insertAtCursor(`${currentText().trim() ? '\n\n' : ''}${images}\n`)
}

async function createFromInspiration() {
  const text = inspiration.value.trim()
  if (!text) return
  creating.value = true
  try {
    const confirmExactLocation = await confirmExactLocationIfNeeded()
    if (confirmExactLocation === null) return
    const draft = await api.post<any>('/ai/polish-moment', { inspiration: text })
    const content = draft.content || text
    const title = draft.title || buildMomentTitle(content)
    const created = await api.post<any>('/moments', {
      title,
      slug: draft.slug || buildSlug(title),
      content,
      excerpt: draft.excerpt || undefined,
      ...locationPayload(confirmExactLocation),
    })
    Modal.confirm({
      title: '瞬间草稿已创建',
      content: `「${created.title || title}」已保存。`,
      okText: '去预览',
      cancelText: '返回列表',
      onOk: () => router.push(`/admin/moments/preview?slug=${encodeURIComponent(created.slug)}`),
      onCancel: () => router.push('/admin/moments'),
    })
  } catch (error: any) {
    toast.error(`创建失败：${error?.message || ''}`)
  } finally {
    creating.value = false
  }
}

async function loadExisting() {
  if (!props.slug) return
  loading.value = true
  try {
    const moment = await api.get<any>(`/moments/${props.slug}/preview`)
    currentSlug.value = moment.slug
    form.title = moment.title || ''
    form.slug = moment.slug || ''
    form.excerpt = moment.excerpt || ''
    form.content = moment.content || ''
    form.happenedAt = toLocalDateTime(moment.happenedAt)
    form.place = moment.place || null
    form.locationVisibility = moment.locationVisibility || 'private'
    form.locationPrecision = moment.locationPrecision || 'place'
    form.locationSource = moment.locationSource === 'map' ? 'map' : 'manual'
    published.value = moment.status === 'published'
    needsPublish.value = !!moment.needsPublish
  } catch (error: any) {
    toast.error(`读取瞬间失败：${error?.message || ''}`)
    await router.replace('/admin/moments')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!currentSlug.value || !form.content.trim()) {
    toast.warning('正文不能为空')
    return
  }
  saving.value = true
  try {
    const confirmExactLocation = await confirmExactLocationIfNeeded()
    if (confirmExactLocation === null) return
    const title = form.title.trim() || buildMomentTitle(form.content)
    const result = await api.put<any>(`/moments/${currentSlug.value}`, {
      title,
      slug: form.slug.trim() || buildSlug(title),
      excerpt: form.excerpt.trim() || undefined,
      content: form.content.trim(),
      ...locationPayload(confirmExactLocation),
    })
    form.title = result.title || title
    form.slug = result.slug || form.slug
    currentSlug.value = result.slug || currentSlug.value
    needsPublish.value = !!result.needsPublish
    toast.success('已保存')
    if (result.slug && result.slug !== props.slug) await router.replace(`/admin/moments/${result.slug}`)
  } catch (error: any) {
    toast.error(`保存失败：${error?.message || ''}`)
  } finally {
    saving.value = false
  }
}

async function publish() {
  if (!currentSlug.value) return
  publishing.value = true
  try {
    await api.post(`/moments/${currentSlug.value}/publish`)
    published.value = true
    needsPublish.value = false
    toast.success('已发布到瞬间流')
  } catch (error: any) {
    toast.error(`发布失败：${error?.message || ''}`)
  } finally {
    publishing.value = false
  }
}

function openPreview() {
  if (!currentSlug.value) return
  router.push(`/admin/moments/preview?slug=${encodeURIComponent(currentSlug.value)}`)
}

function locationPayload(confirmExactLocation: boolean) {
  return {
    placeId: form.place?.id || null,
    happenedAt: form.happenedAt ? new Date(form.happenedAt).toISOString() : null,
    locationVisibility: form.place ? form.locationVisibility : 'private',
    locationPrecision: form.place ? form.locationPrecision : 'place',
    locationSource: form.place ? form.locationSource : null,
    confirmExactLocation,
  }
}

function toLocalDateTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function confirmExactLocationIfNeeded(): Promise<boolean | null> {
  if (!form.place || form.locationVisibility !== 'public' || form.locationPrecision !== 'exact') {
    return Promise.resolve(false)
  }
  return new Promise((resolve) => {
    Modal.confirm({
      title: '确认公开精确位置？',
      content: `保存后，访客可获得「${form.place?.name}」的精确坐标。住宅或私人地点建议改为模糊公开。`,
      okText: '确认精确公开',
      cancelText: '返回检查',
      okType: 'danger',
      onOk: () => resolve(true),
      onCancel: () => resolve(null),
    })
  })
}

onMounted(() => { void loadExisting() })
</script>

<style scoped>
.moment-editor { min-height: 100%; padding: 8px 0 28px; }
.studio-header { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:24px; }
.studio-heading, .header-actions { display:flex; align-items:center; gap:12px; }
.studio-icon { display:grid; width:42px; height:42px; place-items:center; border:1px solid var(--border); border-radius:8px; background:var(--c-primary-soft); color:var(--c-primary); font-size:1.25rem; }
.studio-heading p, .surface-kicker { margin:0; color:var(--c-text-3); font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; }
.studio-heading h1 { margin:3px 0 0; color:var(--c-text); font-size:1.55rem; line-height:1.25; }
.quick-create-shell { width:min(760px,100%); margin:34px auto 0; padding:24px 26px 18px; border:1px solid color-mix(in srgb,var(--border) 84%,transparent); border-radius:16px; background:var(--ld-bg-card); box-shadow:0 12px 32px color-mix(in srgb,var(--ld-shadow) 48%,transparent); }
.quick-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-bottom:14px; border-bottom:1px solid color-mix(in srgb,var(--border) 72%,transparent); }
.quick-head > div { display:flex; align-items:center; gap:8px; color:var(--c-text-2); font-size:.8rem; }
.quick-head i { width:7px; height:7px; border-radius:50%; background:var(--c-primary); box-shadow:0 0 0 4px var(--c-primary-soft); }
.quick-head strong { font-weight:650; }
.quick-head > span { color:var(--c-text-3); font-size:.72rem; font-variant-numeric:tabular-nums; }
.quick-input { display:block; width:100%; min-height:210px; max-height:52vh; overflow-y:auto; padding:22px 2px; border:0; outline:0; background:transparent; color:var(--c-text); font:inherit; font-size:1rem; line-height:1.9; }
.starter-row { display:flex; flex-wrap:wrap; align-items:center; gap:7px; padding:12px 0 15px; border-top:1px dashed color-mix(in srgb,var(--border) 78%,transparent); }
.starter-row > span { margin-right:3px; color:var(--c-text-3); font-size:.7rem; }
.starter-row button { display:inline-flex; align-items:center; gap:5px; padding:5px 9px; border:1px solid var(--border); border-radius:999px; background:transparent; color:var(--c-text-2); cursor:pointer; font:inherit; font-size:.7rem; transition:background-color .18s ease,color .18s ease; }
.starter-row button:hover { background:var(--c-primary-soft); color:var(--c-primary); }
.quick-location { margin-top:4px; padding:16px 0; border-top:1px dashed color-mix(in srgb,var(--border) 78%,transparent); }
.quick-footer { display:flex; align-items:center; justify-content:space-between; gap:16px; padding-top:14px; border-top:1px solid color-mix(in srgb,var(--border) 72%,transparent); }
.quick-footer .composer-tools { margin-top:0; align-items:center; }
.quick-footer .composer-tools > span { margin-left:4px; color:var(--c-text-3); font-size:.7rem; }
.create-layout, .edit-layout { display:grid; grid-template-columns:minmax(0,1fr) 260px; gap:20px; align-items:start; max-width:1180px; }
.writing-surface, .prompt-rail, .edit-rail { border:1px solid var(--border); border-radius:8px; background:var(--ld-bg-card); }
.writing-surface { padding:24px; }
.surface-head { display:flex; align-items:start; justify-content:space-between; gap:12px; margin-bottom:18px; }
.surface-head h2, .prompt-rail h2 { margin:5px 0 0; color:var(--c-text); font-size:1.1rem; }
.surface-head > span { color:var(--c-text-3); font-size:.78rem; }
.moment-input { display:block; width:100%; padding:16px; border:1px solid var(--border); border-radius:6px; outline:0; overflow-y:auto; background:var(--c-bg); color:var(--c-text); font:inherit; line-height:1.85; }
.moment-input:focus { border-color:var(--c-primary); box-shadow:0 0 0 3px var(--c-primary-soft); }
.composer-tools { position:relative; display:flex; gap:8px; margin-top:12px; }
.icon-action { display:grid; width:34px; height:34px; place-items:center; border:1px solid var(--border); border-radius:6px; background:var(--c-bg); color:var(--c-text-2); cursor:pointer; font-size:1.05rem; }
.icon-action:hover, .icon-action.active { border-color:var(--c-primary); color:var(--c-primary); }
.surface-actions { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:20px; color:var(--c-text-3); font-size:.78rem; }
.prompt-rail, .edit-rail { padding:18px; }
.prompt-rail h2 { margin-bottom:14px; }
.prompt-rail button { display:flex; width:100%; align-items:center; gap:10px; padding:11px 0; border:0; border-bottom:1px solid var(--border); background:transparent; color:var(--c-text-2); cursor:pointer; font:inherit; text-align:left; }
.prompt-rail button:last-child { border-bottom:0; }
.prompt-rail button:hover { color:var(--c-primary); }
.field-label { display:block; margin:0 0 7px; color:var(--c-text-3); font-size:.76rem; }
.title-input { margin-bottom:20px; padding:0; color:var(--c-text); font-size:1.35rem; font-weight:650; }
.edit-input { min-height:420px; }
.edit-rail { display:grid; gap:16px; }
.publish-block { display:grid; gap:10px; padding-top:16px; border-top:1px solid var(--border); color:var(--c-text-3); font-size:.78rem; line-height:1.7; }
.spinning { animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
@media (max-width:900px) { .create-layout, .edit-layout { grid-template-columns:1fr; } .prompt-rail { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; } .prompt-rail h2, .prompt-rail > .surface-kicker { grid-column:1 / -1; } .prompt-rail button { border:1px solid var(--border); border-radius:6px; padding:10px; } }
@media (max-width:640px) { .studio-header, .surface-actions { align-items:stretch; flex-direction:column; } .header-actions { display:grid; grid-template-columns:repeat(3,1fr); } .quick-create-shell { margin-top:20px; padding:18px 16px 14px; border-radius:12px; } .quick-input { min-height:180px; padding:18px 1px; font-size:.92rem; } .quick-footer { align-items:stretch; flex-direction:column; } .quick-footer .composer-tools > span { display:none; } .quick-footer > :last-child { align-self:flex-end; } .writing-surface, .prompt-rail, .edit-rail { padding:16px; } .prompt-rail { grid-template-columns:1fr; } .prompt-rail h2, .prompt-rail > .surface-kicker { grid-column:auto; } .edit-input { min-height:300px; } }
</style>

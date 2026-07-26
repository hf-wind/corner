<template>
  <div class="library-form-page">
    <header class="form-header">
      <div>
        <a-button type="text" class="back-button" @click="router.push('/admin/library')">
          <Icon name="ph:arrow-left-bold" /> 返回书影音
        </a-button>
        <h1>{{ item ? '编辑收藏记录' : '新增收藏记录' }}</h1>
        <p>把故事资料与自己的阅读、观影感受一起留下。</p>
      </div>
      <div class="header-actions">
        <a-select v-model:value="form.publishStatus" style="width: 112px">
          <a-select-option value="draft">草稿</a-select-option>
          <a-select-option value="published">发布</a-select-option>
        </a-select>
        <a-button type="primary" :loading="saving" :disabled="aiLoading" @click="save">
          <Icon name="ph:floppy-disk-bold" /> 保存记录
        </a-button>
      </div>
    </header>

    <Transition name="ai-banner">
      <div v-if="aiLoading" class="ai-loading-banner" role="status" aria-live="polite">
        <span class="ai-loading-icon"><Icon name="ph:sparkle-fill" /></span>
        <div><strong>AI 正在查询并整理这部作品</strong><span>正在补全简介、体会、摘录与名句，通常需要几秒钟…</span></div>
        <i /><i /><i />
      </div>
    </Transition>

    <a-spin :spinning="aiLoading" tip="AI 正在生成记录草稿，请稍候" size="large" class="ai-form-spin">
    <div class="form-grid" :aria-busy="aiLoading">
      <div class="form-main">
        <a-card :bordered="false" class="section-card">
          <div class="section-title"><span>01</span> 基本资料</div>
          <a-form layout="vertical">
            <div class="type-switch" role="group" aria-label="内容类型">
              <button type="button" :class="{ active: form.type === 'book' }" @click="setType('book')">
                <Icon name="ph:book-open-text-bold" /> 书籍
              </button>
              <button type="button" :class="{ active: form.type === 'film' }" @click="setType('film')">
                <Icon name="ph:film-strip-bold" /> 影视
              </button>
            </div>
            <div class="two-columns">
              <a-form-item label="名称" required extra="输入名称后，AI 会补全作品资料、体会草稿、摘录与名句；状态、日期、评分和排名仍由你填写">
                <div class="ai-title-row">
                  <a-input v-model:value="form.title" placeholder="例如：穆斯林的葬礼" @blur="ensureSlug" @pressEnter="lookupWithAi" />
                  <a-button class="ai-fill-button" :loading="aiLoading" :disabled="!form.title.trim()" @click="lookupWithAi">
                    <Icon name="ph:sparkle-bold" /> AI 一键填充
                  </a-button>
                </div>
              </a-form-item>
              <a-form-item label="原名 / 外文名">
                <a-input v-model:value="form.originalTitle" placeholder="可选" />
              </a-form-item>
            </div>
            <a-form-item label="页面 Slug" required extra="用于详情页地址，建议使用英文与短横线">
              <a-input v-model:value="form.slug" placeholder="例如：muslim-funeral" />
            </a-form-item>
            <div class="two-columns">
              <a-form-item :label="form.type === 'book' ? '作者' : '导演'">
                <a-input v-if="form.type === 'book'" v-model:value="form.creator" placeholder="作者姓名" />
                <a-input v-else v-model:value="form.director" placeholder="导演姓名" />
              </a-form-item>
              <a-form-item v-if="form.type === 'film'" label="上映年份">
                <a-input-number v-model:value="form.releaseYear" :min="1000" :max="3000" style="width:100%" placeholder="上映年份" />
              </a-form-item>
              <a-form-item label="国家 / 地区">
                <a-input v-model:value="form.country" placeholder="中国大陆" />
              </a-form-item>
              <a-form-item label="语言">
                <a-input v-model:value="form.language" placeholder="中文" />
              </a-form-item>
            </div>
            <a-form-item :label="form.type === 'film' ? '类型 / 悬疑标签' : '分类 / 主题'" extra="用逗号分隔">
              <a-input v-model:value="genresText" :placeholder="form.type === 'film' ? '悬疑, 犯罪, 心理' : '文学, 家族, 爱情'" />
            </a-form-item>
            <a-form-item label="简介">
              <a-textarea v-model:value="form.summary" :rows="5" placeholder="作品讲了什么？尽量保持简洁，不剧透。" />
            </a-form-item>
          </a-form>
        </a-card>

        <a-card :bordered="false" class="section-card reflection-card">
          <div class="section-title"><span>02</span> 我的记录</div>
          <a-form layout="vertical">
            <a-form-item label="体会 / 短评" extra="这是详情页的核心内容，可以写得长一些">
              <a-textarea v-model:value="form.reflection" :rows="9" placeholder="它为什么触动我？阅读或观看后留下了什么？" />
            </a-form-item>
            <div class="two-columns">
              <a-form-item :label="form.type === 'book' ? '阅读状态' : '观看状态'">
                <a-select v-model:value="form.progressStatus" allow-clear placeholder="请选择">
                  <a-select-option v-for="option in progressOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="我的评分（10 分制）">
                <a-input-number v-model:value="form.rating" :min="0" :max="10" :step="0.1" style="width:100%" />
              </a-form-item>
              <a-form-item :label="form.type === 'book' ? '阅读日期' : '观看日期'" extra="记录到月份即可">
                <input v-model="form.experienceDate" class="date-input" type="month">
              </a-form-item>
            </div>
            <a-form-item :label="form.type === 'book' ? '摘录' : '印象深刻的段落 / 场景'" extra="每行一条，详情页会逐条展示">
              <a-textarea v-model:value="highlightsText" :rows="5" placeholder="每行记录一条" />
            </a-form-item>
            <a-form-item :label="form.type === 'book' ? '名句' : '经典台词'" extra="每行一条">
              <a-textarea v-model:value="quotesText" :rows="4" placeholder="每行记录一句" />
            </a-form-item>
          </a-form>
        </a-card>

        <a-card v-if="form.type === 'film'" :bordered="false" class="section-card">
          <div class="section-title"><span>03</span> 影视信息</div>
          <a-form layout="vertical">
            <div class="two-columns">
              <a-form-item label="个人排名" extra="数字越小排名越靠前">
                <a-input-number v-model:value="form.rank" :min="1" style="width:100%" />
              </a-form-item>
              <a-form-item label="单集 / 影片时长（分钟）"><a-input-number v-model:value="form.runtimeMinutes" :min="1" style="width:100%" /></a-form-item>
              <a-form-item label="集数"><a-input-number v-model:value="form.episodeCount" :min="1" style="width:100%" /></a-form-item>
              <a-form-item label="观看平台"><a-input v-model:value="form.platform" placeholder="影院 / Netflix / 爱奇艺" /></a-form-item>
            </div>
            <a-form-item label="主要演员" extra="用逗号分隔"><a-input v-model:value="castText" /></a-form-item>
          </a-form>
        </a-card>
      </div>

      <aside class="form-aside">
        <a-card :bordered="false" class="section-card cover-card">
          <div class="section-title"><span>封面</span></div>
          <div class="cover-preview" :class="form.type">
            <img v-if="form.coverImage" :src="mediaUrl(form.coverImage)" alt="封面预览">
            <div v-else class="cover-empty">
              <Icon :name="form.type === 'book' ? 'ph:book-open-text' : 'ph:film-slate'" />
              <span>选择一张竖版封面</span>
            </div>
          </div>
          <a-button block @click="pickCover"><Icon name="ph:image-bold" /> 从文件库选择</a-button>
          <a-input v-model:value="form.coverImage" class="cover-url" placeholder="或粘贴图片 URL" allow-clear />
          <p>建议比例 2:3，宽度至少 600px。</p>
        </a-card>

        <a-card :bordered="false" class="section-card quick-card">
          <div class="section-title"><span>展示设置</span></div>
          <div class="switch-row">
            <div><strong>特别推荐</strong><span>会获得醒目标记并优先展示</span></div>
            <a-switch v-model:checked="form.recommended" />
          </div>
          <div class="preview-link" v-if="item?.slug && item.publishStatus === 'published'">
            <NuxtLink :to="`/library/${item.slug}`" target="_blank"><Icon name="ph:arrow-square-out-bold" /> 查看前台详情</NuxtLink>
          </div>
        </a-card>
      </aside>
    </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import type { LibraryItem, LibraryType } from '~/types/library'

const props = defineProps<{ item?: LibraryItem | null }>()
const api = useApi()
const toast = useToast()
const router = useRouter()
const { mediaUrl } = useMediaUrl()
const saving = ref(false)
const aiLoading = ref(false)

const emptyForm = () => ({
  type: 'book' as LibraryType, title: '', originalTitle: '', slug: '', coverImage: '', creator: '', director: '',
  summary: '', reflection: '', publishStatus: 'draft' as 'draft' | 'published', progressStatus: undefined as string | undefined,
  rating: undefined as number | undefined, rank: undefined as number | undefined, recommended: false,
  experienceDate: '', releaseYear: undefined as number | undefined, country: '', language: '',
  runtimeMinutes: undefined as number | undefined, episodeCount: undefined as number | undefined, platform: '',
})
const form = reactive(emptyForm())
const genresText = ref('')
const castText = ref('')
const highlightsText = ref('')
const quotesText = ref('')

const progressOptions = computed(() => form.type === 'book'
  ? [{ value: 'want-to-read', label: '想读' }, { value: 'reading', label: '在读' }, { value: 'finished', label: '已读' }, { value: 'paused', label: '搁置' }]
  : [{ value: 'want-to-watch', label: '想看' }, { value: 'watching', label: '在看' }, { value: 'watched', label: '已看' }, { value: 'paused', label: '搁置' }])

function setType(type: LibraryType) {
  form.type = type
  form.progressStatus = undefined
  if (type === 'book') form.releaseYear = undefined
}

function monthOnly(value?: string | null) {
  return value ? value.slice(0, 7) : ''
}

function applyItem(item?: LibraryItem | null) {
  if (!item) return
  Object.assign(form, emptyForm(), item, { experienceDate: monthOnly(item.experienceDate) })
  genresText.value = (item.genres || []).join(', ')
  castText.value = (item.cast || []).join(', ')
  highlightsText.value = (item.highlights || []).join('\n')
  quotesText.value = (item.quotes || []).join('\n')
}

watch(() => props.item, applyItem, { immediate: true })

function ensureSlug() {
  if (form.slug.trim() || !form.title.trim()) return
  const ascii = form.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  form.slug = ascii || `${form.type}-${Date.now().toString(36)}`
}

async function lookupWithAi() {
  if (!form.title.trim() || aiLoading.value) return
  aiLoading.value = true
  try {
    const data = await api.post<Record<string, any>>('/library/ai/lookup', { type: form.type, title: form.title.trim() })
    const assignable = [
      'title', 'originalTitle', 'creator', 'summary', 'reflection', 'country', 'language',
      'director', 'runtimeMinutes', 'episodeCount', 'coverImage',
    ]
    if (form.type === 'film') assignable.push('releaseYear')
    let filled = 0
    for (const key of assignable) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        ;(form as any)[key] = data[key]
        filled++
      }
    }
    if (Array.isArray(data.genres)) { genresText.value = data.genres.join(', '); filled++ }
    if (Array.isArray(data.cast)) { castText.value = data.cast.join(', '); filled++ }
    if (Array.isArray(data.highlights)) { highlightsText.value = data.highlights.join('\n'); filled++ }
    if (Array.isArray(data.quotes)) { quotesText.value = data.quotes.join('\n'); filled++ }
    if (!form.slug) {
      const source = String(data.originalTitle || data.title || form.title)
      form.slug = source.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `${form.type}-${Date.now().toString(36)}`
    }
    toast.success(`AI 已补全 ${filled} 项资料，请核对后保存`)
  } catch (error: any) {
    toast.error(error?.message || 'AI 查询失败，请检查后台 AI 配置')
  } finally {
    aiLoading.value = false
  }
}

function splitComma(value: string) {
  return value.split(/[,，]/).map(item => item.trim()).filter(Boolean)
}

function splitLines(value: string) {
  return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean)
}

async function pickCover() {
  const { open } = useMediaLibrary()
  const urls = await open({ multiple: false, folder: 'library' })
  if (urls.length) form.coverImage = urls[0]
}

async function save() {
  ensureSlug()
  if (!form.title.trim()) { toast.warning('请填写名称'); return }
  if (!form.slug.trim()) { toast.warning('请填写 Slug'); return }
  const payload: Record<string, any> = {
    ...form,
    title: form.title.trim(), slug: form.slug.trim(),
    experienceDate: form.experienceDate ? `${form.experienceDate}-01` : null,
    genres: splitComma(genresText.value), cast: splitComma(castText.value),
    highlights: splitLines(highlightsText.value), quotes: splitLines(quotesText.value),
  }
  for (const key of Object.keys(payload)) {
    if (payload[key] === '' || payload[key] === undefined) delete payload[key]
  }
  saving.value = true
  try {
    if (props.item?.id) await api.put(`/library/${props.item.id}`, payload)
    else await api.post('/library', payload)
    toast.success(props.item ? '记录已更新' : '记录已创建')
    router.push('/admin/library')
  } catch (error: any) {
    toast.error(error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.library-form-page { width: min(1180px, 100%); margin: 0 auto; padding-bottom: 40px; }
.ai-form-spin { display:block; width:100%; }
.ai-loading-banner { position:relative; display:flex; align-items:center; gap:12px; margin-bottom:14px; padding:13px 18px; overflow:hidden; border:1px solid color-mix(in srgb,var(--c-primary) 30%,var(--border)); border-radius:12px; background:linear-gradient(90deg,var(--c-primary-soft),color-mix(in srgb,var(--ld-bg-card) 92%,var(--c-primary-soft))); color:var(--c-primary); }
.ai-loading-banner>div { display:flex; flex-direction:column; gap:2px; }.ai-loading-banner strong { font-size:.78rem; }.ai-loading-banner span { color:var(--c-text-2); font-size:.65rem; }.ai-loading-icon { display:grid; width:34px; height:34px; flex:0 0 34px; border-radius:50%; background:var(--ld-bg-card); color:var(--c-primary)!important; font-size:1rem!important; place-items:center; animation:ai-pulse 1.35s ease-in-out infinite; }
.ai-loading-banner>i { position:absolute; top:0; width:46px; height:100%; background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--c-primary) 10%,transparent),transparent); transform:skewX(-18deg); animation:ai-scan 1.8s linear infinite; }.ai-loading-banner>i:nth-last-child(3) { left:-70px; }.ai-loading-banner>i:nth-last-child(2) { left:-130px; animation-delay:.42s; }.ai-loading-banner>i:last-child { left:-190px; animation-delay:.84s; }
.ai-banner-enter-active,.ai-banner-leave-active { transition:opacity .2s ease,transform .25s ease; }.ai-banner-enter-from,.ai-banner-leave-to { opacity:0; transform:translateY(-6px); }
.form-header { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; margin-bottom:20px; }
.form-header h1 { margin:4px 0 4px; color:var(--c-text); font-size:1.55rem; }
.form-header p { color:var(--c-text-3); font-size:.78rem; }
.back-button { margin-left:-12px; color:var(--c-text-2); }
.header-actions { display:flex; gap:10px; }
.form-grid { display:grid; grid-template-columns:minmax(0, 1fr) 278px; gap:18px; align-items:start; }
.form-main { display:flex; flex-direction:column; gap:18px; min-width:0; }
.form-aside { position:sticky; top:0; display:flex; flex-direction:column; gap:18px; }
.section-card { border:1px solid color-mix(in srgb, var(--border) 72%, transparent); border-radius:14px; background:var(--ld-bg-card); box-shadow:0 8px 30px color-mix(in srgb, var(--ld-shadow) 35%, transparent); }
.section-title { display:flex; align-items:center; gap:10px; margin-bottom:20px; color:var(--c-text); font-size:.92rem; font-weight:700; }
.section-title span { color:var(--c-primary); font-size:.65rem; letter-spacing:.08em; }
.type-switch { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:20px; padding:5px; border-radius:12px; background:var(--c-bg-2); }
.type-switch button { display:flex; height:42px; align-items:center; justify-content:center; gap:8px; border:0; border-radius:9px; background:transparent; color:var(--c-text-2); cursor:pointer; font:inherit; font-size:.84rem; }
.type-switch button.active { background:var(--ld-bg-card); color:var(--c-primary); box-shadow:0 3px 12px var(--ld-shadow); font-weight:700; }
.two-columns { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); column-gap:16px; }
.ai-title-row { display:flex; gap:8px; }.ai-title-row>:first-child { min-width:0; flex:1; }.ai-fill-button { border-color:color-mix(in srgb,var(--c-primary) 45%,var(--border)); color:var(--c-primary); font-weight:650; }
.date-input { width:100%; height:32px; padding:0 11px; border:1px solid var(--border); border-radius:6px; background:var(--ld-bg-card); color:var(--c-text); outline:0; }
.date-input:focus { border-color:var(--c-primary); box-shadow:0 0 0 2px var(--c-primary-soft); }
.cover-preview { aspect-ratio:2/3; margin-bottom:14px; overflow:hidden; border-radius:12px; background:linear-gradient(145deg,var(--c-bg-2),var(--c-primary-soft)); box-shadow:0 12px 30px var(--ld-shadow); }
.cover-preview img { width:100%; height:100%; object-fit:cover; }
.cover-empty { display:flex; height:100%; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:var(--c-text-3); font-size:.72rem; }
.cover-empty :deep(svg) { font-size:2.7rem; color:var(--c-primary); opacity:.6; }
.cover-url { margin-top:10px; }
.cover-card > :deep(.ant-card-body) > p { margin:10px 0 0; color:var(--c-text-3); font-size:.67rem; line-height:1.6; }
.switch-row { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.switch-row > div { display:flex; flex-direction:column; gap:3px; }
.switch-row strong { color:var(--c-text); font-size:.8rem; }
.switch-row span { color:var(--c-text-3); font-size:.65rem; line-height:1.5; }
.preview-link { margin-top:18px; padding-top:14px; border-top:1px solid var(--border); }
.preview-link a { color:var(--c-primary); font-size:.75rem; text-decoration:none; }
@keyframes ai-pulse { 50% { box-shadow:0 0 0 8px color-mix(in srgb,var(--c-primary) 8%,transparent); transform:rotate(8deg) scale(1.05); } }
@keyframes ai-scan { to { left:calc(100% + 70px); } }
@media (max-width:900px) { .form-grid { grid-template-columns:1fr; } .form-aside { position:static; grid-row:1; } .cover-card { max-width:280px; } }
@media (max-width:600px) { .form-header { align-items:flex-start; flex-direction:column; } .header-actions { width:100%; } .header-actions > :deep(*) { flex:1; } .two-columns { grid-template-columns:1fr; }.ai-title-row { align-items:stretch; flex-direction:column; } }
</style>

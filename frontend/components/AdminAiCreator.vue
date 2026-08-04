<template>
  <div class="ai-create-page">
    <header class="page-header">
      <div class="page-title">
        <span class="title-icon"><Icon name="ph:magic-wand-bold" /></span>
        <div><p>AI CREATION STUDIO</p><h1>AI 创作台</h1></div>
        <em>Beta</em>
      </div>
      <a-button @click="router.push(mode === 'article' ? '/admin/posts' : '/admin/moments')">返回{{ modeConfig.listName }}</a-button>
    </header>

    <section class="mode-hero">
      <div class="mode-intro">
        <span><Icon :name="modeConfig.icon" />{{ modeConfig.kicker }}</span>
        <Transition name="mode-fade" mode="out-in">
          <div :key="mode">
            <h2>{{ modeConfig.title }}</h2>
            <p>{{ modeConfig.description }}</p>
          </div>
        </Transition>
      </div>
      <div class="mode-switch" role="tablist" aria-label="创作类型">
        <button type="button" role="tab" :aria-selected="mode === 'article'" :class="{ active: mode === 'article' }" @click="mode = 'article'">
          <Icon name="ph:article-bold" /><span><strong>文章</strong><small>完整叙事</small></span>
        </button>
        <button type="button" role="tab" :aria-selected="mode === 'moment'" :class="{ active: mode === 'moment' }" @click="mode = 'moment'">
          <Icon name="ph:sparkle-bold" /><span><strong>瞬间</strong><small>轻量记录</small></span>
        </button>
      </div>
    </section>

    <div class="studio-grid">
      <section class="prompt-card">
        <header class="prompt-head">
          <div><span>PROMPT</span><h2>{{ modeConfig.promptTitle }}</h2></div>
          <small>{{ prompt.trim().length }} 字</small>
        </header>

        <textarea
          v-if="mode === 'article'"
          ref="articleEditorRef"
          class="prompt-editor"
          v-model="prompt"
          :rows="13"
          :placeholder="modeConfig.placeholder"
          :disabled="generating"
        />
        <MomentRichEditor
          v-else
          ref="momentEditorRef"
          v-model="prompt"
          class="prompt-editor moment-prompt-editor"
          :placeholder="modeConfig.placeholder"
        />

        <div class="preset-row">
          <span>灵感模板</span>
          <button v-for="preset in presets" :key="preset.label" type="button" @click="applyPreset(preset.text)"><Icon :name="preset.icon" />{{ preset.label }}</button>
        </div>

        <footer class="prompt-footer">
          <div class="prompt-tools">
            <template v-if="mode === 'moment'">
              <div class="picker-wrap"><button type="button" class="tool-button" :class="{ active: pickerOpen }" title="插入表情" @click="pickerOpen = !pickerOpen"><Icon name="ph:smiley-bold" /></button><EmojiPalette :open="pickerOpen" @select="insertEmoji" @close="pickerOpen = false" /></div>
              <button type="button" class="tool-button" title="插入图片" @click="pickImages"><Icon name="ph:image-bold" /></button>
            </template>
            <span><Icon name="ph:shield-check" />生成结果会先保存为草稿</span>
          </div>
          <button type="button" class="generate-button" :disabled="!prompt.trim() || generating" @click="generate">
            <Icon :name="generating ? 'ph:spinner-gap-bold' : 'ph:sparkle-bold'" :class="{ spinning: generating }" />
            {{ generating ? modeConfig.loadingText : modeConfig.actionText }}
          </button>
        </footer>
      </section>

      <aside class="studio-rail">
        <section class="rail-card flow-card">
          <header><span>AI WORKFLOW</span><h3>接下来会发生什么</h3></header>
          <ol>
            <li v-for="(step, index) in modeConfig.steps" :key="step.title"><i>{{ index + 1 }}</i><div><strong>{{ step.title }}</strong><span>{{ step.text }}</span></div></li>
          </ol>
        </section>
        <section class="rail-card tone-card">
          <Icon :name="mode === 'article' ? 'ph:quotes-fill' : 'ph:lightbulb-filament-fill'" />
          <Transition name="mode-fade" mode="out-in"><p :key="mode">{{ modeConfig.tip }}</p></Transition>
          <span>{{ mode === 'article' ? '适合完整表达' : '适合此刻就写' }}</span>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
import { buildSlug } from '~/utils/postMeta'
import { buildMomentTitle } from '~/utils/moment'

type CreatorMode = 'article' | 'moment'
const props = withDefaults(defineProps<{ initialMode?: CreatorMode }>(), { initialMode: 'article' })
const api = useApi()
const toast = useToast()
const router = useRouter()
const { open } = useMediaLibrary()
const mode = ref<CreatorMode>(props.initialMode)
const drafts = reactive<Record<CreatorMode,string>>({ article:'', moment:'' })
const generating = ref(false)
const pickerOpen = ref(false)
const articleEditorRef = ref<HTMLTextAreaElement|null>(null)
const momentEditorRef = ref<{ focus: () => void; insertToken: (token: string) => void } | null>(null)
const prompt = computed({ get:() => drafts[mode.value], set:(value:string) => { drafts[mode.value] = value } })

const configs = {
  article: {
    icon:'ph:article-bold', kicker:'LONG FORM · 深度写作', title:'把一个想法，发展成一篇完整文章',
    description:'提供主题、片段或提纲，AI 会组织结构、补足过渡并生成可继续编辑的文章草稿。',
    promptTitle:'告诉 AI 这篇文章想写什么', placeholder:'可以是一段完整想法，也可以只是几个要点。\n\n例如：我想写最近为什么开始慢下来，以及散步、读书和听歌如何重新安排了一天。',
    actionText:'生成文章草稿', loadingText:'正在组织文章…', listName:'文章列表',
    tip:'好文章不需要从结论开始。一个具体场景、一句真实感受，往往比完整提纲更有生命力。',
    steps:[{title:'理解主题',text:'识别核心观点与叙事方向'},{title:'组织全文',text:'生成标题、结构、正文与摘要'},{title:'继续编辑',text:'进入编辑器补充细节后发布'}],
  },
  moment: {
    icon:'ph:sparkle-bold', kicker:'QUICK NOTE · 即时记录', title:'把眼前这一刻，整理成轻盈的瞬间',
    description:'写下原始感受，也可以附上图片。AI 只做轻度整理，保留自然、真实的表达。',
    promptTitle:'此刻最想留下什么', placeholder:'一句话、一张图、一个还没有想明白的念头都可以。\n\n例如：下班绕路去了江边，风很轻，忽然觉得今天不必急着结束。',
    actionText:'整理瞬间草稿', loadingText:'正在轻轻整理…', listName:'瞬间列表',
    tip:'瞬间不必写得完整。保留一点停顿和未说完，比用力总结更接近当时的心情。',
    steps:[{title:'保留原意',text:'识别情绪与最值得留下的细节'},{title:'轻度润色',text:'生成标题与简短摘要，不过度扩写'},{title:'预览发布',text:'确认图片和文字后加入瞬间流'}],
  },
} as const

const modeConfig = computed(() => configs[mode.value])
const presets = computed(() => mode.value === 'article' ? [
  { label:'生活随笔',icon:'ph:coffee-bold',text:'想写一篇生活随笔。从一个今天真实发生的场景写起，再展开最近的心境变化，结尾落在一个小而真实的感受上。' },
  { label:'阅读观影',icon:'ph:book-open-text-bold',text:'想写一篇读后感或观后感。写最打动我的部分、为什么被触动，以及它和我自身经历的联系。' },
  { label:'阶段复盘',icon:'ph:compass-tool-bold',text:'想写一篇阶段复盘，按照发生了什么、学到了什么、接下来准备怎么做三个层次展开。' },
] : [
  { label:'日常片段',icon:'ph:coffee-bold',text:'今天最想留下来的一个小片段是：' },
  { label:'一张照片',icon:'ph:image-bold',text:'这张照片是在记录：' },
  { label:'此刻心情',icon:'ph:heart-straight-bold',text:'我现在最想说的是：' },
])

function focusEditor() { mode.value === 'moment' ? momentEditorRef.value?.focus() : articleEditorRef.value?.focus() }
watch(mode, () => { pickerOpen.value=false; nextTick(focusEditor) })

function applyPreset(text:string) { prompt.value = prompt.value.trim() ? `${prompt.value}\n\n${text}` : text; nextTick(focusEditor) }
function insertAtCursor(token:string) {
  if (mode.value === 'moment' && momentEditorRef.value) {
    momentEditorRef.value.insertToken(token)
    return
  }
  const area=articleEditorRef.value; const text=prompt.value; const start=area?.selectionStart ?? text.length; const end=area?.selectionEnd ?? text.length
  prompt.value=`${text.slice(0,start)}${token}${text.slice(end)}`
  nextTick(()=>{ area?.focus(); area?.setSelectionRange(start+token.length,start+token.length) })
}
function insertEmoji(payload:{char?:string;imageUrl?:string;label?:string}) { insertAtCursor(payload.imageUrl ? `[[emoji:${payload.imageUrl}|${payload.label || '表情'}]]` : payload.char || ''); pickerOpen.value=false }
async function pickImages() { const urls=await open({multiple:true,folder:'moment'}); if (!urls.length) return; insertAtCursor(`${prompt.value.trim()?'\n\n':''}${urls.map((url,index)=>`![瞬间图片 ${index+1}](${url})`).join('\n')}\n`) }

async function generate() {
  const text=prompt.value.trim()
  if (text.length < 2) { toast.warning('请先写下一点内容'); return }
  generating.value=true
  try { if (mode.value === 'article') await generateArticle(text); else await generateMoment(text) }
  catch (error:any) { toast.error(`生成失败：${error?.message || ''}`) }
  finally { generating.value=false }
}

async function generateArticle(text:string) {
  const result=await api.post<any>('/ai/generate-article',{outline:text})
  const title=result.title || text.slice(0,40); const slug=result.slug || buildSlug(title)
  const post=await api.post<any>('/posts',{title,slug,content:result.content || '',excerpt:result.excerpt || '',coverImage:result.coverImage || '',categoryId:result.categoryId || undefined,tagIds:result.tagIds || [],featured:false})
  const finalSlug=post?.slug || slug
  Modal.confirm({title:'文章草稿已创建',content:`《${title}》已保存，可以继续编辑或预览。`,okText:'继续编辑',cancelText:'返回列表',onOk:()=>router.push(`/admin/posts/${encodeURIComponent(finalSlug)}`),onCancel:()=>router.push('/admin/posts')})
}

async function generateMoment(text:string) {
  const result=await api.post<any>('/ai/polish-moment',{inspiration:text}); const content=result.content || text; const title=result.title || buildMomentTitle(content)
  const created=await api.post<any>('/moments',{title,slug:result.slug || buildSlug(title),content,excerpt:result.excerpt || undefined})
  Modal.confirm({title:'瞬间草稿已创建',content:`「${created.title || title}」已保存。`,okText:'去预览',cancelText:'返回列表',onOk:()=>router.push(`/admin/moments/preview?slug=${encodeURIComponent(created.slug)}`),onCancel:()=>router.push('/admin/moments')})
}
</script>

<style scoped>
.ai-create-page { width:min(1160px,100%); min-height:100%; padding:6px 0 28px; }
.page-header { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:22px; }.page-title { display:flex; align-items:center; gap:12px; }.title-icon { display:grid; width:44px; height:44px; place-items:center; border:1px solid color-mix(in srgb,var(--c-primary) 18%,var(--border)); border-radius:13px; background:var(--c-primary-soft); color:var(--c-primary); font-size:1.25rem; }.page-title p { margin:0; color:var(--c-text-3); font-size:.65rem; letter-spacing:.15em; }.page-title h1 { margin:2px 0 0; color:var(--c-text); font-size:1.45rem; }.page-title em { align-self:flex-start; padding:2px 6px; border-radius:999px; background:var(--c-primary-soft); color:var(--c-primary); font-size:.52rem; font-style:normal; }
.mode-hero { position:relative; display:flex; min-height:160px; align-items:center; justify-content:space-between; gap:34px; padding:27px 30px; overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 74%,transparent); border-radius:17px; background:radial-gradient(circle at 12% 0,color-mix(in srgb,var(--c-primary) 8%,transparent),transparent 34%),var(--ld-bg-card); box-shadow:0 9px 28px color-mix(in srgb,var(--ld-shadow) 34%,transparent); }.mode-hero::before { position:absolute; top:27px; bottom:27px; left:0; width:3px; background:linear-gradient(var(--c-primary),transparent); content:''; }.mode-intro { max-width:610px; }.mode-intro>span { display:flex; align-items:center; gap:7px; color:var(--c-primary); font-size:.6rem; font-weight:700; letter-spacing:.13em; }.mode-intro h2 { margin:10px 0 0; color:var(--c-text); font-size:1.4rem; }.mode-intro p { margin:8px 0 0; color:var(--c-text-2); font-size:.74rem; line-height:1.75; }
.mode-switch { display:flex; flex:0 0 auto; gap:6px; padding:5px; border-radius:14px; background:var(--c-bg-2); }.mode-switch button { display:grid; min-width:116px; grid-template-columns:24px 1fr; align-items:center; gap:7px; padding:11px 12px; border:0; border-radius:10px; background:transparent; color:var(--c-text-3); cursor:pointer; text-align:left; font:inherit; transition:background-color .2s ease,color .2s ease,box-shadow .2s ease; }.mode-switch button.active { background:var(--ld-bg-card); color:var(--c-primary); box-shadow:0 5px 15px var(--ld-shadow); }.mode-switch button> :deep(svg) { font-size:1.1rem; }.mode-switch button span { display:flex; flex-direction:column; }.mode-switch strong { color:var(--c-text); font-size:.76rem; }.mode-switch small { margin-top:2px; color:var(--c-text-3); font-size:.56rem; }
.studio-grid { display:grid; grid-template-columns:minmax(0,1fr) 275px; gap:18px; align-items:start; margin-top:18px; }.prompt-card,.rail-card { border:1px solid color-mix(in srgb,var(--border) 76%,transparent); border-radius:16px; background:var(--ld-bg-card); }.prompt-card { padding:23px 25px 19px; box-shadow:0 10px 30px color-mix(in srgb,var(--ld-shadow) 34%,transparent); }.prompt-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }.prompt-head span,.rail-card header span { color:var(--c-text-3); font-size:.58rem; letter-spacing:.15em; }.prompt-head h2 { margin:5px 0 0; color:var(--c-text); font-size:1rem; }.prompt-head small { color:var(--c-text-3); font-size:.66rem; font-variant-numeric:tabular-nums; }
.prompt-editor { display:block; width:100%; min-height:250px; margin-top:15px; padding:17px 18px; border:1px solid var(--border); border-radius:8px; outline:0; resize:vertical; overflow-y:auto; background:var(--c-bg-1); color:var(--c-text); font:inherit; font-size:.85rem; line-height:1.9; transition:border-color .18s ease,box-shadow .18s ease; }.prompt-editor:focus { border-color:var(--c-primary); box-shadow:0 0 0 3px var(--c-primary-soft); }.prompt-editor::placeholder { color:var(--c-text-3); }.moment-prompt-editor { max-height:52vh; resize:none; }
.preset-row { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:12px; }.preset-row>span { margin-right:3px; color:var(--c-text-3); font-size:.62rem; }.preset-row button { display:flex; align-items:center; gap:5px; padding:5px 8px; border:1px solid var(--border); border-radius:999px; background:transparent; color:var(--c-text-2); cursor:pointer; font:inherit; font-size:.63rem; }.preset-row button:hover { background:var(--c-primary-soft); color:var(--c-primary); }
.prompt-footer { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-top:17px; padding-top:15px; border-top:1px solid color-mix(in srgb,var(--border) 70%,transparent); }.prompt-tools { position:relative; display:flex; align-items:center; gap:6px; }.prompt-tools>span { display:flex; align-items:center; gap:5px; margin-left:3px; color:var(--c-text-3); font-size:.61rem; }.tool-button { display:grid; width:32px; height:32px; place-items:center; border:1px solid var(--border); border-radius:8px; background:transparent; color:var(--c-text-3); cursor:pointer; }.tool-button:hover,.tool-button.active { background:var(--c-primary-soft); color:var(--c-primary); }.picker-wrap { position:relative; }
.generate-button { display:flex; min-height:38px; align-items:center; gap:7px; padding:8px 15px; border:0; border-radius:10px; background:var(--c-primary); color:#fff; box-shadow:0 8px 18px color-mix(in srgb,var(--c-primary) 20%,transparent); cursor:pointer; font:inherit; font-size:.72rem; font-weight:650; }.generate-button:disabled { background:var(--c-bg-2); box-shadow:none; color:var(--c-text-3); cursor:not-allowed; }
.studio-rail { display:grid; gap:12px; }.rail-card { padding:18px; }.rail-card header h3 { margin:5px 0 0; color:var(--c-text); font-size:.88rem; }.flow-card ol { display:grid; gap:0; margin:16px 0 0; padding:0; list-style:none; }.flow-card li { position:relative; display:grid; grid-template-columns:25px 1fr; gap:9px; padding-bottom:16px; }.flow-card li:last-child { padding-bottom:0; }.flow-card li:not(:last-child)::before { position:absolute; top:24px; bottom:0; left:12px; width:1px; background:var(--border); content:''; }.flow-card i { z-index:1; display:grid; width:25px; height:25px; place-items:center; border-radius:50%; background:var(--c-primary-soft); color:var(--c-primary); font-size:.6rem; font-style:normal; }.flow-card li div { display:flex; flex-direction:column; }.flow-card strong { color:var(--c-text-2); font-size:.69rem; }.flow-card li span { margin-top:3px; color:var(--c-text-3); font-size:.58rem; line-height:1.55; }.tone-card { background:linear-gradient(145deg,var(--c-primary-soft),var(--ld-bg-card)); }.tone-card> :deep(svg) { color:var(--c-primary); font-size:1.15rem; }.tone-card p { margin:10px 0 0; color:var(--c-text-2); font-size:.66rem; line-height:1.75; }.tone-card>span { display:block; margin-top:8px; color:var(--c-text-3); font-size:.56rem; }
.mode-fade-enter-active,.mode-fade-leave-active { transition:opacity .15s ease,transform .15s ease; }.mode-fade-enter-from { opacity:0; transform:translateY(4px); }.mode-fade-leave-to { opacity:0; transform:translateY(-4px); }.spinning { animation:spin .8s linear infinite; }@keyframes spin { to { transform:rotate(360deg); } }
@media (max-width:900px) { .mode-hero { align-items:flex-start; flex-direction:column; }.mode-switch { width:100%; }.mode-switch button { min-width:0; flex:1; }.studio-grid { grid-template-columns:1fr; }.studio-rail { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:640px) { .page-header { align-items:stretch; flex-direction:column; }.page-header> :last-child { align-self:flex-end; }.mode-hero { padding:23px 20px; border-radius:14px; }.mode-intro h2 { font-size:1.16rem; }.mode-switch { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }.mode-switch button { grid-template-columns:20px 1fr; padding:9px; }.prompt-card { padding:18px 15px 15px; }.prompt-editor { min-height:220px; padding:14px; }.prompt-footer { align-items:stretch; flex-direction:column; }.prompt-tools>span { display:none; }.generate-button { justify-content:center; }.studio-rail { grid-template-columns:1fr; } }
@media (prefers-reduced-motion:reduce) { .mode-fade-enter-active,.mode-fade-leave-active,.spinning { transition:none; animation:none; } }
</style>

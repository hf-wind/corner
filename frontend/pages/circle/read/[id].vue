<template>
  <div class="reader-page">
    <main id="main-content" ref="mainRef" class="reader-main" @scroll.passive="onScroll">
      <div class="reader-shell">
        <button type="button" class="back-link" @click="goBack"><Icon name="ph:arrow-left-bold" /><span>返回风讯角</span></button>

        <Transition name="reader-content" appear>
          <article v-if="ready && item" class="feed-article">
            <header class="feed-head">
              <div class="feed-kicker"><span><Icon :name="item.source?.kind === 'friend' ? 'ph:handshake-bold' : 'ph:rss-simple-bold'" />{{ sectionLabel }}</span><i />{{ item.source.name }}</div>
              <h1>{{ item.title }}</h1>
              <div class="feed-meta">
                <span>{{ item.author || item.source.name }}</span><time :datetime="item.publishedAt">{{ formatDate(item.publishedAt) }}</time>
                <span class="parse-rule"><Icon name="ph:code-bold" />{{ parserRuleLabel }}</span>
              </div>
            </header>

            <p v-if="item.summary && !contentStartsWithSummary" class="feed-summary">{{ item.summary }}</p>
            <figure v-if="item.image && !coverBroken" class="feed-cover"><img :src="item.image" :alt="item.title" referrerpolicy="no-referrer" @error="coverBroken = true" /></figure>

            <div ref="contentRef" class="feed-content" @error.capture="onContentImageError">
              <div v-if="item.contentFormat === 'html' && item.contentHtml" class="rss-html" v-html="item.contentHtml" />
              <div v-else class="rss-text">{{ item.content || item.summary || '该订阅源未提供正文内容。' }}</div>
            </div>

            <footer class="feed-footer"><button type="button" class="feed-return" @click="goBack"><Icon name="ph:arrow-left-bold" />返回风讯角</button><a :href="item.url" target="_blank" rel="noopener noreferrer">在原站继续阅读 <Icon name="ph:arrow-up-right-bold" /></a></footer>
          </article>
        </Transition>

        <section v-if="!loading && !item" class="reader-state"><Icon name="ph:file-x-bold" /><h1>文章暂时无法打开</h1><p>这篇内容可能已经从订阅源中移除。</p></section>
        <div v-if="loading" class="reader-loading" aria-label="正在载入"><div /><div /><div /></div>
      </div>
    </main>

    <Transition name="progress-enter">
      <aside v-if="ready && item" class="reading-progress" aria-label="阅读进度">
        <span>{{ Math.round(readingProgress) }}%</span><div><i :style="{ height: `${readingProgress}%` }" /></div>
      </aside>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const route = useRoute()
const router = useRouter()
const mainRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const loading = ref(false)
const ready = ref(false)
const item = ref<any>(null)
const coverBroken = ref(false)
const readingProgress = ref(0)
const feedCache = useState<any>('circle-feed-cache')
const itemId = computed(() => String(route.query.id || route.params.id || ''))
const sectionLabel = computed(() => { if (item.value?.source?.kind === 'friend') return '友链'; return ({ thought: '思考', news: '新闻', tech: '科技', ai: 'AI', friends: '友链' } as Record<string, string>)[String(item.value?.source?.section || '')] || '风讯' })
const parserRuleLabel = computed(() => ({ 'rss-content-encoded': 'RSS 全文', 'rss-description-html': 'RSS HTML', 'atom-content-html': 'ATOM HTML', 'text-summary': 'RSS 文本' } as Record<string, string>)[item.value?.parserRule] || 'RSS 内容')
const contentStartsWithSummary = computed(() => { const summary = String(item.value?.summary || '').replace(/\s+/g, '').slice(0, 28); const content = String(item.value?.contentHtml || item.value?.content || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ''); return Boolean(summary && content.startsWith(summary)) })

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date) }
function onScroll() { const host = mainRef.value; if (!host) return; const max = Math.max(1, host.scrollHeight - host.clientHeight); readingProgress.value = Math.min(100, Math.max(0, host.scrollTop / max * 100)) }
function onContentImageError(event: Event) {
  const image = event.target
  if (!(image instanceof HTMLImageElement)) return
  image.hidden = true
  image.setAttribute('aria-hidden', 'true')
  const container = image.closest('figure, p')
  if (!(container instanceof HTMLElement) || container.textContent?.trim()) return
  if (Array.from(container.querySelectorAll('img')).every(candidate => candidate.hidden)) container.hidden = true
}
function goBack() { if (window.history.length > 1) router.back(); else void router.push('/circle') }
async function reveal() { await nextTick(); requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true; requestAnimationFrame(onScroll) })) }
async function load() {
  ready.value = false
  coverBroken.value = false
  const cached = feedCache.value?.items?.find((entry: any) => entry.id === itemId.value)
  if (cached) { item.value = cached; loading.value = false; await reveal(); return }
  loading.value = true
  try { item.value = await api.get(`/circle/item/${encodeURIComponent(itemId.value)}`) } catch { item.value = null }
  finally { loading.value = false; if (item.value) await reveal() }
}

onMounted(load)
watch(itemId, load)
useHead(() => ({ title: item.value?.title ? `${item.value.title} · 风讯角` : '风讯角' }))
</script>

<style scoped>
  .reader-page{position:relative;display:flex;flex:1;min-width:0;min-height:0;overflow:hidden;background:var(--c-bg);color:var(--c-text)}.reader-main{flex:1;min-width:0;overflow-y:auto;scrollbar-gutter:stable}.reader-main::-webkit-scrollbar{width:0}.reader-shell{width:min(780px,calc(100% - clamp(40px,10vw,128px)));min-height:100%;margin:0 auto;padding:38px 0 76px}.back-link{display:inline-flex;align-items:center;gap:7px;margin:0 0 32px;padding:6px 0;border:0;background:transparent;color:var(--c-text-3);cursor:pointer;font:inherit;font-size:.67rem;transition:color .2s,transform .25s}.back-link:hover{color:var(--c-primary);transform:translateX(-3px)}.feed-kicker{display:flex;align-items:center;gap:9px;color:var(--c-text-3);font:.6rem var(--font-mono);letter-spacing:.06em}.feed-kicker span{display:flex;align-items:center;gap:5px;color:var(--c-primary);font-weight:750}.feed-kicker i{width:1px;height:13px;background:var(--border)}.feed-head h1{margin:14px 0 0;font:720 clamp(1.8rem,4vw,3.2rem)/1.18 var(--font-system-rounded);letter-spacing:0}.feed-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px 15px;margin-top:17px;color:var(--c-text-3);font-size:.62rem}.parse-rule{display:inline-flex;align-items:center;gap:4px;padding:3px 6px;border:1px solid color-mix(in srgb,var(--c-primary) 20%,var(--border));border-radius:5px;color:var(--c-primary)}.feed-summary{margin:26px 0 0;padding:15px 17px;border-left:2px solid var(--c-primary);background:color-mix(in srgb,var(--c-primary-soft) 30%,transparent);color:var(--c-text-2);font-size:.76rem;line-height:1.85}.feed-cover{margin:26px 0 0;overflow:hidden;border-radius:7px;background:var(--c-bg-2)}.feed-cover img{display:block;width:100%;max-height:430px;object-fit:cover}.feed-content{margin-top:30px}.rss-text{color:var(--c-text-2);font-size:.82rem;line-height:2;white-space:pre-wrap}.rss-html{color:var(--c-text-2);font-size:.82rem;line-height:2}.rss-html :deep(p){margin:0 0 1.15em}.rss-html :deep(h2),.rss-html :deep(h3),.rss-html :deep(h4){margin:1.8em 0 .65em;color:var(--c-text);font-family:var(--font-system-rounded);line-height:1.35}.rss-html :deep(h2){font-size:1.35rem}.rss-html :deep(h3){font-size:1.12rem}.rss-html :deep(a){color:var(--c-primary);text-decoration-color:color-mix(in srgb,var(--c-primary) 35%,transparent);text-underline-offset:3px}.rss-html :deep(img){display:block;width:auto;max-width:100%;height:auto;max-height:680px;margin:20px auto;border-radius:7px;object-fit:contain}.rss-html :deep(blockquote){margin:1.4em 0;padding:2px 0 2px 17px;border-left:2px solid var(--c-primary);color:var(--c-text-2)}.rss-html :deep(pre){overflow-x:auto;padding:15px;border:1px solid var(--border);border-radius:7px;background:var(--c-bg-2);font-size:.72rem;line-height:1.7}.rss-html :deep(code){font-family:var(--font-mono)}.rss-html :deep(hr){height:1px;margin:2em 0;border:0;background:var(--border)}.rss-html :deep(ul),.rss-html :deep(ol){padding-left:1.5em}.rss-html :deep(table){display:block;max-width:100%;overflow-x:auto;border-collapse:collapse}.rss-html :deep(th),.rss-html :deep(td){padding:7px 10px;border:1px solid var(--border)}.feed-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:38px;padding-top:18px;border-top:1px solid var(--border);color:var(--c-text-3);font-size:.61rem}.feed-footer a,.feed-return{display:inline-flex;align-items:center;gap:5px;color:var(--c-primary);text-decoration:none}.feed-return{padding:0;border:0;background:transparent;cursor:pointer;font:inherit}.feed-return:hover{color:var(--c-text)}.reading-progress{position:absolute;z-index:4;right:clamp(18px,3vw,42px);top:50%;display:flex;align-items:center;gap:8px;color:var(--c-text-3);font:.52rem var(--font-mono);transform:translateY(-50%)}.reading-progress>div{position:relative;width:2px;height:104px;overflow:hidden;border-radius:2px;background:var(--border)}.reading-progress i{position:absolute;right:0;bottom:0;left:0;background:var(--c-primary);transition:height .16s linear}.reader-loading,.reader-state{display:grid;min-height:62vh;align-content:center;justify-items:center;color:var(--c-text-3);text-align:center}.reader-loading{display:flex;align-items:center;justify-content:center;gap:6px}.reader-loading div{width:6px;height:6px;border-radius:50%;background:var(--c-primary);animation:loading-pulse 1s ease-in-out infinite alternate}.reader-loading div:nth-child(2){animation-delay:.14s}.reader-loading div:nth-child(3){animation-delay:.28s}.reader-state :deep(svg){color:var(--c-primary);font-size:1.8rem}.reader-state h1{margin:10px 0 0;color:var(--c-text);font-size:1rem}.reader-state p{margin:5px 0 0;font-size:.66rem}.reader-content-enter-active{transition:opacity .58s ease,transform .7s cubic-bezier(.16,1,.3,1),filter .58s ease}.reader-content-enter-from{opacity:0;filter:blur(3px);transform:translateY(14px)}.progress-enter-enter-active{transition:opacity .4s ease .28s,transform .55s cubic-bezier(.16,1,.3,1) .28s}.progress-enter-enter-from{opacity:0;transform:translate(12px,-50%)}@keyframes loading-pulse{to{opacity:.2;transform:translateY(-3px)}}
@media(max-width:900px){.reader-shell{width:calc(100% - 32px);padding-top:max(76px,calc(env(safe-area-inset-top) + 60px))}.reading-progress{right:7px}.reading-progress span{display:none}.reading-progress>div{height:82px}}
@media(max-width:640px){.back-link{margin-bottom:24px}.feed-head h1{font-size:1.75rem}.feed-summary{margin-top:20px;padding:13px 14px}.feed-cover{margin-top:20px}.feed-content{margin-top:24px}.rss-html,.rss-text{font-size:.77rem;line-height:1.9}.feed-footer{align-items:flex-start;flex-direction:column;margin-top:30px}}
@media(prefers-reduced-motion:reduce){.reader-content-enter-active,.progress-enter-enter-active,.back-link,.reading-progress i{transition:none}.reader-loading div{animation:none}}
</style>

<template>
  <main ref="pageRef" class="wind-page" @scroll.passive="persistScroll">
    <div class="wind-shell">
      <header class="wind-masthead">
        <div class="masthead-mark" aria-hidden="true"><Icon name="ph:wind-bold" /></div>
        <div class="masthead-copy">
          <span>WIND DISPATCH</span>
          <h1>{{ config.title || '风讯角' }}</h1>
          <p>{{ config.subtitle || '从不同的角落，收拢值得读完的文字。' }}</p>
        </div>
        <div class="masthead-meta">
          <span><b>{{ sourceCount }}</b> 个来源</span><i /><span><b>{{ totalCount }}</b> 篇收录</span>
          <small v-if="fetchedAt">{{ relativeDate(fetchedAt) }}更新</small>
        </div>
      </header>

      <div v-if="newItemsCount" class="new-dispatch" role="status">
        <Icon name="ph:sparkle-bold" /><span>新抵达 {{ newItemsCount }} 篇</span>
        <button type="button" title="标记为已读" aria-label="标记为已读" @click="dismissNewItems"><Icon name="ph:check-bold" /></button>
      </div>

      <nav class="channel-nav" aria-label="风讯分类">
        <button v-for="section in sections" :key="section.key" type="button" :class="{ active: activeSection === section.key }" @click="selectSection(section.key)">
          <Icon :name="section.icon" /><span>{{ section.label }}</span><small>{{ section.count }}</small>
        </button>
      </nav>

      <section class="dispatch-list" aria-live="polite" :class="{ loading }">
        <div v-if="loading && !visibleItems.length" class="wind-loading"><i /><i /><i /></div>
        <div v-else-if="!visibleItems.length" class="wind-empty">
          <Icon name="ph:wind-bold" /><h2>这阵风还没有带来新消息</h2><p>订阅源更新后，内容会自动抵达这里。</p>
        </div>
        <article v-for="(item, index) in visibleItems" v-else :key="item.id" :data-item-id="item.id" class="dispatch-item" tabindex="0" role="link" :style="{ '--delay': `${Math.min(index * 36, 220)}ms` }" @click="openItem(item)" @keydown.enter.prevent="openItem(item)">
          <div class="item-index">{{ String((page - 1) * pageSize + index + 1).padStart(2, '0') }}</div>
          <div class="item-body">
            <header>
              <span class="source-name"><img v-if="item.source.avatar && !brokenAvatars.has(item.id)" :src="item.source.avatar" alt="" referrerpolicy="no-referrer" @error="brokenAvatars.add(item.id)" /><Icon v-else :name="item.source.kind === 'friend' ? 'ph:handshake-bold' : 'ph:rss-simple-bold'" />{{ item.source.name }}</span>
              <span class="channel-label">{{ sectionLabel(item) }}</span><time :datetime="item.publishedAt">{{ relativeDate(item.publishedAt) }}</time>
            </header>
            <h2>{{ item.title }}</h2><p v-if="item.summary">{{ item.summary }}</p>
            <footer><span>{{ readingMinutes(item) }} 分钟阅读</span><span v-if="item.author">{{ item.author }}</span><Icon name="ph:arrow-up-right-bold" /></footer>
          </div>
          <figure v-if="item.image && !brokenImages.has(item.id)"><img :src="item.image" :alt="item.title" loading="lazy" decoding="async" referrerpolicy="no-referrer" @error.stop="brokenImages.add(item.id)" /></figure>
        </article>
      </section>
    </div>
    <FloatingPagination v-model="page" :total="totalPages" :hidden="totalPages <= 1" variant="circle" @change="changePage" />
  </main>
</template>

<script setup lang="ts">
type CircleItem = { id: string; title: string; summary: string; url: string; publishedAt: string; image?: string; categories?: string[]; author?: string; content?: string; contentHtml?: string; source: { name: string; url: string; avatar?: string; rssUrl?: string; section?: string; kind?: 'subscription' | 'friend' } }
type SectionKey = 'all' | 'thought' | 'news' | 'tech' | 'ai' | 'friends'
const pageSize = 20
const api = useApi()
const router = useRouter()
const pageRef = ref<HTMLElement | null>(null)
const loading = ref(false)
const clock = ref(Date.now())
const brokenImages = reactive(new Set<string>())
const brokenAvatars = reactive(new Set<string>())
const cache = useState('circle-feed-cache', () => ({ items: [] as CircleItem[], page: 1, totalPages: 1, total: 0, sourceCount: 0, fetchedAt: '', config: { title: '风讯角', subtitle: '从不同的角落，收拢值得读完的文字。' } }))
const items = computed(() => cache.value.items)
const page = computed({ get: () => cache.value.page, set: value => { cache.value.page = value } })
const totalPages = computed(() => cache.value.totalPages)
const totalCount = computed(() => cache.value.total)
const sourceCount = computed(() => cache.value.sourceCount || new Set(items.value.map(item => item.source.url)).size)
const fetchedAt = computed(() => cache.value.fetchedAt)
const config = computed(() => cache.value.config)
const activeSection = useState<SectionKey>('circle-active-section', () => 'all')
const reading = reactive({ lastSeenAt: '' })
const readingKey = 'corner:circle:reading'
const scrollKey = 'corner:circle:scroll'
const sectionDefs: Array<{ key: SectionKey; label: string; icon: string }> = [
  { key: 'all', label: '全部', icon: 'ph:squares-four-bold' }, { key: 'thought', label: '思考', icon: 'ph:lightbulb-filament-bold' },
  { key: 'news', label: '新闻', icon: 'ph:newspaper-bold' }, { key: 'tech', label: '科技', icon: 'ph:cpu-bold' },
  { key: 'ai', label: 'AI', icon: 'ph:sparkle-bold' }, { key: 'friends', label: '友链', icon: 'ph:handshake-bold' },
]
const visibleItems = computed(() => activeSection.value === 'all' ? items.value : items.value.filter(item => sectionFor(item) === activeSection.value))
const sections = computed(() => sectionDefs.map(section => ({ ...section, count: section.key === 'all' ? totalCount.value : items.value.filter(item => sectionFor(item) === section.key).length })))
const newItemsCount = computed(() => { const since = Date.parse(reading.lastSeenAt); return Number.isFinite(since) ? items.value.filter(item => Date.parse(item.publishedAt) > since).length : 0 })

function sectionFor(item: CircleItem): SectionKey { if (item.source.kind === 'friend') return 'friends'; if (['thought', 'news', 'tech', 'ai', 'friends'].includes(String(item.source.section))) return item.source.section as SectionKey; return 'news' }
function sectionLabel(item: CircleItem) { return sectionDefs.find(section => section.key === sectionFor(item))?.label || '新闻' }
function selectSection(key: SectionKey) { activeSection.value = key; pageRef.value?.scrollTo({ top: 0, behavior: 'smooth' }) }
function relativeDate(value: string) { const time = Date.parse(value); if (!Number.isFinite(time)) return ''; const minutes = Math.max(0, Math.floor((clock.value - time) / 60000)); if (minutes < 1) return '刚刚'; if (minutes < 60) return `${minutes} 分钟前`; if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`; if (minutes < 10080) return `${Math.floor(minutes / 1440)} 天前`; return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(time)) }
function readingMinutes(item: CircleItem) { return Math.max(1, Math.round((item.contentHtml || item.content || item.summary || '').length / 700)) }
function dismissNewItems() { reading.lastSeenAt = items.value[0]?.publishedAt || new Date().toISOString(); localStorage.setItem(readingKey, JSON.stringify(reading)) }
function restoreReading() { try { const value = JSON.parse(localStorage.getItem(readingKey) || '{}'); reading.lastSeenAt = typeof value.lastSeenAt === 'string' ? value.lastSeenAt : '' } catch { reading.lastSeenAt = '' } }
function persistScroll() { const host = pageRef.value; if (!host) return; const entries = Array.from(host.querySelectorAll<HTMLElement>('.dispatch-item')); const anchor = entries.find(entry => entry.offsetTop + entry.offsetHeight >= host.scrollTop + 20) || entries.at(-1); sessionStorage.setItem(scrollKey, JSON.stringify({ top: host.scrollTop, anchorId: anchor?.dataset.itemId || '', anchorOffset: anchor ? host.scrollTop - anchor.offsetTop : 0, page: page.value })) }
async function restoreScroll() { const host = pageRef.value; if (!host) return; try { const value = JSON.parse(sessionStorage.getItem(scrollKey) || '{}'); await nextTick(); const anchor = value.anchorId ? host.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(value.anchorId)}"]`) : null; const anchorOffset = Number(value.anchorOffset); host.scrollTop = anchor && Number.isFinite(anchorOffset) ? Math.max(0, anchor.offsetTop + anchorOffset) : Math.max(0, Number(value.top) || 0) } catch { /* ignore invalid session state */ } }
function openItem(item: CircleItem) { persistScroll(); void router.push({ path: '/circle/read', query: { id: item.id } }) }
async function loadFeed(target = page.value) { loading.value = true; try { const result = await api.get<any>('/circle/feed', { page: target, limit: pageSize }); cache.value = { items: Array.isArray(result?.items) ? result.items : [], page: Number(result?.page) || target, totalPages: Number(result?.totalPages) || 1, total: Number(result?.total) || 0, sourceCount: Number(result?.sourceCount) || 0, fetchedAt: String(result?.fetchedAt || ''), config: { title: String(result?.config?.title || '风讯角'), subtitle: String(result?.config?.subtitle || '从不同的角落，收拢值得读完的文字。') } } } finally { loading.value = false } }
async function changePage(target: number) { await loadFeed(target); pageRef.value?.scrollTo({ top: 0, behavior: 'smooth' }) }

let clockTimer: ReturnType<typeof setInterval> | undefined
onMounted(async () => { restoreReading(); if (items.value.length) await restoreScroll(); else { await loadFeed(); await restoreScroll() } clockTimer = setInterval(() => { clock.value = Date.now() }, 60000) })
onUnmounted(() => { persistScroll(); if (clockTimer) clearInterval(clockTimer); localStorage.setItem(readingKey, JSON.stringify(reading)) })
useHead(() => ({ title: `${config.value.title || '风讯角'} · 风隅随笔` }))
</script>

<style scoped>
.wind-page{flex:1;min-width:0;min-height:0;overflow-y:auto;background:var(--c-bg);color:var(--c-text);scrollbar-gutter:stable}.wind-shell{width:min(1040px,calc(100% - clamp(32px,7vw,100px)));margin:0 auto;padding:38px 0 100px}.wind-masthead{display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:16px;padding:0 0 24px;border-bottom:1px solid var(--border)}.masthead-mark{display:grid;width:44px;height:44px;border:1px solid color-mix(in srgb,var(--c-primary) 28%,var(--border));border-radius:8px;background:color-mix(in srgb,var(--c-primary-soft) 48%,transparent);color:var(--c-primary);font-size:1.35rem;place-items:center;animation:mark-arrive .7s var(--ui-ease-out) both}.masthead-copy{min-width:0}.masthead-copy>span{color:var(--c-primary);font:750 .53rem var(--font-mono);letter-spacing:.14em}.masthead-copy h1{margin:4px 0 0;font:720 2.15rem/1.1 var(--font-system-rounded);letter-spacing:0}.masthead-copy p{margin:5px 0 0;color:var(--c-text-2);font-size:.72rem}.masthead-meta{display:flex;align-items:center;gap:9px;color:var(--c-text-3);font-size:.62rem;white-space:nowrap}.masthead-meta b{color:var(--c-text-2);font-weight:680}.masthead-meta i{width:1px;height:14px;background:var(--border)}.masthead-meta small{padding-left:2px}.new-dispatch{display:flex;align-items:center;gap:7px;margin-top:14px;padding:7px 10px;border-left:2px solid var(--c-primary);background:color-mix(in srgb,var(--c-primary-soft) 36%,transparent);color:var(--c-primary);font-size:.65rem}.new-dispatch button{display:grid;width:22px;height:22px;margin-left:auto;border:0;background:transparent;color:inherit;cursor:pointer;place-items:center}.channel-nav{display:flex;gap:2px;margin-top:20px;overflow-x:auto;border-bottom:1px solid color-mix(in srgb,var(--border) 70%,transparent);scrollbar-width:none}.channel-nav::-webkit-scrollbar{display:none}.channel-nav button{position:relative;display:flex;flex:0 0 auto;align-items:center;gap:6px;padding:9px 12px;border:0;background:transparent;color:var(--c-text-3);cursor:pointer;font:inherit;font-size:.67rem;transition:color .2s}.channel-nav button::after{position:absolute;right:12px;bottom:-1px;left:12px;height:2px;background:var(--c-primary);content:'';transform:scaleX(0);transition:transform .28s var(--ui-ease-out)}.channel-nav button:hover,.channel-nav button.active{color:var(--c-primary)}.channel-nav button.active::after{transform:scaleX(1)}.channel-nav :deep(svg){font-size:.82rem}.channel-nav small{font:.54rem var(--font-mono);opacity:.65}.dispatch-list{margin-top:5px}.dispatch-item{--thumb-width:148px;display:grid;grid-template-columns:28px minmax(0,1fr) var(--thumb-width);gap:15px;align-items:center;padding:21px 4px;border-bottom:1px solid color-mix(in srgb,var(--border) 70%,transparent);cursor:pointer;outline:none;animation:item-arrive .56s var(--ui-ease-out) var(--delay) both;transition:background-color .2s,padding .25s}.dispatch-item:not(:has(figure)){grid-template-columns:28px minmax(0,1fr)}.dispatch-item:hover,.dispatch-item:focus-visible{padding-right:10px;padding-left:10px;background:color-mix(in srgb,var(--c-primary-soft) 22%,transparent)}.item-index{align-self:start;padding-top:22px;color:var(--c-text-3);font:.55rem var(--font-mono)}.item-body{min-width:0}.item-body header{display:flex;align-items:center;gap:8px;color:var(--c-text-3);font-size:.58rem}.source-name{display:flex;min-width:0;align-items:center;gap:5px;color:var(--c-text-2);font-weight:650}.source-name img{width:16px;height:16px;border-radius:4px;object-fit:cover}.source-name :deep(svg){color:var(--c-primary)}.channel-label{padding-left:8px;border-left:1px solid var(--border);color:var(--c-primary)}.item-body time{margin-left:auto}.item-body h2{margin:8px 0 0;color:var(--c-text);font:680 clamp(1rem,1.7vw,1.3rem)/1.38 var(--font-system-rounded);letter-spacing:0;transition:color .2s}.dispatch-item:hover h2{color:var(--c-primary)}.item-body p{display:-webkit-box;max-width:680px;margin:7px 0 0;overflow:hidden;color:var(--c-text-2);font-size:.69rem;line-height:1.75;-webkit-box-orient:vertical;-webkit-line-clamp:2}.item-body footer{display:flex;align-items:center;gap:9px;margin-top:10px;color:var(--c-text-3);font-size:.56rem}.item-body footer span+span{padding-left:9px;border-left:1px solid var(--border)}.item-body footer :deep(svg){margin-left:auto;color:var(--c-primary);opacity:0;transform:translateX(-5px);transition:opacity .2s,transform .2s}.dispatch-item:hover footer :deep(svg){opacity:1;transform:none}.dispatch-item figure{width:var(--thumb-width);aspect-ratio:1.55;margin:0;overflow:hidden;border-radius:6px;background:var(--c-bg-2)}.dispatch-item figure img{width:100%;height:100%;object-fit:cover;transition:transform .55s var(--ui-ease-out)}.dispatch-item:hover figure img{transform:scale(1.035)}.wind-loading,.wind-empty{display:grid;min-height:330px;align-content:center;justify-items:center;color:var(--c-text-3);text-align:center}.wind-loading{display:flex;align-items:center;justify-content:center;gap:6px}.wind-loading i{width:6px;height:6px;border-radius:50%;background:var(--c-primary);animation:pulse 1s ease-in-out infinite alternate}.wind-loading i:nth-child(2){animation-delay:.14s}.wind-loading i:nth-child(3){animation-delay:.28s}.wind-empty :deep(svg){color:var(--c-primary);font-size:1.8rem}.wind-empty h2{margin:10px 0 0;color:var(--c-text);font-size:.92rem}.wind-empty p{margin:5px 0 0;font-size:.65rem}@keyframes item-arrive{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes mark-arrive{from{opacity:0;transform:translateX(-12px) rotate(-8deg)}to{opacity:1;transform:none}}@keyframes pulse{to{opacity:.2;transform:translateY(-3px)}}
@media(max-width:760px){.wind-shell{width:calc(100% - 28px);padding-top:max(72px,calc(env(safe-area-inset-top) + 58px))}.wind-masthead{grid-template-columns:40px 1fr;gap:12px}.masthead-mark{width:38px;height:38px}.masthead-copy h1{font-size:1.72rem}.masthead-meta{grid-column:1/-1;flex-wrap:wrap;margin-top:2px;padding-left:52px}.dispatch-item{--thumb-width:92px;grid-template-columns:20px minmax(0,1fr) var(--thumb-width);gap:9px;padding:17px 0}.dispatch-item:not(:has(figure)){grid-template-columns:20px minmax(0,1fr)}.item-index{padding-top:20px;font-size:.49rem}.item-body header{flex-wrap:wrap;gap:6px}.item-body time{margin-left:0}.item-body h2{font-size:.94rem}.item-body p{font-size:.64rem;-webkit-line-clamp:2}.dispatch-item figure{align-self:start;margin-top:20px}.channel-nav button{padding:8px 10px}.item-body footer span:nth-child(2){display:none}}
@media(max-width:470px){.dispatch-item{grid-template-columns:20px minmax(0,1fr)}.dispatch-item figure{display:none}.masthead-copy p{max-width:260px}.masthead-meta{padding-left:0}.masthead-meta small{flex-basis:100%}}
@media(prefers-reduced-motion:reduce){.masthead-mark,.dispatch-item,.wind-loading i{animation:none}.dispatch-item,.dispatch-item figure img,.channel-nav button::after{transition:none}}
</style>

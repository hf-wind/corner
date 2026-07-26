<template>
  <main class="library-page">
    <div class="ambient ambient-one" /><div class="ambient ambient-two" />
    <section class="library-hero">
      <div class="hero-copy">
        <span class="eyebrow"><i /> PERSONAL COLLECTION · 书与影</span>
        <h1>在故事里，<br><em>收藏另一种人生。</em></h1>
        <p>读过的页，追过的谜，和那些散场之后仍留在心里的回声。这里不做标准答案，只记录我的偏爱。</p>
      </div>
      <div class="hero-stats" aria-label="收藏统计">
        <div><strong>{{ meta.books }}</strong><span>BOOKS<br>读过的书</span></div>
        <i />
        <div><strong>{{ meta.films }}</strong><span>FILMS<br>悬疑片单</span></div>
      </div>
      <span class="hero-number">COLLECTION<br>NO. {{ String(meta.total).padStart(2, '0') }}</span>
    </section>

    <section class="collection-section">
      <header class="collection-toolbar">
        <div class="filter-tabs" role="tablist">
          <button v-for="option in tabs" :key="option.value" type="button" :class="{ active: activeType === option.value }" @click="changeType(option.value)">
            <Icon :name="option.icon" />{{ option.label }}<span>{{ option.count }}</span>
          </button>
        </div>
        <label class="library-search">
          <Icon name="ph:magnifying-glass" /><input v-model="search" type="search" placeholder="寻找一本书或一部电影" @keyup.enter="searchItems"><button v-if="search" type="button" aria-label="清空" @click="clearSearch"><Icon name="ph:x" /></button>
        </label>
      </header>

      <div class="section-intro">
        <div><span>{{ activeType === 'film' ? 'MYSTERY & SUSPENSE' : activeType === 'book' ? 'READING NOTES' : 'RECENTLY COLLECTED' }}</span><h2>{{ sectionTitle }}</h2></div>
        <p>{{ sectionDescription }}</p>
      </div>

      <div v-if="loading" class="card-grid skeleton-grid"><div v-for="n in 6" :key="n" class="skeleton-card"><i /><div><span /><strong /><span /><span /></div></div></div>
      <div v-else-if="items.length" class="card-grid"><LibraryCard v-for="item in items" :key="item.id" :item="item" /></div>
      <div v-else class="empty-state"><span><Icon name="ph:books" /></span><h3>这一格还空着</h3><p>或许下一本书、下一部电影就会出现在这里。</p></div>

      <div v-if="totalPages > 1" class="library-pagination">
        <button type="button" :disabled="page <= 1" @click="goPage(page - 1)"><Icon name="ph:arrow-left" /></button>
        <span>{{ String(page).padStart(2, '0') }} <i /> {{ String(totalPages).padStart(2, '0') }}</span>
        <button type="button" :disabled="page >= totalPages" @click="goPage(page + 1)"><Icon name="ph:arrow-right" /></button>
      </div>
    </section>
    <footer class="library-footer"><span>清欢小筑 · 私人书影音档案</span><i /><span>持续更新中</span></footer>
  </main>
</template>

<script setup lang="ts">
import type { LibraryItem, LibraryType } from '~/types/library'
type FilterType = 'all' | LibraryType
const api = useApi()
const route = useRoute()
const router = useRouter()
const items = ref<LibraryItem[]>([])
const loading = ref(true)
const activeType = ref<FilterType>(['book', 'film'].includes(String(route.query.type)) ? route.query.type as LibraryType : 'all')
const search = ref(String(route.query.q || ''))
const page = ref(1)
const totalPages = ref(1)
const meta = reactive({ books: 0, films: 0, total: 0 })
const tabs = computed(() => [
  { value: 'all' as FilterType, label: '全部收藏', icon: 'ph:squares-four-bold', count: meta.total },
  { value: 'book' as FilterType, label: '阅读书架', icon: 'ph:book-open-text-bold', count: meta.books },
  { value: 'film' as FilterType, label: '悬疑片单', icon: 'ph:film-strip-bold', count: meta.films },
])
const sectionTitle = computed(() => activeType.value === 'film' ? '迷雾剧场' : activeType.value === 'book' ? '枕边书页' : '最近收藏')
const sectionDescription = computed(() => activeType.value === 'film' ? '偏爱那些线索藏在暗处、结局值得再想一遍的故事。排名是我的私人秩序。' : activeType.value === 'book' ? '一本书真正被读完，也许是在合上它之后。这里留下摘录，也留下当时的自己。' : '书和影不必分得太开，它们都是通往别处的一扇门。')

async function loadItems() {
  loading.value = true
  try {
    const res = await api.get<any>('/library', { page: page.value, limit: 10, type: activeType.value, search: search.value, sort: activeType.value === 'film' ? 'rank' : undefined })
    items.value = res.items || []; totalPages.value = res.totalPages || 1
  } catch { items.value = []; totalPages.value = 1 }
  finally { loading.value = false }
}
async function loadMeta() { try { Object.assign(meta, await api.get('/library/meta')) } catch { /* decorative counts */ } }
function syncQuery() { router.replace({ query: { ...(activeType.value !== 'all' ? { type: activeType.value } : {}), ...(search.value ? { q: search.value } : {}) } }) }
function changeType(type: FilterType) { activeType.value = type; page.value = 1; syncQuery(); loadItems() }
function searchItems() { page.value = 1; syncQuery(); loadItems() }
function clearSearch() { search.value = ''; searchItems() }
function goPage(next: number) { page.value = next; loadItems(); document.querySelector('.collection-section')?.scrollIntoView({ behavior: 'smooth' }) }
onMounted(() => { void Promise.all([loadMeta(), loadItems()]) })
useHead({ title: '书影音', meta: [{ name: 'description', content: '清欢小筑的个人阅读记录与悬疑影视收藏。' }] })
</script>

<style scoped>
.library-page { --library-accent:var(--c-primary); position:relative; width:100%; height:100%; padding:24px 28px; overflow-x:hidden; overflow-y:auto; background:var(--c-bg); color:var(--c-text); scrollbar-gutter:stable; }
.ambient { position:absolute; border-radius:50%; pointer-events:none; filter:blur(2px); }.ambient-one { top:-180px; right:-110px; width:480px; height:480px; background:radial-gradient(circle,color-mix(in srgb,var(--library-accent) 10%,transparent),transparent 68%); }.ambient-two { top:550px; left:-230px; width:480px; height:480px; background:radial-gradient(circle,color-mix(in srgb,var(--c-primary) 8%,transparent),transparent 70%); }
.library-hero { position:relative; display:grid; width:100%; min-height:242px; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:46px; margin:0 auto; padding:36px 38px; overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 72%,transparent); border-radius:18px; background:linear-gradient(135deg,color-mix(in srgb,var(--c-primary-soft) 48%,var(--ld-bg-card)),var(--ld-bg-card)); box-shadow:0 8px 30px color-mix(in srgb,var(--ld-shadow) 30%,transparent); }
.library-hero::before { position:absolute; top:38px; bottom:38px; left:0; width:3px; background:linear-gradient(var(--library-accent),transparent); content:''; }
.eyebrow { display:flex; align-items:center; gap:9px; margin-bottom:22px; color:var(--c-text-3); font-size:.58rem; font-weight:700; letter-spacing:.2em; }.eyebrow i { width:7px; height:7px; border:2px solid var(--library-accent); border-radius:50%; }
.hero-copy h1 { margin:0; color:var(--c-text); font-family:var(--font-heading); font-size:clamp(2rem,3.7vw,3.05rem); font-weight:750; letter-spacing:.025em; line-height:1.2; }.hero-copy h1 em { color:var(--library-accent); font-family:var(--font-heading); font-style:normal; font-weight:650; }
.hero-copy>p { max-width:560px; margin:17px 0 0; color:var(--c-text-2); font-size:.76rem; letter-spacing:.03em; line-height:1.85; }
.hero-stats { display:flex; align-items:center; gap:26px; padding:24px 27px; border:1px solid color-mix(in srgb,var(--border) 76%,transparent); border-radius:17px; background:color-mix(in srgb,var(--ld-bg-card) 82%,transparent); backdrop-filter:blur(12px); }.hero-stats>div { display:flex; align-items:center; gap:10px; }.hero-stats strong { color:var(--c-text); font-family:var(--font-heading); font-size:2rem; font-variant-numeric:tabular-nums; }.hero-stats span { color:var(--c-text-3); font-size:.5rem; letter-spacing:.1em; line-height:1.7; }.hero-stats>i { width:1px; height:36px; background:var(--border); }
.hero-number { position:absolute; right:1px; bottom:12px; color:var(--c-text-3); font-size:.44rem; letter-spacing:.15em; line-height:1.5; text-align:right; opacity:.65; }
.collection-section { position:relative; width:100%; margin:0 auto; padding:26px 0 44px; }
.collection-toolbar { display:flex; align-items:center; justify-content:space-between; gap:20px; }
.filter-tabs { display:flex; gap:5px; padding:4px; border-radius:12px; background:var(--c-bg-2); }.filter-tabs button { display:flex; height:36px; align-items:center; gap:7px; padding:0 13px; border:0; border-radius:9px; background:transparent; color:var(--c-text-2); cursor:pointer; font:inherit; font-size:.68rem; transition:.2s ease; }.filter-tabs button span { color:var(--c-text-3); font-size:.53rem; }.filter-tabs button.active { background:var(--ld-bg-card); box-shadow:0 4px 13px var(--ld-shadow); color:var(--library-accent); font-weight:700; }
.library-search { display:flex; width:min(270px,100%); height:38px; align-items:center; gap:8px; padding:0 11px; border-bottom:1px solid var(--border); color:var(--c-text-3); transition:border-color .2s; }.library-search:focus-within { border-color:var(--library-accent); }.library-search input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:var(--c-text); font:inherit; font-size:.68rem; }.library-search button { display:grid; border:0; background:transparent; color:var(--c-text-3); cursor:pointer; place-items:center; }
.section-intro { display:flex; align-items:flex-end; justify-content:space-between; gap:30px; margin:30px 0 16px; }.section-intro span { color:var(--library-accent); font-size:.48rem; font-weight:700; letter-spacing:.2em; }.section-intro h2 { margin:5px 0 0; font-family:var(--font-heading); font-size:1.3rem; }.section-intro p { max-width:465px; color:var(--c-text-3); font-size:.65rem; line-height:1.8; text-align:right; }
.card-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }.skeleton-card { display:grid; min-height:238px; grid-template-columns:148px 1fr; overflow:hidden; border:1px solid var(--border); border-radius:20px; background:var(--ld-bg-card); }.skeleton-card>i,.skeleton-card span,.skeleton-card strong { display:block; background:linear-gradient(90deg,var(--c-bg-2),color-mix(in srgb,var(--c-bg-2) 55%,var(--ld-bg-card)),var(--c-bg-2)); background-size:200% 100%; animation:skeleton 1.4s infinite; }.skeleton-card>div { padding:25px 20px; }.skeleton-card span { height:10px; margin-bottom:18px; border-radius:5px; }.skeleton-card strong { width:80%; height:20px; margin-bottom:20px; border-radius:6px; }
.empty-state { display:flex; min-height:300px; flex-direction:column; align-items:center; justify-content:center; color:var(--c-text-3); }.empty-state>span { display:grid; width:72px; height:72px; margin-bottom:15px; border-radius:50%; background:var(--c-bg-2); color:var(--library-accent); font-size:2rem; place-items:center; }.empty-state h3 { margin:0 0 6px; color:var(--c-text); font-size:1rem; }.empty-state p { font-size:.68rem; }
.library-pagination { display:flex; align-items:center; justify-content:center; gap:24px; margin-top:36px; }.library-pagination button { display:grid; width:38px; height:38px; border:1px solid var(--border); border-radius:50%; background:var(--ld-bg-card); color:var(--c-text-2); cursor:pointer; place-items:center; }.library-pagination button:disabled { cursor:not-allowed; opacity:.35; }.library-pagination span { display:flex; align-items:center; gap:9px; color:var(--c-text-3); font-size:.62rem; font-variant-numeric:tabular-nums; }.library-pagination span i { width:28px; height:1px; background:var(--border); }
.library-footer { display:flex; width:100%; align-items:center; gap:14px; margin:0 auto; padding:20px 0 max(20px,env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--c-text-3); font-size:.49rem; letter-spacing:.13em; }.library-footer i { flex:1; height:1px; background:linear-gradient(90deg,var(--border),transparent); }
@keyframes skeleton { to { background-position:-200% 0; } }
@media (max-width:1050px) { .library-hero { grid-template-columns:1fr; gap:30px; }.hero-stats { width:max-content; }.card-grid { grid-template-columns:1fr; } }
@media (max-width:700px) { .library-page { padding:max(68px,calc(env(safe-area-inset-top) + 60px)) max(16px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left)); }.library-hero { min-height:auto; padding:27px 20px; }.hero-copy h1 { font-size:2.15rem; }.hero-stats { gap:16px; padding:17px 18px; }.hero-stats strong { font-size:1.55rem; }.collection-toolbar { align-items:stretch; flex-direction:column; }.filter-tabs { display:grid; grid-template-columns:repeat(3,1fr); }.filter-tabs button { justify-content:center; padding:0 7px; }.library-search { width:100%; }.section-intro { align-items:flex-start; flex-direction:column; gap:8px; margin-top:32px; }.section-intro p { text-align:left; }.hero-number { display:none; } }
</style>

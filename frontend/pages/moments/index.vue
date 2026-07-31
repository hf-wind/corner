<template>
  <div class="page-layout">
    <main class="main-content moments-main">
      <div class="ambient ambient-one" aria-hidden="true" />
      <div class="moments-shell">
        <ContentPageHero
          eyebrow="MOMENTS · 日常手记"
          title="日常不必完整，记住一瞬就好"
          description="随手收藏生活里的光线、声音和没有说完的话。"
          icon="ph:sparkle-bold"
          :metric="total"
          metric-label="篇生活切片"
          variant="moments"
        />

        <div class="content-grid">
          <section class="feed-section" aria-labelledby="moment-stream-title">
            <header class="stream-header">
              <div><span>RECENT NOTES</span><h2 id="moment-stream-title">最近记录</h2></div>
              <div class="stream-tools">
                <PublicSelectMenu v-model="selectedPlace" :options="placeOptions" icon="ph:map-pin-line-bold" label="地点筛选" empty-text="地点需要发布后才会出现在这里" @update:model-value="selectPlace" />
                <small class="sort-indicator"><Icon name="ph:arrow-down" /> 从新到旧</small>
              </div>
            </header>

            <div v-if="!loading && !moments.length" class="moment-empty content-reveal">
              <span><Icon name="ph:paper-plane-tilt" /></span>
              <h3>这一页还很安静</h3>
              <p>下一段值得记住的小事，会从这里开始。</p>
            </div>

            <div v-else-if="moments.length" class="moment-list content-reveal">
              <MomentCard
                v-for="moment in moments"
                :key="moment.slug"
                :moment="moment"
                :initially-expanded-comments="moment.slug === focusSlug"
              />
            </div>

            <div v-if="page < totalPages" class="load-more">
              <button type="button" :disabled="loadingMore" @click="loadMore">
                <Icon :name="loadingMore ? 'ph:spinner-gap' : 'ph:plus'" :class="{ spinning: loadingMore }" />
                {{ loadingMore ? '加载中…' : '再看一些' }}
              </button>
            </div>
          </section>

          <aside class="moments-sidebar">
            <section class="side-card overview-card">
              <header><span><Icon name="ph:chart-donut" />记录概览</span><small>当前加载</small></header>
              <div class="overview-grid">
                <div><strong>{{ total }}</strong><span>全部记录</span></div>
                <div><strong>{{ visibleImageCount }}</strong><span>图片切片</span></div>
                <div><strong>{{ visibleCommentCount }}</strong><span>收到回应</span></div>
              </div>
              <p v-if="latestDate"><i />最近更新于 {{ latestDate }}</p>
            </section>

            <section v-if="recentIndex.length" class="side-card index-card">
              <header><span><Icon name="ph:list-dashes" />这一页</span><small>{{ recentIndex.length }} 条</small></header>
              <button v-for="(moment, index) in recentIndex" :key="moment.slug" type="button" @click="scrollToMoment(moment.slug)">
                <em>{{ String(index + 1).padStart(2, '0') }}</em>
                <span>{{ moment.title }}</span>
                <Icon name="ph:arrow-up-right" />
              </button>
            </section>

            <section class="side-card note-card">
              <Icon name="ph:quotes-fill" />
              <p>生活的大部分，本来就由不值得发朋友圈的小事组成。</p>
              <span>把它们留在这里。</span>
            </section>
          </aside>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { extractMomentImages } from '~/utils/moment'

const api = useApi()
const route = useRoute()
const router = useRouter()
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const moments = ref<any[]>([])
const places = ref<any[]>([])
const selectedPlace = ref(String(route.query.place || ''))
const placeOptions = computed(() => [
  { value: '', label: '全部地点', icon: 'ph:globe-hemisphere-east-bold', count: total.value },
  ...places.value.map(place => ({ value: place.slug, label: place.name, icon: 'ph:map-pin-fill', count: place.momentCount })),
])
const focusSlug = computed(() => String(route.query.focus || ''))
const visibleImageCount = computed(() => moments.value.reduce((sum, item) => sum + extractMomentImages(item.content).length, 0))
const visibleCommentCount = computed(() => moments.value.reduce((sum, item) => sum + Number(item.commentCount || 0), 0))
const recentIndex = computed(() => moments.value.slice(0, 5))
const latestDate = computed(() => formatSidebarDate(moments.value[0]?.publishedAt || moments.value[0]?.createdAt))

function formatSidebarDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function scrollToMoment(slug: string) {
  document.getElementById(`moment-${slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function fetchMoments(targetPage = 1, append = false) {
  if (append) loadingMore.value = true
  else loading.value = true
  try {
    const res = await api.get<any>('/moments', { page: targetPage, limit: 10, sort: 'latest', place: selectedPlace.value || undefined })
    const nextItems = (res.items ?? []).map((item: any) => ({
      id: item.id, slug: item.slug, title: item.title, content: item.content, excerpt: item.excerpt,
      publishedAt: item.publishedAt, createdAt: item.createdAt, likeCount: item.likeCount ?? 0,
      happenedAt: item.happenedAt, publicLocation: item.publicLocation,
      commentCount: item.commentCount ?? item._count?.comments ?? 0, liked: !!item.liked,
    }))
    if (append) {
      const existing = new Set(moments.value.map((item) => item.slug))
      moments.value.push(...nextItems.filter((item: any) => !existing.has(item.slug)))
    } else moments.value = nextItems
    page.value = targetPage
    total.value = res.total ?? moments.value.length
    totalPages.value = res.totalPages ?? 1
    if (!append && focusSlug.value) {
      await nextTick()
      document.getElementById(`moment-${focusSlug.value}`)?.scrollIntoView({ block: 'start' })
    }
  } catch {
    if (!append) { moments.value = []; total.value = 0; totalPages.value = 1 }
  } finally { loading.value = false; loadingMore.value = false }
}

async function loadMore() {
  const nextPage = page.value + 1
  if (loadingMore.value || nextPage > totalPages.value) return
  await fetchMoments(nextPage, true)
}

async function applyPlaceFilter() {
  await router.replace({ query: { ...route.query, place: selectedPlace.value || undefined, focus: undefined } })
  await fetchMoments(1)
}

async function selectPlace(slug: string) {
  selectedPlace.value = slug
  await applyPlaceFilter()
}

onMounted(async () => {
  const placeResult = await api.get<any>('/places', { limit: 100 }).catch(() => ({ items: [] }))
  places.value = placeResult.items || []
  await fetchMoments(1)
})
useHead({ title: '我的瞬间' })
</script>

<style scoped>
.page-layout { display:flex; flex:1; min-height:0; overflow:hidden; }
.moments-main { position:relative; flex:1; min-width:0; min-height:0; padding:24px 28px 52px; overflow-x:hidden; overflow-y:auto; overscroll-behavior:contain; }
.ambient { position:absolute; border-radius:50%; pointer-events:none; }.ambient-one { top:-180px; right:-130px; width:470px; height:470px; background:radial-gradient(circle,color-mix(in srgb,var(--c-primary) 8%,transparent),transparent 69%); }
.moments-shell { position:relative; width:100%; margin:0 auto; }
.moments-hero { position:relative; display:flex; min-height:176px; align-items:center; justify-content:space-between; gap:34px; padding:30px 34px; overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 72%,transparent); border-radius:18px; background:linear-gradient(135deg,color-mix(in srgb,var(--c-primary-soft) 46%,var(--ld-bg-card)),var(--ld-bg-card) 68%); box-shadow:0 8px 30px color-mix(in srgb,var(--ld-shadow) 30%,transparent); }
.moments-hero::before { position:absolute; top:30px; bottom:30px; left:0; width:3px; background:linear-gradient(var(--c-primary),transparent); content:''; }
.hero-copy { position:relative; z-index:1; }.hero-kicker { display:flex; align-items:center; gap:8px; color:var(--c-primary); font-size:.56rem; font-weight:700; letter-spacing:.18em; }.hero-kicker i { width:6px; height:6px; border:2px solid var(--c-primary); border-radius:50%; }
.hero-copy h1 { margin:12px 0 0; color:var(--c-text); font-size:clamp(1.7rem,3.1vw,2.45rem); line-height:1.25; }.hero-copy h1 em { color:var(--c-primary); font-style:normal; }.hero-copy p { margin:10px 0 0; color:var(--c-text-2); font-size:.74rem; }
.hero-count { position:relative; z-index:1; display:flex; min-width:112px; flex-direction:column; align-items:flex-end; padding-left:26px; border-left:1px solid var(--border); }.hero-count strong { color:var(--c-text); font-size:2rem; font-variant-numeric:tabular-nums; line-height:1; }.hero-count span { margin-top:7px; color:var(--c-text-3); font-size:.58rem; }
.hero-mark { position:absolute; right:105px; bottom:-42px; color:var(--c-primary); font-size:8.5rem; opacity:.045; transform:rotate(-9deg); }.hero-stamp { position:absolute; right:8px; bottom:8px; color:var(--c-text-3); font-size:.43rem; letter-spacing:.15em; line-height:1.5; text-align:right; opacity:.55; }
.content-grid { display:grid; grid-template-columns:minmax(0,1fr) 260px; gap:22px; align-items:start; margin-top:24px; }
.feed-section { min-width:0; }.stream-header { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin:0 0 12px 62px; }.stream-header span { color:var(--c-primary); font-size:.52rem; font-weight:700; letter-spacing:.18em; }.stream-header h2 { margin:4px 0 0; color:var(--c-text); font-size:1.08rem; }.stream-header small { display:flex; align-items:center; gap:5px; color:var(--c-text-3); font-size:.62rem; }
.stream-tools { --stream-control-width:132px; display:flex; align-items:center; gap:10px; }.place-filter { position:relative; width:var(--stream-control-width); }.place-filter>button,.sort-indicator { display:flex; width:var(--stream-control-width); height:32px; box-sizing:border-box; align-items:center; gap:7px; padding:0 9px; border:1px solid color-mix(in srgb,var(--border) 82%,transparent); border-radius:9px; background:color-mix(in srgb,var(--ld-bg-card) 96%,transparent); box-shadow:0 4px 14px color-mix(in srgb,var(--ld-shadow) 22%,transparent); color:var(--c-text-2); font:inherit; font-size:.62rem; }.place-filter>button { justify-content:space-between; cursor:pointer; }.sort-indicator { justify-content:center; }.place-filter>button :deep(svg):first-child,.sort-indicator :deep(svg) { color:var(--c-primary); }.place-filter>button.active { border-color:color-mix(in srgb,var(--c-primary) 42%,var(--border)); background:var(--c-primary-soft); color:var(--c-primary); }.place-menu { position:absolute; z-index:30; top:38px; right:0; width:100%; box-sizing:border-box; padding:7px; border:1px solid var(--border); border-radius:11px; background:var(--ld-bg-card); box-shadow:0 14px 32px color-mix(in srgb,var(--ld-shadow) 55%,transparent); }.place-menu button { display:flex; width:100%; align-items:center; justify-content:space-between; gap:6px; padding:8px 7px; border:0; border-radius:7px; background:transparent; color:var(--c-text-2); cursor:pointer; font:inherit; }.place-menu button:hover,.place-menu button.selected { background:var(--c-primary-soft); color:var(--c-primary); }.place-menu button span { display:flex; min-width:0; align-items:center; gap:5px; overflow:hidden; font-size:.62rem; text-overflow:ellipsis; white-space:nowrap; }.place-menu button em { min-width:20px; padding:2px 4px; border-radius:999px; background:var(--c-bg-2); color:var(--c-text-3); font-size:.5rem; font-style:normal; text-align:center; }.place-menu p { margin:4px; padding:9px 4px; color:var(--c-text-3); font-size:.56rem; line-height:1.6; text-align:center; }
.moment-list { display:grid; gap:11px; }
.moment-empty { display:flex; min-height:280px; flex-direction:column; align-items:center; justify-content:center; padding:30px; border:1px dashed var(--border); border-radius:16px; color:var(--c-text-3); text-align:center; }.moment-empty>span { display:grid; width:48px; height:48px; margin-bottom:12px; place-items:center; border-radius:15px; background:var(--c-primary-soft); color:var(--c-primary); font-size:1.25rem; }.moment-empty h3 { margin:0; color:var(--c-text-2); font-size:.9rem; }.moment-empty p { margin:7px 0 0; font-size:.68rem; }
.moments-sidebar { position:sticky; top:0; display:grid; gap:12px; }.side-card { padding:16px; border:1px solid color-mix(in srgb,var(--border) 74%,transparent); border-radius:16px; background:color-mix(in srgb,var(--ld-bg-card) 96%,transparent); box-shadow:0 7px 24px color-mix(in srgb,var(--ld-shadow) 30%,transparent); }.side-card header { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px; }.side-card header>span { display:flex; align-items:center; gap:6px; color:var(--c-text-2); font-size:.72rem; font-weight:650; }.side-card header small { color:var(--c-text-3); font-size:.56rem; }
.overview-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px; }.overview-grid div { display:flex; min-width:0; flex-direction:column; padding:9px 5px; border-radius:9px; background:var(--c-bg-1); text-align:center; }.overview-grid strong { color:var(--c-text); font-size:.95rem; font-variant-numeric:tabular-nums; }.overview-grid span { margin-top:3px; color:var(--c-text-3); font-size:.5rem; white-space:nowrap; }.overview-card>p { display:flex; align-items:center; gap:6px; margin:12px 0 0; color:var(--c-text-3); font-size:.57rem; }.overview-card>p i { width:5px; height:5px; border-radius:50%; background:var(--c-primary); box-shadow:0 0 0 3px var(--c-primary-soft); }
.index-card { padding-bottom:9px; }.index-card button { display:grid; width:100%; grid-template-columns:22px minmax(0,1fr) 14px; align-items:center; gap:7px; padding:8px 2px; border:0; border-top:1px solid color-mix(in srgb,var(--border) 62%,transparent); background:transparent; color:var(--c-text-2); cursor:pointer; text-align:left; font:inherit; }.index-card button:hover { color:var(--c-primary); }.index-card button em { color:var(--c-text-3); font-size:.53rem; font-style:normal; font-variant-numeric:tabular-nums; }.index-card button span { overflow:hidden; font-size:.65rem; text-overflow:ellipsis; white-space:nowrap; }.index-card button :deep(svg) { color:var(--c-text-3); font-size:.7rem; }
.note-card { position:relative; overflow:hidden; background:linear-gradient(145deg,var(--c-primary-soft),var(--ld-bg-card)); }.note-card> :deep(svg) { color:var(--c-primary); font-size:1.2rem; opacity:.75; }.note-card p { margin:11px 0 0; color:var(--c-text-2); font-size:.68rem; line-height:1.75; }.note-card span { display:block; margin-top:7px; color:var(--c-text-3); font-size:.57rem; }
.load-more { display:flex; justify-content:center; margin-top:18px; }.load-more button { display:flex; align-items:center; gap:6px; padding:7px 12px; border:1px solid var(--border); border-radius:8px; background:var(--ld-bg-card); color:var(--c-text-3); cursor:pointer; font:inherit; font-size:.67rem; }.load-more button:hover:not(:disabled) { color:var(--c-primary); }.load-more button:disabled { cursor:wait; opacity:.6; }.spinning { animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
@media (max-width:980px) { .content-grid { grid-template-columns:minmax(0,1fr) 230px; } }
@media (max-width:900px) { .moments-main { padding:max(76px,calc(env(safe-area-inset-top) + 64px)) 18px 38px; }.content-grid { grid-template-columns:1fr; }.moments-sidebar { position:static; grid-template-columns:repeat(2,minmax(0,1fr)); }.note-card { display:none; } }
@media (max-width:640px) { .moments-hero { min-height:168px; align-items:flex-start; padding:26px 21px; border-radius:16px; }.hero-copy h1 { max-width:270px; font-size:1.7rem; }.hero-copy p { max-width:255px; font-size:.68rem; line-height:1.7; }.hero-count { position:absolute; right:20px; bottom:20px; min-width:auto; padding-left:0; border:0; }.hero-count strong { font-size:1.45rem; }.hero-mark { right:25px; }.content-grid { margin-top:20px; }.stream-header { align-items:flex-start; margin-left:1px; }.stream-tools { align-items:flex-end; flex-direction:column; gap:5px; }.stream-tools small { display:none; }.moments-sidebar { display:none; }.moment-list { gap:9px; } }
@media (prefers-reduced-motion:reduce) { .spinning { animation:none; } }
</style>

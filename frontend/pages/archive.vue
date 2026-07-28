<template>
  <div class="page-layout">
    <main class="main-content">
      <ContentPageHero
        eyebrow="TIMELINE · WRITING HISTORY"
        title="把写过的日子，收进时间里"
        description="文字沿着时间留下坐标。向下翻阅，看看一些想法如何发生、停留，又与今天重新相遇。"
        icon="ph:clock-countdown"
        :metric="stats.posts"
        metric-label="篇时间存档"
      />

      <section class="archive-stats">
        <div><span><Icon name="ph:article-bold" /></span><p><strong>{{ stats.posts }}</strong><small>文章</small></p></div>
        <div><span><Icon name="ph:folders-bold" /></span><p><strong>{{ stats.categories }}</strong><small>分类</small></p></div>
        <div><span><Icon name="ph:hash-bold" /></span><p><strong>{{ stats.tags }}</strong><small>标签</small></p></div>
        <div><span><Icon name="ph:calendar-dots-bold" /></span><p><strong>{{ archiveDays }}</strong><small>天跨度</small></p></div>
      </section>

      <div v-if="loading" class="timeline-skeleton"><div v-for="n in 6" :key="n"><i /><span /><p><strong /><small /></p></div></div>
      <template v-else-if="yearGroups.length">
        <header class="content-heading"><div><span>CHRONOLOGICAL ARCHIVE</span><h2>时间轴</h2></div><p>共 {{ yearGroups.length }} 个写作年份</p></header>
        <section class="archive-timeline">
          <article v-for="group in yearGroups" :key="group.year" class="year-group">
            <header class="year-header">
              <div><strong>{{ group.year }}</strong><span>{{ group.items.length }} POSTS</span></div>
              <i /><small>{{ yearPercentage(group.items.length) }}%</small>
            </header>
            <div class="year-items">
              <NuxtLink v-for="item in group.items" :key="item.slug" :to="`/article/${item.slug}`" class="timeline-item">
                <time><strong>{{ dayOf(item.date) }}</strong><span>{{ monthOf(item.date) }}</span></time>
                <i class="timeline-dot" />
                <div class="timeline-copy">
                  <span v-if="item.tag" class="item-tag">{{ item.tag }}</span>
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.desc || '这篇文章没有留下摘要，点开继续阅读。' }}</p>
                </div>
                <span class="timeline-arrow"><Icon name="ph:arrow-up-right-bold" /></span>
              </NuxtLink>
            </div>
          </article>
        </section>
      </template>
      <div v-else class="empty-state"><Icon name="ph:archive-box" /><strong>时间轴还没有内容</strong><span>第一篇文章会成为这里的起点。</span></div>
    </main>

    <aside class="sidebar-right">
      <section class="right-card year-overview">
        <span class="aside-kicker">YEARLY RHYTHM</span><h3>写作年份</h3>
        <div class="year-bars">
          <div v-for="group in yearGroups" :key="group.year">
            <p><strong>{{ group.year }}</strong><span>{{ group.items.length }} 篇</span></p>
            <i><span :style="{ width: yearPercentage(group.items.length) + '%' }" /></i>
          </div>
        </div>
      </section>
      <section class="right-card">
        <div class="right-card-title"><span><Icon name="ph:calendar-blank-bold" /> 最近月份</span></div>
        <div class="month-grid">
          <div v-for="month in monthList" :key="month.label"><strong>{{ month.count }}</strong><span>{{ prettyMonth(month.label) }}</span></div>
        </div>
      </section>
      <section class="right-card">
        <div class="right-card-title"><span><Icon name="ph:fire-bold" /> 常用标签</span><NuxtLink to="/tags">标签页</NuxtLink></div>
        <div class="tag-cloud"><NuxtLink v-for="tag in hotTags" :key="tag" to="/tags">#{{ tag }}</NuxtLink></div>
      </section>
      <section class="right-card archive-note"><Icon name="ph:quotes-fill" /><p>归档不是结束，而是让旧文字拥有再次被看见的入口。</p></section>
    </aside>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const posts = ref<any[]>([])
const tags = ref<any[]>([])
const loading = ref(true)
const stats = ref({ posts: 0, tags: 0, categories: 0 })

const grouped = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const post of posts.value) {
    const year = post.date.slice(0, 4) || '未注明'
    if (!groups[year]) groups[year] = []
    groups[year].push(post)
  }
  return groups
})
const yearGroups = computed(() => Object.entries(grouped.value)
  .map(([year, items]) => ({ year, items }))
  .sort((a, b) => b.year.localeCompare(a.year)))
const maxYearCount = computed(() => Math.max(...yearGroups.value.map(group => group.items.length), 1))
const archiveDays = computed(() => {
  const dates = posts.value.map(post => new Date(post.date).getTime()).filter(Number.isFinite)
  if (dates.length < 2) return dates.length
  return Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / 86400000))
})
const monthList = computed(() => {
  const months: Record<string, number> = {}
  for (const post of posts.value) {
    const month = post.date.slice(0, 7)
    if (month) months[month] = (months[month] || 0) + 1
  }
  return Object.entries(months).sort(([a], [b]) => b.localeCompare(a)).slice(0, 12).map(([label, count]) => ({ label, count }))
})
const hotTags = computed(() => tags.value.slice(0, 10))

function yearPercentage(count: number) { return Math.round(count / maxYearCount.value * 100) }
function dayOf(value: string) { return value?.slice(8, 10) || '—' }
function monthOf(value: string) { const month = Number(value?.slice(5, 7)); return month ? `${month}月` : '' }
function prettyMonth(value: string) { return value.replace('-', '.') }

onMounted(async () => {
  try {
    const [postRes, tagRes, radar] = await Promise.all([
      api.get<any>('/posts', { limit: 100, sort: 'latest' }), api.get<any>('/tags'), api.get<any>('/stats/radar'),
    ])
    posts.value = (postRes.items ?? []).map((post: any) => ({
      slug: post.slug, title: post.title, date: post.publishedAt?.slice(0, 10) ?? '', excerpt: post.excerpt,
      desc: post.excerpt ?? '', tag: post.category?.name ?? post.tags?.[0]?.name ?? '',
    }))
    tags.value = (tagRes ?? []).map((tag: any) => tag.name)
    stats.value = { posts: radar.posts ?? 0, tags: radar.tags ?? 0, categories: radar.categories ?? 0 }
  } catch { posts.value = [] }
  finally { loading.value = false }
})

useHead({ title: '文章归档' })
</script>

<style scoped>
.page-layout { display:flex; flex:1; overflow:hidden; }.main-content { flex:1; min-width:0; padding:24px 28px; overflow-y:auto; scrollbar-gutter:stable; }.sidebar-right { display:flex; width:var(--right-w); flex:0 0 var(--right-w); flex-direction:column; gap:14px; padding:24px 16px; overflow-y:auto; }
.archive-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); margin-bottom:28px; padding:14px 8px; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border-radius:14px; background:var(--ld-bg-card); box-shadow:0 5px 18px color-mix(in srgb,var(--ld-shadow) 25%,transparent); }.archive-stats>div { display:flex; align-items:center; justify-content:center; gap:9px; border-right:1px solid var(--border); }.archive-stats>div:last-child { border-right:0; }.archive-stats>div>span { display:grid; width:34px; height:34px; border-radius:10px; background:var(--c-primary-soft); color:var(--c-primary); place-items:center; }.archive-stats p { display:flex; flex-direction:column; }.archive-stats strong { color:var(--c-text); font-size:.92rem; font-variant-numeric:tabular-nums; }.archive-stats small { color:var(--c-text-3); font-size:.52rem; }
.content-heading { display:flex; align-items:flex-end; justify-content:space-between; margin:0 2px 18px; }.content-heading span,.aside-kicker { color:var(--c-primary); font-size:.48rem; font-weight:750; letter-spacing:.18em; }.content-heading h2 { margin:4px 0 0; color:var(--c-text); font-size:1.25rem; }.content-heading p { color:var(--c-text-3); font-size:.6rem; }
.archive-timeline { position:relative; }.archive-timeline::before { position:absolute; top:34px; bottom:20px; left:76px; width:1px; background:linear-gradient(var(--c-primary),var(--border) 18%,var(--border) 85%,transparent); content:''; }.year-group { margin-bottom:30px; }.year-header { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:12px; margin-bottom:8px; }.year-header>div { display:flex; width:63px; flex-direction:column; }.year-header strong { color:var(--c-primary); font-family:var(--font-heading); font-size:1.05rem; }.year-header span { color:var(--c-text-3); font-size:.4rem; letter-spacing:.08em; }.year-header>i { height:1px; background:linear-gradient(90deg,var(--border),transparent); }.year-header>small { color:var(--c-text-3); font-family:var(--font-mono); font-size:.47rem; }
.year-items { display:grid; gap:6px; }.timeline-item { position:relative; display:grid; grid-template-columns:62px 18px minmax(0,1fr) 24px; align-items:center; gap:6px; min-height:82px; padding:10px 12px 10px 0; border:1px solid transparent; border-radius:13px; color:inherit; text-decoration:none; transition:.25s ease; }.timeline-item:hover { border-color:color-mix(in srgb,var(--border) 70%,transparent); background:var(--ld-bg-card); box-shadow:0 7px 20px color-mix(in srgb,var(--ld-shadow) 27%,transparent); transform:translateX(3px); }.timeline-item time { display:flex; flex-direction:column; align-items:flex-end; padding-right:8px; }.timeline-item time strong { color:var(--c-text); font-size:.81rem; }.timeline-item time span { color:var(--c-text-3); font-size:.52rem; }.timeline-dot { position:relative; z-index:1; display:block; width:9px; height:9px; border:2px solid var(--c-bg); border-radius:50%; background:var(--c-primary); box-shadow:0 0 0 3px var(--c-primary-soft); }.timeline-copy { min-width:0; }.item-tag { display:inline-block; margin-bottom:3px; color:var(--c-primary); font-size:.5rem; font-weight:650; }.timeline-copy h3 { overflow:hidden; margin:0; color:var(--c-text); font-size:.8rem; line-height:1.45; text-overflow:ellipsis; white-space:nowrap; }.timeline-copy p { display:-webkit-box; overflow:hidden; margin:4px 0 0; color:var(--c-text-2); font-size:.61rem; line-height:1.5; -webkit-box-orient:vertical; -webkit-line-clamp:1; }.timeline-arrow { display:grid; color:var(--c-primary); opacity:0; place-items:center; transform:translate(-3px,3px); transition:.2s; }.timeline-item:hover .timeline-arrow { opacity:.8; transform:none; }
.timeline-skeleton { display:grid; gap:8px; }.timeline-skeleton>div { display:grid; height:82px; grid-template-columns:62px 16px 1fr; align-items:center; gap:8px; }.timeline-skeleton i { width:9px; height:9px; border-radius:50%; background:var(--c-primary-soft); }.timeline-skeleton>div>span { grid-column:1; grid-row:1; width:42px; height:16px; justify-self:end; border-radius:6px; background:var(--c-bg-2); }.timeline-skeleton p { grid-column:3; }.timeline-skeleton strong,.timeline-skeleton small { display:block; height:10px; margin:8px 0; border-radius:6px; background:linear-gradient(90deg,var(--c-bg-2),var(--ld-bg-card),var(--c-bg-2)); background-size:200% 100%; animation:shimmer 1.4s infinite; }.timeline-skeleton small { width:70%; }
.empty-state { display:flex; min-height:260px; flex-direction:column; align-items:center; justify-content:center; border:1px dashed var(--border); border-radius:16px; color:var(--c-text-3); }.empty-state>svg { margin-bottom:10px; color:var(--c-primary); font-size:2rem; }.empty-state strong { color:var(--c-text-2); font-size:.75rem; }.empty-state span { margin-top:4px; font-size:.6rem; }
.right-card { padding:17px; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border-radius:14px; background:var(--ld-bg-card); box-shadow:0 5px 18px color-mix(in srgb,var(--ld-shadow) 25%,transparent); }.year-overview { background:linear-gradient(150deg,var(--c-primary-soft),var(--ld-bg-card) 65%); }.year-overview h3 { margin:5px 0 15px; color:var(--c-text); font-size:.88rem; }.year-bars { display:grid; gap:10px; }.year-bars p { display:flex; justify-content:space-between; margin:0 0 5px; }.year-bars strong { color:var(--c-text-2); font-size:.61rem; }.year-bars p span { color:var(--c-text-3); font-size:.52rem; }.year-bars>div>i { display:block; height:5px; overflow:hidden; border-radius:999px; background:color-mix(in srgb,var(--c-bg-2) 85%,transparent); }.year-bars i span { display:block; height:100%; border-radius:inherit; background:var(--c-primary); }
.right-card-title { display:flex; align-items:center; justify-content:space-between; margin-bottom:13px; padding-bottom:10px; border-bottom:1px solid var(--border); }.right-card-title>span { display:flex; align-items:center; gap:6px; color:var(--c-text); font-size:.7rem; font-weight:700; }.right-card-title a { color:var(--c-primary); font-size:.53rem; text-decoration:none; }.month-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }.month-grid>div { display:flex; flex-direction:column; align-items:center; padding:7px 3px; border-radius:8px; background:var(--c-bg-2); }.month-grid strong { color:var(--c-primary); font-size:.75rem; }.month-grid span { margin-top:2px; color:var(--c-text-3); font-size:.46rem; }.tag-cloud { display:flex; flex-wrap:wrap; gap:6px; }.tag-cloud a { padding:4px 7px; border-radius:999px; background:var(--c-bg-2); color:var(--c-text-2); font-size:.55rem; text-decoration:none; }.archive-note { display:flex; gap:9px; }.archive-note>svg { flex:0 0 auto; color:var(--c-primary); font-size:1rem; opacity:.7; }.archive-note p { color:var(--c-text-2); font-family:var(--font-serif,var(--font-body)); font-size:.61rem; line-height:1.7; }
@keyframes shimmer { to { background-position:-200% 0; } }
@media (max-width:640px) { .main-content { padding:max(68px,calc(env(safe-area-inset-top) + 60px)) 16px 24px!important; }.archive-stats { grid-template-columns:repeat(2,1fr); gap:0; }.archive-stats>div { justify-content:flex-start; padding:9px 15px; border-right:0; }.archive-stats>div:nth-child(odd) { border-right:1px solid var(--border); }.archive-timeline::before { left:61px; }.timeline-item { grid-template-columns:47px 18px minmax(0,1fr) 18px; }.timeline-copy p { display:none; }.year-header>div { width:48px; }.content-heading { align-items:flex-start; flex-direction:column; gap:4px; } }
</style>

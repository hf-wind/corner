<template>
  <div class="page-layout">
    <main class="main-content">
      <ContentPageHero
        eyebrow="KEYWORDS · IDEA INDEX"
        title="用标签，串起散落的灵感"
        description="比分类更轻，也更自由。每个标签都是一条细线，把不同时刻写下的内容连接起来。"
        icon="ph:hash-straight"
        :metric="allTags.length"
        metric-label="个灵感标签"
      />

      <div v-if="loading" class="tag-loading"><span v-for="n in 16" :key="n" :style="{ width: `${58 + n % 4 * 18}px` }" /></div>
      <template v-else>
        <section class="insight-strip">
          <div><span><Icon name="ph:article-bold" /></span><p><strong>{{ totalPosts }}</strong><small>文章总数</small></p></div>
          <i />
          <div><span><Icon name="ph:fire-bold" /></span><p><strong>{{ hottestTag?.name || '—' }}</strong><small>最常出现</small></p></div>
          <i />
          <div><span><Icon name="ph:sparkle-bold" /></span><p><strong>{{ latestTag || '—' }}</strong><small>最近添加</small></p></div>
        </section>

        <header class="content-heading">
          <div><span>BROWSE THE CLOUD</span><h2>标签云</h2></div>
          <p>点击标签查看相关文章，再次点击即可收起</p>
        </header>
        <section class="tag-stage">
          <div class="stage-orbit orbit-one" /><div class="stage-orbit orbit-two" />
          <button
            v-for="(tag, index) in tagCloud"
            :key="tag.name"
            type="button"
            class="tag-chip"
            :class="[tag.size, { active: activeTag === tag.name }]"
            :style="{ '--tag-delay': `${index * 28}ms` }"
            @click="selectTag(tag)"
          ><Icon name="ph:hash" /><span>{{ tag.name }}</span><small>{{ tag.count }}</small></button>
          <div v-if="!tagCloud.length" class="empty-tags">还没有标签，新的灵感会在这里生长。</div>
        </section>

        <section v-if="activeTag" class="result-section">
          <header class="result-heading">
            <div><span class="result-icon"><Icon name="ph:tag-bold" /></span><div><small>TAGGED WITH</small><h2># {{ activeTag }}</h2></div></div>
            <span>{{ tagPosts.length }} 篇文章</span>
          </header>
          <div v-if="postsLoading" class="article-skeletons"><i v-for="n in 3" :key="n" /></div>
          <div v-else-if="tagPosts.length" class="article-list"><CompactArticleCard v-for="article in tagPosts" :key="article.slug" :article="article" /></div>
          <div v-else class="empty-state"><Icon name="ph:tag" /><strong>暂时没有相关文章</strong></div>
        </section>
      </template>
    </main>

    <aside class="sidebar-right">
      <section class="right-card hot-card">
        <span class="aside-kicker">TRENDING</span><h3>热门标签</h3>
        <div class="hot-list">
          <button v-for="(tag, index) in hotTagsList" :key="tag.name" type="button" @click="selectTag(tag)">
            <span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ tag.name }}</strong><small>{{ tag.count }} 篇</small>
          </button>
        </div>
      </section>
      <section class="right-card">
        <div class="right-card-title"><span><Icon name="ph:chart-donut-bold" /> 标签密度</span></div>
        <div class="distribution">
          <div v-for="item in distribution" :key="item.label">
            <div><span>{{ item.label }}</span><small>{{ item.value }} 个</small></div>
            <i><span :style="{ width: distributionWidth(item.value) }" /></i>
          </div>
        </div>
      </section>
      <section class="right-card note-card"><Icon name="ph:lightbulb-filament-duotone" /><p>标签会随文章一起生长，它们不是目录，而是内容之间悄悄建立的联系。</p></section>
    </aside>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const allTags = ref<any[]>([])
const tagPosts = ref<any[]>([])
const loading = ref(true)
const postsLoading = ref(false)
const activeTag = ref('')
const activeTagSlug = ref('')
const totalPosts = ref(0)
const latestTag = ref('')

const tagCloud = computed(() => {
  const counts = allTags.value.map(tag => Number(tag._count?.posts || 0))
  const max = Math.max(...counts, 1)
  return allTags.value.map(tag => {
    const ratio = Number(tag._count?.posts || 0) / max
    return { name: tag.name, slug: tag.slug, count: Number(tag._count?.posts || 0), size: ratio > .66 ? 'size-lg' : ratio > .32 ? 'size-md' : 'size-sm' }
  })
})
const hotTagsList = computed(() => [...tagCloud.value].sort((a, b) => b.count - a.count).slice(0, 6))
const hottestTag = computed(() => hotTagsList.value[0])
const distCounts = computed(() => ({
  high: allTags.value.filter(tag => Number(tag._count?.posts || 0) >= 10).length,
  medium: allTags.value.filter(tag => Number(tag._count?.posts || 0) >= 5 && Number(tag._count?.posts || 0) < 10).length,
  low: allTags.value.filter(tag => Number(tag._count?.posts || 0) < 5).length,
}))
const distribution = computed(() => [
  { label: '10+ 篇', value: distCounts.value.high }, { label: '5–9 篇', value: distCounts.value.medium }, { label: '1–4 篇', value: distCounts.value.low },
])
const maxDistribution = computed(() => Math.max(...distribution.value.map(item => item.value), 1))
function distributionWidth(value: number) { return `${Math.max(value ? 10 : 0, value / maxDistribution.value * 100)}%` }

async function selectTag(tag: { name: string; slug: string }) {
  const closing = tag.slug === activeTagSlug.value
  activeTag.value = closing ? '' : tag.name
  activeTagSlug.value = closing ? '' : tag.slug
  if (!activeTagSlug.value) { tagPosts.value = []; return }
  postsLoading.value = true
  try {
    const res = await api.get<any>(`/tags/${encodeURIComponent(activeTagSlug.value)}/posts`, { limit: 20 })
    tagPosts.value = (res.items ?? []).map((post: any) => ({
      slug: post.slug, title: post.title, date: post.publishedAt, cover: post.coverImage,
      excerpt: post.excerpt, tag: activeTag.value,
    }))
  } catch { tagPosts.value = [] }
  finally { postsLoading.value = false }
}

onMounted(async () => {
  try {
    const [tagRes, postRes] = await Promise.all([api.get<any>('/tags'), api.get<any>('/posts', { limit: 1 })])
    allTags.value = Array.isArray(tagRes) ? tagRes : []
    totalPosts.value = postRes.total ?? 0
    latestTag.value = allTags.value.at(-1)?.name || ''
  } catch { allTags.value = [] }
  finally { loading.value = false }
})

useHead({ title: '文章标签' })
</script>

<style scoped>
.page-layout { display:flex; flex:1; overflow:hidden; }.main-content { flex:1; min-width:0; padding:24px 28px; overflow-y:auto; scrollbar-gutter:stable; }.sidebar-right { display:flex; width:var(--right-w); flex:0 0 var(--right-w); flex-direction:column; gap:14px; padding:24px 16px; overflow-y:auto; }
.insight-strip { display:grid; grid-template-columns:1fr auto 1fr auto 1fr; align-items:center; margin-bottom:28px; padding:15px 20px; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border-radius:14px; background:var(--ld-bg-card); box-shadow:0 5px 18px color-mix(in srgb,var(--ld-shadow) 25%,transparent); }.insight-strip>div { display:flex; align-items:center; justify-content:center; gap:10px; }.insight-strip>div>span { display:grid; width:33px; height:33px; border-radius:10px; background:var(--c-primary-soft); color:var(--c-primary); place-items:center; }.insight-strip p { display:flex; min-width:0; flex-direction:column; gap:2px; }.insight-strip strong { max-width:110px; overflow:hidden; color:var(--c-text); font-size:.87rem; text-overflow:ellipsis; white-space:nowrap; }.insight-strip small { color:var(--c-text-3); font-size:.53rem; }.insight-strip>i { width:1px; height:30px; background:var(--border); }
.content-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin:0 2px 14px; }.content-heading span,.result-heading small,.aside-kicker { color:var(--c-primary); font-size:.48rem; font-weight:750; letter-spacing:.18em; }.content-heading h2,.result-heading h2 { margin:4px 0 0; color:var(--c-text); font-size:1.25rem; }.content-heading p { color:var(--c-text-3); font-size:.61rem; }
.tag-stage { position:relative; display:flex; min-height:230px; flex-wrap:wrap; align-content:center; justify-content:center; gap:10px; padding:35px 26px; overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border-radius:18px; background:radial-gradient(circle at 50% 50%,var(--c-primary-soft),transparent 55%),var(--ld-bg-card); box-shadow:0 8px 28px color-mix(in srgb,var(--ld-shadow) 30%,transparent); }.stage-orbit { position:absolute; border:1px dashed color-mix(in srgb,var(--c-primary) 13%,transparent); border-radius:50%; pointer-events:none; }.orbit-one { width:310px; height:150px; transform:rotate(9deg); }.orbit-two { width:480px; height:210px; transform:rotate(-7deg); }
.tag-chip { --tag-delay:0ms; position:relative; z-index:1; display:inline-flex; align-items:center; gap:5px; padding:7px 12px; border:1px solid color-mix(in srgb,var(--border) 78%,transparent); border-radius:999px; background:color-mix(in srgb,var(--ld-bg-card) 92%,transparent); color:var(--c-text-2); cursor:pointer; font:inherit; font-size:.7rem; box-shadow:0 3px 10px color-mix(in srgb,var(--ld-shadow) 23%,transparent); animation:tag-in .45s var(--tag-delay) both; transition:.25s cubic-bezier(.16,1,.3,1); }.tag-chip small { display:grid; min-width:18px; height:18px; padding:0 4px; border-radius:999px; background:var(--c-bg-2); color:var(--c-text-3); font-size:.49rem; place-items:center; }.tag-chip:hover { border-color:var(--c-primary); color:var(--c-primary); transform:translateY(-3px); }.tag-chip.active { border-color:var(--c-primary); background:var(--c-primary); box-shadow:0 7px 18px color-mix(in srgb,var(--c-primary) 28%,transparent); color:#fff; }.tag-chip.active small { background:rgb(255 255 255 / 18%); color:#fff; }.tag-chip.size-lg { padding:10px 16px; font-size:.88rem; font-weight:700; }.tag-chip.size-md { padding:8px 14px; font-size:.77rem; }.empty-tags { color:var(--c-text-3); font-size:.7rem; }
.result-section { margin-top:30px; }.result-heading { display:flex; align-items:center; justify-content:space-between; margin-bottom:13px; }.result-heading>div { display:flex; align-items:center; gap:11px; }.result-icon { display:grid; width:35px; height:35px; border-radius:10px; background:var(--c-primary-soft); color:var(--c-primary); place-items:center; }.result-heading>span { color:var(--c-text-3); font-size:.6rem; }.article-list,.article-skeletons { display:grid; gap:10px; }.article-skeletons i { height:104px; border-radius:14px; background:linear-gradient(90deg,var(--c-bg-2),var(--ld-bg-card),var(--c-bg-2)); background-size:200% 100%; animation:shimmer 1.4s infinite; }.empty-state { display:flex; min-height:150px; flex-direction:column; align-items:center; justify-content:center; border:1px dashed var(--border); border-radius:14px; color:var(--c-text-3); }.empty-state>svg { margin-bottom:8px; color:var(--c-primary); font-size:1.6rem; }.empty-state strong { font-size:.68rem; }
.tag-loading { display:flex; min-height:270px; flex-wrap:wrap; align-content:center; justify-content:center; gap:10px; padding:30px; border-radius:18px; background:var(--ld-bg-card); }.tag-loading span { height:32px; border-radius:999px; background:linear-gradient(90deg,var(--c-bg-2),var(--ld-bg-card),var(--c-bg-2)); background-size:200% 100%; animation:shimmer 1.4s infinite; }
.right-card { padding:17px; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border-radius:14px; background:var(--ld-bg-card); box-shadow:0 5px 18px color-mix(in srgb,var(--ld-shadow) 25%,transparent); }.hot-card { background:linear-gradient(150deg,var(--c-primary-soft),var(--ld-bg-card) 62%); }.hot-card h3 { margin:5px 0 13px; color:var(--c-text); font-size:.88rem; }.hot-list { display:grid; gap:4px; }.hot-list button { display:grid; grid-template-columns:22px 1fr auto; align-items:center; gap:7px; padding:7px 4px; border:0; border-bottom:1px dashed color-mix(in srgb,var(--border) 70%,transparent); background:transparent; color:inherit; cursor:pointer; font:inherit; text-align:left; }.hot-list button:last-child { border-bottom:0; }.hot-list button>span { color:var(--c-primary); font-family:var(--font-mono); font-size:.48rem; }.hot-list strong { overflow:hidden; color:var(--c-text-2); font-size:.65rem; text-overflow:ellipsis; white-space:nowrap; }.hot-list small { color:var(--c-text-3); font-size:.52rem; }
.right-card-title { margin-bottom:13px; padding-bottom:10px; border-bottom:1px solid var(--border); }.right-card-title span { display:flex; align-items:center; gap:6px; color:var(--c-text); font-size:.72rem; font-weight:700; }.distribution { display:grid; gap:12px; }.distribution>div>div { display:flex; justify-content:space-between; margin-bottom:5px; color:var(--c-text-2); font-size:.58rem; }.distribution small { color:var(--c-text-3); }.distribution i { display:block; height:5px; overflow:hidden; border-radius:999px; background:var(--c-bg-2); }.distribution i span { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,var(--c-primary),color-mix(in srgb,var(--c-primary) 50%,#9bd)); }.note-card { display:flex; align-items:flex-start; gap:9px; }.note-card>svg { flex:0 0 auto; color:var(--c-primary); font-size:1.1rem; }.note-card p { color:var(--c-text-2); font-size:.59rem; line-height:1.7; }
@keyframes tag-in { from { opacity:0; transform:translateY(8px) scale(.96); } } @keyframes shimmer { to { background-position:-200% 0; } }
@media (max-width:640px) { .main-content { padding:max(68px,calc(env(safe-area-inset-top) + 60px)) 16px 24px!important; }.insight-strip { grid-template-columns:1fr 1fr 1fr; padding:12px 8px; }.insight-strip>i { display:none; }.insight-strip>div { gap:6px; }.insight-strip>div>span { width:28px; height:28px; }.insight-strip strong { max-width:64px; font-size:.74rem; }.content-heading { align-items:flex-start; flex-direction:column; gap:4px; }.tag-stage { min-height:200px; padding:25px 12px; }.orbit-two { width:350px; }.tag-chip,.tag-chip.size-lg,.tag-chip.size-md { padding:7px 11px; font-size:.69rem; } }
</style>

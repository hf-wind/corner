<template>
  <div class="page-layout">
    <main class="main-content">
      <ContentPageHero
        eyebrow="TOPICS · CONTENT MAP"
        title="循着分类，抵达感兴趣的角落"
        description="文章被安放在不同主题里。选择一个分类，沿着相似的思考继续阅读。"
        icon="ph:folders"
        :metric="categories.length"
        metric-label="个内容分类"
        variant="category"
      />
      <PageStatsBar :items="categoryStats" label="分类概况" />

      <template v-if="!loading">
        <header class="content-heading">
          <div><span>EXPLORE BY TOPIC</span><h2>文章分类</h2></div>
          <label class="category-search">
            <Icon name="ph:magnifying-glass" />
            <input v-model.trim="categoryKeyword" type="search" placeholder="查找分类" aria-label="查找分类">
            <button v-if="categoryKeyword" type="button" aria-label="清空分类搜索" @click="categoryKeyword = ''"><Icon name="ph:x-bold" /></button>
          </label>
        </header>

        <div class="category-grid">
          <button
            v-for="(category, index) in filteredCategories"
            :key="category.id"
            type="button"
            class="category-card"
            :class="{ active: activeCategory === category.slug }"
            @click="selectCategory(category.slug)"
          >
            <span class="category-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="category-icon"><Icon name="ph:folder-open-duotone" /></span>
            <span class="category-copy">
              <strong>{{ category.name }}</strong>
              <small>{{ category.description || '这个分类正在慢慢积累内容。' }}</small>
            </span>
            <span class="category-count"><strong>{{ category._count?.posts ?? 0 }}</strong><small>篇文章</small></span>
            <Icon name="ph:arrow-up-right-bold" class="category-arrow" />
          </button>
        </div>

        <div v-if="!filteredCategories.length" class="category-empty">
          <Icon name="ph:magnifying-glass" />
          <strong>没有找到“{{ categoryKeyword }}”</strong>
          <button type="button" @click="categoryKeyword = ''">查看全部分类</button>
        </div>

        <section class="result-section">
          <header class="result-heading">
            <div>
              <span class="result-icon"><Icon :name="activeCategory ? 'ph:folder-notch-open-bold' : 'ph:stack-bold'" /></span>
              <div><small>{{ activeCategory ? 'SELECTED CATEGORY' : 'LATEST WRITING' }}</small><h2>{{ activeCategoryName || '全部文章' }}</h2></div>
            </div>
            <button v-if="activeCategory" type="button" @click="selectCategory(activeCategory)"><Icon name="ph:x-bold" /> 查看全部</button>
            <span v-else class="result-count">最近 {{ categoryPosts.length }} 篇</span>
          </header>
          <div v-if="!postsLoading && categoryPosts.length" class="article-list content-reveal">
            <CompactArticleCard v-for="article in categoryPosts" :key="article.slug" :article="article" />
          </div>
          <div v-else-if="!postsLoading" class="empty-state content-reveal"><Icon name="ph:tray" /><strong>{{ activeCategory ? '这个分类暂时没有文章' : '还没有已发布文章' }}</strong><span>{{ activeCategory ? '换一个分类看看吧。' : '新的内容会在这里出现。' }}</span></div>
        </section>
      </template>
    </main>

    <aside class="sidebar-right">
      <section class="right-card overview-card">
        <span class="aside-kicker">OVERVIEW</span><h3>分类概览</h3>
        <div class="overview-number"><strong>{{ totalCategoryPosts }}</strong><span>篇文章分布在<br>{{ categories.length }} 个分类中</span></div>
      </section>
      <section class="right-card">
        <div class="right-card-title"><span><Icon name="ph:chart-bar-bold" /> 内容分布</span></div>
        <div class="cat-stats-list">
          <button v-for="category in categories" :key="category.id" type="button" :class="{ active: activeCategory === category.slug }" @click="selectCategory(category.slug)">
            <span><i :style="{ width: categoryWidth(category) }" /></span>
            <div><strong>{{ category.name }}</strong><small>{{ category._count?.posts ?? 0 }} 篇</small></div>
          </button>
        </div>
      </section>
      <section class="right-card">
        <div class="right-card-title"><span><Icon name="ph:hash-bold" /> 热门标签</span><NuxtLink to="/tags">全部</NuxtLink></div>
        <div class="tag-cloud"><NuxtLink v-for="tag in hotTags" :key="tag" to="/tags"># {{ tag }}</NuxtLink></div>
      </section>
    </aside>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const route = useRoute()
const router = useRouter()
const categories = ref<any[]>([])
const categoryPosts = ref<any[]>([])
const hotTags = ref<string[]>([])
const loading = ref(true)
const postsLoading = ref(false)
const categoryKeyword = ref('')

const activeCategory = computed(() => String(route.query.cat || ''))
const activeCategoryName = computed(() => categories.value.find((category: any) => category.slug === activeCategory.value)?.name || '')
const totalCategoryPosts = computed(() => categories.value.reduce((sum, category) => sum + Number(category._count?.posts || 0), 0))
const maxCategoryPosts = computed(() => Math.max(...categories.value.map(category => Number(category._count?.posts || 0)), 1))
const leadingCategory = computed(() => [...categories.value].sort((a, b) => Number(b._count?.posts || 0) - Number(a._count?.posts || 0))[0])
const categoryStats = computed(() => [
  { icon: 'ph:article-medium-bold', value: totalCategoryPosts.value, label: '已归档文章' },
  { icon: 'ph:crown-simple-bold', value: leadingCategory.value?.name || '等待内容', label: '内容最多的分类' },
  { icon: 'ph:compass-tool-bold', value: activeCategoryName.value || '全部内容', label: '当前阅读范围' },
])
const filteredCategories = computed(() => {
  const keyword = categoryKeyword.value.toLocaleLowerCase()
  if (!keyword) return categories.value
  return categories.value.filter(category => `${category.name} ${category.description || ''}`.toLocaleLowerCase().includes(keyword))
})

function categoryWidth(category: any) {
  return `${Math.max(8, Number(category._count?.posts || 0) / maxCategoryPosts.value * 100)}%`
}

async function loadCategoryPosts(slug: string) {
  postsLoading.value = true
  try {
    const res = await api.get<any>('/posts', { ...(slug ? { category: slug } : {}), limit: 12 })
    categoryPosts.value = (res.items ?? []).map((post: any) => ({
      slug: post.slug, title: post.title, cover: post.coverImage, excerpt: post.excerpt,
      publishedAt: post.publishedAt, tag: post.category?.name || activeCategoryName.value || '随笔',
    }))
  } catch { categoryPosts.value = [] }
  finally { postsLoading.value = false }
}

async function selectCategory(slug: string) {
  const next = slug === activeCategory.value ? '' : slug
  await router.replace({ query: next ? { cat: next } : {} })
  await loadCategoryPosts(next)
}

onMounted(async () => {
  try {
    const [catRes, tagRes] = await Promise.all([api.get<any>('/categories'), api.get<any>('/tags')])
    categories.value = Array.isArray(catRes) ? catRes : (catRes.items ?? [])
    hotTags.value = (Array.isArray(tagRes) ? tagRes : []).map((tag: any) => tag.name).slice(0, 9)
    await loadCategoryPosts(activeCategory.value)
  } catch { categories.value = []; hotTags.value = [] }
  finally { loading.value = false }
})

useHead({ title: '文章分类' })
</script>

<style scoped>
.page-layout { position:relative; display:flex; flex:1; overflow:hidden; background:var(--c-bg); color:var(--c-text); isolation:isolate; }.page-layout::before,.page-layout::after { position:absolute; z-index:-1; border-radius:50%; content:''; pointer-events:none; }.page-layout::before { top:-220px; right:80px; width:520px; height:520px; background:radial-gradient(circle,color-mix(in srgb,var(--c-primary) 11%,transparent),transparent 69%); }.page-layout::after { bottom:-260px; left:-170px; width:500px; height:500px; background:radial-gradient(circle,color-mix(in srgb,#8b72e8 8%,transparent),transparent 70%); }.main-content { position:relative; z-index:1; flex:1; min-width:0; padding:24px 28px 42px; overflow-y:auto; scrollbar-gutter:stable; }.sidebar-right { position:relative; z-index:1; display:flex; width:var(--right-w); flex:0 0 var(--right-w); flex-direction:column; gap:14px; padding:24px 16px; overflow-y:auto; }
.content-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin:0 2px 15px; }.content-heading span,.result-heading small,.aside-kicker { color:var(--c-primary); font-size:.48rem; font-weight:750; letter-spacing:.18em; }.content-heading h2,.result-heading h2 { margin:4px 0 0; color:var(--c-text); font-family:var(--font-heading); font-size:1.25rem; }.category-search { display:flex; width:210px; height:35px; align-items:center; gap:7px; padding:0 10px; border:1px solid color-mix(in srgb,var(--border) 75%,transparent); border-radius:10px; background:color-mix(in srgb,var(--ld-bg-card) 88%,transparent); color:var(--c-text-3); box-shadow:0 4px 14px color-mix(in srgb,var(--ld-shadow) 20%,transparent); transition:.2s; }.category-search:focus-within { border-color:color-mix(in srgb,var(--c-primary) 48%,var(--border)); box-shadow:0 0 0 3px var(--c-primary-soft); }.category-search input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:var(--c-text); font:inherit; font-size:.62rem; }.category-search button { display:grid; padding:0; border:0; background:transparent; color:var(--c-text-3); cursor:pointer; place-items:center; }
.category-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:13px; }.category-card { position:relative; display:grid; min-height:142px; grid-template-columns:54px minmax(0,1fr) auto; align-items:center; gap:8px 14px; padding:21px; overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 67%,transparent); border-radius:17px; background:linear-gradient(145deg,color-mix(in srgb,var(--ld-bg-card) 96%,var(--c-primary-soft)),var(--ld-bg-card)); color:inherit; cursor:pointer; font:inherit; text-align:left; box-shadow:0 8px 24px color-mix(in srgb,var(--ld-shadow) 30%,transparent); transition:.3s cubic-bezier(.16,1,.3,1); }.category-card::before { position:absolute; top:-65px; right:-70px; width:150px; height:150px; border-radius:50%; background:var(--c-primary-soft); content:''; opacity:.5; transition:.35s; }.category-card::after { position:absolute; bottom:0; left:0; width:0; height:3px; border-radius:0 3px 0 0; background:linear-gradient(90deg,var(--c-primary),#8f79e7); content:''; transition:.35s; }.category-card:hover { border-color:color-mix(in srgb,var(--c-primary) 38%,var(--border)); box-shadow:0 15px 34px color-mix(in srgb,var(--ld-shadow) 50%,transparent); transform:translateY(-4px); }.category-card:hover::before { transform:scale(1.12); }.category-card:hover::after,.category-card.active::after { width:100%; }.category-card.active { border-color:color-mix(in srgb,var(--c-primary) 55%,var(--border)); background:linear-gradient(135deg,color-mix(in srgb,var(--c-primary-soft) 82%,var(--ld-bg-card)),var(--ld-bg-card)); }
.category-index { position:absolute; top:10px; right:12px; color:var(--c-text-3); font-family:var(--font-mono); font-size:.47rem; opacity:.6; }.category-icon { display:grid; width:48px; height:48px; border-radius:14px; background:var(--c-primary-soft); color:var(--c-primary); font-size:1.45rem; place-items:center; }.category-copy { display:flex; min-width:0; flex-direction:column; gap:5px; }.category-copy strong { color:var(--c-text); font-size:.91rem; }.category-copy small { display:-webkit-box; overflow:hidden; color:var(--c-text-2); font-size:.66rem; line-height:1.55; -webkit-box-orient:vertical; -webkit-line-clamp:2; }.category-count { display:flex; min-width:52px; flex-direction:column; align-items:flex-end; }.category-count strong { color:var(--c-primary); font-size:1.15rem; }.category-count small { color:var(--c-text-3); font-size:.52rem; }.category-arrow { position:absolute; right:12px; bottom:10px; color:var(--c-primary); font-size:.72rem; opacity:0; transform:translate(-3px,3px); transition:.2s; }.category-card:hover .category-arrow { opacity:.8; transform:none; }
.category-empty { display:flex; min-height:150px; flex-direction:column; align-items:center; justify-content:center; border:1px dashed var(--border); border-radius:16px; background:color-mix(in srgb,var(--ld-bg-card) 76%,transparent); color:var(--c-text-3); }.category-empty>svg { margin-bottom:8px; color:var(--c-primary); font-size:1.5rem; }.category-empty strong { color:var(--c-text-2); font-size:.68rem; }.category-empty button { margin-top:10px; padding:6px 10px; border:0; border-radius:8px; background:var(--c-primary-soft); color:var(--c-primary); cursor:pointer; font:inherit; font-size:.58rem; }.result-section { margin-top:34px; padding-top:23px; border-top:1px solid color-mix(in srgb,var(--border) 75%,transparent); }.result-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:13px; }.result-heading>div { display:flex; align-items:center; gap:11px; }.result-icon { display:grid; width:39px; height:39px; border-radius:11px; background:linear-gradient(145deg,var(--c-primary),#8874df); box-shadow:0 7px 18px color-mix(in srgb,var(--c-primary) 24%,transparent); color:#fff; place-items:center; }.result-heading button { display:flex; align-items:center; gap:5px; padding:7px 10px; border:1px solid var(--border); border-radius:9px; background:var(--ld-bg-card); color:var(--c-text-3); cursor:pointer; font:inherit; font-size:.59rem; }.result-count { color:var(--c-text-3); font-size:.56rem; letter-spacing:.08em; }.article-list { display:grid; gap:10px; }.empty-state { display:flex; min-height:180px; flex-direction:column; align-items:center; justify-content:center; border:1px dashed var(--border); border-radius:15px; background:color-mix(in srgb,var(--ld-bg-card) 68%,transparent); color:var(--c-text-3); }.empty-state>svg { margin-bottom:9px; color:var(--c-primary); font-size:1.7rem; }.empty-state strong { color:var(--c-text-2); font-size:.75rem; }.empty-state span { margin-top:4px; font-size:.61rem; }
.right-card { padding:17px; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border-radius:14px; background:var(--ld-bg-card); box-shadow:0 5px 18px color-mix(in srgb,var(--ld-shadow) 25%,transparent); }.overview-card { background:linear-gradient(145deg,var(--c-primary-soft),var(--ld-bg-card)); }.overview-card h3 { margin:5px 0 18px; color:var(--c-text); font-size:.88rem; }.overview-number { display:flex; align-items:center; gap:10px; }.overview-number strong { color:var(--c-primary); font-size:1.8rem; }.overview-number span { color:var(--c-text-2); font-size:.6rem; line-height:1.6; }.right-card-title { display:flex; align-items:center; justify-content:space-between; margin-bottom:13px; padding-bottom:10px; border-bottom:1px solid var(--border); }.right-card-title span { display:flex; align-items:center; gap:6px; color:var(--c-text); font-size:.72rem; font-weight:700; }.right-card-title a { color:var(--c-primary); font-size:.55rem; text-decoration:none; }
.cat-stats-list { display:grid; gap:10px; }.cat-stats-list button { display:grid; grid-template-columns:42px 1fr; align-items:center; gap:8px; padding:0; border:0; background:transparent; color:inherit; cursor:pointer; font:inherit; text-align:left; }.cat-stats-list button>span { height:4px; overflow:hidden; border-radius:999px; background:var(--c-bg-2); }.cat-stats-list i { display:block; height:100%; border-radius:inherit; background:var(--c-primary); }.cat-stats-list button>div { display:flex; justify-content:space-between; gap:8px; }.cat-stats-list strong { overflow:hidden; color:var(--c-text-2); font-size:.64rem; text-overflow:ellipsis; white-space:nowrap; }.cat-stats-list small { color:var(--c-text-3); font-size:.55rem; }.cat-stats-list button.active strong { color:var(--c-primary); }.tag-cloud { display:flex; flex-wrap:wrap; gap:6px; }.tag-cloud a { padding:4px 8px; border-radius:999px; background:var(--c-bg-2); color:var(--c-text-2); font-size:.57rem; text-decoration:none; transition:.2s; }.tag-cloud a:hover { background:var(--c-primary-soft); color:var(--c-primary); }
@media (max-width:900px) { .category-grid { grid-template-columns:1fr; }.category-insights { grid-template-columns:repeat(3,minmax(0,1fr)); margin-inline:0; }.category-insights>i { display:none; } }
@media (max-width:640px) { .main-content { padding:max(68px,calc(env(safe-area-inset-top) + 60px)) 16px 24px!important; }.category-insights { grid-template-columns:1fr; gap:9px; padding:13px; }.category-insights>div { padding:4px; }.category-card { min-height:122px; padding:16px; }.content-heading { align-items:stretch; flex-direction:column; gap:10px; }.category-search { width:100%; }.category-copy small { -webkit-line-clamp:1; }.result-heading { align-items:flex-start; }.result-count { padding-top:6px; } }
</style>

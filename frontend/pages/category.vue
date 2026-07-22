<template>
  <div class="page-layout">
    <main class="main-content">
      <div class="section-title">· 文章分类</div>

      <div v-if="loading" class="loading-tip">加载中...</div>
      <template v-else>
        <div class="category-grid">
          <NuxtLink
            v-for="c in categories"
            :key="c.id"
            :to="'?cat=' + c.slug"
            class="category-card"
            :class="{ active: activeCategory === c.slug }"
            @click.prevent="selectCategory(c.slug)"
          >
            <div class="category-icon"><Icon name="ph:folder-bold" /></div>
            <div class="category-name">{{ c.name }}</div>
            <div class="category-desc">{{ c.description || '' }}</div>
            <div class="category-meta">
              <span>{{ c._count?.posts ?? 0 }} 篇</span>
            </div>
          </NuxtLink>
        </div>

        <div v-if="activeCategoryName" class="section-title">· {{ activeCategoryName }} 下的文章</div>
        <div v-if="categoryPosts.length" class="article-list">
          <NuxtLink :to="'/article/' + a.slug" v-for="a in categoryPosts" :key="a.slug" class="article-item">
            <div class="article-item-cover">
              <img :src="a.cover" alt="cover">
            </div>
            <div class="article-item-body">
              <div class="article-item-title">{{ a.title }}</div>
              <div class="article-item-desc">{{ a.excerpt }}</div>
              <div class="article-item-meta">
                <span>{{ a.publishedAt?.slice(0, 10) }}</span>
              </div>
            </div>
          </NuxtLink>
        </div>
        <div v-else-if="activeCategory" class="loading-tip">该分类暂无文章</div>
      </template>
    </main>

    <aside class="sidebar-right">
      <div class="right-card">
        <div class="right-card-title">分类统计</div>
        <div class="cat-stats-list">
          <div v-for="c in categories" :key="c.id" class="cat-stat-row">
            <span class="cat-stat-name"><Icon name="ph:folder-bold" /> {{ c.name }}</span>
            <span class="cat-stat-count">{{ c._count?.posts ?? 0 }} 篇</span>
          </div>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">热门标签</div>
        <div class="tag-cloud">
          <span class="tag-item" v-for="t in hotTags" :key="t">{{ t }}</span>
        </div>
      </div>
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

const activeCategory = computed(() => (route.query.cat as string) || '')
const activeCategoryName = computed(() => {
  const c = categories.value.find((c: any) => c.slug === activeCategory.value)
  return c?.name || ''
})

async function selectCategory(slug: string) {
  await router.replace({ query: { cat: slug === activeCategory.value ? undefined : slug } })
  if (slug) {
    const res = await api.get<any>('/posts', { category: slug, limit: 20 })
    categoryPosts.value = res.items ?? []
  } else {
    categoryPosts.value = []
  }
}

onMounted(async () => {
  try {
    const [catRes, tagRes] = await Promise.all([
      api.get<any>('/categories'),
      api.get<any>('/tags'),
    ])
    categories.value = Array.isArray(catRes) ? catRes : (catRes.items ?? [])
    hotTags.value = (Array.isArray(tagRes) ? tagRes : []).map((t: any) => t.name).slice(0, 8)
  } catch { /* ignore */ }
  if (activeCategory.value) {
    await selectCategory(activeCategory.value)
  }
  loading.value = false
})
</script>

<style scoped>
.page-layout { display: flex; flex: 1; overflow: hidden; }
.main-content { flex: 1; overflow-y: auto; padding: 24px 32px; min-width: 0; }
.loading-tip { text-align: center; color: var(--c-text-2); padding: 32px; font-size: 0.85rem; }
.section-title { font-size: 0.82rem; color: var(--c-text-2); letter-spacing: 0.12em; margin-bottom: 14px; padding-left: 4px; }
.category-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px; }
.category-card { background: var(--ld-bg-card); border-radius: 14px; padding: 24px; box-shadow: 0 2px 4px var(--ld-shadow); cursor: pointer; transition: all 0.2s; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 12px; }
.category-card:hover { transform: translateY(-2px); box-shadow: 0 0.5em 1em var(--ld-shadow); }
.category-card.active { border-color: var(--c-primary); background: var(--c-primary-soft); }
.category-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: var(--c-primary-soft); }
.category-name { font-size: 1rem; font-weight: 700; color: var(--c-text); }
.category-desc { font-size: 0.78rem; color: var(--c-text-2); line-height: 1.6; }
.category-meta { display: flex; gap: 12px; font-size: 0.7rem; color: var(--c-text-2); margin-top: auto; }
.article-list { display: flex; flex-direction: column; gap: 14px; }
.article-item { display: flex; gap: 16px; padding: 16px; background: var(--ld-bg-card); border-radius: 12px; box-shadow: 0 2px 4px var(--ld-shadow); cursor: pointer; transition: all 0.2s; text-decoration: none; color: inherit; }
.article-item:hover { transform: translateX(2px); box-shadow: 0 0.5em 1em var(--ld-shadow); }
.article-item-cover { width: 120px; height: 80px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.article-item-cover img { width: 100%; height: 100%; object-fit: cover; }
.article-item-body { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.article-item-title { font-size: 0.92rem; font-weight: 700; line-height: 1.4; color: var(--c-text); }
.article-item-desc { font-size: 0.78rem; color: var(--c-text-2); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.article-item-meta { display: flex; gap: 12px; font-size: 0.68rem; color: var(--c-text-2); margin-top: auto; }
.sidebar-right { width: var(--right-w); flex-shrink: 0; padding: 24px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.right-card { background: var(--ld-bg-card); border-radius: 12px; padding: 18px; box-shadow: 0 2px 4px var(--ld-shadow); transition: all 0.2s; }
.right-card-title { font-size: 0.82rem; font-weight: 700; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); letter-spacing: 0.05em; color: var(--c-text); }
.cat-stats-list { display: flex; flex-direction: column; gap: 10px; }
.cat-stat-row { display: flex; justify-content: space-between; align-items: center; }
.cat-stat-name { font-size: 0.78rem; color: var(--c-text); }
.cat-stat-count { font-size: 0.72rem; color: var(--c-primary); }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-item { padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border); font-size: 0.72rem; color: var(--c-text-2); cursor: pointer; transition: all 0.2s; }
.tag-item:hover { border-color: var(--c-primary); color: var(--c-primary); }
</style>

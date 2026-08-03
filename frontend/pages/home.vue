<template>
  <div class="page-layout">
    <main class="main-content">
      <FeaturedSwiper />

      <div class="section-title">· 最新文章</div>

      <div v-if="!loading" class="article-list-wrap content-reveal" :class="{ refreshing }" aria-live="polite">
        <div v-if="refreshing" class="article-refresh-bar"><span /></div>
        <div v-if="!articles.length" class="article-empty">
          <Icon name="ph:article-bold" />
          <span>暂时还没有文章</span>
        </div>
        <div v-else class="article-list">
          <ArticleCard
            v-for="(article, i) in articles"
            :key="article.slug"
            :style="{ '--article-index': i }"
            :eager="i < 2"
            :priority="i === 0"
            v-bind="article"
          />
        </div>
      </div>

      <FloatingPagination v-model="page" :total="totalPages" variant="articles" @change="loadArticles" />
    </main>

    <aside class="sidebar-right">
      <HomeSidebar />
    </aside>

    <ClientOnly>
      <AiPet v-if="showPet" mode="home" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const AiPet = defineAsyncComponent(() => import('~/components/AiPet.vue'))
const api = useApi()
const articles = ref<any[]>([])
const loading = ref(true)
const refreshing = ref(false)
const page = ref(1)
const totalPages = ref(1)
const showPet = ref(false)
let requestId = 0
let petIdleHandle: number | undefined

async function loadArticles() {
  const id = ++requestId
  if (articles.value.length) refreshing.value = true
  else loading.value = true
  try {
    const res = await api.get<any>('/posts', { page: page.value, limit: 10, sort: 'latest' })
    if (id !== requestId) return
    articles.value = (res.items ?? []).map((p: any) => ({
      slug: p.slug,
      cover: p.coverImage,
      tag: p.category?.name ?? p.tags?.[0]?.name ?? '',
      categoryIcon: p.category?.icon || 'ph:folder-open-bold',
      categoryColor: p.category?.color || '',
      tags: (p.tags ?? []).map((t: any) => t.name),
      tagItems: (p.tags ?? []).map((t: any) => ({ name: t.name, icon: t.icon, color: t.color })),
      title: p.title,
      date: p.publishedAt?.slice(0, 10) ?? '',
      desc: p.excerpt ?? '',
      author: p.author ? { name: p.author.username, avatar: p.author.avatar } : undefined,
      views: p.viewCount ?? 0,
      comments: p._count?.comments ?? 0,
    }))
    totalPages.value = res.totalPages ?? 1
  } catch { /* keep empty */ }
  finally {
    if (id === requestId) {
      loading.value = false
      refreshing.value = false
    }
  }
}

async function restoreScroll() {
  const saved = sessionStorage.getItem('home-scroll')
  if (!saved) return
  sessionStorage.removeItem('home-scroll')

  const target = parseInt(saved, 10)
  if (target <= 0) return

  await nextTick()

  const el = document.querySelector('.main-content')
  if (!el) return
  el.scrollTop = target
}

onMounted(() => {
  loadArticles().then(restoreScroll)
  const schedule = window.requestIdleCallback || ((callback: IdleRequestCallback) => window.setTimeout(callback, 1000))
  petIdleHandle = schedule(() => { showPet.value = true }, { timeout: 2200 })
})

onUnmounted(() => {
  if (petIdleHandle === undefined) return
  if (window.cancelIdleCallback) window.cancelIdleCallback(petIdleHandle)
  else window.clearTimeout(petIdleHandle)
})
</script>

<style scoped>
.page-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  min-width: 0;
  min-height: 0;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scroll-behavior: auto;
}

.section-title {
  font-size: 0.75rem;
  color: var(--c-text-2);
  letter-spacing: 0.12em;
  margin-bottom: 10px;
  padding-left: 4px;
}

.loading-tip {
  text-align: center;
  color: var(--c-text-2);
  padding: 32px;
  font-size: 0.85rem;
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
}

.article-list-wrap {
  position: relative;
  min-height: 180px;
}

.article-list-wrap.refreshing .article-list {
  opacity: 0.62;
  pointer-events: none;
}

.article-list-wrap .article-list {
  transition: opacity 0.16s ease;
}

.article-refresh-bar {
  position: absolute;
  z-index: 2;
  top: -2px;
  left: 0;
  right: 0;
  height: 2px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--c-primary-soft);
}

.article-refresh-bar span {
  display: block;
  width: 36%;
  height: 100%;
  border-radius: inherit;
  background: var(--c-primary);
  animation: article-loading 0.9s ease-in-out infinite alternate;
}

.article-empty {
  min-height: 180px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  color: var(--c-text-3);
  font-size: 0.8rem;
}

.article-empty .icon {
  font-size: 1.8rem;
}

@keyframes article-loading {
  from { transform: translateX(-10%); }
  to { transform: translateX(190%); }
}

.sidebar-right {
  width: var(--right-w);
  flex-shrink: 0;
  padding: 24px 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .article-refresh-bar span { animation: none; }
}

@media (max-width: 640px) {
  .article-list { gap: 9px; }
}
</style>

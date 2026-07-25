<template>
  <div class="page-layout">
    <main class="main-content">
      <FeaturedSwiper :ready="!loading" />

      <div class="section-title">· 最新文章</div>

      <template v-if="loading">
        <div class="skeleton-list">
          <div v-for="i in 4" :key="i" class="skeleton-card">
            <div class="skeleton-cover" />
            <div class="skeleton-body">
              <div class="skeleton-line skeleton-line-tag" />
              <div class="skeleton-line skeleton-line-title" />
              <div class="skeleton-line skeleton-line-title skeleton-line-short" />
              <div class="skeleton-line skeleton-line-desc" />
              <div class="skeleton-line skeleton-line-footer" />
            </div>
          </div>
        </div>
      </template>

      <div v-else class="article-list-wrap" :class="{ refreshing }" aria-live="polite">
        <div v-if="refreshing" class="article-refresh-bar"><span /></div>
        <div v-if="!articles.length" class="article-empty">
          <Icon name="ph:article-bold" />
          <span>暂时还没有文章</span>
        </div>
        <div v-else class="article-list">
          <ArticleCard
            v-for="(article, i) in articles"
            :key="article.slug"
            :eager="i < 2"
            :priority="i === 0"
            v-bind="article"
          />
        </div>
      </div>

      <FloatingPagination v-model="page" :total="totalPages" @change="loadArticles" />
    </main>

    <aside class="sidebar-right">
      <RadarChart />
    </aside>

    <ClientOnly>
      <AiPet mode="home" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const articles = ref<any[]>([])
const loading = ref(true)
const refreshing = ref(false)
const page = ref(1)
const totalPages = ref(1)
let requestId = 0

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
      tags: (p.tags ?? []).map((t: any) => t.name),
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

/* ===== Skeleton ===== */

@keyframes shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-card {
  display: flex;
  border-radius: 10px;
  overflow: hidden;
  background: var(--ld-bg-card);
  box-shadow: 0 1px 3px var(--ld-shadow);
  position: relative;
  contain: layout paint style;
}

.skeleton-card::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--c-bg-3) 70%, transparent), transparent);
  animation: shimmer 1.8s ease-in-out infinite;
  will-change: transform;
}

.skeleton-cover {
  width: 140px;
  aspect-ratio: 140 / 110;
  flex-shrink: 0;
  background: var(--c-bg-2);
}

.skeleton-body {
  flex: 1;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
}

.skeleton-line {
  height: 12px;
  border-radius: 4px;
  background: var(--c-bg-2);
}

.skeleton-line-tag { width: 60px; height: 16px; border-radius: 8px; }
.skeleton-line-title { width: 85%; height: 15px; }
.skeleton-line-short { width: 50%; }
.skeleton-line-desc { width: 65%; height: 11px; }
.skeleton-line-footer { width: 55%; height: 11px; }

@media (prefers-reduced-motion: reduce) {
  .skeleton-card::after {
    animation: none;
  }

  .article-refresh-bar span { animation: none; }
}

@media (max-width: 640px) {
  .article-list,
  .skeleton-list {
    gap: 9px;
  }

  .skeleton-card {
    min-height: 112px;
    border-radius: 12px;
  }

  .skeleton-cover {
    width: clamp(96px, 29vw, 112px);
    min-height: 112px;
    aspect-ratio: auto;
  }

  .skeleton-body {
    padding: 10px;
  }

  .skeleton-line-desc,
  .skeleton-line-footer {
    display: none;
  }
}
</style>

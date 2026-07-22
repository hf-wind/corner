<template>
  <div class="page-layout">
    <main class="main-content">
      <FeaturedSwiper :ready="!loading" />

      <div class="section-title">· 最新文章</div>
      <div v-if="loading" class="loading-tip">加载中...</div>
      <div v-else class="article-list">
        <NuxtLink v-for="article in articles" :key="article.slug" :to="'/article/' + article.slug" class="article-card"
          @click="saveScroll">
          <div class="article-cover">
            <img :src="article.cover" :alt="article.title" loading="lazy">
          </div>
          <div class="article-body">
            <span class="article-tag">{{ article.tag }}</span>
            <div class="article-title">{{ article.title }}</div>
            <div class="article-date">{{ article.date }}</div>
            <div class="article-desc">{{ article.desc }}</div>
          </div>
        </NuxtLink>
      </div>

      <FloatingPagination v-model="page" :total="totalPages" @change="loadArticles" />
    </main>

    <aside class="sidebar-right">
      <RadarChart />
    </aside>

    <ClientOnly>
      <AiPet />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const articles = ref<any[]>([])
const loading = ref(true)
const page = ref(1)
const totalPages = ref(1)
const SCROLL_KEY = 'home-scroll'

async function loadArticles() {
  loading.value = true
  try {
    const res = await api.get<any>('/posts', { page: page.value, limit: 10, sort: 'latest' })
    articles.value = (res.items ?? []).map((p: any) => ({
      slug: p.slug,
      cover: p.coverImage,
      tag: p.category?.name ?? p.tags?.[0]?.name ?? '',
      title: p.title,
      date: p.publishedAt?.slice(0, 10) ?? '',
      desc: p.excerpt ?? '',
    }))
    totalPages.value = res.totalPages ?? 1
  } catch { /* keep empty */ }
  loading.value = false
}

function saveScroll() {
  const el = document.querySelector('.main-content')
  if (el) sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop))
}

async function restoreScroll() {
  const saved = sessionStorage.getItem(SCROLL_KEY)
  if (!saved) return
  sessionStorage.removeItem(SCROLL_KEY)

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
}

.section-title {
  font-size: 0.8rem;
  color: var(--c-text-2);
  letter-spacing: 0.12em;
  margin-bottom: 12px;
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
  gap: 14px;
}

.article-card {
  display: flex;
  gap: 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--ld-bg-card);
  box-shadow: 0 2px 4px var(--ld-shadow);
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 0.5em 1em var(--ld-shadow);
}

.article-cover {
  width: 180px;
  aspect-ratio: 180 / 130;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.article-cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  mask-image: linear-gradient(to right, black calc(100% - 60px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 60px), transparent 100%);
}

.article-body {
  flex: 1;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}

.article-tag {
  display: inline-block;
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  width: fit-content;
  letter-spacing: 0.06em;
}

.article-title {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.5;
  color: var(--c-text);
}

.article-date {
  font-size: 0.7rem;
  color: var(--c-text-2);
}

.article-desc {
  font-size: 0.8rem;
  color: var(--c-text-2);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
</style>

<template>
  <div class="home-sidebar" :class="{ ready: !loading }">
    <section class="side-card overview-card" aria-labelledby="home-overview-title">
      <div class="side-card-head">
        <span id="home-overview-title"><Icon name="ph:pulse-bold" /> 站点一览</span>
        <NuxtLink to="/archive" aria-label="查看归档"><Icon name="ph:arrow-up-right-bold" /></NuxtLink>
      </div>
      <div class="overview-grid">
        <div v-for="item in overviewItems" :key="item.label" class="overview-item">
          <strong>{{ compactNumber(item.value) }}</strong>
          <span>{{ item.label }}</span>
        </div>
      </div>
    </section>

    <section class="side-card" aria-labelledby="home-popular-title">
      <div class="side-card-head">
        <span id="home-popular-title"><Icon name="ph:trend-up-bold" /> 值得一读</span>
        <span class="head-note">按阅读量</span>
      </div>
      <div v-if="popularPosts.length" class="popular-list">
        <NuxtLink v-for="(post, index) in popularPosts" :key="post.slug" :to="`/article/${post.slug}`"
          class="popular-item">
          <span class="popular-rank">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="popular-main">
            <strong>{{ post.title }}</strong>
            <small>{{ compactNumber(post.viewCount || 0) }} 阅读</small>
          </span>
          <Icon name="ph:caret-right-bold" />
        </NuxtLink>
      </div>
      <div v-else class="side-empty">热门文章正在整理中</div>
    </section>

    <section v-if="tags.length" class="side-card" aria-labelledby="home-tags-title">
      <div class="side-card-head">
        <span id="home-tags-title"><Icon name="ph:hash-bold" /> 探索主题</span>
        <NuxtLink to="/tags">全部</NuxtLink>
      </div>
      <div class="tag-list">
        <NuxtLink v-for="tag in tags" :key="tag.id || tag.slug" to="/tags" class="topic-tag">
          {{ tag.name }}<small>{{ tag._count?.posts ?? 0 }}</small>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const loading = ref(true)
const stats = ref({ posts: 0, comments: 0, users: 0, views: 0 })
const popularPosts = ref<any[]>([])
const tags = ref<any[]>([])
let idleHandle: number | null = null

const overviewItems = computed(() => [
  { label: '文章', value: stats.value.posts },
  { label: '阅读', value: stats.value.views },
  { label: '评论', value: stats.value.comments },
  { label: '读者', value: stats.value.users },
])

function compactNumber(value: number) {
  return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)
}

async function loadSidebar() {
  try {
    const [overview, posts, tagList] = await Promise.all([
      api.get<any>('/stats/overview'),
      api.get<any>('/posts', { page: 1, limit: 4, sort: 'popular' }),
      api.get<any[]>('/tags'),
    ])
    stats.value = { ...stats.value, ...(overview || {}) }
    popularPosts.value = posts?.items ?? []
    tags.value = [...(tagList || [])]
      .sort((a, b) => (b._count?.posts ?? 0) - (a._count?.posts ?? 0))
      .slice(0, 8)
  } catch {
    // Sidebar content is supplementary; keep the page usable when it fails.
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if ('requestIdleCallback' in window) {
    idleHandle = window.requestIdleCallback(() => void loadSidebar(), { timeout: 1200 })
  } else {
    idleHandle = window.setTimeout(() => void loadSidebar(), 220)
  }
})

onUnmounted(() => {
  if (idleHandle === null) return
  if ('cancelIdleCallback' in window) window.cancelIdleCallback(idleHandle)
  else window.clearTimeout(idleHandle)
})
</script>

<style scoped>
.home-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  contain: layout paint;
}

.side-card {
  padding: 13px;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  border-radius: 13px;
  background: var(--ld-bg-card);
  opacity: 0;
  transform: translate3d(10px, 0, 0);
}

.home-sidebar.ready .side-card {
  animation: side-card-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.home-sidebar.ready .side-card:nth-of-type(2) { animation-delay: 55ms; }
.home-sidebar.ready .side-card:nth-of-type(3) { animation-delay: 110ms; }

@keyframes side-card-in {
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

.side-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 11px;
  color: var(--c-text-2);
  font-size: 0.7rem;
  font-weight: 700;
}

.side-card-head > span:first-child,
.side-card-head a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.side-card-head a {
  color: var(--c-text-3);
  text-decoration: none;
  font-size: 0.62rem;
}

.side-card-head a:hover { color: var(--c-primary); }
.head-note { color: var(--c-text-3); font-size: 0.58rem; font-weight: 500; }

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.overview-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 10px;
  border-radius: 9px;
  background: var(--c-bg-1);
}

.overview-item strong { color: var(--c-text); font-size: 0.9rem; font-variant-numeric: tabular-nums; }
.overview-item span { color: var(--c-text-3); font-size: 0.58rem; }

.popular-list { display: flex; flex-direction: column; }
.popular-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 8px 2px;
  color: inherit;
  text-decoration: none;
  border-top: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
}
.popular-item:first-child { border-top: 0; padding-top: 2px; }
.popular-item:hover .popular-main strong { color: var(--c-primary); }
.popular-rank { color: var(--c-primary); font-size: 0.64rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.popular-main { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 3px; }
.popular-main strong { overflow: hidden; color: var(--c-text-1); font-size: 0.68rem; text-overflow: ellipsis; white-space: nowrap; transition: color 0.15s ease; }
.popular-main small { color: var(--c-text-3); font-size: 0.55rem; }
.popular-item > :deep(.icon) { color: var(--c-text-3); font-size: 0.62rem; }

.tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
.topic-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 7px;
  background: var(--c-bg-1);
  color: var(--c-text-2);
  font-size: 0.6rem;
  text-decoration: none;
}
.topic-tag:hover { color: var(--c-primary); background: var(--c-primary-soft); }
.topic-tag small { color: var(--c-text-3); font-size: 0.52rem; }
.side-empty { padding: 12px 0; color: var(--c-text-3); font-size: 0.65rem; text-align: center; }
@media (prefers-reduced-motion: reduce) {
  .home-sidebar.ready .side-card { animation: none; opacity: 1; transform: none; }
  .popular-main strong { transition: none; }
}
</style>

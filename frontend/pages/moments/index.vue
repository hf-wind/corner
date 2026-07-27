<template>
  <div class="moments-page">
    <section class="moments-hero">
      <div class="hero-copy">
        <p class="hero-eyebrow">Moments</p>
        <h1>把零碎日常，认真摆放在一起</h1>
        <p>
          这里不是首页的附属分页，而是一条单独的动态流。会放一些短想法、日常切片、
          图片记录和临时冒出来的小情绪。
        </p>
      </div>

      <div class="hero-stats">
        <article>
          <strong>{{ total }}</strong>
          <span>公开瞬间</span>
        </article>
        <article>
          <strong>{{ sort === 'popular' ? '热度' : '时间' }}</strong>
          <span>{{ sort === 'popular' ? '按互动排序' : '按最新时间线' }}</span>
        </article>
      </div>
    </section>

    <section class="toolbar-card">
      <div class="toolbar-copy">
        <span class="toolbar-title">浏览方式</span>
        <p>切换一下节奏，看看是按时间翻，还是按热度翻。</p>
      </div>
      <a-segmented
        v-model:value="sort"
        :options="sortOptions"
        @change="changeSort"
      />
    </section>

    <div v-if="loading && !moments.length" class="moment-skeletons">
      <div v-for="i in 4" :key="i" class="moment-skeleton" />
    </div>

    <div v-else-if="!moments.length" class="moment-empty">
      <Icon name="ph:sparkle-bold" />
      <strong>还没有瞬间</strong>
      <span>晚点再来看看，也许会多出一张生活便签。</span>
    </div>

    <div v-else class="moment-list">
      <MomentCard v-for="moment in moments" :key="moment.slug" :moment="moment" />
    </div>

    <div v-if="totalPages > 1" class="load-more">
      <a-button
        size="large"
        :loading="loadingMore"
        :disabled="page >= totalPages"
        @click="loadMore"
      >
        {{ page >= totalPages ? '已经翻到底了' : loadingMore ? '正在加载...' : '继续往下翻' }}
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const sort = ref<'latest' | 'popular'>('latest')
const moments = ref<any[]>([])

const sortOptions = [
  { label: '最新', value: 'latest' },
  { label: '热门', value: 'popular' },
]

async function fetchMoments(targetPage = 1, append = false) {
  if (append) loadingMore.value = true
  else loading.value = true

  try {
    const res = await api.get<any>('/moments', {
      page: targetPage,
      limit: 10,
      sort: sort.value,
    })

    const nextItems = (res.items ?? []).map((item: any) => ({
      slug: item.slug,
      title: item.title,
      content: item.content,
      excerpt: item.excerpt,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      likeCount: item.likeCount ?? 0,
      commentCount: item.commentCount ?? item._count?.comments ?? 0,
      viewCount: item.viewCount ?? 0,
    }))

    if (append) {
      const existing = new Set(moments.value.map((item) => item.slug))
      moments.value.push(...nextItems.filter((item: any) => !existing.has(item.slug)))
    } else {
      moments.value = nextItems
    }

    page.value = targetPage
    total.value = res.total ?? moments.value.length
    totalPages.value = res.totalPages ?? 1
  } catch {
    if (!append) moments.value = []
    total.value = append ? total.value : 0
    totalPages.value = append ? totalPages.value : 1
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function changeSort() {
  page.value = 1
  await fetchMoments(1)
}

async function loadMore() {
  const nextPage = page.value + 1
  if (loadingMore.value || nextPage > totalPages.value) return
  await fetchMoments(nextPage, true)
}

onMounted(() => {
  void fetchMoments(1)
})

useHead({ title: '我的瞬间' })
</script>

<style scoped>
.moments-page {
  width: min(1100px, calc(100% - 32px));
  margin: 0 auto;
  padding: 28px 0 42px;
}

.moments-hero,
.toolbar-card {
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  background:
    radial-gradient(circle at top left, color-mix(in srgb, #ffcc70 18%, transparent), transparent 34%),
    radial-gradient(circle at bottom right, color-mix(in srgb, var(--c-primary) 12%, transparent), transparent 32%),
    linear-gradient(145deg, color-mix(in srgb, var(--ld-bg-card) 98%, white 2%), color-mix(in srgb, var(--c-bg-2) 85%, transparent));
  box-shadow: 0 24px 54px color-mix(in srgb, var(--ld-shadow) 16%, transparent);
}

.moments-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(240px, 0.8fr);
  gap: 22px;
  padding: 30px;
  border-radius: 34px;
}

.hero-eyebrow {
  margin: 0 0 10px;
  color: var(--c-text-3);
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-copy h1 {
  margin: 0;
  color: var(--c-text);
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.08;
}

.hero-copy p:last-child {
  margin: 16px 0 0;
  max-width: 640px;
  color: var(--c-text-2);
  line-height: 1.9;
}

.hero-stats {
  display: grid;
  gap: 12px;
  align-content: end;
}

.hero-stats article {
  padding: 18px 20px;
  border-radius: 24px;
  background: rgb(255 255 255 / 68%);
  backdrop-filter: blur(12px);
}

.hero-stats strong {
  display: block;
  color: var(--c-text);
  font-size: 1.8rem;
}

.hero-stats span {
  color: var(--c-text-3);
  font-size: 0.82rem;
}

.toolbar-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding: 18px 20px;
  border-radius: 26px;
}

.toolbar-title {
  display: inline-block;
  margin-bottom: 4px;
  color: var(--c-text);
  font-weight: 700;
}

.toolbar-copy p {
  margin: 0;
  color: var(--c-text-3);
}

.moment-list {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

.moment-empty,
.moment-skeletons {
  margin-top: 20px;
}

.moment-empty {
  display: grid;
  min-height: 260px;
  place-items: center;
  justify-items: center;
  gap: 10px;
  border: 1px dashed color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 28px;
  color: var(--c-text-3);
}

.moment-empty strong {
  color: var(--c-text);
}

.moment-empty .icon {
  font-size: 1.8rem;
}

.moment-skeletons {
  display: grid;
  gap: 14px;
}

.moment-skeleton {
  height: 200px;
  border-radius: 26px;
  background: linear-gradient(90deg, var(--c-bg-2), color-mix(in srgb, var(--c-bg-2) 70%, white 30%), var(--c-bg-2));
  background-size: 220% 100%;
  animation: skeleton-wave 1.2s linear infinite;
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: 22px;
}

@keyframes skeleton-wave {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: -100% 0;
  }
}

@media (max-width: 860px) {
  .moments-page {
    width: min(100%, calc(100% - 24px));
    padding-top: max(76px, calc(env(safe-area-inset-top) + 64px));
  }

  .moments-hero {
    grid-template-columns: 1fr;
    padding: 24px;
    border-radius: 28px;
  }

  .toolbar-card {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

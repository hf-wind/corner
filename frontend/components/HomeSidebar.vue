<template>
  <div class="home-sidebar" :class="{ ready: !loading }">
    <WeatherClock />
    <section
      class="side-card overview-card"
      aria-labelledby="home-overview-title"
    >
      <div class="side-card-head">
        <span id="home-overview-title"
          ><Icon name="ph:wind-bold" /> 风隅坐标</span
        >
        <NuxtLink to="/archive" aria-label="查看归档"
          ><Icon name="ph:arrow-up-right-bold"
        /></NuxtLink>
      </div>
      <div class="overview-grid">
        <div
          v-for="item in overviewItems"
          :key="item.label"
          class="overview-item"
        >
          <span class="overview-icon"><Icon :name="item.icon" /></span>
          <span class="overview-copy"
            ><small>{{ item.label }}</small
            ><strong>{{ compactNumber(item.value) }}</strong></span
          >
          <i aria-hidden="true" />
        </div>
      </div>
    </section>

    <section
      class="side-card reading-route"
      aria-labelledby="home-popular-title"
    >
      <div class="side-card-head">
        <span id="home-popular-title"
          ><Icon name="ph:compass-bold" /> 今日阅读航线</span
        >
        <span class="head-note">随风挑选</span>
      </div>
      <div v-if="popularPosts.length" class="popular-list">
        <NuxtLink
          v-for="(post, index) in popularPosts"
          :key="post.slug"
          :to="`/article/${post.slug}`"
          class="popular-item"
        >
          <span class="popular-rank">{{
            String(index + 1).padStart(2, "0")
          }}</span>
          <span class="popular-main">
            <strong>{{ post.title }}</strong>
            <small>{{
              post.category?.name || post.tags?.[0]?.name || "文章"
            }}</small>
          </span>
          <Icon name="ph:caret-right-bold" />
        </NuxtLink>
      </div>
      <div v-else class="side-empty">热门文章正在整理中</div>
    </section>

    <section
      v-if="tags.length"
      class="side-card"
      aria-labelledby="home-tags-title"
    >
      <div class="side-card-head">
        <span id="home-tags-title"><Icon name="ph:hash-bold" /> 探索主题</span>
        <NuxtLink to="/tags">全部</NuxtLink>
      </div>
      <div class="tag-list">
        <NuxtLink
          v-for="tag in tags"
          :key="tag.id || tag.slug"
          to="/tags"
          class="topic-tag"
        >
          {{ tag.name }}<small>{{ tag._count?.posts ?? 0 }}</small>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const api = useApi();
const loading = ref(true);
const stats = ref({ posts: 0, comments: 0, views: 0 });
const popularPosts = ref<any[]>([]);
const tags = ref<any[]>([]);
let idleHandle: number | null = null;

const overviewItems = computed(() => [
  { label: "文章", value: stats.value.posts, icon: "ph:article-bold" },
  {
    label: "字间回声",
    value: stats.value.comments,
    icon: "ph:chat-circle-dots-bold",
  },
  { label: "翻阅", value: stats.value.views, icon: "ph:book-open-text-bold" },
]);

function compactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

async function loadSidebar() {
  try {
    const [overview, posts, tagList] = await Promise.all([
      api.get<any>("/stats/overview"),
      api.get<any>("/posts", { page: 1, limit: 4, sort: "popular" }),
      api.get<any[]>("/tags"),
    ]);
    stats.value = { ...stats.value, ...(overview || {}) };
    popularPosts.value = posts?.items ?? [];
    tags.value = [...(tagList || [])]
      .sort((a, b) => (b._count?.posts ?? 0) - (a._count?.posts ?? 0))
      .slice(0, 8);
  } catch {
    // Sidebar content is supplementary; keep the page usable when it fails.
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if ("requestIdleCallback" in window) {
    idleHandle = window.requestIdleCallback(() => void loadSidebar(), {
      timeout: 1200,
    });
  } else {
    idleHandle = window.setTimeout(() => void loadSidebar(), 220);
  }
});

onUnmounted(() => {
  if (idleHandle === null) return;
  if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
  else window.clearTimeout(idleHandle);
});
</script>

<style scoped>
.home-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  contain: layout paint;
}

.side-card {
  position: relative;
  padding: 12px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--ld-bg-card) 97%, var(--c-primary-soft));
  opacity: 0;
  transform: translate3d(10px, 0, 0);
}

.home-sidebar.ready .side-card {
  animation: side-card-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.home-sidebar.ready .side-card:nth-of-type(2) {
  animation-delay: 55ms;
}
.home-sidebar.ready .side-card:nth-of-type(3) {
  animation-delay: 110ms;
}

@keyframes side-card-in {
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
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

.side-card-head a:hover {
  color: var(--c-primary);
}
.head-note {
  color: var(--c-text-3);
  font-size: 0.58rem;
  font-weight: 500;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
}

.overview-item {
  position: relative;
  display: grid;
  min-width: 0;
  place-items: center;
  gap: 5px;
  padding: 4px 2px;
}

.overview-card::after {
  position: absolute;
  right: -24px;
  bottom: -35px;
  width: 96px;
  height: 96px;
  border: 1px dashed color-mix(in srgb, var(--c-primary) 14%, transparent);
  border-radius: 50%;
  content: "";
  pointer-events: none;
}
.overview-icon {
  display: grid;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  place-items: center;
  font-size: 0.78rem;
}
.overview-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.overview-copy strong {
  color: var(--c-text);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}
.overview-copy small {
  color: var(--c-text-3);
  font-size: 0.48rem;
}
.overview-item > i {
  position: absolute;
  top: 7px;
  right: 0;
  bottom: 7px;
  width: 1px;
  background: color-mix(in srgb, var(--border) 72%, transparent);
}
.overview-item:last-child > i {
  display: none;
}

.popular-list {
  display: flex;
  flex-direction: column;
}
.popular-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 8px 5px;
  color: inherit;
  text-decoration: none;
  border-top: 1px solid color-mix(in srgb, var(--border) 48%, transparent);
  border-radius: 9px;
  transition:
    background 0.2s ease,
    transform 0.24s ease;
}
.popular-item:first-child {
  border-top: 0;
  padding-top: 2px;
}
.popular-item:hover {
  background: color-mix(in srgb, var(--c-primary-soft) 55%, transparent);
  transform: translateX(2px);
}
.popular-item:hover .popular-main strong {
  color: var(--c-primary);
}
.popular-rank {
  display: grid;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 0.54rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  place-items: center;
}
.popular-main {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}
.popular-main strong {
  overflow: hidden;
  color: var(--c-text-1);
  font-size: 0.68rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s ease;
}
.popular-main small {
  color: var(--c-text-3);
  font-size: 0.55rem;
}
.popular-item > :deep(.icon) {
  color: var(--c-text-3);
  font-size: 0.62rem;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
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
.topic-tag:hover {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}
.topic-tag small {
  color: var(--c-text-3);
  font-size: 0.52rem;
}
.side-empty {
  padding: 12px 0;
  color: var(--c-text-3);
  font-size: 0.65rem;
  text-align: center;
}
@media (prefers-reduced-motion: reduce) {
  .home-sidebar.ready .side-card {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .popular-main strong {
    transition: none;
  }
}
</style>

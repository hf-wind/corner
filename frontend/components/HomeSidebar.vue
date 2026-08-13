<template>
  <div class="home-sidebar ready">
    <WeatherClock />
    <section
      class="side-card overview-card"
      aria-labelledby="home-overview-title"
    >
      <div class="side-card-head">
        <span id="home-overview-title"
          ><Icon name="ph:wind-bold" /> 风隅坐标</span
        >
        <AppLink to="/archive" aria-label="查看归档"
          ><Icon name="ph:arrow-up-right-bold"
        /></AppLink>
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

    <VisitorFootprints />
  </div>
</template>

<script setup lang="ts">
const api = useApi();
const loading = ref(true);
const stats = ref({ posts: 0, comments: 0, views: 0 });
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
    const overview = await api.get<any>("/stats/overview");
    stats.value = { ...stats.value, ...(overview || {}) };
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

.side-card,
.footprints {
  position: relative;
  opacity: 0;
  transform: translate3d(10px, 0, 0);
}

.side-card {
  padding: 12px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--ld-bg-card) 97%, var(--c-primary-soft));
}

.home-sidebar.ready .side-card,
.home-sidebar.ready .footprints {
  animation: side-card-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.home-sidebar.ready .side-card {
  animation-delay: 55ms;
}
.home-sidebar.ready .footprints {
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
  width: 34px;
  height: 34px;
  border: 1px solid color-mix(in srgb,var(--c-primary) 12%,transparent);
  border-radius: 10px;
  background: linear-gradient(145deg,var(--c-primary-soft),color-mix(in srgb,var(--ld-bg-card) 72%,transparent));
  color: var(--c-primary);
  place-items: center;
  font-size: 1rem;
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

@media (prefers-reduced-motion: reduce) {
  .home-sidebar.ready .side-card,
  .home-sidebar.ready .footprints {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>

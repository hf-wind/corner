<template>
  <div class="home-sidebar ready">
    <WeatherClock />
    <section
      class="side-card overview-card"
      aria-labelledby="home-overview-title"
    >
      <div class="side-card-head">
        <div>
          <span class="side-kicker">CORNER INDEX</span>
          <span id="home-overview-title">风隅坐标</span>
        </div>
        <AppLink to="/archive" aria-label="查看归档" title="查看归档"><Icon name="ph:arrow-up-right-bold" /></AppLink>
      </div>
      <div class="overview-grid">
        <div
          v-for="item in overviewItems"
          :key="item.label"
          class="overview-item"
        >
          <span class="overview-copy"
            ><strong>{{ loading ? "--" : compactNumber(item.value) }}</strong
            ><small>{{ item.label }}</small></span
          >
          <i aria-hidden="true" />
        </div>
      </div>
    </section>

    <VisitorFootprints />

    <ClientOnly>
      <div class="pet-dock" aria-label="AI 伙伴">
        <AiPet v-if="showPet" docked mode="home" />
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const AiPet = defineAsyncComponent(() => import("~/components/AiPet.vue"));
const api = useApi();
const loading = ref(true);
const stats = ref({ posts: 0, comments: 0, views: 0 });
let idleHandle: number | null = null;
let petIdleHandle: number | null = null;
const showPet = ref(false);

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
    petIdleHandle = window.requestIdleCallback(
      () => {
        showPet.value = true;
      },
      { timeout: 2200 },
    );
  } else {
    idleHandle = window.setTimeout(() => void loadSidebar(), 220);
    petIdleHandle = window.setTimeout(() => {
      showPet.value = true;
    }, 1000);
  }
});

onUnmounted(() => {
  const cancel = (handle: number | null) => {
    if (handle === null) return;
    if ("cancelIdleCallback" in window) window.cancelIdleCallback(handle);
    else window.clearTimeout(handle);
  };
  cancel(idleHandle);
  cancel(petIdleHandle);
});
</script>

<style scoped>
.home-sidebar {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 8px;
  overflow: visible;
}

.side-card,
.footprints {
  position: relative;
  opacity: 0;
  transform: translate3d(10px, 0, 0);
}

.side-card {
  min-height: 94px;
  flex: 0 0 94px;
  padding: 13px 14px 12px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
  border-radius: 8px;
  background: var(--ld-bg-card);
  box-shadow: var(--ui-shadow-soft);
}

.home-sidebar.ready .side-card,
.home-sidebar.ready .footprints,
.home-sidebar.ready .pet-dock {
  animation: side-card-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.home-sidebar.ready .side-card {
  animation-delay: 55ms;
}
.home-sidebar.ready .footprints {
  animation-delay: 85ms;
}
.home-sidebar.ready .pet-dock {
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
  margin-bottom: 12px;
  color: var(--c-text-2);
  font-size: 0.7rem;
  font-weight: 700;
}

.side-card-head > div,
.side-card-head a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.side-card-head > div { flex-direction: column; align-items: flex-start; gap: 2px; }
.side-kicker { color: var(--c-primary); font-family: var(--font-mono); font-size: .44rem; font-weight: 700; }
#home-overview-title { color: var(--c-text); font-size: .72rem; }

.side-card-head a {
  display: grid;
  width: 27px;
  height: 27px;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--c-text-3);
  text-decoration: none;
  font-size: 0.62rem;
  place-items: center;
}

.side-card-head a:hover {
  color: var(--c-primary);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.overview-item {
  position: relative;
  display: grid;
  min-width: 0;
  align-items: end;
  padding: 0 0 0 9px;
  border-left: 2px solid color-mix(in srgb, var(--c-primary) 52%, var(--border));
}

.overview-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.overview-copy strong {
  color: var(--c-text);
  font-family: var(--font-mono);
  font-size: 1rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.overview-copy small {
  color: var(--c-text-3);
  font-size: 0.48rem;
}
.overview-item > i { display: none; }

.pet-dock {
  display: flex;
  height: 92px;
  min-height: 92px;
  flex: 0 0 92px;
  align-items: flex-end;
  justify-content: flex-end;
  border-top: 0;
}

.footprints {
  display: flex;
  min-height: 190px;
  flex: 1 1 190px;
  flex-direction: column;
}

@media (max-height: 680px) and (min-width: 901px) {
  .overview-card { display: none; }
  .footprints { min-height: 170px; }
}

@media (prefers-reduced-motion: reduce) {
  .home-sidebar.ready .side-card,
  .home-sidebar.ready .footprints,
  .home-sidebar.ready .pet-dock {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>

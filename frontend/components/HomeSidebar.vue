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

    <section v-if="latestActivity.length" class="side-card activity-card" aria-labelledby="home-latest-title">
      <div class="side-card-head">
        <span id="home-latest-title"><Icon name="ph:activity-bold" /> 最新动态</span>
        <span class="live-badge" role="status" title="实时更新" aria-label="实时更新"><i class="live-dot" aria-hidden="true" /></span>
      </div>
      <div class="activity-list">
        <NuxtLink v-for="item in latestActivity" :key="`${item.type}:${item.id}`" :to="item.href">
          <span class="overview-icon" :class="`activity-${item.type}`"><Icon :name="item.icon" /></span>
          <span class="activity-copy"><small>{{ item.label }}</small><strong>{{ item.title }}</strong></span>
          <time v-if="item.timestamp" :title="formatTime(item.timestamp)">{{ fromNowText(item.timestamp) }}</time>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

const api = useApi();
const loading = ref(true);
const stats = ref({ posts: 0, comments: 0, views: 0 });
const latestActivity = ref<Array<{ id: string; type: string; label: string; title: string; href: string; icon: string; timestamp?: string | null }>>([]);
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

const TYPE_ICONS: Record<string, string> = {
  post: "ph:article-bold",
  moment: "ph:sparkle-bold",
  album: "ph:images-square-bold",
  library: "ph:books-bold",
  comment: "ph:chat-circle-bold",
  guestbook: "ph:note-pencil-bold",
  like: "ph:heart-bold",
  footprint: "ph:footprints-bold",
};

function compactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function fromNowText(time: string) {
  return dayjs(time).fromNow();
}

function formatTime(time: string) {
  return dayjs(time).format("YYYY-MM-DD HH:mm");
}

async function loadSidebar() {
  try {
    const [overview, activities] = await Promise.all([
      api.get<any>("/stats/overview"),
      api.get<any[]>("/stats/activities", { limit: 5 }),
    ]);
    stats.value = { ...stats.value, ...(overview || {}) };
    latestActivity.value = (activities ?? []).map((item) => ({
      ...item,
      icon: TYPE_ICONS[item.type] ?? "ph:activity-bold",
    }));
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
.live-badge {
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
}
.live-dot {
  position: relative;
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 6px color-mix(in srgb, var(--c-primary) 60%, transparent);
}
.live-dot::after {
  position: absolute;
  inset: -3px;
  border: 1px solid var(--c-primary);
  border-radius: 50%;
  content: "";
  animation: live-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@keyframes live-ping {
  0% {
    transform: scale(0.55);
    opacity: 0.8;
  }
  70%,
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
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

.activity-list {
  display: grid;
  gap: 2px;
}
.activity-list a {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border-radius: 9px;
  color: inherit;
  text-decoration: none;
  transition: background 0.15s ease;
}
.activity-list a:hover {
  background: color-mix(in srgb, var(--c-primary-soft) 46%, transparent);
}
.activity-list .overview-icon {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-color: color-mix(in srgb, var(--act, var(--c-primary)) 16%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--act, var(--c-primary)) 9%, var(--ld-bg-card));
  color: var(--act, var(--c-primary));
  font-size: 0.85rem;
}
.activity-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}
.activity-copy small {
  overflow: hidden;
  color: var(--c-text-3);
  font-size: 0.48rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.activity-copy strong {
  overflow: hidden;
  color: var(--c-text);
  font-size: 0.66rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.activity-list time {
  flex: 0 0 auto;
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.48rem;
  white-space: nowrap;
}
.activity-post {
  --act: #4f8ff7;
}
.activity-moment {
  --act: #f0a04b;
}
.activity-album {
  --act: #34a06e;
}
.activity-library {
  --act: #7a56d6;
}
.activity-comment {
  --act: #4f8ff7;
}
.activity-guestbook {
  --act: #e2703a;
}
.activity-like {
  --act: #e0446c;
}
.activity-footprint {
  --act: #2f9d6b;
}
@media (prefers-reduced-motion: reduce) {
  .home-sidebar.ready .side-card {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .live-dot::after {
    animation: none;
  }
  .activity-list a {
    transition: none;
  }
}
</style>

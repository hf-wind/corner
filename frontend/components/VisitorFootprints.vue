<template>
  <section class="footprints" aria-label="最近访客足迹">
    <div class="fp-head">
      <div class="fp-title-wrap">
        <span class="fp-kicker">FOOTPRINTS · 最近足迹</span>
        <h4 class="fp-title"><Icon name="ph:footprints-bold" /> 旅人来过的痕迹</h4>
      </div>
      <button
        type="button"
        class="fp-refresh"
        :title="refreshing ? '刷新中' : '刷新足迹'"
        :aria-label="refreshing ? '刷新中' : '刷新足迹'"
        @click="load"
      >
        <Icon :name="refreshing ? 'ph:circle-notch-bold' : 'ph:arrows-clockwise-bold'" :spin="refreshing" />
      </button>
    </div>

    <div v-if="loading && !items.length" class="fp-state">
      <Icon name="ph:footprints" />
      <span>正在打捞足迹…</span>
    </div>

    <div v-else-if="!items.length" class="fp-state">
      <Icon name="ph:footprints" />
      <span>还没有访客留下足迹</span>
    </div>

    <ol v-else class="fp-list">
      <li v-for="visit in items" :key="visit.id" class="fp-item">
        <span class="fp-mark" :class="`fp-mark-${visit.pageType}`" aria-hidden="true">
          <Icon :name="pageIcon(visit.pageType)" />
        </span>
        <div class="fp-copy">
          <p class="fp-line">
            <strong :title="visit.nickname">{{ visit.nickname }}</strong>
            <em v-if="visit.region" class="fp-region" :title="`来自 ${visit.region}`">
              <Icon name="ph:map-pin-bold" />{{ visit.region }}
            </em>
            <i class="fp-sep" aria-hidden="true" />
            <span class="fp-action-text">{{ pageLabel(visit.pageType) }}</span>
          </p>
          <p v-if="visit.targetTitle" class="fp-target" :title="visit.targetTitle">{{ visit.targetTitle }}</p>
        </div>
        <time class="fp-time" :title="formatTime(visit.time)">{{ timeLabel(visit.time) }}</time>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { useVisitor } from "~/composables/useVisitor";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

const { fetchRecent } = useVisitor();
const route = useRoute();

const items = ref<Array<{ id: string; nickname: string; pageType: string; targetTitle?: string | null; region?: string | null; time: string }>>([]);
const loading = ref(false);
const refreshing = ref(false);

const PAGE_ICONS: Record<string, string> = {
  home: "ph:house-bold",
  post: "ph:article-bold",
  album: "ph:images-square-bold",
  "memory-map": "ph:map-trifold-bold",
  "memory-graph": "ph:graph-bold",
  guestbook: "ph:chat-circle-dots-bold",
  journey: "ph:path-bold",
  page: "ph:compass-bold",
};

const PAGE_LABELS: Record<string, string> = {
  home: "到访首页",
  post: "读了一篇文章",
  album: "翻看了相册",
  "memory-map": "游览时光地图",
  "memory-graph": "仰望时光星图",
  guestbook: "在留言板驻足",
  journey: "沿着航线旅行",
  page: "浏览一个角落",
};

const pageIcon = (type: string) => PAGE_ICONS[type] ?? "ph:compass-bold";
const pageLabel = (type: string) => PAGE_LABELS[type] ?? "浏览一个角落";

function timeLabel(time: string) {
  return dayjs(time).fromNow();
}

function formatTime(time: string) {
  return dayjs(time).format("YYYY-MM-DD HH:mm");
}

async function load() {
  if (loading.value) return;
  loading.value = true;
  refreshing.value = true;
  try {
    const data = await fetchRecent();
    items.value = Array.isArray(data) ? data : [];
  } catch {
    /* 静默失败，保持旧数据 */
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

watch(
  () => route.path,
  () => load(),
);

onMounted(() => load());
</script>

<style scoped>
.footprints {
  padding: 17px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 14px;
  background: var(--ld-bg-card);
  box-shadow: 0 5px 18px color-mix(in srgb, var(--ld-shadow) 25%, transparent);
}
.fp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 11px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
}
.fp-title-wrap {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}
.fp-kicker {
  color: var(--c-text-3);
  font-family: var(--font-accent);
  font-size: 0.44rem;
  font-weight: 760;
  letter-spacing: 0.16em;
}
.fp-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--c-text);
  font-size: 0.72rem;
  font-weight: 700;
}
.fp-title > svg {
  color: var(--c-primary);
  font-size: 0.82rem;
}
.fp-refresh {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  border-radius: 8px;
  background: var(--c-bg-1);
  color: var(--c-text-3);
  cursor: pointer;
  font-size: 0.76rem;
  place-items: center;
  transition: color 0.15s, background 0.15s, transform 0.15s, border-color 0.15s;
}
.fp-refresh:hover {
  border-color: color-mix(in srgb, var(--c-primary) 32%, var(--border));
  background: var(--c-primary-soft);
  color: var(--c-primary);
  transform: rotate(18deg);
}
.fp-state {
  display: flex;
  min-height: 108px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--c-text-3);
  font-size: 0.62rem;
}
.fp-state > svg {
  font-size: 1.3rem;
  opacity: 0.65;
}

.fp-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.fp-item {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 9px;
  padding: 7px 8px;
  border-radius: 10px;
  transition: background 0.16s ease, transform 0.16s ease;
}
.fp-item:hover {
  background: color-mix(in srgb, var(--c-primary-soft) 40%, transparent);
  transform: translateX(2px);
}
.fp-mark {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border: 1px solid color-mix(in srgb, var(--mark, var(--c-primary)) 20%, transparent);
  border-radius: 9px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--mark, var(--c-primary)) 26%, var(--ld-bg-card)),
    color-mix(in srgb, var(--mark, var(--c-primary)) 8%, var(--ld-bg-card))
  );
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 14%, transparent);
  color: var(--mark, var(--c-primary));
  font-size: 0.92rem;
  place-items: center;
}
.fp-mark-home { --mark: #4f8ff7; }
.fp-mark-post { --mark: #7a56d6; }
.fp-mark-album { --mark: #34a06e; }
.fp-mark-memory-map { --mark: #e2703a; }
.fp-mark-memory-graph { --mark: #b48bf2; }
.fp-mark-guestbook { --mark: #f08bb4; }
.fp-mark-journey { --mark: #f0a04b; }
.fp-mark-page { --mark: #3b6ee8; }
.fp-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}
.fp-line {
  display: flex;
  min-width: 0;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 5px;
  margin: 0;
  color: var(--c-text-3);
  font-size: 0.58rem;
}
.fp-line strong {
  color: var(--c-text);
  font-size: 0.68rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}
.fp-sep {
  width: 3px;
  height: 3px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--c-text-3);
  opacity: 0.55;
}
.fp-region {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 100%;
  padding: 1px 7px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 22%, transparent);
  border-radius: 99px;
  background: color-mix(in srgb, var(--c-primary) 10%, var(--ld-bg-card));
  color: color-mix(in srgb, var(--c-primary) 78%, var(--c-text-2));
  font-size: 0.52rem;
  font-style: normal;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.fp-region > svg { font-size: 0.5rem; }
.fp-action-text {
  overflow-wrap: anywhere;
}
.fp-target {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.6rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.fp-time {
  flex: 0 0 auto;
  align-self: flex-start;
  margin-top: 4px;
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.46rem;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .fp-item,
  .fp-refresh {
    transition: none;
  }
}
</style>

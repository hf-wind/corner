<template>
  <section class="footprints" aria-label="最近访客足迹">
    <header class="fp-head">
      <div>
        <span class="fp-kicker">RECENT ARRIVALS</span>
        <h4>欢迎路过风隅</h4>
        <p>愿你在这里，遇见一段刚好的文字。</p>
      </div>
      <button
        type="button"
        class="fp-refresh"
        :title="refreshing ? '刷新中' : '刷新足迹'"
        :aria-label="refreshing ? '刷新中' : '刷新足迹'"
        :disabled="refreshing"
        @click="load"
      >
        <Icon :name="refreshing ? 'ph:circle-notch-bold' : 'ph:arrows-clockwise-bold'" :spin="refreshing" />
      </button>
    </header>

    <div v-if="loading && !items.length" class="fp-state">
      <Icon name="ph:footprints" />
      <span>正在读取最近的足迹</span>
    </div>

    <div v-else-if="!items.length" class="fp-state">
      <Icon name="ph:wind-bold" />
      <span>静候下一位途经这里的朋友</span>
    </div>

    <ol v-else :key="listKey" class="fp-list">
      <li
        v-for="(visit, index) in items"
        :key="visit.id"
        class="fp-item"
        :style="{ '--fp-delay': itemDelay(index) }"
      >
        <span class="fp-avatar" aria-hidden="true">
          <template v-if="visit.nickname?.trim()">{{ visit.nickname.trim().charAt(0) }}</template>
          <Icon v-else name="ph:footprints-bold" />
        </span>
        <div class="fp-copy">
          <p :title="visitorLabel(visit)">{{ visitorLabel(visit) }}</p>
          <div class="fp-meta">
            <span v-if="visit.region"><Icon name="ph:map-pin-bold" />{{ visit.region }}</span>
            <span v-if="visit.device"><Icon :name="deviceIcon(visit.device)" />{{ deviceLabel(visit.device) }}</span>
          </div>
        </div>
        <time :datetime="visit.time" :title="formatTime(visit.time)">{{ timeLabel(visit.time) }}</time>
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

type RecentVisit = {
  id: string;
  nickname: string;
  region?: string | null;
  device?: string | null;
  time: string;
};

const { fetchRecent } = useVisitor();
const items = ref<RecentVisit[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const listKey = ref(0);
let loadSeq = 0;
let idleHandle: number | null = null;

function visitorLabel(visit: RecentVisit) {
  const nickname = visit.nickname?.trim();
  return nickname || "途经风隅的旅人";
}

function itemDelay(index: number) {
  return `${index * 44}ms`;
}

const DEVICE_META: Record<string, { icon: string; label: string }> = {
  mobile: { icon: "ph:device-mobile-bold", label: "手机" },
  tablet: { icon: "ph:device-tablet-bold", label: "平板" },
  desktop: { icon: "ph:desktop-bold", label: "桌面端" },
};

function deviceIcon(device: string) {
  return DEVICE_META[device]?.icon ?? "ph:devices-bold";
}

function deviceLabel(device: string) {
  return DEVICE_META[device]?.label ?? device;
}

function timeLabel(time: string) {
  return dayjs(time).fromNow();
}

function formatTime(time: string) {
  return dayjs(time).format("YYYY-MM-DD HH:mm");
}

async function load() {
  if (loading.value) return;
  loading.value = true;
  refreshing.value = items.value.length > 0;
  const seq = ++loadSeq;
  try {
    const data = await fetchRecent();
    if (seq !== loadSeq) return;
    items.value = (Array.isArray(data) ? data : []).slice(0, 3);
    listKey.value += 1;
  } catch {
    // Supplementary content keeps its last successful state on network failure.
  } finally {
    if (seq === loadSeq) {
      loading.value = false;
      refreshing.value = false;
    }
  }
}

onMounted(() => {
  if ("requestIdleCallback" in window) {
    idleHandle = window.requestIdleCallback(() => void load(), { timeout: 1400 });
  } else {
    idleHandle = window.setTimeout(() => void load(), 300);
  }
});
onUnmounted(() => {
  if (idleHandle === null) return;
  if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
  else window.clearTimeout(idleHandle);
});
</script>

<style scoped>
.footprints {
  display: flex;
  min-height: 190px;
  flex-direction: column;
  padding: 15px 14px 10px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-radius: 8px;
  background: var(--ld-bg-card);
  box-shadow: var(--ui-shadow-soft);
}
.fp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 0 1px 13px;
  border-bottom: 1px solid var(--border);
}
.fp-head > div { min-width: 0; }
.fp-kicker {
  display: block;
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: .46rem;
  font-weight: 700;
}
.fp-head h4 {
  margin: 5px 0 0;
  color: var(--c-text);
  font-size: .82rem;
}
.fp-head p {
  margin: 4px 0 0;
  color: var(--c-text-3);
  font-size: .54rem;
  line-height: 1.45;
}
.fp-refresh {
  display: grid;
  width: 29px;
  height: 29px;
  flex: 0 0 29px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: transparent;
  color: var(--c-text-3);
  cursor: pointer;
  place-items: center;
  transition: border-color .2s ease, color .2s ease, transform .2s ease;
}
.fp-refresh:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--c-primary) 45%, var(--border));
  color: var(--c-primary);
  transform: translateY(-1px);
}
.fp-refresh:focus-visible { outline: 2px solid var(--c-primary); outline-offset: 2px; }
.fp-state {
  display: grid;
  min-height: 150px;
  flex: 1;
  align-content: center;
  justify-items: center;
  gap: 8px;
  color: var(--c-text-3);
  font-size: .6rem;
}
.fp-state > svg { color: var(--c-primary); font-size: 1.25rem; }
.fp-list {
  display: grid;
  flex: 1;
  align-content: center;
  gap: 3px;
  margin: 0;
  padding: 5px 0 0;
  list-style: none;
}
.fp-item {
  display: grid;
  min-width: 0;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 45px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  animation: fp-item-in .42s var(--ui-ease-out) both;
  animation-delay: var(--fp-delay);
}
.fp-item:last-child { border-bottom: 0; }
.fp-avatar {
  display: grid;
  width: 28px;
  height: 28px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 22%, var(--border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--c-primary-soft) 62%, var(--ld-bg-card));
  color: var(--c-primary);
  font-size: .62rem;
  font-weight: 750;
  place-items: center;
}
.fp-copy { min-width: 0; }
.fp-copy > p {
  margin: 0;
  overflow: hidden;
  color: var(--c-text);
  font-size: .62rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fp-meta {
  display: flex;
  min-width: 0;
  gap: 7px;
  margin-top: 2px;
  overflow: hidden;
  color: var(--c-text-3);
  font-size: .45rem;
}
.fp-meta span { display: inline-flex; min-width: 0; align-items: center; gap: 3px; white-space: nowrap; }
.fp-meta span:first-child { overflow: hidden; text-overflow: ellipsis; }
.fp-meta svg { flex: none; font-size: .55rem; }
.fp-item > time {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: .44rem;
  white-space: nowrap;
}
@media (max-height: 680px) and (min-width: 901px) {
  .footprints { min-height: 170px; padding-top: 12px; }
  .fp-head { padding-bottom: 9px; }
  .fp-head p { display: none; }
  .fp-item { min-height: 39px; }
}
@keyframes fp-item-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .fp-item, .fp-refresh { animation: none; transition: none; }
}
</style>

<template>
  <section class="footprints" aria-label="最近访客足迹">
    <div class="fp-head">
      <div class="fp-title-wrap">
        <span class="fp-kicker">VISITOR WALL</span>
        <h4 class="fp-title">足迹墙</h4>
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
      <Icon name="ph:footprints" class="fp-state-icon" />
      <span>正在打捞足迹…</span>
    </div>

    <div v-else-if="!items.length" class="fp-state">
      <Icon name="ph:footprints" class="fp-state-icon" />
      <span>还没有伙伴留下足迹</span>
    </div>

    <ol v-else :key="listKey" class="fp-list">
      <li
        v-for="(visit, i) in items"
        :key="visit.id"
        class="fp-item"
        :style="{ '--fp-delay': itemDelay(i) }"
      >
        <span class="fp-avatar" :style="avatarStyle(visit)" aria-hidden="true">
          {{ avatarChar(visit) }}
        </span>
        <p class="fp-line" :title="greeting(visit)">{{ greeting(visit) }}</p>
        <div class="fp-tags">
          <span v-if="uaLabel(visit)" class="fp-tag fp-tag-ua" :title="uaLabel(visit)">{{ uaLabel(visit) }}</span>
          <span v-if="visit.device" class="fp-tag fp-tag-device" :title="deviceLabel(visit.device)">
            <Icon :name="deviceIcon(visit.device)" />
            <span>{{ deviceLabel(visit.device) }}</span>
          </span>
          <span class="fp-tag fp-tag-time" :title="formatTime(visit.time)">
            <Icon name="ph:clock-bold" />
            <time>{{ timeLabel(visit.time) }}</time>
          </span>
        </div>
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

const items = ref<
  Array<{
    id: string;
    nickname: string;
    region?: string | null;
    browser?: string | null;
    os?: string | null;
    device?: string | null;
    time: string;
  }>
>([]);
const loading = ref(false);
const refreshing = ref(false);
const listKey = ref(0);
let loadSeq = 0;

function greeting(visit: { nickname?: string; region?: string | null }) {
  if (visit.region) return `来自 ${visit.region} 的伙伴`;
  if (visit.nickname?.trim()) return `${visit.nickname} 到访`;
  return "来自远方的伙伴";
}

function avatarChar(visit: { nickname?: string; region?: string | null }) {
  if (visit.nickname?.trim()) return visit.nickname.trim().charAt(0);
  return "客";
}

function avatarStyle(visit: { id: string; nickname?: string }): Record<string, string> {
  const seed = String(visit.id || visit.nickname || "guest");
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  const sat = 46 + (hash % 3) * 12;
  const light = 62 + ((hash >>> 4) % 3) * 6;
  return {
    background: `linear-gradient(145deg, hsl(${hue} ${sat}% ${light + 7}%), hsl(${hue} ${sat - 16}% ${light - 10}%))`,
    color: `hsl(${hue} 55% 22%)`,
    "--fp-ring": `hsl(${hue} ${sat}% ${light + 2}%)`,
  } as Record<string, string>;
}

function itemDelay(i: number) {
  return `${Math.min(i * 45, 405)}ms`;
}

const DEVICE_META: Record<string, { icon: string; label: string }> = {
  mobile: { icon: "ph:device-mobile-bold", label: "手机" },
  tablet: { icon: "ph:device-tablet-bold", label: "平板" },
  desktop: { icon: "ph:desktop-bold", label: "桌面" },
};

function uaLabel(visit: { browser?: string | null; os?: string | null }) {
  const parts = [visit.browser, visit.os].filter(Boolean);
  return parts.length ? parts.join(" · ") : "";
}

function deviceIcon(device: string) {
  return DEVICE_META[device]?.icon ?? "ph:device-mobile-bold";
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
  refreshing.value = true;
  const seq = ++loadSeq;
  try {
    const data = await fetchRecent();
    if (seq !== loadSeq) return;
    items.value = Array.isArray(data) ? data : [];
    listKey.value += 1;
  } catch {
    /* 静默失败，保持旧数据 */
  } finally {
    if (seq === loadSeq) {
      loading.value = false;
      refreshing.value = false;
    }
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
  display: flex;
  min-height: 0;
  flex-direction: column;
  padding: 12px 12px 10px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 14px;
  background:
    radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--c-primary-soft) 55%, transparent) 0%, transparent 55%),
    var(--ld-bg-card);
  box-shadow: 0 5px 18px color-mix(in srgb, var(--ld-shadow) 25%, transparent);
}
.fp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 9px;
  padding-bottom: 9px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
}
.fp-title-wrap {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}
.fp-kicker {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--c-text-3);
  font-family: var(--font-accent);
  font-size: 0.4rem;
  font-weight: 760;
  letter-spacing: 0.18em;
}
.fp-kicker::before {
  content: "";
  display: inline-block;
  width: 5px;
  height: 5px;
  flex: 0 0 5px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 7px color-mix(in srgb, var(--c-primary) 70%, transparent);
}
.fp-title {
  margin: 0;
  background: linear-gradient(
    120deg,
    var(--c-primary) 10%,
    color-mix(in srgb, var(--c-primary) 45%, #9ec5ff) 90%
  );
  background-clip: text;
  color: transparent;
  font-size: 0.74rem;
  font-weight: 760;
  letter-spacing: 0.02em;
}
.fp-refresh {
  position: relative;
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 20%, var(--border));
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-primary-soft) 42%, transparent);
  color: var(--c-primary);
  cursor: pointer;
  font-size: 0.7rem;
  place-items: center;
  transition:
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.fp-refresh > svg {
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
.fp-refresh:hover {
  border-color: color-mix(in srgb, var(--c-primary) 45%, var(--border));
  background: color-mix(in srgb, var(--c-primary-soft) 92%, transparent);
  box-shadow: 0 3px 10px color-mix(in srgb, var(--c-primary) 26%, transparent);
  transform: translateY(-1px);
}
.fp-refresh:hover > svg {
  transform: rotate(200deg);
}
.fp-refresh:active {
  transform: translateY(0) scale(0.94);
}
.fp-refresh:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--c-primary) 45%, transparent);
  outline-offset: 2px;
}
.fp-state {
  display: flex;
  min-height: 96px;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--c-text-3);
  font-size: 0.6rem;
  letter-spacing: 0.02em;
}
.fp-state-icon {
  font-size: 1.25rem;
  opacity: 0.55;
  animation: fp-float 2.6s ease-in-out infinite;
}
@keyframes fp-float {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.55;
  }
  50% {
    transform: translateY(-3px);
    opacity: 0.85;
  }
}

.fp-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  margin: 0;
  padding: 2px 4px 0 0;
  overflow-y: auto;
  list-style: none;
  scrollbar-color: color-mix(in srgb, var(--border) 90%, transparent) transparent;
  scrollbar-width: thin;
}
.fp-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 6px 7px;
  border-radius: 10px;
  animation: fp-item-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--fp-delay, 0ms);
}
@keyframes fp-item-in {
  from {
    opacity: 0;
    transform: translateY(7px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.fp-avatar {
  position: relative;
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 50%;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 35%),
    inset 0 -1px 2px rgb(0 0 0 / 10%),
    0 2px 7px color-mix(in srgb, var(--ld-shadow) 20%, transparent);
  font-size: 0.66rem;
  font-weight: 750;
  place-items: center;
}
.fp-avatar::after {
  content: "";
  position: absolute;
  inset: -1.5px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--fp-ring, var(--c-primary)) 42%, transparent);
  pointer-events: none;
}
.fp-line {
  min-width: 0;
  flex: 1;
  margin: 0;
  overflow: hidden;
  color: var(--c-text);
  font-size: 0.64rem;
  font-weight: 650;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fp-tags {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}
.fp-tag {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 3px;
  color: var(--c-text-3);
  font-size: 0.5rem;
  line-height: 1;
  white-space: nowrap;
}
.fp-tag > svg {
  flex: 0 0 auto;
  font-size: 0.62rem;
}
.fp-tag-ua {
  max-width: 84px;
  overflow: hidden;
  color: color-mix(in srgb, var(--c-text-3) 82%, transparent);
  font-family: var(--font-mono);
  font-size: 0.45rem;
  text-overflow: ellipsis;
}
.fp-tag-device > svg {
  color: color-mix(in srgb, var(--c-primary) 78%, transparent);
}
.fp-tag-device {
  color: var(--c-text-3);
}
.fp-tag-time {
  color: color-mix(in srgb, var(--c-text-3) 88%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .fp-refresh,
  .fp-refresh > svg,
  .fp-item,
  .fp-state-icon {
    animation: none;
    transition: none;
  }
}
</style>

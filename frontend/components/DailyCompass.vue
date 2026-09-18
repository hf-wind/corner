<template>
  <section
    class="daily-compass"
    :class="{ 'is-ready': ready }"
    aria-label="今日风向标"
  >
    <Transition name="compass-swap" mode="out-in">
      <AppLink
        v-if="item"
        :key="item.slug"
        :to="item.href"
        class="compass-card"
      >
        <span class="compass-veil" aria-hidden="true" />
        <img
          v-if="item.image"
          :src="mediaUrl(item.image)"
          alt=""
          class="compass-image"
          loading="lazy"
        />

        <div class="compass-copy">
          <header class="compass-head">
            <span class="compass-eyebrow">DAILY WIND · 今日风向标</span>
            <span class="compass-no">No.{{ dayNumber }}</span>
          </header>

          <span class="compass-kind">{{ kindLabel(item.type) }}</span>
          <h3 class="compass-title">{{ item.title }}</h3>
          <p v-if="item.reason" class="compass-reason">
            <i aria-hidden="true">“</i>{{ item.reason
            }}<i aria-hidden="true">”</i>
          </p>

          <footer class="compass-foot">
            <span class="compass-go">
              {{ goLabel(item.type) }}
              <Icon name="ph:arrow-up-right-bold" />
            </span>
            <span class="compass-date">{{ dateLabel }}</span>
          </footer>

          <span class="compass-progress" aria-hidden="true">
            <i :style="{ transform: `scaleX(${dayProgress})` }" />
          </span>
        </div>
      </AppLink>
    </Transition>

    <div v-if="!item && ready" class="compass-empty">
      <Icon name="ph:wind-bold" />
      <span>今天的风还没有带来推荐</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

interface DailyItem {
  type: string;
  slug: string;
  title: string;
  summary: string;
  image: string;
  href: string;
  reason: string;
  pickedBy: string;
  date: string;
}

const api = useApi();
const { mediaUrl } = useMediaUrl();
const item = ref<DailyItem | null>(null);
const ready = ref(false);

const now = new Date();
const dayOfYear = Math.floor(
  (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
);
const dayNumber = String(dayOfYear).padStart(3, "0");
const dateLabel = `${now.getMonth() + 1} 月 ${now.getDate()} 日`;
const dayProgress = Math.min(
  1,
  Math.max(0.02, (now.getHours() * 3600 + now.getMinutes() * 60) / 86400),
);

const KIND_LABELS: Record<string, string> = {
  post: "今日 · 读",
  moment: "今日 · 瞬间",
  library: "今日 · 书影",
  album: "今日 · 相簿",
};
const GO_LABELS: Record<string, string> = {
  post: "阅读全文",
  moment: "看看这则瞬间",
  library: "翻开这份记录",
  album: "走进这册相簿",
};

function kindLabel(type: string) {
  return KIND_LABELS[type] || "今日 · 推荐";
}

function goLabel(type: string) {
  return GO_LABELS[type] || "去看看";
}

onMounted(async () => {
  try {
    const result = await api.get<DailyItem>("/stats/daily-featured");
    if (result && result.slug) item.value = result;
  } catch {
    // 风向标是补充内容，失败时保持安静
  } finally {
    ready.value = true;
  }
});
</script>

<style scoped>
.daily-compass {
  position: relative;
  min-height: 252px;
}

.compass-card {
  position: relative;
  display: flex;
  min-height: 252px;
  align-items: flex-end;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: var(--ui-radius-hero);
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--c-primary-soft) 46%, var(--ld-bg-card)),
    var(--ld-bg-card) 58%
  );
  box-shadow: var(--ui-shadow-panel);
  isolation: isolate;
  text-decoration: none;
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.4s ease;
}

.is-ready .compass-card {
  opacity: 1;
  transform: none;
}

@media (hover: hover) {
  .compass-card:hover {
    box-shadow: 0 22px 52px
      color-mix(in srgb, var(--ld-shadow) 44%, transparent);
  }

  .compass-card:hover .compass-image {
    transform: scale(1.035);
  }
}

.compass-veil {
  position: absolute;
  z-index: 1;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      transparent 30%,
      color-mix(in srgb, var(--ld-bg-card) 92%, transparent) 78%
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--ld-bg-card) 78%, transparent),
      transparent 55%
    );
  pointer-events: none;
}

.compass-image {
  position: absolute;
  z-index: 0;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.compass-copy {
  position: relative;
  z-index: 2;
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 6px;
  padding: 22px 26px 20px;
}

.compass-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.compass-eyebrow {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.54rem;
  font-weight: 750;
  letter-spacing: 0.2em;
}

.compass-no {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
}

.compass-kind {
  color: var(--c-text-2);
  font-family: var(--font-serif);
  font-size: 0.62rem;
  letter-spacing: 0.24em;
}

.compass-title {
  margin: 0;
  color: var(--c-text);
  font-family: var(--font-heading);
  font-size: clamp(1.32rem, 2.4vw, 1.8rem);
  font-weight: 640;
  line-height: 1.32;
  letter-spacing: 0.02em;
}

.compass-reason {
  margin: 4px 0 0;
  max-width: 560px;
  color: var(--c-text-2);
  font-family: var(--font-summary);
  font-size: 0.76rem;
  line-height: 1.8;
  letter-spacing: 0.03em;
}

.compass-reason i {
  margin: 0 3px;
  color: var(--c-primary);
  font-family: Georgia, serif;
  font-style: normal;
  opacity: 0.7;
}

.compass-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 9px;
}

.compass-go {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--c-primary);
  font-size: 0.7rem;
  font-weight: 680;
  letter-spacing: 0.06em;
  transition: gap 0.25s ease;
}

@media (hover: hover) {
  .compass-card:hover .compass-go {
    gap: 11px;
  }
}

.compass-date {
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.14em;
  font-variant-numeric: tabular-nums;
}

/* 当日时间进度线：代替轮播圆点 */
.compass-progress {
  position: absolute;
  right: 30px;
  bottom: 14px;
  left: 30px;
  height: 2px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--border) 74%, transparent);
  overflow: hidden;
}

.compass-progress > i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--c-primary) 55%, transparent),
    var(--c-primary)
  );
  transform-origin: left center;
  transform: scaleX(0.1);
  transition: transform 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.25s;
}

.compass-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 252px;
  border: 1px dashed color-mix(in srgb, var(--border) 78%, transparent);
  border-radius: var(--ui-radius-hero);
  color: var(--c-text-3);
  font-size: 0.72rem;
}

.compass-empty :deep(svg) {
  font-size: 1.3rem;
  color: var(--c-primary);
  opacity: 0.6;
}

.compass-swap-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}

.compass-swap-leave-active {
  transition: opacity 0.22s ease;
}

.compass-swap-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.compass-swap-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .daily-compass,
  .compass-card,
  .compass-empty {
    min-height: 218px;
  }

  .compass-copy {
    padding: 18px 18px 16px;
  }

  .compass-title {
    font-size: 1.3rem;
  }

  .compass-progress {
    right: 18px;
    bottom: 10px;
    left: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .compass-card,
  .compass-image,
  .compass-progress > i {
    transition: none;
  }
}
</style>

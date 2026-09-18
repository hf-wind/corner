<template>
  <div class="home-sidebar ready">
    <WeatherClock />

    <!-- 最近足迹 -->
    <section class="side-card footprints-card" aria-label="最近足迹">
      <header class="side-head">
        <span class="side-kicker">PASSING WINDS</span>
        <span class="side-title">最近足迹</span>
      </header>
      <ul v-if="visitors.length" class="footprint-list">
        <li
          v-for="(visitor, index) in visitors"
          :key="index"
          class="footprint-item"
        >
          <i class="footprint-dot" aria-hidden="true" />
          <span class="footprint-place"
            >欢迎来自{{ regionName(visitor.region) }}</span
          >
          <span class="footprint-device" :title="visitor.device || '未知设备'"
            ><Icon :name="deviceIcon(visitor.device)"
          /></span>
          <span
            class="footprint-device"
            :title="visitor.browser || '未知浏览器'"
            ><Icon :name="browserIcon(visitor.browser)"
          /></span>
          <span class="footprint-greeting">{{
            visitorGreeting(visitor, index)
          }}</span>
          <time>{{ fromNow(visitor.at) }}</time>
        </li>
      </ul>
      <p v-else class="footprint-empty">风还未带来旅人的消息</p>
    </section>

    <!-- 最近动态 -->
    <section class="side-card activity-card" aria-label="最近动态">
      <header class="side-head">
        <span class="side-kicker">MOMENTS AGO</span>
        <span class="side-title">最近动态</span>
      </header>
      <ul v-if="activities.length" class="activity-list">
        <li
          v-for="activity in activities"
          :key="activity.id + activity.type"
          class="activity-item"
        >
          <span class="activity-icon" :class="`is-${activity.type}`">
            <Icon :name="activityIcon(activity.type)" />
          </span>
          <AppLink :to="activity.href" class="activity-copy">
            <b>{{ activityLabel(activity.type) }}</b>
            <span>{{ activity.title }}</span>
          </AppLink>
          <time>{{ fromNow(activity.timestamp) }}</time>
        </li>
      </ul>
      <p v-else class="footprint-empty">这里还没有新的故事</p>
    </section>

    <!-- 一言 -->
    <section class="side-card hitokoto-card" aria-label="一言">
      <span class="hitokoto-mark" aria-hidden="true">“</span>
      <Transition name="hitokoto-fade" mode="out-in">
        <p :key="hitokoto.text" class="hitokoto-text">{{ hitokoto.text }}</p>
      </Transition>
      <footer>
        <span>—— {{ hitokoto.from || "一言" }}</span>
        <button
          type="button"
          title="换一句"
          aria-label="换一句"
          @click="nextHitokoto"
        >
          <Icon name="ph:arrows-clockwise-bold" />
        </button>
      </footer>
    </section>

    <BrowserOnly>
      <div class="pet-dock" aria-label="AI 伙伴">
        <AiPet v-if="showPet" docked mode="home" />
      </div>
    </BrowserOnly>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from "vue";

const AiPet = defineAsyncComponent(() => import("@/components/AiPet.vue"));
const api = useApi();
const { state: homePreload } = useHomePreload();
const { identify, fetchRecent } = useVisitor();
const showPet = ref(false);

interface ActivityItem {
  id: string;
  type: string;
  label: string;
  title: string;
  href: string;
  timestamp: string | null;
}

const visitors = ref<
  Array<{
    nickname: string;
    region: string | null;
    browser: string | null;
    os: string | null;
    device: string | null;
    at: string;
  }>
>([]);
const activities = ref<ActivityItem[]>([]);
const hitokoto = ref({
  text: "把日子过成诗，把风声听成歌。",
  from: "风隅随笔",
});

const LOCAL_QUOTES = [
  { text: "山风会替你记住，你来过这里。", from: "风隅随笔" },
  { text: "慢一点也没关系，风一直在。", from: "风隅随笔" },
  { text: "读过的书、走过的路，都会悄悄变成你的一部分。", from: "风隅随笔" },
  { text: "生活明朗，万物可爱，人间值得。", from: "人间值得" },
  { text: "凡是过往，皆为序章。", from: "莎士比亚" },
];

const activityMeta: Record<string, { icon: string; label: string }> = {
  post: { icon: "ph:article-bold", label: "发布了文章" },
  moment: { icon: "ph:sparkle-bold", label: "新增了瞬间" },
  album: { icon: "ph:images-square-bold", label: "整理了相册" },
  library: { icon: "ph:books-bold", label: "收录了书影" },
  comment: { icon: "ph:chat-circle-dots-bold", label: "一条回应" },
  guestbook: { icon: "ph:chat-teardrop-text-bold", label: "墙上的新留言" },
  like: { icon: "ph:heart-bold", label: "收到一次点赞" },
};

function activityIcon(type: string) {
  return activityMeta[type]?.icon || "ph:sparkle-bold";
}

function activityLabel(type: string) {
  return activityMeta[type]?.label || "新动态";
}

const GREETINGS = [
  "到此一游",
  "循风而来",
  "来此小憩",
  "留下足迹",
  "与风相逢",
  "路过风隅",
];
function regionName(region: string | null | undefined) {
  if (!region) return "远方";
  const parts = region.split(/[·,，/\s]+/).filter(Boolean);
  return parts.at(-1)?.replace(/市$/, "") || "远方";
}
function visitorGreeting(
  visitor: {
    region: string | null;
    browser: string | null;
    device: string | null;
  },
  index: number,
) {
  const seed = `${visitor.region || ""}${visitor.browser || ""}${visitor.device || ""}${index}`;
  const hash = [...seed].reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
  return GREETINGS[hash % GREETINGS.length];
}
function deviceIcon(device: string | null) {
  return /手机/i.test(device || "")
    ? "ph:device-mobile-bold"
    : /平板/i.test(device || "")
      ? "ph:device-tablet-bold"
      : "ph:desktop-bold";
}
function browserIcon(browser: string | null) {
  if (/Chrome/i.test(browser || "")) return "ph:google-chrome-logo-bold";
  if (/Firefox/i.test(browser || "")) return "ph:firefox-logo-bold";
  if (/Safari/i.test(browser || "")) return "ph:safari-logo-bold";
  if (/Edge/i.test(browser || "")) return "ph:microsoft-edge-logo-bold";
  return "ph:browser-bold";
}

function fromNow(value: string | null) {
  if (!value) return "";
  const at = new Date(value).getTime();
  const diff = Date.now() - at;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(at);
}

async function fetchHitokoto() {
  try {
    const response = await fetch(
      "https://v1.hitokoto.cn/?c=i&c=k&c=d&max_length=28",
      {
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) throw new Error("hitokoto unavailable");
    const data = await response.json();
    if (data?.hitokoto) {
      hitokoto.value = { text: data.hitokoto, from: data.from || "" };
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function nextHitokoto() {
  void fetchHitokoto().then((ok) => {
    if (!ok) {
      const current = hitokoto.value.text;
      const next =
        LOCAL_QUOTES[Math.floor(Math.random() * LOCAL_QUOTES.length)];
      if (next.text !== current) hitokoto.value = next;
    }
  });
}

async function loadSidebar() {
  try {
    if (homePreload.value.visitors) {
      visitors.value = homePreload.value.visitors.slice(0, 5);
    } else {
      visitors.value = (await fetchRecent(5)).slice(0, 5);
    }
    const acts = await api.get<ActivityItem[]>(
      "/stats/activities",
      { limit: 5 },
      { signal: AbortSignal.timeout(9000) },
    );
    activities.value = (acts || []).slice(0, 5);
  } catch {
    // 侧栏是补充内容，失败时保持页面可用
  }
}

onMounted(() => {
  void identify();
  void loadSidebar();
  void fetchHitokoto();
  const idle = (callback: () => void, timeout: number) => {
    if ("requestIdleCallback" in window)
      window.requestIdleCallback(callback, { timeout });
    else window.setTimeout(callback, timeout);
  };
  idle(() => {
    showPet.value = true;
  }, 2200);
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

.side-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 14px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
  border-radius: 10px;
  background: var(--ld-bg-card);
  box-shadow: var(--ui-shadow-soft);
  opacity: 0;
  transform: translate3d(10px, 0, 0);
}

.home-sidebar.ready .side-card,
.home-sidebar.ready .pet-dock {
  animation: side-card-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.home-sidebar.ready .footprints-card {
  animation-delay: 55ms;
}
.home-sidebar.ready .activity-card {
  animation-delay: 85ms;
}
.home-sidebar.ready .hitokoto-card {
  animation-delay: 110ms;
}
.home-sidebar.ready .pet-dock {
  animation-delay: 140ms;
}

@keyframes side-card-in {
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.side-head {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 8px;
}

.side-kicker {
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.42rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.side-title {
  color: var(--c-text);
  font-size: 0.7rem;
  font-weight: 700;
}

/* ---- 最近足迹 ---- */
.footprint-list {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.footprint-item {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  padding: 4px 0;
  color: var(--c-text-2);
  font-size: 0.64rem;
}

.footprint-dot {
  width: 5px;
  height: 5px;
  flex: 0 0 5px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    var(--c-primary),
    color-mix(in srgb, var(--c-primary) 45%, #fff)
  );
  opacity: 0.85;
}

.footprint-place {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  color: var(--c-text);
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.footprint-device {
  display: grid;
  width: 17px;
  height: 17px;
  flex: 0 0 17px;
  border-radius: 5px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 0.58rem;
  place-items: center;
}
.footprint-greeting {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--c-text-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footprint-item time {
  flex-shrink: 0;
  color: var(--c-text-3);
  font-size: 0.56rem;
  font-variant-numeric: tabular-nums;
}

/* ---- 最近动态 ---- */
.activity-list {
  display: grid;
  gap: 1px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 4.5px 0;
}

.activity-icon {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--c-primary-soft) 62%, transparent);
  color: var(--c-primary);
  font-size: 0.68rem;
  place-items: center;
}

.activity-icon.is-like {
  background: color-mix(in srgb, #e0699a 12%, transparent);
  color: #d96895;
}

.activity-icon.is-guestbook {
  background: color-mix(in srgb, var(--ui-accent-warm) 13%, transparent);
  color: var(--ui-accent-warm);
}

.activity-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  text-decoration: none;
}

.activity-copy b {
  color: var(--c-text-3);
  font-size: 0.52rem;
  font-weight: 650;
  letter-spacing: 0.05em;
}

.activity-copy span {
  overflow: hidden;
  color: var(--c-text-1);
  font-size: 0.64rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.16s ease;
}

.activity-item {
  border-radius: 9px;
  padding-inline: 5px;
  margin-inline: -5px;
  transition: background-color 0.18s ease;
}

.activity-item:hover {
  background: color-mix(in srgb, var(--c-primary-soft) 34%, transparent);
}

.activity-copy:hover span {
  color: var(--c-primary);
}

.activity-item time {
  flex-shrink: 0;
  color: var(--c-text-3);
  font-size: 0.54rem;
}

/* ---- 一言 ---- */
.hitokoto-card {
  gap: 2px;
  padding: 12px 14px 10px;
}

.hitokoto-mark {
  position: absolute;
  top: 0;
  right: 8px;
  color: var(--c-primary);
  font-family: Georgia, serif;
  font-size: 2.2rem;
  line-height: 1;
  opacity: 0.1;
  pointer-events: none;
}

.hitokoto-text {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--c-text-1);
  font-family: var(--font-summary);
  font-size: 0.7rem;
  line-height: 1.65;
  letter-spacing: 0.03em;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.hitokoto-card footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 5px;
}

.hitokoto-card footer span {
  overflow: hidden;
  color: var(--c-text-3);
  font-size: 0.54rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hitokoto-card footer button {
  display: grid;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border: 0;
  border-radius: 7px;
  background: color-mix(in srgb, var(--c-bg-2) 72%, transparent);
  color: var(--c-text-3);
  cursor: pointer;
  font-size: 0.6rem;
  place-items: center;
  transition:
    color 0.16s ease,
    transform 0.3s ease;
}

.hitokoto-card footer button:hover {
  color: var(--c-primary);
  transform: rotate(180deg);
}

.hitokoto-fade-enter-active,
.hitokoto-fade-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.hitokoto-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.hitokoto-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.footprint-empty {
  margin: 0;
  color: var(--c-text-3);
  font-size: 0.62rem;
}

.pet-dock {
  display: flex;
  height: 92px;
  min-height: 92px;
  flex: 0 0 92px;
  align-items: flex-end;
  justify-content: flex-end;
  margin-top: auto;
}

@media (max-height: 860px) {
  .footprint-item:nth-child(n + 4),
  .activity-item:nth-child(n + 5) {
    display: none;
  }
  .pet-dock {
    height: 76px;
    min-height: 76px;
    flex-basis: 76px;
  }
}
@media (max-height: 740px) {
  .footprint-item:nth-child(n + 3),
  .activity-item:nth-child(n + 4) {
    display: none;
  }
  .side-card {
    padding-block: 9px;
  }
  .pet-dock {
    height: 58px;
    min-height: 58px;
    flex-basis: 58px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-sidebar.ready .side-card,
  .home-sidebar.ready .pet-dock {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .hitokoto-fade-enter-active,
  .hitokoto-fade-leave-active {
    transition: none;
  }
}
</style>

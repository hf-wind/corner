<template>
  <main ref="pageRef" class="wind-page" @scroll.passive="persistScroll">
    <div class="wind-shell">
      <header class="wind-masthead">
        <div class="masthead-mark" aria-hidden="true">
          <Icon name="ph:wind-bold" /><i class="mark-status" />
        </div>
        <div class="masthead-copy" :class="{ 'hero-ready': heroReady }">
          <span class="masthead-eyebrow">WIND DISPATCH</span>
          <h1>{{ config.title || "风讯角" }}</h1>
          <p>{{ config.subtitle || "从不同的角落，收拢值得读完的文字。" }}</p>
        </div>
        <div class="masthead-meta" :class="{ 'hero-ready': heroReady }">
          <div class="masthead-stats">
            <span
              ><b>{{ sourceCount }}</b
              ><small>来源</small></span
            >
            <span
              ><b>{{ totalCount }}</b
              ><small>收录</small></span
            >
          </div>
          <div v-if="fetchedAt" class="masthead-update">
            <i /><span>UPDATED</span
            ><time :datetime="fetchedAt">{{ relativeDate(fetchedAt) }}</time>
          </div>
        </div>
      </header>

      <div v-if="newItemsCount" class="new-dispatch" role="status">
        <Icon name="ph:sparkle-bold" /><span
          >新抵达 {{ newItemsCount }} 篇</span
        >
        <button
          type="button"
          title="标记为已读"
          aria-label="标记为已读"
          @click="dismissNewItems"
        >
          <Icon name="ph:check-bold" />
        </button>
      </div>

      <nav class="channel-nav" aria-label="风讯分类">
        <button
          v-for="section in sections"
          :key="section.key"
          type="button"
          :class="{ active: activeSection === section.key }"
          @click="selectSection(section.key)"
        >
          <Icon :name="section.icon" /><span>{{ section.label }}</span
          ><small>{{ section.count }}</small>
        </button>
      </nav>

      <section class="dispatch-list" aria-live="polite" :class="{ loading }">
        <div v-if="loading && !visibleItems.length" class="wind-loading">
          <i /><i /><i />
        </div>
        <div v-else-if="!visibleItems.length" class="wind-empty">
          <Icon name="ph:wind-bold" />
          <h2>这阵风还没有带来新消息</h2>
          <p>订阅源更新后，内容会自动抵达这里。</p>
        </div>
        <article
          v-for="(item, index) in visibleItems"
          v-else
          :key="item.id"
          :data-item-id="item.id"
          class="dispatch-item"
          tabindex="0"
          role="link"
          :style="{ '--delay': `${Math.min(index * 36, 220)}ms` }"
          @click="openItem(item)"
          @keydown.enter.prevent="openItem(item)"
        >
          <div class="item-index">
            {{ String((page - 1) * pageSize + index + 1).padStart(2, "0") }}
          </div>
          <div class="item-body">
            <header>
              <span class="source-name"
                ><img
                  v-if="item.source.avatar && !brokenAvatars.has(item.id)"
                  :src="item.source.avatar"
                  alt=""
                  referrerpolicy="no-referrer"
                  @error="brokenAvatars.add(item.id)"
                /><Icon
                  v-else
                  :name="
                    item.source.kind === 'friend'
                      ? 'ph:handshake-bold'
                      : 'ph:rss-simple-bold'
                  "
                />{{ item.source.name }}</span
              >
              <span class="channel-label">{{ sectionLabel(item) }}</span
              ><time :datetime="item.publishedAt">{{
                relativeDate(item.publishedAt)
              }}</time>
            </header>
            <h2>{{ item.title }}</h2>
            <p v-if="item.summary">{{ item.summary }}</p>
            <footer>
              <span>{{ readingMinutes(item) }} 分钟阅读</span
              ><span v-if="item.author">{{ item.author }}</span
              ><Icon name="ph:arrow-up-right-bold" />
            </footer>
          </div>
          <figure v-if="item.image && !brokenImages.has(item.id)">
            <img
              :src="item.image"
              :alt="item.title"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
              @load="validateListImage($event, item.id)"
              @error.stop="brokenImages.add(item.id)"
            />
          </figure>
        </article>
      </section>
    </div>
    <FloatingPagination
      v-model="page"
      :total="totalPages"
      :hidden="totalPages <= 1"
      variant="circle"
      @change="changePage"
    />
  </main>
</template>

<script setup lang="ts">
type CircleItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  image?: string;
  categories?: string[];
  author?: string;
  content?: string;
  contentHtml?: string;
  source: {
    name: string;
    url: string;
    avatar?: string;
    rssUrl?: string;
    section?: string;
    kind?: "subscription" | "friend";
  };
};
type SectionKey = "all" | "thought" | "news" | "tech" | "ai" | "friends";
const pageSize = 20;
const api = useApi();
const router = useRouter();
const pageRef = ref<HTMLElement | null>(null);
const loading = ref(false);
const clock = ref(Date.now());
const brokenImages = reactive(new Set<string>());
const brokenAvatars = reactive(new Set<string>());
const cache = useState("circle-feed-cache", () => ({
  items: [] as CircleItem[],
  page: 1,
  totalPages: 1,
  total: 0,
  sourceCount: 0,
  fetchedAt: "",
  config: { title: "风讯角", subtitle: "从不同的角落，收拢值得读完的文字。" },
}));
const heroReady = ref(
  Boolean(cache.value.fetchedAt || cache.value.items.length),
);
const items = computed(() => cache.value.items);
const page = computed({
  get: () => cache.value.page,
  set: (value) => {
    cache.value.page = value;
  },
});
const totalPages = computed(() => cache.value.totalPages);
const totalCount = computed(() => cache.value.total);
const sourceCount = computed(
  () =>
    cache.value.sourceCount ||
    new Set(items.value.map((item) => item.source.url)).size,
);
const fetchedAt = computed(() => cache.value.fetchedAt);
const config = computed(() => cache.value.config);
const activeSection = useState<SectionKey>(
  "circle-active-section",
  () => "all",
);
const reading = reactive({ lastSeenAt: "" });
const clientState = useClientState();
let scrollPersistedForNavigation = false;
let scrollRestoreTimer: ReturnType<typeof setTimeout> | null = null;
let scrollRestoreFrame: number | null = null;
let scrollRestoreAbortController: AbortController | null = null;
let scrollRestoreActive = false;
const sectionDefs: Array<{ key: SectionKey; label: string; icon: string }> = [
  { key: "all", label: "全部", icon: "ph:squares-four-bold" },
  { key: "thought", label: "思考", icon: "ph:lightbulb-filament-bold" },
  { key: "news", label: "新闻", icon: "ph:newspaper-bold" },
  { key: "tech", label: "科技", icon: "ph:cpu-bold" },
  { key: "ai", label: "AI", icon: "ph:sparkle-bold" },
  { key: "friends", label: "友链", icon: "ph:handshake-bold" },
];
const visibleItems = computed(() =>
  activeSection.value === "all"
    ? items.value
    : items.value.filter((item) => sectionFor(item) === activeSection.value),
);
const sections = computed(() =>
  sectionDefs.map((section) => ({
    ...section,
    count:
      section.key === "all"
        ? totalCount.value
        : items.value.filter((item) => sectionFor(item) === section.key).length,
  })),
);
const newItemsCount = computed(() => {
  const since = Date.parse(reading.lastSeenAt);
  return Number.isFinite(since)
    ? items.value.filter((item) => Date.parse(item.publishedAt) > since).length
    : 0;
});

function sectionFor(item: CircleItem): SectionKey {
  if (item.source.kind === "friend") return "friends";
  if (
    ["thought", "news", "tech", "ai", "friends"].includes(
      String(item.source.section),
    )
  )
    return item.source.section as SectionKey;
  return "news";
}
function sectionLabel(item: CircleItem) {
  return (
    sectionDefs.find((section) => section.key === sectionFor(item))?.label ||
    "新闻"
  );
}
function selectSection(key: SectionKey) {
  activeSection.value = key;
  pageRef.value?.scrollTo({ top: 0, behavior: "smooth" });
}
function relativeDate(value: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "";
  const minutes = Math.max(0, Math.floor((clock.value - time) / 60000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)} 天前`;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(new Date(time));
}
function readingMinutes(item: CircleItem) {
  return Math.max(
    1,
    Math.round(
      (item.contentHtml || item.content || item.summary || "").length / 700,
    ),
  );
}
function dismissNewItems() {
  reading.lastSeenAt = items.value[0]?.publishedAt || new Date().toISOString();
  clientState.set('site', 'circleLastSeenAt', reading.lastSeenAt);
}
function restoreReading() {
  reading.lastSeenAt = String(clientState.get('site', 'circleLastSeenAt', ''));
}
function validateListImage(event: Event, id: string) {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;
  if (image.naturalWidth < 96 || image.naturalHeight < 64) brokenImages.add(id);
}
function scrollLayoutTop(element: HTMLElement, host: HTMLElement) {
  return (
    host.scrollTop +
    element.getBoundingClientRect().top -
    host.getBoundingClientRect().top
  );
}
function persistScroll() {
  if (scrollPersistedForNavigation || scrollRestoreActive) return;
  const host = pageRef.value;
  if (!host) return;
  const entries = Array.from(
    host.querySelectorAll<HTMLElement>(".dispatch-item"),
  );
  const anchor =
    entries.find(
      (entry) => entry.offsetTop + entry.offsetHeight >= host.scrollTop + 20,
    ) || entries.at(-1);
  clientState.setSession('circleScroll', {
      top: host.scrollTop,
      anchorId: anchor?.dataset.itemId || "",
      anchorOffset: anchor ? host.scrollTop - scrollLayoutTop(anchor, host) : 0,
      page: page.value,
    });
}
function clearScrollRestore() {
  scrollRestoreActive = false;
  scrollRestoreAbortController?.abort();
  scrollRestoreAbortController = null;
  if (scrollRestoreTimer) clearTimeout(scrollRestoreTimer);
  scrollRestoreTimer = null;
  if (scrollRestoreFrame !== null) cancelAnimationFrame(scrollRestoreFrame);
  scrollRestoreFrame = null;
}
function stabilizeScrollAnchor(
  host: HTMLElement,
  anchor: HTMLElement,
  anchorOffset: number,
) {
  clearScrollRestore();
  const apply = () => {
    scrollRestoreFrame = null;
    if (!scrollRestoreActive || !host.isConnected || !anchor.isConnected)
      return;
    host.scrollTop = Math.max(0, scrollLayoutTop(anchor, host) + anchorOffset);
    scrollRestoreFrame = requestAnimationFrame(apply);
  };
  scrollRestoreActive = true;
  scrollRestoreAbortController = new AbortController();
  for (const eventName of ["wheel", "touchstart", "pointerdown"] as const) {
    host.addEventListener(eventName, clearScrollRestore, {
      passive: true,
      signal: scrollRestoreAbortController.signal,
    });
  }
  apply();
  scrollRestoreTimer = window.setTimeout(clearScrollRestore, 1600);
}
async function restoreScroll() {
  const host = pageRef.value;
  if (!host) return;
  try {
    const value = clientState.getSession('circleScroll', {}) as Record<string, any>;
    await nextTick();
    const anchor = value.anchorId
      ? host.querySelector<HTMLElement>(
          `[data-item-id="${CSS.escape(value.anchorId)}"]`,
        )
      : null;
    const anchorOffset = Number(value.anchorOffset);
    if (anchor && Number.isFinite(anchorOffset)) {
      stabilizeScrollAnchor(host, anchor, anchorOffset);
    } else {
      host.scrollTop = Math.max(0, Number(value.top) || 0);
    }
  } catch {
    /* ignore invalid session state */
  }
}
function openItem(item: CircleItem) {
  persistScroll();
  clientState.setSession('circleReturning', true);
  scrollPersistedForNavigation = true;
  void router.push({ path: "/circle/read", query: { id: item.id } });
}
async function loadFeed(target = page.value) {
  loading.value = true;
  try {
    const result = await api.get<any>("/circle/feed", {
      page: target,
      limit: pageSize,
    });
    cache.value = {
      items: Array.isArray(result?.items) ? result.items : [],
      page: Number(result?.page) || target,
      totalPages: Number(result?.totalPages) || 1,
      total: Number(result?.total) || 0,
      sourceCount: Number(result?.sourceCount) || 0,
      fetchedAt: String(result?.fetchedAt || ""),
      config: {
        title: String(result?.config?.title || "风讯角"),
        subtitle: String(
          result?.config?.subtitle || "从不同的角落，收拢值得读完的文字。",
        ),
      },
    };
  } finally {
    loading.value = false;
    heroReady.value = true;
  }
}
async function changePage(target: number) {
  await loadFeed(target);
  pageRef.value?.scrollTo({ top: 0, behavior: "smooth" });
}

let clockTimer: ReturnType<typeof setInterval> | undefined;
onMounted(async () => {
  restoreReading();
  const shouldRestore = clientState.getSession('circleReturning', false) === true;
  clientState.removeSession('circleReturning');
  if (!items.value.length) await loadFeed();
  await nextTick();
  if (shouldRestore) await restoreScroll();
  else if (pageRef.value) pageRef.value.scrollTop = 0;
  clockTimer = setInterval(() => {
    clock.value = Date.now();
  }, 60000);
});
onUnmounted(() => {
  clearScrollRestore();
  if (!scrollPersistedForNavigation) persistScroll();
  if (clockTimer) clearInterval(clockTimer);
  clientState.set('site', 'circleLastSeenAt', reading.lastSeenAt);
});
useHead(() => ({ title: `${config.value.title || "风讯角"} · 风隅随笔` }));
</script>

<style scoped>
.wind-page {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  background: var(--c-bg);
  color: var(--c-text);
  scrollbar-gutter: stable;
}
.wind-shell {
  width: min(1040px, calc(100% - clamp(32px, 7vw, 100px)));
  margin: 0 auto;
  padding: 38px 0 100px;
}
.wind-masthead {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 0 0 24px;
  border-bottom: 1px solid var(--border);
}
.masthead-mark {
  display: grid;
  width: 44px;
  height: 44px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 28%, var(--border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--c-primary-soft) 48%, transparent);
  color: var(--c-primary);
  font-size: 1.35rem;
  place-items: center;
  animation: mark-arrive 0.7s var(--ui-ease-out) both;
}
.masthead-copy {
  min-width: 0;
}
.masthead-copy > span {
  color: var(--c-primary);
  font: 750 0.53rem var(--font-mono);
  letter-spacing: 0.14em;
}
.masthead-copy h1 {
  margin: 4px 0 0;
  font: 720 2.15rem/1.1 var(--font-system-rounded);
  letter-spacing: 0;
}
.masthead-copy p {
  margin: 5px 0 0;
  color: var(--c-text-2);
  font-size: 0.72rem;
}
.masthead-meta {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--c-text-3);
  font-size: 0.62rem;
  white-space: nowrap;
}
.masthead-meta b {
  color: var(--c-text-2);
  font-weight: 680;
}
.masthead-meta i {
  width: 1px;
  height: 14px;
  background: var(--border);
}
.masthead-meta small {
  padding-left: 2px;
}
.new-dispatch {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 14px;
  padding: 7px 10px;
  border-left: 2px solid var(--c-primary);
  background: color-mix(in srgb, var(--c-primary-soft) 36%, transparent);
  color: var(--c-primary);
  font-size: 0.65rem;
}
.new-dispatch button {
  display: grid;
  width: 22px;
  height: 22px;
  margin-left: auto;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  place-items: center;
}
.channel-nav {
  display: flex;
  gap: 2px;
  margin-top: 20px;
  overflow-x: auto;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  scrollbar-width: none;
}
.channel-nav::-webkit-scrollbar {
  display: none;
}
.channel-nav button {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  border: 0;
  background: transparent;
  color: var(--c-text-3);
  cursor: pointer;
  font: inherit;
  font-size: 0.67rem;
  transition: color 0.2s;
}
.channel-nav button::after {
  position: absolute;
  right: 12px;
  bottom: -1px;
  left: 12px;
  height: 2px;
  background: var(--c-primary);
  content: "";
  transform: scaleX(0);
  transition: transform 0.28s var(--ui-ease-out);
}
.channel-nav button:hover,
.channel-nav button.active {
  color: var(--c-primary);
}
.channel-nav button.active::after {
  transform: scaleX(1);
}
.channel-nav :deep(svg) {
  font-size: 0.82rem;
}
.channel-nav small {
  font: 0.54rem var(--font-mono);
  opacity: 0.65;
}
.dispatch-list {
  margin-top: 5px;
}
.dispatch-item {
  --thumb-width: 148px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) var(--thumb-width);
  gap: 15px;
  align-items: center;
  padding: 21px 4px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  cursor: pointer;
  outline: none;
  animation: item-arrive 0.56s var(--ui-ease-out) var(--delay) both;
  transition:
    background-color 0.2s,
    padding 0.25s;
}
.dispatch-item:not(:has(figure)) {
  grid-template-columns: 28px minmax(0, 1fr);
}
.dispatch-item:hover,
.dispatch-item:focus-visible {
  padding-right: 10px;
  padding-left: 10px;
  background: color-mix(in srgb, var(--c-primary-soft) 22%, transparent);
}
.item-index {
  align-self: start;
  padding-top: 22px;
  color: var(--c-text-3);
  font: 0.55rem var(--font-mono);
}
.item-body {
  min-width: 0;
}
.item-body header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--c-text-3);
  font-size: 0.58rem;
}
.source-name {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  color: var(--c-text-2);
  font-weight: 650;
}
.source-name img {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  object-fit: cover;
}
.source-name :deep(svg) {
  color: var(--c-primary);
}
.channel-label {
  padding-left: 8px;
  border-left: 1px solid var(--border);
  color: var(--c-primary);
}
.item-body time {
  margin-left: auto;
}
.item-body h2 {
  margin: 8px 0 0;
  color: var(--c-text);
  font: 680 clamp(1rem, 1.7vw, 1.3rem)/1.38 var(--font-system-rounded);
  letter-spacing: 0;
  transition: color 0.2s;
}
.dispatch-item:hover h2 {
  color: var(--c-primary);
}
.item-body p {
  display: -webkit-box;
  max-width: 680px;
  margin: 7px 0 0;
  overflow: hidden;
  color: var(--c-text-2);
  font-size: 0.69rem;
  line-height: 1.75;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.item-body footer {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 10px;
  color: var(--c-text-3);
  font-size: 0.56rem;
}
.item-body footer span + span {
  padding-left: 9px;
  border-left: 1px solid var(--border);
}
.item-body footer :deep(svg) {
  margin-left: auto;
  color: var(--c-primary);
  opacity: 0;
  transform: translateX(-5px);
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.dispatch-item:hover footer :deep(svg) {
  opacity: 1;
  transform: none;
}
.dispatch-item figure {
  width: var(--thumb-width);
  aspect-ratio: 1.55;
  margin: 0;
  overflow: hidden;
  border-radius: 6px;
  background: var(--c-bg-2);
}
.dispatch-item figure img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.55s var(--ui-ease-out);
}
.dispatch-item:hover figure img {
  transform: scale(1.035);
}
.wind-loading,
.wind-empty {
  display: grid;
  min-height: 330px;
  align-content: center;
  justify-items: center;
  color: var(--c-text-3);
  text-align: center;
}
.wind-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.wind-loading i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-primary);
  animation: pulse 1s ease-in-out infinite alternate;
}
.wind-loading i:nth-child(2) {
  animation-delay: 0.14s;
}
.wind-loading i:nth-child(3) {
  animation-delay: 0.28s;
}
.wind-empty :deep(svg) {
  color: var(--c-primary);
  font-size: 1.8rem;
}
.wind-empty h2 {
  margin: 10px 0 0;
  color: var(--c-text);
  font-size: 0.92rem;
}
.wind-empty p {
  margin: 5px 0 0;
  font-size: 0.65rem;
}
@keyframes item-arrive {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes mark-arrive {
  from {
    opacity: 0;
    transform: translateX(-12px) rotate(-8deg);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes pulse {
  to {
    opacity: 0.2;
    transform: translateY(-3px);
  }
}
@media (max-width: 760px) {
  .wind-shell {
    width: calc(100% - 28px);
    padding-top: max(72px, calc(env(safe-area-inset-top) + 58px));
  }
  .wind-masthead {
    grid-template-columns: 40px 1fr;
    gap: 12px;
  }
  .masthead-mark {
    width: 38px;
    height: 38px;
  }
  .masthead-copy h1 {
    font-size: 1.72rem;
  }
  .masthead-meta {
    grid-column: 1/-1;
    flex-wrap: wrap;
    margin-top: 2px;
    padding-left: 52px;
  }
  .dispatch-item {
    --thumb-width: 92px;
    grid-template-columns: 20px minmax(0, 1fr) var(--thumb-width);
    gap: 9px;
    padding: 17px 0;
  }
  .dispatch-item:not(:has(figure)) {
    grid-template-columns: 20px minmax(0, 1fr);
  }
  .item-index {
    padding-top: 20px;
    font-size: 0.49rem;
  }
  .item-body header {
    flex-wrap: wrap;
    gap: 6px;
  }
  .item-body time {
    margin-left: 0;
  }
  .item-body h2 {
    font-size: 0.94rem;
  }
  .item-body p {
    font-size: 0.64rem;
    -webkit-line-clamp: 2;
  }
  .dispatch-item figure {
    align-self: start;
    margin-top: 20px;
  }
  .channel-nav button {
    padding: 8px 10px;
  }
  .item-body footer span:nth-child(2) {
    display: none;
  }
}
@media (max-width: 470px) {
  .dispatch-item {
    grid-template-columns: 20px minmax(0, 1fr);
  }
  .dispatch-item figure {
    display: none;
  }
  .masthead-copy p {
    max-width: 260px;
  }
  .masthead-meta {
    padding-left: 0;
  }
  .masthead-meta small {
    flex-basis: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .masthead-mark,
  .dispatch-item,
  .wind-loading i {
    animation: none;
  }
  .dispatch-item,
  .dispatch-item figure img,
  .channel-nav button::after {
    transition: none;
  }
}

/* Keep the masthead editorial and compact while giving live feed data a clear hierarchy. */
.wind-masthead {
  position: relative;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  gap: 18px;
  padding: 4px 0 26px;
}
.wind-masthead::after {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 64px;
  height: 1px;
  background: var(--c-primary);
  content: "";
}
.masthead-mark {
  position: relative;
  width: 48px;
  height: 48px;
  border-color: color-mix(in srgb, var(--c-primary) 34%, var(--border));
  background: transparent;
  box-shadow: inset 0 0 0 4px
    color-mix(in srgb, var(--c-primary-soft) 28%, transparent);
}
.masthead-mark::before {
  position: absolute;
  inset: 7px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 18%, transparent);
  border-radius: 5px;
  content: "";
}
.masthead-mark :deep(svg) {
  position: relative;
  z-index: 1;
}
.mark-status {
  position: absolute;
  z-index: 2;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border: 2px solid var(--c-bg);
  border-radius: 50%;
  background: var(--c-primary);
  box-sizing: content-box;
  animation: status-breathe 2.4s ease-in-out infinite;
}
.masthead-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
}
.masthead-eyebrow em {
  padding-left: 8px;
  border-left: 1px solid var(--border);
  color: var(--c-text-3);
  font-style: normal;
  font-weight: 620;
  letter-spacing: 0.08em;
}
.masthead-copy h1 {
  margin-top: 5px;
  font-size: 2.25rem;
  font-weight: 740;
}
.masthead-copy p {
  margin-top: 6px;
  max-width: 560px;
  color: var(--c-text-2);
  line-height: 1.65;
}
.masthead-meta {
  display: grid;
  min-width: 174px;
  gap: 9px;
}
.masthead-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(70px, 1fr));
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.masthead-stats > span {
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 8px 10px;
}
.masthead-stats > span + span {
  border-left: 1px solid var(--border);
}
.masthead-stats b {
  color: var(--c-text);
  font: 730 1rem var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.masthead-stats small {
  color: var(--c-text-3);
  font-size: 0.56rem;
}
.masthead-update {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 2px;
  color: var(--c-text-3);
  font: 0.5rem var(--font-mono);
  letter-spacing: 0.08em;
}
.masthead-update i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 12%, transparent);
}
.masthead-update time {
  margin-left: auto;
  color: var(--c-text-2);
  font-family: var(--font-system);
  letter-spacing: 0;
}
.dispatch-item {
  transition:
    background-color 0.2s,
    box-shadow 0.2s;
}
.dispatch-item:hover,
.dispatch-item:focus-visible {
  padding-right: 4px;
  padding-left: 4px;
  box-shadow: inset 2px 0 0
    color-mix(in srgb, var(--c-primary) 72%, transparent);
}
@keyframes status-breathe {
  50% {
    opacity: 0.42;
    transform: scale(0.82);
  }
}
@media (max-width: 760px) {
  .wind-masthead {
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 13px;
    padding-top: 2px;
  }
  .masthead-mark {
    width: 42px;
    height: 42px;
  }
  .masthead-copy h1 {
    font-size: 1.82rem;
  }
  .masthead-meta {
    grid-column: 1/-1;
    min-width: 0;
    margin-top: 4px;
    padding-left: 57px;
  }
  .masthead-stats {
    width: min(220px, 100%);
  }
  .dispatch-item:hover,
  .dispatch-item:focus-visible {
    padding-right: 0;
    padding-left: 0;
  }
}
@media (max-width: 470px) {
  .wind-masthead {
    gap: 11px;
  }
  .masthead-meta {
    padding-left: 0;
  }
  .masthead-copy p {
    max-width: 100%;
  }
  .masthead-eyebrow em {
    display: none;
  }
  .masthead-stats {
    width: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .mark-status {
    animation: none;
  }
}

/* Open hero treatment: no divider lines, with a quiet tinted data cluster. */
.wind-masthead {
  padding-bottom: 24px;
  border-bottom: 0;
}
.wind-masthead::after {
  display: none;
}
.masthead-mark {
  border: 0;
  background: color-mix(in srgb, var(--c-primary-soft) 64%, var(--c-bg-2));
  box-shadow: 0 8px 24px color-mix(in srgb, var(--c-primary) 10%, transparent);
}
.masthead-mark::before {
  display: none;
}
.masthead-eyebrow::before {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--c-primary);
  content: "";
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-primary) 10%, transparent);
}
.masthead-meta {
  padding: 11px 12px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--c-primary-soft) 25%, var(--c-bg-2));
  gap: 7px;
}
.masthead-stats {
  border: 0;
}
.masthead-stats > span {
  padding: 0 10px;
}
.masthead-stats > span:first-child {
  padding-left: 0;
}
.masthead-stats > span + span {
  border-left: 0;
}
.masthead-update {
  padding: 0;
}
.dispatch-item:hover,
.dispatch-item:focus-visible {
  box-shadow: none;
}
.item-index,
.item-body,
.dispatch-item figure {
  transition: transform 0.25s var(--ui-ease-out);
}
.dispatch-item:hover .item-index,
.dispatch-item:hover .item-body,
.dispatch-item:focus-visible .item-index,
.dispatch-item:focus-visible .item-body {
  transform: translateX(6px);
}
.dispatch-item:hover figure,
.dispatch-item:focus-visible figure {
  transform: translateX(-6px);
}
@media (prefers-reduced-motion: reduce) {
  .item-index,
  .item-body,
  .dispatch-item figure {
    transition: none;
  }
}

.masthead-meta {
  min-width: 188px;
  padding: 0;
  border-radius: 0;
  background: transparent;
  gap: 8px;
}
.masthead-stats {
  grid-template-columns: repeat(2, max-content);
  justify-content: end;
  gap: 24px;
}
.masthead-stats > span {
  gap: 6px;
  padding: 0;
}
.masthead-stats b {
  font-size: 1.08rem;
}
.masthead-update {
  justify-content: flex-end;
}
.masthead-update time {
  margin-left: 6px;
}
.channel-nav {
  border-bottom: 0;
}
@media (max-width: 760px) {
  .masthead-stats {
    justify-content: start;
  }
  .masthead-update {
    justify-content: flex-start;
  }
  .masthead-update time {
    margin-left: 6px;
  }
}

.masthead-copy {
  min-height: 69px;
}
.masthead-copy > span,
.masthead-copy > h1,
.masthead-copy > p,
.masthead-meta > .masthead-stats,
.masthead-meta > .masthead-update {
  animation: hero-content-in 0.42s ease both;
}
.masthead-skeleton {
  display: grid;
  height: 69px;
  align-content: center;
  gap: 8px;
}
.masthead-skeleton i,
.masthead-skeleton b,
.masthead-skeleton span,
.meta-skeleton i,
.meta-skeleton span {
  display: block;
  border-radius: 3px;
  background: var(--c-bg-2);
  animation: skeleton-breathe 1.2s ease-in-out infinite alternate;
}
.masthead-skeleton i {
  width: 88px;
  height: 6px;
}
.masthead-skeleton b {
  width: 128px;
  height: 30px;
}
.masthead-skeleton span {
  width: min(260px, 80%);
  height: 8px;
}
.meta-skeleton {
  display: grid;
  grid-template-columns: 54px 62px;
  justify-content: end;
  gap: 8px;
}
.meta-skeleton i {
  height: 20px;
}
.meta-skeleton span {
  grid-column: 1/-1;
  justify-self: end;
  width: 94px;
  height: 7px;
}
.dispatch-item,
.dispatch-item:hover,
.dispatch-item:focus-visible {
  padding-right: 10px;
  padding-left: 10px;
}
.item-index,
.item-body {
  transform: translateX(-6px);
}
.dispatch-item figure {
  transform: translateX(6px);
}
.item-index,
.item-body,
.dispatch-item figure {
  transition: transform 0.25s ease;
}
.dispatch-item:hover .item-index,
.dispatch-item:hover .item-body,
.dispatch-item:focus-visible .item-index,
.dispatch-item:focus-visible .item-body,
.dispatch-item:hover figure,
.dispatch-item:focus-visible figure {
  transform: none;
}
@keyframes hero-content-in {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes skeleton-breathe {
  to {
    opacity: 0.46;
  }
}
@media (max-width: 760px) {
  .dispatch-item {
    padding-right: 10px;
    padding-left: 10px;
  }
  .item-index,
  .item-body {
    transform: translateX(-10px);
  }
  .dispatch-item figure {
    transform: translateX(10px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .masthead-copy > span,
  .masthead-copy > h1,
  .masthead-copy > p,
  .masthead-meta > .masthead-stats,
  .masthead-meta > .masthead-update,
  .masthead-skeleton i,
  .masthead-skeleton b,
  .masthead-skeleton span,
  .meta-skeleton i,
  .meta-skeleton span {
    animation: none;
  }
}

.masthead-copy > span,
.masthead-copy > h1,
.masthead-copy > p,
.masthead-meta > .masthead-stats,
.masthead-meta > .masthead-update {
  visibility: hidden;
  opacity: 0;
  animation: none;
  transform: translateY(6px);
}
.masthead-copy.hero-ready > span,
.masthead-copy.hero-ready > h1,
.masthead-copy.hero-ready > p,
.masthead-meta.hero-ready > .masthead-stats,
.masthead-meta.hero-ready > .masthead-update {
  visibility: visible;
  opacity: 1;
  transform: none;
  transition:
    opacity 0.42s ease,
    transform 0.48s var(--ui-ease-out);
}
</style>

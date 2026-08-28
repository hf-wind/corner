<template>
  <main ref="circlePageRef" class="circle-page">
    <section class="circle-stage" :class="{ 'stage-with-cover': coverImage }">
      <div class="stage-backdrop" :style="coverImage ? { backgroundImage: `url(${coverImage})` } : undefined" />
      <div class="stage-glass" />
      <div class="stage-inner">
        <div class="stage-topline"><span class="eyebrow"><Icon name="ph:users-three-bold" /> FRIENDS / MOMENTS</span><button class="stage-refresh" type="button" :disabled="loading" :title="loading ? '正在刷新' : '刷新动态'" @click="loadFeed(true)"><Icon :name="loading ? 'ph:spinner-gap-bold' : 'ph:arrows-clockwise-bold'" :class="{ spin: loading }" /><span>{{ loading ? '同步中' : '刷新动态' }}</span></button></div>
        <div class="stage-main">
          <div class="stage-copy"><h1>{{ config.title || '朋友圈' }}</h1><p>{{ config.subtitle || '和朋友们分享新鲜事' }}</p><div class="stage-tags"><span><Icon name="ph:rss-bold" /> {{ sourceCount }} 个来源</span><span><Icon name="ph:waveform-bold" /> {{ items.length }} 条动态</span><span v-if="latestPublishedAt"><Icon name="ph:clock-bold" /> {{ relativeDate(latestPublishedAt) }}更新</span></div></div>
          <div class="stage-orbit" aria-hidden="true"><span class="orbit-ring ring-one" /><span class="orbit-ring ring-two" /><span class="orbit-dot dot-one" /><span class="orbit-dot dot-two" /><span class="orbit-core"><Icon name="ph:heart-half-bold" /></span></div>
        </div>
        <div v-if="coverGallery.length" class="cover-gallery" aria-label="朋友圈封面组"><span class="gallery-label">CURATED COVERS</span><div class="gallery-track"><span v-for="(cover, index) in coverGallery" :key="cover" class="gallery-thumb" :class="{ active: cover === coverImage }" :style="{ backgroundImage: `url(${cover})`, '--gallery-index': index }" /></div></div>
      </div>
    </section>

    <div v-if="newItemsCount" class="reading-notice"><span><Icon name="ph:sparkle-bold" /> 距离上次阅读新增 <strong>{{ newItemsCount }}</strong> 条动态</span><button type="button" @click="dismissNewItems">标记为已读 <Icon name="ph:check-bold" /></button></div>

    <section class="circle-toolbar" aria-label="动态筛选"><div class="toolbar-inner"><div class="toolbar-heading"><span class="eyebrow">LIVE STREAM</span><h2 id="circle-stream-title">朋友动态</h2><p class="stream-overview">共 {{ totalCount }} 条 · 已加载 {{ items.length }} 条<span v-if="fetchedAt"> · 更新于 {{ relativeDate(fetchedAt) }}</span></p></div><div class="filter-pills" role="tablist" aria-label="动态筛选"><button v-for="filter in filters" :key="filter.key" type="button" role="tab" :aria-selected="activeFilter === filter.key" :class="{ active: activeFilter === filter.key }" @click="setActiveFilter(filter.key)"><Icon :name="filter.icon" /> {{ filter.label }}<small>{{ filterCount(filter.key) }}</small></button></div></div></section>

    <div class="circle-layout">
      <section class="circle-stream" aria-labelledby="circle-stream-title" aria-live="polite">
        <div v-if="loading && !items.length" class="stream-state stream-loading"><div class="loading-mark"><span /><span /><span /></div><strong>正在收集朋友们的新消息</strong><span>RSS 订阅源正在抵达。</span></div>
        <div v-else-if="!filteredItems.length" class="stream-state stream-empty"><div class="empty-mark"><Icon name="ph:wind-bold" /></div><strong>{{ items.length ? '没有符合筛选条件的动态' : '此刻很安静' }}</strong><span>{{ items.length ? '试试切换另一个动态视图。' : '为友链配置 RSS 后，新消息会自动出现在这里。' }}</span><button v-if="items.length" type="button" @click="setActiveFilter('all')">查看全部动态 <Icon name="ph:arrow-right-bold" /></button></div>
        <div v-else class="stream-list"><template v-for="(item, index) in visibleFilteredItems" :key="item.id"><div v-if="showNewDivider(index)" class="new-divider"><span><Icon name="ph:sparkle-bold" /> 上次阅读 · {{ readingLabel }}</span></div><div v-if="showDateMarker(index)" class="date-marker"><span>{{ dateLabel(item.publishedAt) }}</span><i /></div><article class="stream-entry" :class="{ 'has-image': item.image && !brokenImages.has(item.id), 'is-featured': index === 0 }" :style="entryStyle(item, index)"><div class="entry-spine"><a class="source-avatar" :href="item.source.url" target="_blank" rel="noopener noreferrer" :title="item.source.name"><img :src="avatarFor(item.source)" :alt="item.source.name" loading="lazy" @error="onAvatarError" /></a><span class="entry-node" /></div><div class="entry-content"><header class="entry-head"><div class="entry-source"><a :href="item.source.url" target="_blank" rel="noopener noreferrer">{{ item.source.name }}</a><span class="source-badge">RSS</span><time :datetime="item.publishedAt" :title="formatDate(item.publishedAt)">{{ relativeDate(item.publishedAt) }}</time></div><a class="entry-open" :href="item.url" target="_blank" rel="noopener noreferrer" title="打开原文" aria-label="打开原文"><Icon name="ph:arrow-up-right-bold" /></a></header><a class="entry-body" :href="item.url" target="_blank" rel="noopener noreferrer"><div class="entry-label"><span v-if="index === 0" class="featured-label"><Icon name="ph:star-four-fill" /> LATEST</span><span class="entry-index">{{ String(index + 1).padStart(2, '0') }}</span></div><h3>{{ item.title }}</h3><p v-if="item.content || item.summary" class="entry-excerpt">{{ item.content || item.summary }}</p><figure v-if="item.image && !brokenImages.has(item.id)"><img :src="item.image" :alt="item.title" loading="lazy" decoding="async" @error="onEntryImageError(item.id)" /><figcaption><Icon name="ph:image-square-bold" /> 文章配图</figcaption></figure></a></div></article></template></div>
        <div ref="loadMoreRef" class="load-more" aria-live="polite"><template v-if="hasMore"><span class="load-pulse"><i /><i /><i /></span> {{ loadingMore ? '正在加载更多' : '继续向下探索' }}</template><span v-else-if="filteredItems.length" class="end-mark"><Icon name="ph:check-circle-bold" /> 已抵达最早的动态</span></div>
      </section>

      <aside class="circle-rail" aria-label="朋友圈信息"><section class="rail-panel rail-signal"><div class="rail-panel-head"><span class="eyebrow">SIGNAL</span><Icon name="ph:pulse-bold" /></div><div class="signal-value"><strong>{{ todayCount }}</strong><span>今日更新</span></div><div class="signal-bars"><i v-for="bar in signalBars" :key="bar" :style="{ height: `${bar}%` }" /></div><p>保持关注，朋友们的灵感正在流动。</p></section><section class="rail-panel"><div class="rail-panel-head"><span class="eyebrow">SOURCES</span><span class="rail-count">{{ sourceCount }}</span></div><h3>最近活跃</h3><div class="source-list"><a v-for="source in activeSources" :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer"><span class="source-mini-avatar"><img :src="avatarFor(source)" :alt="source.name" loading="lazy" @error="onAvatarError" /></span><span class="source-copy"><strong>{{ source.name }}</strong><small>{{ source.count }} 条动态</small></span><Icon name="ph:arrow-up-right-bold" /></a></div></section><section class="rail-panel rail-note"><Icon name="ph:quotes-bold" /><p>“让不同角落的声音，在这里相遇。”</p><span>WIND · CORNER</span></section></aside>
    </div>
  </main>
</template>

<script setup lang="ts">
type CircleSource = { name: string; url: string; avatar?: string; rssUrl?: string };
type CircleItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  image?: string;
  cover?: string;
  categories?: string[];
  author?: string;
  content?: string;
  enclosure?: string;
  comments?: string;
  source: CircleSource;
};
type CircleFilterKey = "all" | "today";
type CircleFilter = { key: CircleFilterKey; label: string; icon: string };
const api = useApi();
const toast = useToast();
const circlePageRef = ref<HTMLElement | null>(null);
const loadMoreRef = ref<HTMLElement | null>(null);
const loading = ref(true);
const loadingMore = ref(false);
const items = ref<CircleItem[]>([]);
const activeFilter = ref<CircleFilterKey>("all");
const filters: CircleFilter[] = [
  { key: "all", label: "全部", icon: "ph:squares-four-bold" },
  { key: "today", label: "今日", icon: "ph:sun-horizon-bold" },
];
const page = ref(1);
const totalPages = ref(1);
const totalCount = ref(0);
const feedSourceCount = ref(0);
const feedTodayCount = ref(0);
const fetchedAt = ref("");
const clock = ref(Date.now());
const brokenImages = reactive(new Set<string>());
const readingKey = "corner:circle:reading";
const reading = reactive({ lastSeenAt: "" });
const restoredPosition = ref(false);
const config = reactive({
  title: "朋友圈",
  subtitle: "和朋友们分享新鲜事",
  covers: [] as string[],
});
const coverImage = computed(
  () => items.value[0]?.cover || config.covers[0] || "",
);
const coverGallery = computed(() => {
  const covers = [...config.covers, ...items.value.map((item) => item.cover || "")];
  return Array.from(new Set(covers.map((cover) => cover.trim()).filter(Boolean))).slice(0, 8);
});
const sourceCount = computed(
  () => feedSourceCount.value || new Set(items.value.map((item) => item.source.url)).size,
);
const latestPublishedAt = computed(() => items.value[0]?.publishedAt || "");
const filteredItems = computed(() => {
  if (activeFilter.value === "today") {
    const today = new Date().toDateString();
    return items.value.filter((item) => new Date(item.publishedAt).toDateString() === today);
  }
  return items.value;
});
const visibleFilteredItems = computed(() => filteredItems.value);
const hasMore = computed(() => page.value < totalPages.value);
const readingLabel = computed(() => reading.lastSeenAt ? dateLabel(reading.lastSeenAt) : "此前");
const filterCount = (key: CircleFilterKey) => {
  if (key === "today") {
    const today = new Date().toDateString();
    return items.value.filter((item) => new Date(item.publishedAt).toDateString() === today).length;
  }
  return totalCount.value;
};
const signalBars = computed(() => {
  const buckets = Array.from({ length: 7 }, () => 0);
  const now = Date.now();
  for (const item of items.value) {
    const age = Math.max(0, now - new Date(item.publishedAt).getTime());
    const bucket = Math.min(6, Math.floor(age / (24 * 60 * 60 * 1000)));
    if (Number.isFinite(bucket)) buckets[6 - bucket] += 1;
  }
  const max = Math.max(1, ...buckets);
  return buckets.map((value) => Math.max(12, Math.round((value / max) * 100)));
});
const newItemsCount = computed(() => {
  if (!reading.lastSeenAt) return 0;
  const since = Date.parse(reading.lastSeenAt);
  return Number.isFinite(since) ? items.value.filter((item) => Date.parse(item.publishedAt) > since).length : 0;
});
const todayCount = computed(() => {
  const today = new Date().toDateString();
  return feedTodayCount.value || items.value.filter(
    (item) => new Date(item.publishedAt).toDateString() === today,
  ).length;
});
const activeSources = computed(() => {
  const sources = new Map<string, CircleSource & { count: number }>();
  for (const item of items.value) {
    const current = sources.get(item.source.url);
    if (current) current.count += 1;
    else sources.set(item.source.url, { ...item.source, count: 1 });
  }
  return Array.from(sources.values()).slice(0, 7);
});
async function loadFeed(refresh = false, notify = refresh) {
  if (refresh && items.value.length && (loading.value || loadingMore.value)) return;
  if (!refresh && loadingMore.value) return;
  if (refresh) loading.value = true;
  else if (items.value.length) loadingMore.value = true;
  try {
    const targetPage = refresh ? 1 : page.value + 1;
    const result = await api.get<any>("/circle/feed", { page: targetPage, limit: 20, refresh: refresh ? 1 : undefined });
    Object.assign(config, result?.config || {});
    const nextItems = Array.isArray(result?.items) ? result.items : [];
    items.value = refresh ? nextItems : [...items.value, ...nextItems];
    page.value = Number(result?.page) || targetPage;
    totalPages.value = Number(result?.totalPages) || 1;
    totalCount.value = Number(result?.total) || items.value.length;
    feedSourceCount.value = Number(result?.sourceCount) || feedSourceCount.value;
    feedTodayCount.value = Number(result?.todayCount) || feedTodayCount.value;
    fetchedAt.value = typeof result?.fetchedAt === "string" ? result.fetchedAt : new Date().toISOString();
    if (refresh && notify) {
      brokenImages.clear();
      toast.success("朋友圈已更新");
    }
    await restoreReadingPosition();
  } catch {
    if (!items.value.length) items.value = [];
    if (refresh && notify) toast.error("朋友圈更新失败，请稍后重试");
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}
function isNew(item: CircleItem) { return Boolean(reading.lastSeenAt) && Date.parse(item.publishedAt) > Date.parse(reading.lastSeenAt); }
function showNewDivider(index: number) {
  if (!newItemsCount.value || index <= 0) return false;
  return isNew(visibleFilteredItems.value[index - 1]) && !isNew(visibleFilteredItems.value[index]);
}
function showDateMarker(index: number) {
  const item = visibleFilteredItems.value[index];
  if (!item) return false;
  if (index === 0) return true;
  const previous = visibleFilteredItems.value[index - 1];
  return dateKey(previous.publishedAt) !== dateKey(item.publishedAt);
}
function dateKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}
function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知日期";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "今天";
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(date);
}
function dismissNewItems() { reading.lastSeenAt = items.value[0]?.publishedAt || new Date().toISOString(); persistReading(); }
function persistReading() { if (typeof window === "undefined") return; localStorage.setItem(readingKey, JSON.stringify({ lastSeenAt: reading.lastSeenAt })); }
async function restoreReadingPosition() { if (restoredPosition.value || typeof window === "undefined") return; restoredPosition.value = true; try { const stored = JSON.parse(localStorage.getItem(readingKey) || "{}"); reading.lastSeenAt = typeof stored.lastSeenAt === "string" ? stored.lastSeenAt : ""; } catch { /* ignore invalid local state */ } await nextTick(); }
function onCircleScroll() {
  persistReading();
}
function entryStyle(item: CircleItem, index: number) {
  const accents = ["var(--c-primary)", "#2b8b71", "#c47b34", "#c65468", "#397bb8"];
  let hash = index;
  for (const character of item.source.url) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return {
    "--entry-order": index,
    "--entry-accent": accents[Math.abs(hash) % accents.length],
  };
}
function onEntryImageError(id: string) {
  brokenImages.add(id);
}
function avatarFor(source: CircleSource) {
  return source.avatar || "/logo_64.png";
}
function onAvatarError(event: Event) {
  const image = event.target as HTMLImageElement;
  if (!image.src.endsWith("/logo_64.png")) image.src = "/logo_64.png";
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}
function relativeDate(value: string) {
  const now = clock.value;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const minutes = Math.max(0, Math.floor((now - time) / 60000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)} 天前`;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(new Date(time));
}
let clockTimer = 0;
let circleObserver: IntersectionObserver | null = null;
function setActiveFilter(key: CircleFilterKey) {
  activeFilter.value = key;
  void nextTick(() => circlePageRef.value?.scrollTo({ top: 0, behavior: "smooth" }));
}
function observeLoadMore() {
  circleObserver?.disconnect();
  if (!loadMoreRef.value || typeof IntersectionObserver === "undefined") return;
  circleObserver = new IntersectionObserver(() => {
    if (hasMore.value && !loadingMore.value) void loadFeed();
  }, { root: circlePageRef.value, rootMargin: "420px" });
  circleObserver.observe(loadMoreRef.value);
}
watch(activeFilter, () => {
  void nextTick(observeLoadMore);
});
onMounted(() => {
  void loadFeed(true, false);
  circlePageRef.value?.addEventListener("scroll", onCircleScroll, { passive: true });
  void nextTick(observeLoadMore);
  clockTimer = window.setInterval(() => {
    clock.value = Date.now();
  }, 60_000);
});
onUnmounted(() => {
  window.clearInterval(clockTimer);
  circleObserver?.disconnect();
  circlePageRef.value?.removeEventListener("scroll", onCircleScroll);
  persistReading();
});
useHead({ title: computed(() => `${config.title || "朋友圈"} · 风隅随笔`) });
</script>

<style scoped>
.circle-page {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  background: var(--c-bg);
  color: var(--c-text);
  overscroll-behavior: contain;
}
.circle-banner {
  position: relative;
  min-height: 190px;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, var(--c-bg-1), var(--c-primary-soft));
}
.circle-banner > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.banner-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--c-bg) 92%, transparent),
    color-mix(in srgb, var(--c-bg) 68%, transparent) 52%,
    color-mix(in srgb, var(--c-bg) 18%, transparent)
  );
}
.has-cover .banner-shade {
  background: linear-gradient(
    90deg,
    rgb(5 10 18 / 84%),
    rgb(5 10 18 / 56%) 55%,
    rgb(5 10 18 / 20%)
  );
}
.banner-inner {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(1040px, calc(100% - 48px));
  min-height: 190px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin: 0 auto;
  padding: 34px 0 28px;
}
.banner-copy > span,
.rail-kicker,
.stream-head span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.54rem;
  font-weight: 750;
}
.banner-copy h1 {
  margin: 8px 0 5px;
  font-family: var(--font-system-rounded);
  font-size: 2rem;
  line-height: 1.15;
  letter-spacing: 0;
}
.banner-copy p {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.72rem;
}
.has-cover .banner-copy h1 {
  color: #fff;
}
.has-cover .banner-copy p {
  color: rgb(255 255 255 / 76%);
}
.banner-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  padding: 7px 8px 7px 12px;
  border: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ld-bg-card) 82%, transparent);
  color: var(--c-text-3);
  font-size: 0.6rem;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.banner-meta strong {
  color: var(--c-text);
  font-family: var(--font-mono);
}
.banner-meta > i {
  width: 1px;
  height: 14px;
  background: var(--border);
}
.banner-meta button {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.58rem;
}
.banner-meta button:disabled {
  opacity: 0.65;
  cursor: wait;
}
.circle-layout {
  display: grid;
  width: min(1040px, calc(100% - 48px));
  grid-template-columns: minmax(0, 740px) minmax(210px, 1fr);
  gap: 38px;
  align-items: start;
  margin: 0 auto;
  padding: 30px 0 72px;
}
.circle-stream {
  min-width: 0;
}
.stream-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 0 0 14px 56px;
  border-bottom: 1px solid var(--border);
}
.stream-head h2,
.circle-rail h2 {
  margin: 4px 0 0;
  font-size: 0.92rem;
  letter-spacing: 0;
}
.stream-head time {
  color: var(--c-text-3);
  font-size: 0.55rem;
}
.stream-list {
  display: grid;
}
.stream-entry {
  --entry-accent: var(--c-primary);
  position: relative;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 16px;
  padding: 23px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  animation: stream-entry-in 0.46s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: min(calc(var(--entry-order) * 34ms), 240ms);
}
.stream-entry::before {
  position: absolute;
  top: 64px;
  bottom: -24px;
  left: 19px;
  width: 1px;
  background: linear-gradient(var(--border), transparent);
  content: "";
}
.stream-entry:last-child::before {
  display: none;
}
.source-avatar {
  position: relative;
  z-index: 1;
  display: block;
  width: 40px;
  height: 40px;
  padding: 2px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--entry-accent) 24%, var(--border));
  border-radius: 8px;
  background: var(--ld-bg-card);
  box-shadow:
    0 5px 14px color-mix(in srgb, var(--ld-shadow) 38%, transparent),
    0 0 0 3px color-mix(in srgb, var(--entry-accent) 5%, transparent);
}
.source-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
  object-fit: cover;
}
.entry-sequence {
  position: absolute;
  top: 67px;
  left: 0;
  width: 40px;
  color: color-mix(in srgb, var(--entry-accent) 54%, var(--c-text-3));
  font-family: var(--font-mono);
  font-size: 0.46rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.entry-content {
  min-width: 0;
}
.entry-head {
  display: flex;
  min-height: 40px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.entry-head > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.entry-head > div > a {
  color: var(--c-text);
  font-size: 0.72rem;
  font-weight: 720;
  text-decoration: none;
}
.entry-head time {
  color: var(--c-text-3);
  font-size: 0.54rem;
}
.entry-head > a {
  display: grid;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--c-text-3);
  text-decoration: none;
  place-items: center;
}
.entry-head > a:hover {
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.entry-body {
  display: block;
  margin-top: 8px;
  color: inherit;
  text-decoration: none;
}
.entry-body h3 {
  margin: 0;
  color: var(--c-text);
  font-size: 1rem;
  line-height: 1.55;
  letter-spacing: 0;
  text-wrap: pretty;
  transition: color 0.2s ease;
}
.entry-body:hover h3 {
  color: color-mix(in srgb, var(--entry-accent) 76%, var(--c-text));
}
.entry-body p {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  color: var(--c-text-2);
  font-size: 0.72rem;
  line-height: 1.82;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 20;
}
.entry-body figure {
  margin: 14px 0 0;
  aspect-ratio: 16/7;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--entry-accent) 7%, transparent), transparent),
    var(--c-bg-2);
}
.entry-body figure img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.45s var(--ui-ease-out);
}
.entry-body:hover figure img {
  transform: scale(1.025);
}
.entry-foot {
  display: flex;
  min-height: 30px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.entry-details {
  display: flex;
  min-width: 0;
  flex: 0 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: var(--circle-faint);
  font-size: 0.52rem;
}

.entry-details span,
.entry-details a {
  display: inline-flex;
  max-width: 150px;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  color: inherit;
  text-overflow: ellipsis;
  text-decoration: none;
  white-space: nowrap;
}

.entry-details a:hover {
  color: var(--entry-accent);
}

.entry-details svg {
  flex: 0 0 auto;
  font-size: 0.68rem;
}
.category-row {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 5px;
}
.category-row span {
  padding: 3px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--entry-accent) 9%, transparent);
  color: color-mix(in srgb, var(--entry-accent) 80%, var(--c-text));
  font-size: 0.52rem;
}
.entry-foot > a {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  color: var(--c-text-3);
  font-size: 0.56rem;
  text-decoration: none;
}
.entry-foot > a:hover {
  color: var(--entry-accent);
}
.circle-rail {
  position: sticky;
  top: 24px;
  display: grid;
  gap: 26px;
  padding-left: 24px;
  border-left: 1px solid var(--border);
}
.circle-rail section + section {
  padding-top: 23px;
  border-top: 1px solid var(--border);
}
.rail-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}
.rail-stats div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.rail-stats strong {
  font-family: var(--font-mono);
  font-size: 1.25rem;
}
.rail-stats small {
  color: var(--c-text-3);
  font-size: 0.54rem;
}
.source-list {
  display: grid;
  margin-top: 11px;
}
.source-list > a {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 14px;
  align-items: center;
  gap: 9px;
  padding: 9px 0;
  color: inherit;
  text-decoration: none;
}
.source-list img {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  object-fit: cover;
}
.source-list span {
  min-width: 0;
}
.source-list strong,
.source-list small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source-list strong {
  font-size: 0.63rem;
}
.source-list small {
  margin-top: 2px;
  color: var(--c-text-3);
  font-size: 0.5rem;
}
.source-list > a > svg {
  color: var(--c-text-3);
  font-size: 0.65rem;
}
.source-list > a:hover > svg {
  color: var(--c-primary);
}
.stream-state {
  display: grid;
  min-height: 360px;
  align-content: center;
  justify-items: center;
  gap: 8px;
  color: var(--c-text-3);
  text-align: center;
}
.stream-state > svg {
  color: var(--c-primary);
  font-size: 1.7rem;
}
.stream-state strong {
  color: var(--c-text);
  font-size: 0.78rem;
}
.stream-state span {
  font-size: 0.6rem;
}
.stream-loading > svg {
  animation: spin 0.9s linear infinite;
}
.circle-pagination {
  display: flex;
  width: max-content;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  gap: 3px;
  margin: 26px auto 0;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ld-bg-card) 90%, transparent);
  box-shadow:
    0 8px 24px color-mix(in srgb, #000 7%, var(--ld-shadow)),
    0 1px 0 color-mix(in srgb, #fff 48%, transparent) inset;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.circle-pagination button {
  width: 29px;
  height: 29px;
  display: grid;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-text-3);
  cursor: pointer;
  font: inherit;
  font-size: 0.58rem;
  font-variant-numeric: tabular-nums;
  place-items: center;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease;
}
.circle-pagination button:hover:not(:disabled),
.circle-pagination button.active {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}
.circle-pagination button.active {
  font-weight: 800;
  box-shadow: 0 3px 10px color-mix(in srgb, var(--c-primary) 15%, transparent);
}
.circle-pagination button:hover:not(:disabled) {
  transform: translateY(-1px);
}
.circle-pagination button:disabled {
  opacity: 0.3;
  cursor: default;
}
.feed-page-enter-active,
.feed-page-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.feed-page-enter-from {
  opacity: 0;
  transform: translate3d(0, 12px, 0);
}
.feed-page-leave-to {
  opacity: 0;
  transform: translate3d(0, -7px, 0);
}
.spin {
  animation: spin 0.8s linear infinite;
}
.reading-notice {
  display: flex;
  width: min(1040px, calc(100% - 48px));
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 18px auto 0;
  padding: 11px 14px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 28%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--c-primary-soft) 54%, var(--ld-bg-card));
  color: var(--c-text-2);
  font-size: .65rem;
}
.reading-notice span { display: inline-flex; align-items: center; gap: 7px; }
.reading-notice span svg { color: var(--c-primary); }
.reading-notice button { border: 0; background: transparent; color: var(--c-primary); cursor: pointer; font: inherit; font-size: .6rem; }
.new-divider { display: flex; align-items: center; gap: 12px; padding: 17px 0 3px 56px; color: var(--c-primary); font-family: var(--font-mono); font-size: .54rem; letter-spacing: .04em; }
.new-divider::before, .new-divider::after { height: 1px; background: color-mix(in srgb, var(--c-primary) 32%, var(--border)); content: ""; }
.new-divider::before { width: 22px; }
.new-divider::after { flex: 1; }
.load-more { display: flex; min-height: 56px; align-items: center; justify-content: center; color: var(--c-text-3); font-size: .58rem; }
.stream-entry { transition: background-color .22s ease, transform .22s ease; }
.stream-entry:hover { background: color-mix(in srgb, var(--c-primary-soft) 22%, transparent); }
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes stream-entry-in {
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (max-width: 900px) {
  .circle-banner {
    min-height: 172px;
  }
  .banner-inner,
  .circle-layout {
    width: min(760px, calc(100% - 32px));
  }
  .circle-layout {
    grid-template-columns: 1fr;
    gap: 26px;
    padding-top: 24px;
  }
  .circle-rail {
    position: static;
    grid-row: 1;
    grid-template-columns: 1fr 1fr;
    padding: 0 0 18px;
    border: 0;
    border-bottom: 1px solid var(--border);
  }
  .circle-rail section + section {
    padding: 0 0 0 20px;
    border-top: 0;
    border-left: 1px solid var(--border);
  }
  .source-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 16px;
  }
}
@media (max-width: 640px) {
  .reading-notice { width: calc(100% - 32px); align-items: flex-start; flex-direction: column; gap: 7px; }
  .circle-banner {
    min-height: 220px;
  }
  .banner-inner {
    width: calc(100% - 32px);
    min-height: 220px;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 17px;
    padding: 76px 0 20px;
  }
  .banner-copy h1 {
    font-size: 1.55rem;
  }
  .banner-meta {
    width: 100%;
    justify-content: flex-start;
  }
  .banner-meta button {
    margin-left: auto;
  }
  .circle-layout {
    width: calc(100% - 32px);
    padding: 20px 0 96px;
  }
  .circle-rail {
    grid-template-columns: 1fr;
  }
  .circle-rail section + section {
    display: none;
  }
  .stream-head {
    padding-left: 0;
  }
  .new-divider { padding-left: 45px; }
  .stream-entry {
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 11px;
    padding: 19px 0;
  }
  .source-avatar {
    width: 34px;
    height: 34px;
    border-radius: 7px;
  }
  .stream-entry::before {
    top: 55px;
    left: 16px;
  }
  .entry-sequence {
    top: 58px;
    width: 34px;
  }
  .entry-head {
    min-height: 34px;
  }
  .entry-body {
    margin-top: 7px;
  }
  .entry-body h3 {
    font-size: 0.9rem;
  }
  .entry-body p {
    font-size: 0.68rem;
    -webkit-line-clamp: 20;
  }
  .entry-body figure {
    aspect-ratio: 4/3;
  }
  .entry-foot {
    align-items: flex-end;
  }
  .category-row span:nth-child(n + 3) {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spin,
  .stream-entry {
    animation: none;
  }
  .entry-body figure img,
  .feed-page-enter-active,
  .feed-page-leave-active,
  .circle-pagination button {
    transition: none;
  }
}

/* Detail states keep the stream calm while making every interaction explicit. */
.circle-stage,
.circle-toolbar,
.circle-layout,
.reading-notice {
  contain: layout style;
}

.circle-stage :where(button, a),
.circle-toolbar :where(button, a),
.circle-layout :where(button, a) {
  -webkit-tap-highlight-color: transparent;
}

.circle-stage :where(a),
.circle-toolbar :where(a),
.circle-layout :where(a) {
  text-underline-offset: 3px;
}

.circle-stage :where(a):focus-visible,
.circle-toolbar :where(a):focus-visible,
.circle-layout :where(a):focus-visible {
  outline: 2px solid var(--circle-accent);
  outline-offset: 4px;
}

.stage-copy,
.stage-tags,
.stage-orbit,
.cover-gallery {
  animation: circle-copy-in 0.72s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.stage-tags {
  animation-delay: 80ms;
}

.stage-orbit {
  animation-delay: 140ms;
}

.cover-gallery {
  animation-delay: 220ms;
}

@keyframes circle-copy-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stage-with-cover .stage-glass {
  background: linear-gradient(112deg, rgb(7 14 19 / 80%), rgb(7 14 19 / 32%) 62%, transparent);
}

.stage-with-cover .stage-tags svg {
  color: #f2c783;
}

.stage-with-cover .stage-refresh {
  border-color: rgb(255 255 255 / 28%);
  background: rgb(7 14 19 / 26%);
  color: #fff;
}

.stage-with-cover .stage-refresh:hover:not(:disabled) {
  border-color: #f2c783;
  background: rgb(242 199 131 / 16%);
  color: #f2c783;
}

.stage-with-cover .orbit-ring {
  border-color: rgb(242 199 131 / 54%);
}

.stage-with-cover .orbit-ring::after {
  border-color: rgb(255 255 255 / 30%);
}

.stage-with-cover .orbit-core {
  border-color: rgb(242 199 131 / 58%);
  background: rgb(7 14 19 / 46%);
  color: #f2c783;
}

.stage-with-cover .orbit-dot {
  background: #f2c783;
  box-shadow: 0 0 0 5px rgb(242 199 131 / 18%);
}

.stage-with-cover .dot-two {
  background: #f6e2bd;
}

.stage-with-cover .gallery-thumb {
  border-color: rgb(255 255 255 / 22%);
}

.stage-with-cover .gallery-thumb.active {
  border-color: #f2c783;
}

.circle-toolbar::before {
  display: block;
  width: 42px;
  height: 3px;
  margin-bottom: 18px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--circle-accent), color-mix(in srgb, var(--circle-accent) 14%, transparent));
  content: "";
}

.toolbar-heading {
  min-width: 0;
}

.toolbar-heading .eyebrow {
  white-space: nowrap;
}

.toolbar-heading h2::after {
  display: inline-block;
  width: 5px;
  height: 5px;
  margin: 0 0 2px 8px;
  border-radius: 50%;
  background: var(--circle-accent);
  content: "";
  vertical-align: middle;
}

.filter-pills button svg {
  flex: 0 0 auto;
  font-size: 0.8rem;
}

.filter-pills button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.filter-pills button.active:hover {
  background: color-mix(in srgb, var(--circle-accent) 20%, transparent);
  transform: none;
}

.circle-stream[aria-busy="true"] {
  cursor: progress;
}

.stream-entry.is-featured {
  padding-top: 26px;
}

.stream-entry.is-featured .entry-body h3 {
  font-size: clamp(1.1rem, 2.2vw, 1.42rem);
}

.stream-entry.is-featured .source-avatar {
  box-shadow: 0 8px 20px color-mix(in srgb, var(--entry-accent) 15%, transparent);
}

.stream-entry.has-image .entry-body p {
  -webkit-line-clamp: 20;
}

.stream-entry:not(.has-image) .entry-body figure {
  display: none;
}

.entry-head,
.entry-body,
.entry-foot {
  min-width: 0;
}

.entry-source {
  line-height: 1.35;
}

.entry-source > a:focus-visible,
.entry-open:focus-visible,
.entry-read:focus-visible,
.source-avatar:focus-visible,
.source-list > a:focus-visible {
  outline: 2px solid var(--entry-accent, var(--circle-accent));
  outline-offset: 3px;
}

.entry-body h3,
.entry-body p,
.entry-foot,
.entry-source > a {
  overflow-wrap: anywhere;
}

.entry-body figure:empty {
  display: none;
}

.entry-body figure img[src=""] {
  display: none;
}

.entry-body figure img:not([src]) {
  display: none;
}

.entry-body figcaption svg {
  flex: 0 0 auto;
}

.category-row span {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-read svg {
  flex: 0 0 auto;
  font-size: 0.72rem;
}

.date-marker span {
  flex: 0 0 auto;
  font-weight: 700;
}

.date-marker i {
  min-width: 24px;
}

.new-divider span {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  padding: 3px 7px;
  border: 1px solid color-mix(in srgb, var(--circle-accent) 24%, transparent);
  border-radius: 999px;
  background: var(--circle-accent-soft);
}

.new-divider span svg {
  font-size: 0.7rem;
}

.new-divider::before {
  flex: 0 0 auto;
}

.new-divider::after {
  min-width: 20px;
}

.entry-node::after {
  position: absolute;
  inset: -3px;
  border: 1px solid color-mix(in srgb, var(--entry-accent) 28%, transparent);
  border-radius: inherit;
  content: "";
  opacity: 0;
  transform: scale(0.7);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.stream-entry:hover .entry-node::after {
  opacity: 1;
  transform: scale(1);
}

.rail-panel {
  min-width: 0;
}

.rail-panel-head .eyebrow {
  font-size: 0.52rem;
}

.rail-signal {
  position: relative;
  overflow: hidden;
}

.rail-signal::before {
  position: absolute;
  top: -34px;
  right: -34px;
  width: 92px;
  height: 92px;
  border: 1px solid color-mix(in srgb, var(--circle-accent) 26%, transparent);
  border-radius: 50%;
  box-shadow: 0 0 0 12px color-mix(in srgb, var(--circle-accent) 6%, transparent), 0 0 0 24px color-mix(in srgb, var(--circle-accent) 4%, transparent);
  content: "";
  pointer-events: none;
}

.rail-signal::after {
  position: absolute;
  top: 17px;
  right: 18px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--circle-accent);
  box-shadow: 0 0 0 5px var(--circle-accent-soft);
  content: "";
}

.signal-bars i:nth-child(1) {
  animation-delay: 40ms;
}

.signal-bars i:nth-child(2) {
  animation-delay: 80ms;
}

.signal-bars i:nth-child(3) {
  animation-delay: 120ms;
}

.signal-bars i:nth-child(4) {
  animation-delay: 160ms;
}

.signal-bars i:nth-child(5) {
  animation-delay: 200ms;
}

.signal-bars i:nth-child(6) {
  animation-delay: 240ms;
}

.signal-bars i:nth-child(7) {
  animation-delay: 280ms;
}

.source-list > a {
  border-radius: 9px;
  transition: background-color 0.2s ease, padding-inline 0.2s ease;
}

.source-list > a:hover {
  padding-inline: 7px;
  background: color-mix(in srgb, var(--circle-accent) 6%, transparent);
}

.source-list > a:hover .source-copy strong {
  color: var(--circle-accent);
}

.source-list > a:active {
  background: color-mix(in srgb, var(--circle-accent) 10%, transparent);
}

.source-list:empty::before {
  color: var(--circle-faint);
  content: "暂无活跃来源";
  font-size: 0.6rem;
}

.rail-note::before {
  width: 28px;
  height: 2px;
  border-radius: 999px;
  background: #d58a50;
  content: "";
}

.load-more {
  border-bottom: 1px solid transparent;
}

.load-more[aria-busy="true"] {
  color: var(--circle-accent);
}

.end-mark {
  padding: 7px 10px;
  border: 1px solid var(--circle-line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--circle-panel) 80%, transparent);
}

.stream-state button:focus-visible,
.reading-notice button:focus-visible {
  outline: 2px solid var(--circle-accent);
  outline-offset: 3px;
}

.stream-loading .loading-mark {
  filter: drop-shadow(0 4px 8px color-mix(in srgb, var(--circle-accent) 18%, transparent));
}

.stream-empty .empty-mark {
  box-shadow: 0 0 0 12px color-mix(in srgb, var(--circle-accent) 4%, transparent);
}

.circle-page[data-theme="dark"] .stage-glass {
  background: linear-gradient(110deg, rgb(4 9 12 / 90%), rgb(4 9 12 / 48%) 62%, transparent);
}

.circle-page[data-theme="dark"] .circle-stage::before {
  opacity: 0.24;
}

.circle-page[data-theme="dark"] .entry-body figure {
  background: color-mix(in srgb, #10191c 82%, var(--c-bg));
}

.circle-page[data-theme="dark"] .reading-notice {
  background: color-mix(in srgb, var(--circle-accent) 11%, var(--c-bg));
}

@media (min-width: 1280px) {
  .circle-stage {
    min-height: 360px;
  }

  .stage-copy h1 {
    font-size: 4.8rem;
  }

  .stage-orbit {
    width: 300px;
    height: 300px;
  }

  .circle-layout {
    grid-template-columns: minmax(0, 1fr) 228px;
  }

  .entry-body p {
    max-width: 720px;
  }
}

@media (min-width: 1600px) {
  .circle-page {
    --circle-max: 1260px;
  }

  .circle-layout {
    gap: 94px;
  }

  .circle-rail {
    padding-left: 32px;
  }
}

@media (max-width: 1040px) {
  .stage-copy h1 {
    font-size: clamp(2.5rem, 7vw, 4.5rem);
  }

  .circle-layout {
    width: min(var(--circle-max), calc(100% - var(--circle-gutter) * 2));
  }

  .entry-body p {
    max-width: 620px;
  }
}

@media (max-width: 820px) {
  .circle-toolbar::before {
    margin-bottom: 14px;
  }

  .circle-layout {
    padding-bottom: 78px;
  }

  .circle-rail .rail-panel {
    padding-bottom: 0;
  }

  .rail-signal p {
    max-width: 260px;
  }
}

@media (max-width: 620px) {
  .circle-page {
    overscroll-behavior-x: none;
  }

  .circle-stage::before {
    background-size: 30px 30px;
  }

  .stage-glass {
    background: linear-gradient(180deg, color-mix(in srgb, var(--c-bg) 74%, transparent), color-mix(in srgb, var(--c-bg) 88%, transparent));
  }

  .stage-with-cover .stage-glass {
    background: linear-gradient(180deg, rgb(7 14 19 / 42%), rgb(7 14 19 / 82%));
  }

  .stage-topline .eyebrow {
    max-width: calc(100% - 50px);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stage-tags {
    max-width: 82%;
    gap: 7px 13px;
  }

  .stage-tags span {
    font-size: 0.55rem;
  }

  .circle-toolbar {
    padding-top: 34px;
  }

  .toolbar-heading h2 {
    font-size: 1.18rem;
  }

  .circle-stream {
    padding-top: 18px;
  }

  .stream-entry.is-featured {
    padding-top: 21px;
  }

  .stream-entry.is-featured .entry-body h3 {
    font-size: 1.05rem;
  }

  .entry-label {
    margin-bottom: 4px;
  }

  .featured-label {
    font-size: 0.46rem;
  }

  .entry-index {
    font-size: 0.46rem;
  }

  .entry-body figcaption {
    right: 7px;
    bottom: 7px;
    padding: 3px 5px;
    font-size: 0.46rem;
  }

  .new-divider span {
    padding: 2px 6px;
  }

  .date-marker {
    padding-top: 20px;
  }

  .rail-signal {
    padding-bottom: 18px;
  }

  .signal-value {
    margin-top: 16px;
  }

  .signal-value strong {
    font-size: 2rem;
  }

  .signal-bars {
    height: 44px;
    margin-top: 12px;
  }

  .load-more {
    min-height: 62px;
  }
}

@media (max-width: 380px) {
  .circle-page {
    --circle-gutter: 13px;
  }

  .stage-copy h1 {
    font-size: 2.45rem;
  }

  .stage-orbit {
    right: -42px;
    opacity: 0.62;
  }

  .stage-tags {
    max-width: 100%;
  }

  .filter-pills button {
    gap: 4px;
    font-size: 0.56rem;
  }

  .filter-pills button svg {
    font-size: 0.72rem;
  }

  .stream-entry {
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 10px;
  }

  .source-avatar {
    width: 32px;
    height: 32px;
  }

  .entry-spine::after {
    top: 38px;
  }

  .entry-source > a {
    max-width: 42vw;
  }

  .entry-body h3 {
    font-size: 0.9rem;
  }

  .entry-foot {
    gap: 8px;
  }

  .entry-read {
    max-width: 76px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .date-marker,
  .new-divider {
    padding-left: 42px;
  }
}

@media (orientation: landscape) and (max-height: 560px) {
  .circle-stage {
    min-height: 340px;
  }

  .stage-main {
    padding-block: 40px 30px;
  }

  .stage-copy h1 {
    font-size: clamp(2.1rem, 8vh, 3.7rem);
  }

  .stage-orbit {
    width: 150px;
    height: 150px;
  }
}

@media (hover: none) {
  .stream-entry:hover {
    background: transparent;
  }

  .source-list > a:hover {
    padding-inline: 0;
    background: transparent;
  }

  .entry-body:hover figure img {
    filter: none;
    transform: none;
  }
}

@media print {
  .circle-page {
    overflow: visible;
    background: #fff;
    color: #111;
  }

  .stage-backdrop,
  .stage-orbit,
  .stage-refresh,
  .reading-notice,
  .filter-pills,
  .circle-rail,
  .entry-open,
  .entry-read,
  .load-more {
    display: none !important;
  }

  .circle-stage {
    min-height: auto;
    border-bottom: 2px solid #111;
    background: #fff;
  }

  .stage-glass,
  .circle-stage::before {
    display: none;
  }

  .stage-inner {
    width: 100%;
    min-height: auto;
    padding: 24px 0;
  }

  .stage-main {
    padding: 30px 0 0;
  }

  .stage-copy h1,
  .stage-copy p,
  .stage-tags span,
  .eyebrow {
    color: #111 !important;
  }

  .circle-toolbar,
  .circle-layout {
    width: 100%;
  }

  .circle-toolbar {
    padding-top: 22px;
  }

  .circle-layout {
    display: block;
  }

  .stream-entry {
    break-inside: avoid;
    border-bottom-color: #bbb;
  }

  .entry-body h3,
  .entry-body p,
  .entry-source > a,
  .entry-source time {
    color: #111;
  }

  .entry-body figure {
    border-color: #bbb;
  }
}

/* stage-orbit is a live signal marker rather than a static illustration. */
.stage-orbit {
  animation: orbit-entrance 0.72s cubic-bezier(0.16, 1, 0.3, 1) both, orbit-float 8s ease-in-out 0.72s infinite;
  transform-origin: 50% 50%;
}

.stage-orbit .ring-one {
  animation: orbit-spin 18s linear infinite;
}

.stage-orbit .ring-two {
  animation: orbit-spin-reverse 12s linear infinite;
}

.stage-orbit .orbit-core {
  animation: orbit-core-pulse 3.2s ease-in-out infinite;
}

.stage-orbit .dot-one {
  animation: orbit-dot-one 7s ease-in-out infinite;
}

.stage-orbit .dot-two {
  animation: orbit-dot-two 9s ease-in-out -2s infinite;
}

@keyframes orbit-entrance {
  from {
    opacity: 0;
    transform: scale(0.72) rotate(-14deg);
  }
  to {
    opacity: 0.92;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes orbit-float {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(0, -8px, 0);
  }
}

@keyframes orbit-spin {
  from {
    transform: rotate(-24deg) scaleY(0.74);
  }
  to {
    transform: rotate(336deg) scaleY(0.74);
  }
}

@keyframes orbit-spin-reverse {
  from {
    transform: rotate(36deg) scaleY(0.62);
  }
  to {
    transform: rotate(-324deg) scaleY(0.62);
  }
}

@keyframes orbit-core-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 10px color-mix(in srgb, var(--circle-accent) 8%, transparent), 0 16px 40px rgb(0 0 0 / 12%);
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    box-shadow: 0 0 0 17px color-mix(in srgb, var(--circle-accent) 4%, transparent), 0 20px 48px rgb(0 0 0 / 16%);
    transform: translate(-50%, -50%) scale(1.06);
  }
}

@keyframes orbit-dot-one {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  25% {
    transform: translate3d(-8px, 8px, 0) scale(0.82);
  }
  50% {
    transform: translate3d(-16px, 0, 0) scale(1.16);
  }
  75% {
    transform: translate3d(-5px, -9px, 0) scale(0.88);
  }
}

@keyframes orbit-dot-two {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(0.9);
  }
  33% {
    transform: translate3d(10px, -6px, 0) scale(1.18);
  }
  66% {
    transform: translate3d(17px, 5px, 0) scale(0.76);
  }
}

@media (prefers-reduced-motion: reduce) {
  .stage-orbit,
  .stage-orbit .ring-one,
  .stage-orbit .ring-two,
  .stage-orbit .orbit-core,
  .stage-orbit .dot-one,
  .stage-orbit .dot-two {
    animation: none;
  }
}

/* -------------------------------------------------------------------------- */
/* Circle redesign: editorial signal stream                                   */
/* -------------------------------------------------------------------------- */
.circle-page {
  --circle-max: 1180px;
  --circle-gutter: clamp(18px, 4vw, 54px);
  --circle-ink: var(--c-text);
  --circle-muted: var(--c-text-2);
  --circle-faint: var(--c-text-3);
  --circle-line: color-mix(in srgb, var(--border) 78%, transparent);
  --circle-panel: color-mix(in srgb, var(--ld-bg-card) 94%, transparent);
  --circle-panel-soft: color-mix(in srgb, var(--c-bg-2) 72%, var(--ld-bg-card));
  --circle-accent: var(--c-primary);
  --circle-accent-soft: color-mix(in srgb, var(--c-primary) 14%, transparent);
  --circle-radius-lg: 22px;
  --circle-radius-md: 14px;
  --circle-radius-sm: 8px;
  position: relative;
  isolation: isolate;
  scrollbar-color: color-mix(in srgb, var(--c-primary) 42%, var(--border)) transparent;
  scrollbar-width: thin;
}

.circle-page::-webkit-scrollbar {
  width: 8px;
}

.circle-page::-webkit-scrollbar-track {
  background: transparent;
}

.circle-page::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-primary) 42%, var(--border));
  background-clip: padding-box;
}

/* 页面保留滚动能力，但不显示额外的滚动条轨道。 */
.circle-page {
  scrollbar-width: none;
}

.circle-page::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.circle-stage {
  position: relative;
  min-height: clamp(280px, 30vw, 360px);
  overflow: hidden;
  border-bottom: 1px solid var(--circle-line);
  background:
    radial-gradient(circle at 83% 24%, color-mix(in srgb, var(--c-primary) 20%, transparent), transparent 28%),
    radial-gradient(circle at 15% 82%, color-mix(in srgb, #d58a50 13%, transparent), transparent 30%),
    var(--c-bg-2);
}

.circle-stage::before {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  background-image: linear-gradient(var(--circle-line) 1px, transparent 1px), linear-gradient(90deg, var(--circle-line) 1px, transparent 1px);
  background-size: 42px 42px;
  content: "";
  mask-image: linear-gradient(90deg, #000, transparent 72%);
}

.stage-backdrop {
  position: absolute;
  inset: -10%;
  background-position: center;
  background-size: cover;
  filter: saturate(0.88) contrast(0.92);
  opacity: 0;
  transform: scale(1.04);
  transition: opacity 0.7s ease, transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.stage-with-cover .stage-backdrop {
  opacity: 0.74;
  transform: scale(1);
}

.stage-with-cover .stage-backdrop::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, rgb(8 14 18 / 88%), rgb(8 14 18 / 46%) 54%, rgb(8 14 18 / 20%));
  content: "";
}

.stage-glass {
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, color-mix(in srgb, var(--c-bg) 88%, transparent), color-mix(in srgb, var(--c-bg) 40%, transparent) 58%, transparent 100%);
  pointer-events: none;
}

.stage-inner {
  position: relative;
  z-index: 1;
  display: grid;
  width: min(var(--circle-max), calc(100% - var(--circle-gutter) * 2));
  min-height: inherit;
  grid-template-rows: auto 1fr auto;
  margin: 0 auto;
  padding: clamp(24px, 5vw, 54px) 0 clamp(24px, 4vw, 42px);
}

.stage-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--circle-accent);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  line-height: 1;
  text-transform: uppercase;
}

.stage-with-cover .eyebrow {
  color: #f2c783;
}

.stage-refresh {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--circle-accent) 30%, var(--circle-line));
  border-radius: 999px;
  background: color-mix(in srgb, var(--ld-bg-card) 66%, transparent);
  color: var(--circle-ink);
  cursor: pointer;
  font: inherit;
  font-size: 0.63rem;
  font-weight: 650;
  backdrop-filter: blur(16px);
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.stage-refresh:hover:not(:disabled) {
  border-color: var(--circle-accent);
  background: var(--circle-accent-soft);
  color: var(--circle-accent);
  transform: translateY(-1px);
}

.stage-refresh:focus-visible {
  outline: 2px solid var(--circle-accent);
  outline-offset: 3px;
}

.stage-refresh:disabled {
  cursor: wait;
  opacity: 0.66;
}

.stage-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  padding: clamp(30px, 4vw, 54px) 0 clamp(24px, 4vw, 42px);
}

.stage-copy {
  max-width: 680px;
}

.stage-copy h1 {
  margin: 18px 0 12px;
  color: var(--circle-ink);
  font-family: var(--font-system-rounded);
  font-size: clamp(2.4rem, 6vw, 5.6rem);
  font-weight: 800;
  letter-spacing: 0;
  line-height: 0.98;
  text-wrap: balance;
}

.stage-with-cover .stage-copy h1,
.stage-with-cover .stage-copy p,
.stage-with-cover .stage-tags span {
  color: #fff;
}

.stage-copy p {
  max-width: 540px;
  margin: 0;
  color: var(--circle-muted);
  font-size: clamp(0.8rem, 1.45vw, 1rem);
  line-height: 1.8;
}

.stage-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 24px;
}

.stage-tags span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--circle-muted);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-variant-numeric: tabular-nums;
}

.stage-tags svg {
  color: var(--circle-accent);
  font-size: 0.78rem;
}

.stage-orbit {
  position: relative;
  width: clamp(150px, 25vw, 280px);
  height: clamp(150px, 25vw, 280px);
  flex: 0 0 auto;
  opacity: 0.92;
}

.orbit-ring {
  position: absolute;
  inset: 8%;
  border: 1px solid color-mix(in srgb, var(--circle-accent) 44%, transparent);
  border-radius: 50%;
  transform: rotate(-24deg) scaleY(0.74);
}

.orbit-ring::after {
  position: absolute;
  inset: 13%;
  border: 1px dashed color-mix(in srgb, var(--circle-accent) 34%, transparent);
  border-radius: inherit;
  content: "";
}

.ring-two {
  inset: 21%;
  border-color: color-mix(in srgb, #d58a50 46%, transparent);
  transform: rotate(36deg) scaleY(0.62);
}

.ring-two::after {
  inset: 16%;
  border-style: solid;
  border-color: color-mix(in srgb, #d58a50 30%, transparent);
}

.orbit-core {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  width: 54px;
  height: 54px;
  border: 1px solid color-mix(in srgb, var(--circle-accent) 50%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--ld-bg-card) 80%, transparent);
  color: var(--circle-accent);
  place-items: center;
  box-shadow: 0 0 0 10px color-mix(in srgb, var(--circle-accent) 8%, transparent), 0 16px 40px rgb(0 0 0 / 12%);
  transform: translate(-50%, -50%);
  backdrop-filter: blur(12px);
}

.orbit-core svg {
  font-size: 1.35rem;
}

.orbit-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--circle-accent);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--circle-accent) 14%, transparent);
}

.dot-one {
  top: 15%;
  right: 19%;
}

.dot-two {
  bottom: 17%;
  left: 12%;
  background: #d58a50;
  box-shadow: 0 0 0 5px color-mix(in srgb, #d58a50 14%, transparent);
}

.cover-gallery {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 42px;
}

.gallery-label {
  flex: 0 0 auto;
  color: var(--circle-faint);
  font-family: var(--font-mono);
  font-size: 0.5rem;
  letter-spacing: 0.12em;
}

.stage-with-cover .gallery-label {
  color: rgb(255 255 255 / 64%);
}

.gallery-track {
  display: flex;
  min-width: 0;
  gap: 7px;
  overflow: hidden;
}

.gallery-thumb {
  display: block;
  width: 48px;
  height: 30px;
  flex: 0 0 48px;
  border: 1px solid var(--circle-line);
  border-radius: 6px;
  background-position: center;
  background-size: cover;
  opacity: 0.58;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.gallery-thumb.active {
  border-color: var(--circle-accent);
  opacity: 1;
  transform: translateY(-2px);
}

.reading-notice {
  position: relative;
  z-index: 2;
  display: flex;
  width: min(var(--circle-max), calc(100% - var(--circle-gutter) * 2));
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 18px auto -1px;
  padding: 9px 14px;
  border: 1px solid color-mix(in srgb, var(--circle-accent) 28%, var(--circle-line));
  border-radius: 11px;
  background: color-mix(in srgb, var(--circle-accent-soft) 72%, var(--circle-panel));
  color: var(--circle-muted);
  font-size: 0.66rem;
  box-shadow: 0 8px 24px rgb(0 0 0 / 5%);
}

.reading-notice > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.reading-notice > span svg {
  color: var(--circle-accent);
}

.reading-notice strong {
  color: var(--circle-accent);
  font-family: var(--font-mono);
}

.reading-notice button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 6px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--circle-accent);
  cursor: pointer;
  font: inherit;
  font-size: 0.6rem;
  transition: background-color 0.2s ease;
}

.reading-notice button:hover {
  background: var(--circle-accent-soft);
}

.circle-toolbar {
  width: min(var(--circle-max), calc(100% - var(--circle-gutter) * 2));
  margin: 0 auto;
  padding: clamp(28px, 5vw, 54px) 0 0;
}

.toolbar-inner {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--circle-line);
}

.toolbar-heading h2 {
  margin: 8px 0 0;
  color: var(--circle-ink);
  font-size: clamp(1.1rem, 2vw, 1.45rem);
  font-weight: 760;
  letter-spacing: 0;
}

.stream-overview {
  margin: 8px 0 0;
  color: var(--circle-faint);
  font-size: 0.58rem;
  line-height: 1.5;
}

.filter-pills {
  display: flex;
  max-width: 100%;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px;
  padding: 4px;
  border: 1px solid var(--circle-line);
  border-radius: 999px;
  background: var(--circle-panel);
}

.filter-pills button {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--circle-faint);
  cursor: pointer;
  font: inherit;
  font-size: 0.61rem;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.filter-pills button:hover {
  color: var(--circle-ink);
  transform: translateY(-1px);
}

.filter-pills button.active {
  background: var(--circle-accent-soft);
  color: var(--circle-accent);
  font-weight: 720;
}

.filter-pills button:focus-visible {
  outline: 2px solid var(--circle-accent);
  outline-offset: 2px;
}

.filter-pills button small {
  min-width: 16px;
  padding: 1px 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--circle-faint) 12%, transparent);
  color: inherit;
  font-family: var(--font-mono);
  font-size: 0.48rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.filter-pills button.active small {
  background: color-mix(in srgb, var(--circle-accent) 18%, transparent);
}

.circle-layout {
  width: min(var(--circle-max), calc(100% - var(--circle-gutter) * 2));
  grid-template-columns: minmax(0, 1fr) minmax(196px, 228px);
  gap: clamp(24px, 4vw, 52px);
  padding: 0 0 100px;
}

.circle-stream {
  min-width: 0;
  padding-top: 18px;
}

.stream-list {
  display: grid;
}

.date-marker {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 0 6px 58px;
  color: var(--circle-faint);
  font-family: var(--font-mono);
  font-size: 0.54rem;
  letter-spacing: 0.06em;
}

.date-marker i {
  display: block;
  height: 1px;
  flex: 1;
  background: var(--circle-line);
}

.new-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 0 4px 58px;
  color: var(--circle-accent);
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.08em;
}

.new-divider::before,
.new-divider::after {
  height: 1px;
  background: color-mix(in srgb, var(--circle-accent) 34%, var(--circle-line));
  content: "";
}

.new-divider::before {
  width: 20px;
}

.new-divider::after {
  flex: 1;
}

.stream-entry {
  --entry-accent: var(--circle-accent);
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 18px;
  padding: 24px 0 28px;
  border-bottom: 1px solid var(--circle-line);
  background: transparent;
  animation: circle-entry-in 0.5s both;
  animation-delay: min(calc(var(--entry-order) * 30ms), 260ms);
}

.stream-entry:hover {
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--entry-accent) 4%, transparent) 12%, transparent);
}

.entry-spine {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.entry-spine::after {
  position: absolute;
  top: 48px;
  bottom: -28px;
  left: 50%;
  width: 1px;
  background: linear-gradient(var(--circle-line), transparent);
  content: "";
}

.stream-entry:last-child .entry-spine::after {
  display: none;
}

.source-avatar {
  position: relative;
  z-index: 1;
  display: grid;
  width: 42px;
  height: 42px;
  padding: 3px;
  border: 1px solid color-mix(in srgb, var(--entry-accent) 42%, var(--circle-line));
  border-radius: 12px;
  background: var(--circle-panel);
  box-shadow: 0 8px 18px rgb(0 0 0 / 7%);
  place-items: center;
  transition: transform 0.25s ease, border-color 0.25s ease;
}

.source-avatar:hover {
  border-color: var(--entry-accent);
  transform: translateY(-2px) rotate(-2deg);
}

.source-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  object-fit: cover;
}

.entry-node {
  position: absolute;
  right: -4px;
  bottom: -2px;
  width: 8px;
  height: 8px;
  border: 2px solid var(--c-bg);
  border-radius: 50%;
  background: var(--entry-accent);
}

.entry-content {
  min-width: 0;
}

.entry-head {
  display: flex;
  height: 30px;
  min-height: 30px;
  max-height: 30px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.entry-source {
  display: flex;
  flex-direction: row;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.entry-head > .entry-source {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.entry-source > a {
  max-width: 240px;
  overflow: hidden;
  color: var(--circle-ink);
  font-size: 0.75rem;
  font-weight: 760;
  text-overflow: ellipsis;
  text-decoration: none;
  white-space: nowrap;
}

.entry-source > a:hover {
  color: var(--entry-accent);
}

.source-badge {
  padding: 2px 5px;
  border: 1px solid color-mix(in srgb, var(--entry-accent) 26%, transparent);
  border-radius: 4px;
  color: var(--entry-accent);
  font-family: var(--font-mono);
  font-size: 0.46rem;
  letter-spacing: 0.05em;
}

.entry-source time {
  flex: 0 0 auto;
  color: var(--circle-faint);
  font-size: 0.55rem;
}

.entry-open {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--circle-faint);
  place-items: center;
  text-decoration: none;
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}

.entry-open:hover {
  border-color: color-mix(in srgb, var(--entry-accent) 26%, transparent);
  background: var(--circle-accent-soft);
  color: var(--entry-accent);
}

.entry-body {
  display: block;
  margin-top: 6px;
  color: inherit;
  text-decoration: none;
}

.entry-label {
  display: flex;
  min-height: 0;
  max-height: 20px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 3px;
  overflow: hidden;
  line-height: 1;
}

.featured-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--entry-accent);
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.entry-index {
  margin-left: auto;
  color: color-mix(in srgb, var(--entry-accent) 56%, var(--circle-faint));
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-variant-numeric: tabular-nums;
}

.entry-body h3 {
  margin: 0;
  color: var(--circle-ink);
  font-size: clamp(1rem, 1.8vw, 1.22rem);
  font-weight: 750;
  letter-spacing: 0;
  line-height: 1.5;
  text-wrap: pretty;
  transition: color 0.2s ease;
}

.entry-body:hover h3 {
  color: var(--entry-accent);
}

.entry-body p {
  display: -webkit-box;
  max-width: 680px;
  margin: 9px 0 0;
  overflow: hidden;
  color: var(--circle-muted);
  font-size: 0.72rem;
  line-height: 1.8;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 20;
}

.entry-body figure {
  position: relative;
  margin: 16px 0 0;
  aspect-ratio: 16 / 8;
  overflow: hidden;
  border: 1px solid var(--circle-line);
  border-radius: var(--circle-radius-md);
  background: var(--circle-panel-soft);
}

.entry-body figure::after {
  position: absolute;
  inset: 0;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: inherit;
  content: "";
  pointer-events: none;
}

.entry-body figure img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), filter 0.35s ease;
}

.entry-body:hover figure img {
  filter: saturate(1.04);
  transform: scale(1.035);
}

.entry-body figcaption {
  position: absolute;
  right: 10px;
  bottom: 9px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 7px;
  border: 1px solid rgb(255 255 255 / 16%);
  border-radius: 5px;
  background: rgb(0 0 0 / 38%);
  color: rgb(255 255 255 / 80%);
  font-size: 0.5rem;
  backdrop-filter: blur(8px);
}

.entry-foot {
  display: none;
  min-height: 28px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 14px;
}

.category-row {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 5px;
}

.category-row span {
  padding: 3px 6px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--entry-accent) 9%, transparent);
  color: color-mix(in srgb, var(--entry-accent) 84%, var(--circle-muted));
  font-size: 0.52rem;
  line-height: 1.2;
}

.category-row .quiet-tag {
  color: var(--circle-faint);
  background: color-mix(in srgb, var(--circle-faint) 8%, transparent);
}

.entry-read {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  color: var(--circle-faint);
  font-size: 0.57rem;
  text-decoration: none;
  transition: color 0.2s ease, gap 0.2s ease;
}

.entry-read:hover {
  color: var(--entry-accent);
  gap: 8px;
}

.circle-rail {
  position: sticky;
  top: 24px;
  display: grid;
  align-self: start;
  gap: 0;
  padding: 28px 0 0 26px;
  border-left: 1px solid var(--circle-line);
}

.rail-panel {
  padding: 0 0 26px;
}

.rail-panel + .rail-panel {
  padding-top: 26px;
  border-top: 1px solid var(--circle-line);
}

.rail-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rail-panel-head > svg {
  color: var(--circle-accent);
  font-size: 1rem;
}

.rail-count {
  color: var(--circle-accent);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-variant-numeric: tabular-nums;
}

.signal-value {
  display: flex;
  align-items: baseline;
  gap: 9px;
  margin-top: 20px;
}

.signal-value strong {
  color: var(--circle-ink);
  font-family: var(--font-mono);
  font-size: 2.45rem;
  font-weight: 650;
  line-height: 1;
}

.signal-value span {
  color: var(--circle-muted);
  font-size: 0.62rem;
}

.signal-bars {
  display: flex;
  height: 54px;
  align-items: end;
  gap: 5px;
  margin-top: 16px;
  padding: 0 2px;
}

.signal-bars i {
  display: block;
  min-height: 7px;
  flex: 1;
  border-radius: 3px 3px 1px 1px;
  background: linear-gradient(var(--circle-accent), color-mix(in srgb, var(--circle-accent) 34%, transparent));
  opacity: 0.75;
  transform-origin: bottom;
  animation: signal-rise 0.6s both;
  animation-delay: calc(var(--bar-index, 0) * 55ms);
}

.rail-signal p {
  margin: 12px 0 0;
  color: var(--circle-faint);
  font-size: 0.61rem;
  line-height: 1.7;
}

.rail-panel h3 {
  margin: 14px 0 0;
  color: var(--circle-ink);
  font-size: 0.88rem;
  font-weight: 750;
}

.source-list {
  display: grid;
  margin-top: 10px;
}

.source-list > a {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 14px;
  align-items: center;
  gap: 9px;
  padding: 9px 0;
  color: inherit;
  text-decoration: none;
}

.source-mini-avatar {
  display: grid;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border: 1px solid var(--circle-line);
  border-radius: 9px;
  background: var(--circle-panel-soft);
  place-items: center;
}

.source-mini-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.source-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.source-copy strong,
.source-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-copy strong {
  color: var(--circle-ink);
  font-size: 0.62rem;
  font-weight: 700;
}

.source-copy small {
  color: var(--circle-faint);
  font-size: 0.52rem;
}

.source-list > a > svg {
  color: var(--circle-faint);
  font-size: 0.7rem;
  transition: color 0.2s ease, transform 0.2s ease;
}

.source-list > a:hover > svg {
  color: var(--circle-accent);
  transform: translate(2px, -2px);
}

.rail-note {
  display: grid;
  gap: 12px;
}

.rail-note > svg {
  color: #d58a50;
  font-size: 1.45rem;
}

.rail-note p {
  max-width: 220px;
  margin: 0;
  color: var(--circle-muted);
  font-family: var(--font-system-rounded);
  font-size: 0.86rem;
  line-height: 1.7;
}

.rail-note span {
  color: var(--circle-faint);
  font-family: var(--font-mono);
  font-size: 0.5rem;
  letter-spacing: 0.1em;
}

.stream-state {
  min-height: 430px;
  padding: 64px 16px;
}

.stream-state strong {
  color: var(--circle-ink);
  font-size: 0.86rem;
}

.stream-state span {
  max-width: 320px;
  color: var(--circle-faint);
  font-size: 0.62rem;
  line-height: 1.7;
}

.loading-mark {
  display: flex;
  align-items: end;
  gap: 5px;
  height: 28px;
  margin-bottom: 10px;
}

.loading-mark span {
  width: 5px;
  height: 10px;
  border-radius: 999px;
  background: var(--circle-accent);
  animation: loading-wave 0.9s ease-in-out infinite;
}

.loading-mark span:nth-child(2) {
  height: 18px;
  animation-delay: 0.12s;
}

.loading-mark span:nth-child(3) {
  height: 13px;
  animation-delay: 0.24s;
}

.empty-mark {
  display: grid;
  width: 54px;
  height: 54px;
  margin-bottom: 8px;
  border: 1px solid color-mix(in srgb, var(--circle-accent) 24%, var(--circle-line));
  border-radius: 50%;
  background: var(--circle-accent-soft);
  color: var(--circle-accent);
  place-items: center;
}

.empty-mark svg {
  font-size: 1.35rem;
}

.stream-empty button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  padding: 8px 11px;
  border: 1px solid color-mix(in srgb, var(--circle-accent) 30%, var(--circle-line));
  border-radius: 7px;
  background: transparent;
  color: var(--circle-accent);
  cursor: pointer;
  font: inherit;
  font-size: 0.62rem;
}

.stream-empty button:hover {
  background: var(--circle-accent-soft);
}

.load-more {
  min-height: 74px;
  color: var(--circle-faint);
  font-size: 0.58rem;
}

.load-pulse {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 7px;
}

.load-pulse i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--circle-accent);
  animation: loading-wave 0.8s ease-in-out infinite;
}

.load-pulse i:nth-child(2) {
  animation-delay: 0.12s;
}

.load-pulse i:nth-child(3) {
  animation-delay: 0.24s;
}

.end-mark {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.end-mark svg {
  color: var(--circle-accent);
}

@keyframes circle-entry-in {
  from {
    opacity: 0;
    transform: translate3d(0, 14px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes signal-rise {
  from {
    opacity: 0;
    transform: scaleY(0.2);
  }
  to {
    opacity: 0.75;
    transform: scaleY(1);
  }
}

@keyframes loading-wave {
  0%,
  100% {
    opacity: 0.4;
    transform: scaleY(0.7);
  }
  50% {
    opacity: 1;
    transform: scaleY(1.15);
  }
}

@media (max-width: 1040px) {
  .circle-page {
    --circle-gutter: 28px;
  }

  .circle-layout {
    grid-template-columns: minmax(0, 1fr) minmax(196px, 220px);
    gap: 34px;
  }

  .stage-orbit {
    width: 190px;
    height: 190px;
  }
}

@media (max-width: 820px) {
  .circle-page {
    --circle-gutter: 20px;
  }

  .stage-main {
    gap: 24px;
  }

  .stage-orbit {
    width: 150px;
    height: 150px;
  }

  .orbit-core {
    width: 46px;
    height: 46px;
  }

  .circle-layout {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .circle-rail {
    position: static;
    grid-row: 1;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 24px;
    padding: 24px 0 0;
    border: 0;
  }

  .circle-rail .rail-note {
    display: none;
  }

  .circle-rail .rail-panel + .rail-panel {
    padding-top: 0;
    border-top: 0;
    border-left: 1px solid var(--circle-line);
    padding-left: 24px;
  }

  .circle-stream {
    grid-row: 2;
    padding-top: 24px;
  }
}

@media (max-width: 620px) {
  .circle-page {
    --circle-gutter: 16px;
  }

  .circle-stage {
    min-height: 300px;
  }

  .stage-inner {
    padding-top: 22px;
  }

  .stage-topline {
    align-items: flex-start;
  }

  .stage-refresh {
    min-height: 32px;
    padding: 0 9px;
  }

  .stage-refresh span {
    display: none;
  }

  .stage-main {
    display: block;
    padding: 42px 0 30px;
  }

  .stage-copy h1 {
    max-width: 90%;
    font-size: clamp(2.4rem, 15vw, 4.2rem);
  }

  .stage-copy p {
    max-width: 92%;
  }

  .stage-orbit {
    position: absolute;
    top: 98px;
    right: -20px;
    width: 152px;
    height: 152px;
    opacity: 0.74;
  }

  .cover-gallery {
    gap: 10px;
  }

  .gallery-label {
    display: none;
  }

  .gallery-track {
    width: 100%;
  }

  .gallery-thumb {
    width: 52px;
    height: 33px;
    flex-basis: 52px;
  }

  .reading-notice {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
    margin-top: 12px;
  }

  .toolbar-inner {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }

  .filter-pills {
    width: 100%;
    justify-content: stretch;
  }

  .filter-pills button {
    flex: 1;
    justify-content: center;
    padding-inline: 6px;
  }

  .circle-rail {
    grid-template-columns: 1fr;
    gap: 0;
    padding-top: 18px;
  }

  .circle-rail .rail-panel + .rail-panel {
    display: none;
  }

  .stream-entry {
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 12px;
    padding: 20px 0 24px;
  }

  .source-avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }

  .entry-spine::after {
    top: 42px;
  }

  .entry-source > a {
    max-width: min(48vw, 190px);
  }

  .entry-body h3 {
    font-size: 0.96rem;
  }

  .entry-body p {
    font-size: 0.68rem;
    -webkit-line-clamp: 20;
  }

  .entry-body figure {
    aspect-ratio: 4 / 3;
    border-radius: 11px;
  }

  .entry-foot {
    align-items: flex-end;
  }

  .entry-read {
    font-size: 0.54rem;
  }

  .category-row span:nth-child(n + 3) {
    display: none;
  }

  .date-marker,
  .new-divider {
    padding-left: 48px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stage-backdrop,
  .stage-refresh,
  .gallery-thumb,
  .source-avatar,
  .entry-open,
  .entry-body h3,
  .entry-body figure img,
  .entry-read,
  .filter-pills button {
    transition: none;
  }

  .stream-entry,
  .signal-bars i,
  .loading-mark span,
  .load-pulse i {
    animation: none;
  }
}
</style>

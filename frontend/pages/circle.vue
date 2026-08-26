<template>
  <main ref="circlePageRef" class="circle-page">
    <header class="circle-banner" :class="{ 'has-cover': coverImage }">
      <img
        v-if="coverImage"
        :src="coverImage"
        alt="朋友圈封面"
        fetchpriority="high"
      />
      <div class="banner-shade" />
      <div class="banner-inner">
        <div class="banner-copy">
          <span><Icon name="ph:users-three-bold" /> FRIENDS MOMENTS</span>
          <h1>{{ config.title || "朋友圈" }}</h1>
          <p>{{ config.subtitle || "和朋友们分享新鲜事" }}</p>
        </div>
        <div class="banner-meta" aria-label="朋友圈概览">
          <span
            ><strong>{{ items.length }}</strong> 条动态</span
          ><i aria-hidden="true" />
          <span
            ><strong>{{ sourceCount }}</strong> 位朋友</span
          >
          <button
            type="button"
            :disabled="loading"
            :title="loading ? '正在刷新' : '刷新朋友圈'"
            @click="loadFeed"
          >
            <Icon
              :name="
                loading ? 'ph:spinner-gap-bold' : 'ph:arrows-clockwise-bold'
              "
              :class="{ spin: loading }"
            /><span>刷新</span>
          </button>
        </div>
      </div>
    </header>

    <div class="circle-layout">
      <section
        ref="streamRef"
        class="circle-stream"
        aria-labelledby="circle-stream-title"
        aria-live="polite"
      >
        <header class="stream-head">
          <div>
            <span>FEED</span>
            <h2 id="circle-stream-title">朋友动态</h2>
          </div>
          <time v-if="latestPublishedAt"
            >更新于 {{ relativeDate(latestPublishedAt) }}</time
          >
        </header>
        <div v-if="loading && !items.length" class="stream-state stream-loading">
          <Icon name="ph:circle-notch-bold" class="spin" />
          <strong>正在收集朋友们的新消息</strong>
          <span>稍候，动态很快就会抵达。</span>
        </div>
        <div v-else-if="!items.length" class="stream-state">
          <Icon name="ph:wind-bold" /><strong>此刻很安静</strong
          ><span>风会把朋友们的新消息带到这里。</span>
        </div>
        <Transition v-else name="feed-page" mode="out-in">
          <div :key="page" class="stream-list">
          <article
            v-for="(item, index) in paginatedItems"
            :key="item.id"
            class="stream-entry"
            :class="{ 'has-image': item.image && !brokenImages.has(item.id) }"
            :style="entryStyle(item, index)"
          >
            <a
              class="source-avatar"
              :href="item.source.url"
              target="_blank"
              rel="noopener noreferrer"
              :title="item.source.name"
            >
              <img
                :src="avatarFor(item.source)"
                :alt="item.source.name"
                loading="lazy"
                @error="onAvatarError"
              />
            </a>
            <span class="entry-sequence" aria-hidden="true">{{
              String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")
            }}</span>
            <div class="entry-content">
              <header class="entry-head">
                <div>
                  <a
                    :href="item.source.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    >{{ item.source.name }}</a
                  ><time
                    :datetime="item.publishedAt"
                    :title="formatDate(item.publishedAt)"
                    >{{ relativeDate(item.publishedAt) }}</time
                  >
                </div>
                <a
                  :href="item.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="打开原文"
                  aria-label="打开原文"
                  ><Icon name="ph:arrow-up-right-bold"
                /></a>
              </header>
              <a
                class="entry-body"
                :href="item.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <h3>{{ item.title }}</h3>
                <p v-if="item.summary">{{ item.summary }}</p>
                <figure v-if="item.image && !brokenImages.has(item.id)">
                  <img
                    :src="item.image"
                    :alt="item.title"
                    loading="lazy"
                    decoding="async"
                    @error="onEntryImageError(item.id)"
                  />
                </figure>
              </a>
              <footer class="entry-foot">
                <div v-if="item.categories?.length" class="category-row">
                  <span v-for="tag in item.categories" :key="tag"
                    >#{{ tag }}</span
                  >
                </div>
                <a :href="item.url" target="_blank" rel="noopener noreferrer"
                  >阅读原文 <Icon name="ph:arrow-right-bold"
                /></a>
              </footer>
            </div>
          </article>
          </div>
        </Transition>

        <nav
          v-if="totalPages > 1"
          class="circle-pagination"
          aria-label="朋友圈分页"
        >
          <button
            type="button"
            :disabled="page === 1"
            title="上一页"
            aria-label="上一页"
            @click="changePage(page - 1)"
          >
            <Icon name="ph:caret-left-bold" />
          </button>
          <button
            v-for="pageNumber in pageNumbers"
            :key="pageNumber"
            type="button"
            :class="{ active: pageNumber === page }"
            :aria-current="pageNumber === page ? 'page' : undefined"
            :aria-label="`第 ${pageNumber} 页`"
            @click="changePage(pageNumber)"
          >
            {{ pageNumber }}
          </button>
          <button
            type="button"
            :disabled="page === totalPages"
            title="下一页"
            aria-label="下一页"
            @click="changePage(page + 1)"
          >
            <Icon name="ph:caret-right-bold" />
          </button>
        </nav>
      </section>

      <aside v-if="items.length" class="circle-rail" aria-label="朋友圈概览">
        <section>
          <span class="rail-kicker">TODAY</span>
          <h2>今日风向</h2>
          <div class="rail-stats">
            <div>
              <strong>{{ todayCount }}</strong
              ><small>今日更新</small>
            </div>
            <div>
              <strong>{{ sourceCount }}</strong
              ><small>动态来源</small>
            </div>
          </div>
        </section>
        <section>
          <span class="rail-kicker">SOURCES</span>
          <h2>最近活跃</h2>
          <div class="source-list">
            <a
              v-for="source in activeSources"
              :key="source.url"
              :href="source.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                :src="avatarFor(source)"
                :alt="source.name"
                loading="lazy"
                @error="onAvatarError"
              /><span
                ><strong>{{ source.name }}</strong
                ><small>{{ source.count }} 条更新</small></span
              ><Icon name="ph:arrow-up-right-bold" />
            </a>
          </div>
        </section>
      </aside>
    </div>
  </main>
</template>

<script setup lang="ts">
type CircleSource = { name: string; url: string; avatar?: string };
type CircleItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  image?: string;
  cover?: string;
  categories?: string[];
  source: CircleSource;
};
const api = useApi();
const PAGE_SIZE = 10;
const circlePageRef = ref<HTMLElement | null>(null);
const streamRef = ref<HTMLElement | null>(null);
const loading = ref(true);
const items = ref<CircleItem[]>([]);
const page = ref(1);
const clock = ref(Date.now());
const brokenImages = reactive(new Set<string>());
const config = reactive({
  title: "朋友圈",
  subtitle: "和朋友们分享新鲜事",
  coverMode: "random",
  coverUrl: "",
  covers: [] as string[],
});
const coverImage = computed(
  () =>
    items.value[0]?.cover ||
    (config.coverMode === "fixed"
      ? config.coverUrl || config.covers[0]
      : config.covers[0]) ||
    "",
);
const sourceCount = computed(
  () => new Set(items.value.map((item) => item.source.url)).size,
);
const latestPublishedAt = computed(() => items.value[0]?.publishedAt || "");
const totalPages = computed(() =>
  Math.max(1, Math.ceil(items.value.length / PAGE_SIZE)),
);
const pageNumbers = computed(() =>
  Array.from({ length: totalPages.value }, (_, index) => index + 1),
);
const paginatedItems = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE;
  return items.value.slice(start, start + PAGE_SIZE);
});
const todayCount = computed(() => {
  const today = new Date().toDateString();
  return items.value.filter(
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
async function loadFeed() {
  if (loading.value && items.value.length) return;
  loading.value = true;
  try {
    const result = await api.get<any>("/circle/feed");
    Object.assign(config, result?.config || {});
    items.value = Array.isArray(result?.items) ? result.items : [];
    page.value = 1;
    brokenImages.clear();
  } catch {
    if (!items.value.length) items.value = [];
  } finally {
    loading.value = false;
  }
}
async function changePage(nextPage: number) {
  const target = Math.min(totalPages.value, Math.max(1, nextPage));
  if (target === page.value) return;
  page.value = target;
  await nextTick();
  requestAnimationFrame(() => {
    const scrollHost = circlePageRef.value;
    const stream = streamRef.value;
    if (!scrollHost || !stream) return;
    const hostRect = scrollHost.getBoundingClientRect();
    const streamRect = stream.getBoundingClientRect();
    if (streamRect.top >= hostRect.top + 12) return;
    scrollHost.scrollTo({
      top: Math.max(0, scrollHost.scrollTop + streamRect.top - hostRect.top - 18),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  });
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
onMounted(() => {
  void loadFeed();
  clockTimer = window.setInterval(() => {
    clock.value = Date.now();
  }, 60_000);
});
onUnmounted(() => window.clearInterval(clockTimer));
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
  -webkit-line-clamp: 3;
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
    -webkit-line-clamp: 4;
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
</style>

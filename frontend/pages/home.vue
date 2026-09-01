<template>
  <div class="page-layout" :class="{ 'home-ready': homeReady }">
    <main ref="mainContentRef" class="main-content">
      <div
        class="featured-module-slot home-module"
        style="--home-enter-order: 0"
      >
        <FeaturedSwiper />
      </div>
      <!-- AI discovery is temporarily removed from the home flow. -->

      <SectionHead
        class="home-module latest-head"
        style="--home-enter-order: 2"
        kicker="LATEST"
        title="最新文章"
      />

      <div
        class="article-list-wrap home-module"
        style="--home-enter-order: 3"
        :class="{ refreshing, 'content-reveal': !loading }"
        aria-live="polite"
      >
        <div v-if="refreshing" class="article-refresh-bar"><span /></div>
        <div v-if="!loading && !articles.length" class="article-empty">
          <Icon name="ph:article-bold" />
          <span>暂时还没有文章</span>
        </div>
        <div v-else-if="!loading" class="article-list">
          <ArticleCard
            v-for="(article, i) in articles"
            :key="article.slug"
            :data-article-slug="article.slug"
            :style="{ '--article-index': i }"
            :eager="i < 2"
            :priority="i === 0"
            v-bind="article"
          />
        </div>
      </div>

      <FloatingPagination
        v-model="page"
        :total="totalPages"
        variant="articles"
        @change="changePage"
      />

      <footer
        ref="recordsRef"
        class="site-records home-module"
        style="--home-enter-order: 4"
      >
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          ><img src="/records/miit.png" alt="" />浙ICP备2026002544号</a
        >
        <i aria-hidden="true" />
        <a
          href="http://www.beian.gov.cn/portal/registerSystemInfo"
          target="_blank"
          rel="noopener noreferrer"
          ><img src="/records/mps.png" alt="" />浙公网安备33060202001987号</a
        >
        <i aria-hidden="true" />
        <a
          href="https://icp.gov.moe/?keyword=corner.ink"
          target="_blank"
          rel="noopener noreferrer"
          ><img
            src="/records/moe.svg"
            alt=""
            loading="lazy"
          />萌ICP备20266886号</a
        >
        <span class="records-legal" aria-label="法律信息">
          <button type="button" @click="openLegal('terms')">用户协议</button>
          <i aria-hidden="true" />
          <button type="button" @click="openLegal('privacy')">隐私政策</button>
          <i aria-hidden="true" />
          <button type="button" @click="openLegal('disclaimer')">免责声明</button>
        </span>
      </footer>
    </main>

    <aside class="sidebar-right">
      <HomeSidebar />
    </aside>
    <LegalDialog v-model="legalOpen" :initial-tab="legalTab" />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onActivated, onDeactivated } from "vue";
import { useBottomDockState } from "~/composables/useBottomDockState";
import { importWithRetry } from "~/utils/lazyImport";

const FeaturedSwiper = defineAsyncComponent(() =>
  importWithRetry(
    () => import("~/components/FeaturedSwiper.vue"),
    2,
    180,
    "featured-swiper",
  ),
);
const HomeSidebar = defineAsyncComponent(() =>
  importWithRetry(
    () => import("~/components/HomeSidebar.vue"),
    2,
    180,
    "home-sidebar",
  ),
);
import SectionHead from "~/components/SectionHead.vue";
const api = useApi();
const { state: homePreload } = useHomePreload();
const articles = ref<any[]>(
  normalizeArticles(homePreload.value.articles?.items ?? []),
);
const loading = ref(homePreload.value.articles === null);
const refreshing = ref(false);
const page = ref(1);
const totalPages = ref(homePreload.value.articles?.totalPages ?? 1);
const legalOpen = ref(false);
const legalTab = ref<"terms" | "privacy" | "disclaimer">("terms");
const homeReady = ref(false);
const mainContentRef = ref<HTMLElement>();
const recordsRef = ref<HTMLElement>();
const { setRecordsIntersecting, setContentReady: setBottomDockContentReady } =
  useBottomDockState();
setBottomDockContentReady(false);
let requestId = 0;
let enterFrame = 0;
let recordsObserver: IntersectionObserver | null = null;

function openLegal(tab: "terms" | "privacy" | "disclaimer") {
  legalTab.value = tab;
  legalOpen.value = true;
}

type HomeAnchor = { slug: string; offset: number };

function captureHomeAnchor(): HomeAnchor | null {
  const host = mainContentRef.value;
  if (!host) return null;
  const cards = Array.from(
    host.querySelectorAll<HTMLElement>("[data-article-slug]"),
  );
  const anchor =
    cards.find(
      (card) => card.offsetTop + card.offsetHeight >= host.scrollTop,
    ) || cards.at(-1);
  if (!anchor) return null;
  return {
    slug: anchor.dataset.articleSlug || "",
    offset: host.scrollTop - anchor.offsetTop,
  };
}

async function restoreHomeAnchor(anchor: HomeAnchor | null) {
  if (!anchor?.slug || !mainContentRef.value) return;
  await nextTick();
  const target = mainContentRef.value.querySelector<HTMLElement>(
    `[data-article-slug="${CSS.escape(anchor.slug)}"]`,
  );
  if (target)
    mainContentRef.value.scrollTop = Math.max(
      0,
      target.offsetTop + anchor.offset,
    );
}

function articleSnapshot(items: any[]) {
  return JSON.stringify(
    items.map((item) => [
      item.slug,
      item.title,
      item.date,
      item.desc,
      item.cover,
      item.views,
      item.comments,
    ]),
  );
}

function normalizeArticles(items: any[]) {
  return (items ?? []).map((p: any) => ({
    slug: p.slug,
    cover: p.coverImage,
    tag: p.category?.name ?? p.tags?.[0]?.name ?? "",
    categoryIcon: p.category?.icon || "ph:folder-open-bold",
    categoryColor: p.category?.color || "",
    tags: (p.tags ?? []).map((t: any) => t.name),
    tagItems: (p.tags ?? []).map((t: any) => ({
      name: t.name,
      icon: t.icon,
      color: t.color,
    })),
    title: p.title,
    date: p.publishedAt?.slice(0, 10) ?? "",
    desc: p.excerpt ?? "",
    author: p.author
      ? { name: p.author.username, avatar: p.author.avatar }
      : undefined,
    views: p.viewCount ?? 0,
    comments: p._count?.comments ?? 0,
  }));
}

async function loadArticles(options: { silent?: boolean } = {}) {
  const id = ++requestId;
  const silent = options.silent === true;
  const anchor = silent ? captureHomeAnchor() : null;
  if (!silent) {
    if (articles.value.length) refreshing.value = true;
    else loading.value = true;
  }
  try {
    const res = await api.get<any>("/posts", {
      page: page.value,
      limit: 10,
      sort: "latest",
    });
    if (id !== requestId) return;
    const nextArticles = normalizeArticles(res.items ?? []);
    const nextTotalPages = res.totalPages ?? 1;
    if (
      articleSnapshot(nextArticles) !== articleSnapshot(articles.value) ||
      nextTotalPages !== totalPages.value
    ) {
      articles.value = nextArticles;
      totalPages.value = nextTotalPages;
      await restoreHomeAnchor(anchor);
    }
  } catch {
    /* keep empty */
  } finally {
    if (id === requestId) {
      if (!silent) {
        loading.value = false;
        refreshing.value = false;
      }
      setBottomDockContentReady(true);
    }
  }
}

async function changePage() {
  await loadArticles();
  await nextTick();
  const main = document.querySelector<HTMLElement>(".main-content");
  const list = document.querySelector<HTMLElement>(".latest-head");
  if (!main || !list) return;
  const top = Math.max(0, list.offsetTop - 18);
  main.scrollTo({
    top,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

async function restoreScroll() {
  const state = useClientState();
  const saved = state.getSession("homeScroll", 0);
  if (!saved) return;
  state.removeSession("homeScroll");

  const target = Number(saved);
  if (target <= 0) return;

  await nextTick();

  const el = document.querySelector(".main-content");
  if (!el) return;
  el.scrollTop = target;
}

function observeRecords() {
  recordsObserver?.disconnect();
  recordsObserver = new IntersectionObserver(
    ([entry]) => {
      setRecordsIntersecting(entry?.isIntersecting ?? false);
    },
    {
      root: mainContentRef.value,
      threshold: 0.12,
    },
  );
  if (recordsRef.value) recordsObserver.observe(recordsRef.value);
}

let firstActivation = true;
onMounted(() => {
  enterFrame = window.requestAnimationFrame(() => {
    homeReady.value = true;
  });
  if (homePreload.value.articles !== null) {
    setBottomDockContentReady(true);
    void restoreScroll();
  } else {
    loadArticles().then(restoreScroll);
  }

  observeRecords();
});

onActivated(() => {
  if (firstActivation) {
    firstActivation = false;
    return;
  }
  homeReady.value = true;
  setBottomDockContentReady(true);
  observeRecords();
  void loadArticles({ silent: true });
});

onDeactivated(() => {
  recordsObserver?.disconnect();
  setRecordsIntersecting(false);
});

onUnmounted(() => {
  window.cancelAnimationFrame(enterFrame);
  recordsObserver?.disconnect();
  setRecordsIntersecting(false);
  setBottomDockContentReady(true);
});
</script>

<style scoped>
.page-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px 28px;
  min-width: 0;
  min-height: 0;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scroll-behavior: auto;
}

.featured-module-slot {
  min-height: 330px;
}

.home-module {
  opacity: 0;
  transform: translate3d(0, 14px, 0);
}

.home-ready .home-module {
  animation: home-module-enter 0.62s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--home-enter-order, 0) * 70ms);
}

.loading-tip {
  text-align: center;
  color: var(--c-text-2);
  padding: 32px;
  font-size: 0.85rem;
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

.article-list-wrap {
  position: relative;
  min-height: 372px;
}

.article-list-wrap.refreshing .article-list {
  opacity: 0.62;
  pointer-events: none;
}

.article-list-wrap .article-list {
  transition: opacity 0.16s ease;
}

.article-refresh-bar {
  position: absolute;
  z-index: 2;
  top: -2px;
  left: 0;
  right: 0;
  height: 2px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--c-primary-soft);
}

.article-refresh-bar span {
  display: block;
  width: 36%;
  height: 100%;
  border-radius: inherit;
  background: var(--c-primary);
  animation: article-loading 0.9s ease-in-out infinite alternate;
}

.article-empty {
  min-height: 180px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  color: var(--c-text-3);
  font-size: 0.8rem;
}

.article-empty .icon {
  font-size: 1.8rem;
}

.site-records {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 14px;
  padding: 10px 12px 2px;
  border-top: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
  color: var(--c-text-3);
  font-size: 0.52rem;
}
.site-records a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease;
}
.site-records a:hover {
  color: var(--c-primary);
}
.site-records a > svg,
.site-records a > img {
  width: 13px;
  height: 13px;
  flex: none;
  object-fit: contain;
}
.site-records > i {
  width: 1px;
  height: 10px;
  background: var(--border);
}
.records-legal {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-left: 4px;
  padding-left: 10px;
  border-left: 1px solid var(--border);
}
.records-legal button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}
.records-legal button:hover {
  color: var(--c-primary);
}
.records-legal i {
  width: 1px;
  height: 10px;
  background: var(--border);
}

@keyframes article-loading {
  from {
    transform: translateX(-10%);
  }
  to {
    transform: translateX(190%);
  }
}

@keyframes home-module-enter {
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@media (max-width: 640px) {
  .featured-module-slot {
    min-height: 264px;
  }
}

.sidebar-right {
  width: var(--right-w);
  flex-shrink: 0;
  padding: 24px 14px;
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .home-module {
    opacity: 1;
    transform: none;
  }
  .home-ready .home-module {
    animation: none;
  }
  .article-refresh-bar span {
    animation: none;
  }
  .article-list :deep(.article-card) {
    transform: none !important;
    filter: none !important;
  }
}

@media (max-width: 640px) {
  .main-content {
    padding: 18px 16px 104px;
  }
  .article-list {
    gap: 9px;
  }
  .site-records {
    flex-wrap: wrap;
    gap: 7px 10px;
    padding-inline: 2px;
    line-height: 1.5;
  }
  .site-records > i {
    display: none;
  }
  .records-legal {
    margin-left: 0;
    padding-left: 0;
    border-left: 0;
  }
}
</style>

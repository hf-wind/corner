<template>
  <div class="page-layout" :class="{ 'home-ready': homeReady }">
    <main class="main-content">
      <div class="featured-module-slot home-module" style="--home-enter-order: 0">
        <FeaturedSwiper />
      </div>
      <div class="discovery-module-slot home-module" style="--home-enter-order: 1">
        <AiDiscoveryPanel />
      </div>

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
    </main>

    <aside class="sidebar-right">
      <HomeSidebar />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const FeaturedSwiper = defineAsyncComponent(() => import("~/components/FeaturedSwiper.vue"));
const AiDiscoveryPanel = defineAsyncComponent(() => import("~/components/AiDiscoveryPanel.vue"));
const HomeSidebar = defineAsyncComponent(() => import("~/components/HomeSidebar.vue"));
import SectionHead from "~/components/SectionHead.vue";
const api = useApi();
const articles = ref<any[]>([]);
const loading = ref(true);
const refreshing = ref(false);
const page = ref(1);
const totalPages = ref(1);
const homeReady = ref(false);
let requestId = 0;
let enterFrame = 0;

async function loadArticles() {
  const id = ++requestId;
  if (articles.value.length) refreshing.value = true;
  else loading.value = true;
  try {
    const res = await api.get<any>("/posts", {
      page: page.value,
      limit: 10,
      sort: "latest",
    });
    if (id !== requestId) return;
    articles.value = (res.items ?? []).map((p: any) => ({
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
    totalPages.value = res.totalPages ?? 1;
  } catch {
    /* keep empty */
  } finally {
    if (id === requestId) {
      loading.value = false;
      refreshing.value = false;
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
  const saved = sessionStorage.getItem("home-scroll");
  if (!saved) return;
  sessionStorage.removeItem("home-scroll");

  const target = parseInt(saved, 10);
  if (target <= 0) return;

  await nextTick();

  const el = document.querySelector(".main-content");
  if (!el) return;
  el.scrollTop = target;
}

onMounted(() => {
  enterFrame = window.requestAnimationFrame(() => {
    homeReady.value = true;
  });
  loadArticles().then(restoreScroll);
});

onUnmounted(() => {
  window.cancelAnimationFrame(enterFrame);
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
  min-height: 244px;
}

.discovery-module-slot {
  min-height: 96px;
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
  .featured-module-slot { min-height: 206px; }
  .discovery-module-slot { min-height: 96px; }
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
}
</style>

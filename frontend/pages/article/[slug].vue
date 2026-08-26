<template>
  <div
    class="page-layout article-page"
    :class="{ 'is-immersive': immersiveMode }"
  >
    <main
      id="main-content"
      ref="articleMainRef"
      class="article-main"
      :class="{ 'article-ready': articleReady }"
      @scroll.passive="handleArticleScroll"
    >
      <template v-if="!articleLoading && article.id">
        <AppLink to="/home" class="back-btn">
          <Icon name="ph:arrow-left-bold" />
          返回首页
        </AppLink>

        <div
          class="post-header article-anim"
          :class="{ 'has-cover': article.hero }"
        >
          <img
            v-if="article.hero"
            :src="coverUrl(article.hero)"
            class="post-cover"
            :alt="article.title"
            decoding="async"
            fetchpriority="high"
          />

          <div class="post-nav">
            <div class="operations">
              <button
                type="button"
                class="z-btn"
                title="文字分享"
                @click="shareOpen = true"
              >
                <Icon name="ph:share-bold" />
                <span>文字分享</span>
              </button>
              <button
                type="button"
                class="z-btn"
                title="生成分享海报"
                @click="posterOpen = true"
              >
                <Icon name="ph:image-bold" />
                <span>海报分享</span>
              </button>
            </div>

            <div class="post-info">
              <a href="#" class="author-capsule">
                <img :src="avatarImg" alt="作者" loading="lazy" />
                <span>{{ article.author || "作者" }}</span>
              </a>
              <span>
                <Icon name="ph:calendar-dots-bold" />
                <time>{{ article.date }}</time>
              </span>
              <span>
                <Icon name="ph:chat-circle-dots-bold" />
                <span>{{ article.comments }}</span> 评论
              </span>
              <span>
                <Icon
                  :name="article.category?.icon || 'ph:folder-open-bold'"
                  :style="{ color: article.category?.color || undefined }"
                />
                <a>{{ article.tag }}</a>
              </span>
              <span>
                <Icon name="ph:eye-bold" />
                <span>{{ article.views }}</span> 阅读
              </span>
            </div>
          </div>

          <h1 class="post-title text-creative">{{ article.title }}</h1>
        </div>

        <section
          v-if="article.excerpt"
          class="article-lead article-anim"
          aria-label="摘要"
        >
          <div v-if="article.excerpt" class="md-excerpt">
            <span class="excerpt-avatar" aria-hidden="true">
              <img :src="dramExcerptImg" alt="" />
              <i><Icon name="ph:quotes-bold" /></i>
            </span>
            <span class="excerpt-content">
              <small><b>摘要</b><i>SUMMARY</i></small>
              <span class="excerpt-copy">
                <span class="excerpt-typed"
                  >{{ typedExcerpt
                  }}<span
                    v-if="excerptTyping"
                    class="excerpt-caret"
                    aria-hidden="true"
                /></span>
              </span>
            </span>
          </div>

          <!-- <AiReadingStrip type="post" :slug="slug" /> -->
        </section>

        <div
          class="outdated-notice article-anim"
          ref="noticeRef"
          :data-publish-time="article.date"
          data-threshold="180"
          data-message="本文发布于 {days} 天前，内容可能已过时，请注意甄别。"
        >
          <Icon name="ph:warning-circle-bold" />
          <span class="notice-text"></span>
        </div>

        <div ref="articleContentRef" class="article-shell article-anim">
          <ArticleMarkdown
            :content="article.content"
            :editor-id="editorId"
            @rendered="scheduleCatalog"
          />
        </div>

        <div class="post-footer article-anim">
          <section class="tags-section">
            <div class="title text-creative">文章标签</div>
            <div class="content tags-list">
              <a
                v-for="tag in article.tags"
                :key="tag.id || tag.name"
                href="#"
                class="tag-item"
                :style="{ '--tag-color': tag.color || 'var(--c-primary)' }"
                ><Icon :name="tag.icon || 'ph:tag-bold'" />{{ tag.name }}</a
              >
            </div>
          </section>

          <section class="license">
            <div class="title text-creative">许可协议</div>
            <div class="content">
              本文采用
              <a
                href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans"
                target="_blank"
              >
                署名-非商业性使用-相同方式共享 4.0 国际
              </a>
              许可协议，转载请注明出处。
            </div>
          </section>
        </div>

        <NewsletterBar v-if="adjacentLoaded" class="article-anim" />

        <div v-if="adjacentLoaded" class="surround-post article-anim">
          <AppLink
            v-if="prevArticle"
            :to="'/article/' + prevArticle.slug"
            class="surround-link"
          >
            <Icon name="solar:rewind-back-bold-duotone" />
            <div class="surround-text">
              <strong class="title text-creative">{{
                prevArticle.title
              }}</strong>
              <span class="date">{{ prevArticle.date }}</span>
            </div>
          </AppLink>
          <div v-else class="surround-link no-link">
            <Icon name="solar:rewind-back-bold-duotone" />
            <div class="surround-text">
              <strong class="title">已是第一篇文章</strong>
            </div>
          </div>

          <AppLink
            v-if="nextArticle"
            :to="'/article/' + nextArticle.slug"
            class="surround-link align-end"
          >
            <Icon name="solar:reel-bold-duotone" />
            <div class="surround-text">
              <strong class="title">{{ nextArticle.title }}</strong>
              <span class="date">{{ nextArticle.date }}</span>
            </div>
          </AppLink>
          <div v-else class="surround-link align-end no-link">
            <Icon name="solar:reel-bold-duotone" />
            <div class="surround-text">
              <strong class="title">已抵达博客尽头</strong>
            </div>
          </div>
        </div>

        <ArticleComments
          :post-id="article.id"
          :focus-comment-id="focusCommentId"
          :focus-parent-id="focusParentId"
          :highlight-query="highlightQuery"
        />
      </template>
      <section
        v-else-if="!articleLoading"
        class="article-state"
        aria-live="polite"
      >
        <Icon name="ph:file-x-bold" />
        <h1>文章暂时无法打开</h1>
        <p>它可能已经下线，或网络暂时不可用，请稍后再试。</p>
        <AppLink to="/home">
          <Icon name="ph:arrow-left-bold" />
          返回首页
        </AppLink>
      </section>
    </main>

    <ArticleSidebar
      v-if="!articleLoading && article.id"
      :editor-id="editorId"
      scroll-element="#main-content"
      :progress="readingProgress"
      :show-top="showBackTop"
      :immersive="immersiveMode"
      :catalog-ready="catalogReady"
      :catalog-items="catalogItems"
      :active-catalog-index="activeCatalogIndex"
      @scroll-top="scrollToTop"
      @scroll-comment="scrollToComment"
      @catalog-navigate="navigateCatalog"
      @toggle-immersive="toggleImmersive"
    >
      <template #pet>
        <ClientOnly>
          <AiPet docked mode="article" :article="articleContext" />
        </ClientOnly>
      </template>
    </ArticleSidebar>

    <ArticleShare v-model:open="shareOpen" :article="article" />
    <ArticlePoster v-model:open="posterOpen" :article="article" />
  </div>
</template>

<script setup lang="ts">
import avatarImg from "~/assets/images/avatar.jpg";
import dramExcerptImg from "~/assets/images/dram-excerpt.processed.png";
import { getDisplayImageUrl } from "~/utils/imagePerformance";
import { gsap } from "gsap";
import { focusSearchHighlight } from "~/composables/useSearchHighlight";

function coverUrl(source: string) {
  return getDisplayImageUrl(source, 800, 300);
}

const api = useApi();
const route = useRoute();
const slug = route.params.slug as string;
const editorId = "article-preview";
const CATALOG_VIEW_OFFSET = 32;
const CATALOG_ACTIVE_TOLERANCE = 1;

const article = ref<any>({});
const prevArticle = ref<any>(null);
const nextArticle = ref<any>(null);

const shareOpen = ref(false);
const posterOpen = ref(false);

const noticeRef = ref<HTMLElement | null>(null);
const articleMainRef = ref<HTMLElement | null>(null);
const articleContentRef = ref<HTMLElement | null>(null);

const articleLoading = ref(true);
const articleReady = ref(false);
const adjacentLoaded = ref(false);
const readingProgress = ref(0);
const showBackTop = ref(false);
const immersiveMode = ref(false);
const catalogReady = ref(false);
type CatalogItem = {
  id: string;
  text: string;
  level: number;
  index: number;
};
const catalogItems = ref<CatalogItem[]>([]);
const activeCatalogIndex = ref(0);
let catalogHeadings: HTMLElement[] = [];
let catalogOffsets: number[] = [];
const excerptVisibleCount = ref(0);
const excerptCharacters = computed(() =>
  Array.from(
    String(article.value?.excerpt || "")
      .replace(/\s+/g, " ")
      .trim(),
  ),
);
const typedExcerpt = computed(() =>
  excerptCharacters.value.slice(0, excerptVisibleCount.value).join(""),
);
const excerptTyping = computed(
  () => excerptVisibleCount.value < excerptCharacters.value.length,
);
const highlightQuery = computed(() =>
  String(route.query.highlight || "")
    .trim()
    .slice(0, 80),
);
const focusCommentId = computed(() =>
  String(route.query.commentId || "").trim(),
);
const focusParentId = computed(() => String(route.query.parentId || "").trim());
const articleContext = computed(() => ({
  title: article.value?.title || "",
  content: article.value?.content || "",
  slug,
  type: "post",
  scene: "article",
  sourceId: article.value?.id || "",
}));

async function loadArticle() {
  articleLoading.value = true;
  try {
    const p = await api.get<any>(`/posts/${slug}`);
    article.value = {
      author: p.author?.username ?? "作者",
      tag: p.category?.name ?? "",
      category: p.category || null,
      title: p.title,
      date: p.publishedAt?.slice(0, 10) ?? "",
      comments: p._count?.comments ?? 0,
      views: p.viewCount ?? 0,
      hero: p.coverImage,
      excerpt: p.excerpt ?? "",
      content: p.content,
      tags: p.tags ?? [],
      id: p.id,
    };
  } catch {
    /* keep empty */
  } finally {
    articleLoading.value = false;
  }
}

async function loadAdjacent() {
  try {
    const adj = await api.get<any>(`/posts/${slug}/adjacent`);
    prevArticle.value = adj.prev
      ? {
          title: adj.prev.title,
          slug: adj.prev.slug,
          date: adj.prev.publishedAt?.slice(0, 10),
        }
      : null;
    nextArticle.value = adj.next
      ? {
          title: adj.next.title,
          slug: adj.next.slug,
          date: adj.next.publishedAt?.slice(0, 10),
        }
      : null;
  } catch {
    /* keep empty */
  } finally {
    adjacentLoaded.value = true;
  }
}

function scrollArticleTo(destination: number) {
  const container = articleMainRef.value;
  if (!container) return;
  const next = Math.max(0, destination);
  const distance = Math.abs(next - container.scrollTop);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    container.scrollTop = next;
    return;
  }
  gsap.killTweensOf(container);
  gsap.to(container, {
    scrollTop: next,
    duration: Math.min(0.58, Math.max(0.24, distance / 6000)),
    ease: "power3.out",
    overwrite: true,
  });
}

function scrollToTop() {
  scrollArticleTo(0);
}

function scrollToComment() {
  const container = articleMainRef.value;
  const target = document.getElementById("comment");
  if (!container || !target) return;
  const cRect = container.getBoundingClientRect();
  const tRect = target.getBoundingClientRect();
  scrollArticleTo(container.scrollTop + tRect.top - cRect.top - 16);
}

function catalogHeading(item: { text: string; index: number }) {
  const catalogItem = item as CatalogItem;
  if (catalogItem.id) {
    const byId = document.getElementById(catalogItem.id);
    if (byId) return byId;
  }
  const direct = document.getElementById(item.text);
  if (direct) return direct;
  const headings = document.querySelectorAll<HTMLElement>(
    `#${editorId} h1, #${editorId} h2, #${editorId} h3, #${editorId} h4, #${editorId} h5, #${editorId} h6`,
  );
  return headings[item.index - 1] || null;
}

function headingLayoutTop(heading: HTMLElement, container: HTMLElement) {
  const headingRect = heading.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const style = getComputedStyle(heading);
  let transformShift = 0;
  if (style.transform !== "none") {
    const values = style.transform
      .slice(style.transform.indexOf("(") + 1, -1)
      .split(",")
      .map(Number);
    const is3d = style.transform.startsWith("matrix3d(");
    const scaleY = values[is3d ? 5 : 3] ?? 1;
    const translateY = values[is3d ? 13 : 5] ?? 0;
    const originY = Number.parseFloat(style.transformOrigin.split(/\s+/)[1]) || 0;
    transformShift = translateY + (1 - scaleY) * originY;
  }
  return (
    container.scrollTop +
    headingRect.top -
    containerRect.top -
    transformShift
  );
}

function navigateCatalog(
  event: MouseEvent,
  item: { text: string; level: number; index: number },
) {
  event.preventDefault();
  const container = articleMainRef.value;
  const target = catalogHeading(item);
  if (!container || !target) return;

  const destination = Math.max(
    0,
    headingLayoutTop(target, container) - CATALOG_VIEW_OFFSET,
  );
  scrollArticleTo(destination);
}

function setImmersive(active: boolean) {
  immersiveMode.value = active;
  document.documentElement.classList.toggle("article-immersive", active);
}

function toggleImmersive() {
  const next = !immersiveMode.value;
  requestAnimationFrame(() => setImmersive(next));
}

function onPageKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && immersiveMode.value) {
    setImmersive(false);
  }
}

let scrollFrame: number | null = null;
let articleResizeObserver: ResizeObserver | null = null;
let excerptFrame: number | null = null;
let catalogIdleHandle: number | null = null;
let catalogFallbackTimer: ReturnType<typeof setTimeout> | null = null;

function refreshCatalogOffsets() {
  const container = articleMainRef.value;
  if (!container) return;
  const root = articleContentRef.value;
  const currentHeadings = root
    ? Array.from(
        root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"),
      )
    : [];
  const headingsChanged =
    currentHeadings.length !== catalogHeadings.length ||
    currentHeadings.some((heading, index) => heading !== catalogHeadings[index]);
  if (headingsChanged) {
    catalogHeadings = currentHeadings;
    catalogItems.value = catalogHeadings.map((heading, index) => {
      if (!heading.id) heading.id = `${editorId}-heading-${index + 1}`;
      return {
        id: heading.id,
        text: heading.textContent?.trim() || `章节 ${index + 1}`,
        level: Number(heading.tagName.slice(1)) || 1,
        index: index + 1,
      };
    });
  }
  catalogOffsets = catalogHeadings.map((heading) =>
    Math.max(
      0,
      headingLayoutTop(heading, container) - CATALOG_VIEW_OFFSET,
    ),
  );
}

function buildCatalog() {
  refreshCatalogOffsets();
  catalogReady.value = true;
  updateActiveCatalog();
}

function scheduleCatalog() {
  if (catalogIdleHandle !== null || catalogFallbackTimer) return;
  const reveal = () => {
    catalogIdleHandle = null;
    catalogFallbackTimer = null;
    requestAnimationFrame(buildCatalog);
  };
  if ("requestIdleCallback" in window) {
    catalogIdleHandle = window.requestIdleCallback(reveal, { timeout: 700 });
  } else {
    catalogFallbackTimer = window.setTimeout(reveal, 80);
  }
}

function updateActiveCatalog() {
  const container = articleMainRef.value;
  if (!container || !catalogOffsets.length) {
    activeCatalogIndex.value = 0;
    return;
  }
  const position = container.scrollTop;
  let low = 0;
  let high = catalogOffsets.length - 1;
  let active = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (catalogOffsets[middle] <= position + CATALOG_ACTIVE_TOLERANCE) {
      active = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  activeCatalogIndex.value = active;
}

function updateArticleScrollState() {
  const container = articleMainRef.value;
  if (!container) return;
  showBackTop.value = container.scrollTop > 240;

  const content = articleContentRef.value;
  if (!content) {
    readingProgress.value = 0;
    return;
  }
  const containerRect = container.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const contentTop = contentRect.top - containerRect.top + container.scrollTop;
  const readingDistance = Math.max(
    1,
    content.offsetHeight - container.clientHeight,
  );
  const contentScroll = container.scrollTop - contentTop;
  readingProgress.value = Math.min(
    1,
    Math.max(0, contentScroll / readingDistance),
  );
  updateActiveCatalog();
}

function handleArticleScroll() {
  if (scrollFrame !== null) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = null;
    updateArticleScrollState();
  });
}

function typeExcerpt() {
  if (excerptFrame !== null) cancelAnimationFrame(excerptFrame);
  const characters = excerptCharacters.value;
  excerptVisibleCount.value = 0;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    excerptVisibleCount.value = characters.length;
    return;
  }
  let previous = performance.now();
  let delay = 28;
  const tick = (now: number) => {
    if (now - previous >= delay) {
      excerptVisibleCount.value += 1;
      const character = characters[excerptVisibleCount.value - 1] || "";
      delay = /[，。！？；：,.!?;:]/.test(character) ? 118 : 28;
      previous = now;
    }
    if (excerptVisibleCount.value < characters.length) {
      excerptFrame = requestAnimationFrame(tick);
    } else {
      excerptFrame = null;
    }
  };
  excerptFrame = requestAnimationFrame(tick);
}

function checkOutdated() {
  const notice = noticeRef.value;
  if (!notice || !notice.dataset.publishTime) return;
  const publishTime = new Date(notice.dataset.publishTime).getTime();
  if (Number.isNaN(publishTime)) return;
  const threshold = parseInt(notice.dataset.threshold || "180");
  const messageTemplate = notice.dataset.message || "";
  const daysPassed = Math.floor(
    (Date.now() - publishTime) / (1000 * 60 * 60 * 24),
  );
  if (daysPassed >= threshold) {
    const text = messageTemplate.replace("{days}", String(daysPassed));
    const el = notice.querySelector(".notice-text");
    if (el) el.textContent = text;
    notice.style.display = "flex";
  }
}

function focusSearchResult() {
  if (highlightQuery.value)
    focusSearchHighlight(highlightQuery.value, articleMainRef.value);
}

onMounted(async () => {
  document.addEventListener("keydown", onPageKeydown);
  await loadArticle();
  await nextTick();
  requestAnimationFrame(() => {
    articleReady.value = true;
  });
  typeExcerpt();
  focusSearchResult();
  checkOutdated();
  updateArticleScrollState();

  if (articleContentRef.value) {
    articleResizeObserver = new ResizeObserver(() => {
      refreshCatalogOffsets();
      updateArticleScrollState();
    });
    articleResizeObserver.observe(articleContentRef.value);
  }
  void loadAdjacent();
});

onUnmounted(() => {
  document.removeEventListener("keydown", onPageKeydown);
  setImmersive(false);
  if (articleMainRef.value) gsap.killTweensOf(articleMainRef.value);
  articleResizeObserver?.disconnect();
  if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
  if (excerptFrame !== null) cancelAnimationFrame(excerptFrame);
  if (catalogIdleHandle !== null && "cancelIdleCallback" in window)
    window.cancelIdleCallback(catalogIdleHandle);
  if (catalogFallbackTimer) clearTimeout(catalogFallbackTimer);
});
</script>

<style scoped>
.page-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.article-page {
  --article-aside-w: clamp(216px, 17vw, 232px);
  --article-inline-pad: clamp(28px, 3vw, 64px);
  position: relative;
  transition: background-color 0.28s ease;
}

.article-main {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  padding: 28px var(--article-inline-pad) 60px;
  min-width: 0;
  scrollbar-gutter: stable;
}

.article-main > * {
  width: min(100%, 53.333rem);
  margin-right: auto;
  margin-left: auto;
  transition: width 0.32s var(--ui-ease-out);
}

.article-page :deep(.sidebar-right),
.article-main {
  transition:
    width 0.32s var(--ui-ease-out),
    flex-basis 0.32s var(--ui-ease-out),
    opacity 0.24s ease,
    padding 0.32s var(--ui-ease-out);
}

.article-page :deep(.sidebar-right) {
  position: relative;
  z-index: 3;
  min-width: var(--article-aside-w, 236px);
  background: transparent;
  isolation: isolate;
}

.article-page.is-immersive .article-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-basis: 100%;
  width: 100%;
  min-width: 0;
  margin-right: auto;
  margin-left: auto;
  padding-right: clamp(24px, 4vw, 88px);
  padding-left: clamp(24px, 4vw, 88px);
}

.article-page.is-immersive .article-main > * {
  width: min(100%, 50.667rem);
}

.article-page.is-immersive :deep(.sidebar-right) {
  width: 0;
  flex-basis: 0;
  min-width: 0;
  opacity: 0;
  padding-right: 0;
  padding-left: 0;
  overflow: hidden;
  pointer-events: none;
  visibility: hidden;
}

.article-page.is-immersive .post-title,
.article-page.is-immersive .article-shell,
.article-page.is-immersive .article-lead {
  transition:
    max-width 0.36s var(--ui-ease-out),
    width 0.36s var(--ui-ease-out);
}

.article-shell {
  transition: width 0.32s var(--ui-ease-out);
}

.article-main::-webkit-scrollbar {
  display: none;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--c-text-2);
  text-decoration: none;
  margin-bottom: 18px;
  transition: color 0.2s;
}

.back-btn:hover {
  color: var(--c-primary);
}

.post-header {
  position: relative;
  margin-bottom: 26px;
}

.post-cover {
  width: 100%;
  border-radius: 12px;
  margin-bottom: 20px;
  max-height: 340px;
  object-fit: cover;
  display: block;
  box-shadow: 0 14px 36px var(--ld-shadow);
}

.post-header.has-cover {
  aspect-ratio: 10 / 3;
  min-height: 0;
  overflow: hidden;
  border-radius: 12px;
  background: var(--c-bg-2);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--ld-shadow) 76%, transparent);
}

.post-header.has-cover::after {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(
    180deg,
    rgb(4 9 18 / 18%) 20%,
    rgb(4 9 18 / 82%) 100%
  );
  content: "";
  pointer-events: none;
}

.post-header.has-cover .post-cover {
  position: absolute;
  inset: 0;
  height: 100%;
  max-height: none;
  margin: 0;
  border: 0;
  border-radius: inherit;
  box-shadow: none;
}

.post-header.has-cover .post-nav {
  position: absolute;
  top: 18px;
  right: 20px;
  left: 20px;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.post-header.has-cover .operations {
  order: 2;
}
.post-header.has-cover .post-info {
  order: 1;
  color: rgb(255 255 255 / 84%);
}
.post-header.has-cover .post-info a {
  color: inherit;
}
.post-header.has-cover .author-capsule {
  color: #fff;
}
.post-header.has-cover .z-btn {
  background: rgb(8 14 24 / 54%);
  color: rgb(255 255 255 / 88%);
  box-shadow: none;
  backdrop-filter: blur(10px);
}

.post-header.has-cover .post-title {
  position: absolute;
  right: 24px;
  bottom: 24px;
  left: 24px;
  z-index: 1;
  color: #fff;
  text-shadow: 0 3px 18px rgb(0 0 0 / 46%);
}

.post-nav {
  margin-bottom: 16px;
}

.operations {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.z-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  border-radius: 10px;
  background: var(--ld-bg-card);
  color: var(--c-text-2);
  font-family: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  box-shadow: 0 4px 12px var(--ld-shadow);
  transition: all 0.15s;
}

.z-btn:hover {
  color: var(--c-primary);
  box-shadow: 0 8px 18px
    color-mix(in srgb, var(--c-primary) 16%, var(--ld-shadow));
  transform: translateY(-1px);
}

.post-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 0.72rem;
  color: var(--c-text-2);
}

.post-info span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.post-info a {
  color: var(--c-text-2);
  text-decoration: none;
}

.post-info a:hover {
  color: var(--c-primary);
}

.author-capsule {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  text-decoration: none;
  color: var(--c-text-1);
  font-weight: 600;
}

.author-capsule img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
}

.post-title {
  font-family: var(--font-system-rounded);
  font-size: 24px;
  font-weight: 680;
  line-height: 1.35;
  color: var(--c-text);
  margin: 0;
}

.article-lead {
  position: relative;
  margin-bottom: 22px;
  overflow: hidden;
  overflow-anchor: none;
  border: 1px solid color-mix(in srgb, var(--c-primary) 16%, var(--border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--c-primary-soft) 28%, var(--ld-bg-card));
}

.article-lead::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: var(--c-primary);
  content: "";
}

.md-excerpt {
  display: flex;
  align-items: stretch;
  gap: 15px;
  padding: 18px 20px 19px 18px;
  font-family: var(--font-rounded);
  font-size: 13px;
  line-height: 1.95;
  color: var(--c-text-2);
  position: relative;
  background: transparent;
}

.excerpt-avatar,
.excerpt-content,
.excerpt-copy,
.excerpt-caret {
  position: relative;
  z-index: 1;
}

.excerpt-avatar {
  position: relative;
  display: grid;
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--c-primary) 18%, var(--border));
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-primary-soft) 62%, var(--ld-bg-card));
  box-shadow: 0 8px 20px color-mix(in srgb, var(--c-primary) 13%, transparent);
  place-items: center;
}

.excerpt-avatar img {
  width: 100%;
  height: 100%;
  padding: 4px;
  object-fit: contain;
}

.excerpt-avatar i {
  position: absolute;
  right: -3px;
  bottom: -2px;
  display: grid;
  width: 19px;
  height: 19px;
  border: 2px solid var(--ld-bg-card);
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  font-size: 0.65rem;
  font-style: normal;
  place-items: center;
}

.excerpt-content {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 7px;
}

.excerpt-content > small {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 700;
  line-height: 1;
}

.excerpt-content > small b,
.excerpt-content > small i {
  font: inherit;
  font-style: normal;
}

.excerpt-content > small i {
  color: var(--c-text-3);
  font-weight: 500;
}

.excerpt-content > small::after {
  width: min(92px, 18vw);
  height: 1px;
  background: color-mix(in srgb, var(--c-primary) 22%, transparent);
  content: "";
}

.excerpt-copy {
  position: relative;
  display: block;
  min-width: 0;
  min-height: 0;
  color: color-mix(in srgb, var(--c-text) 84%, var(--c-text-2));
  font-family: var(--font-summary);
  font-weight: 500;
  overflow-wrap: break-word;
  word-break: normal;
  white-space: normal;
}

.excerpt-typed {
  display: block;
  min-height: 0;
}

.excerpt-caret {
  display: inline-block;
  width: 1px;
  height: 1.05em;
  margin-left: 3px;
  border-left: 1px solid var(--c-primary);
  vertical-align: -0.16em;
  animation: blink 0.8s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }

  51%,
  100% {
    opacity: 0;
  }
}

:deep(.search-highlight) {
  padding: 0 0.12em;
  border-radius: 3px;
  background: color-mix(in srgb, var(--c-primary) 24%, transparent);
  color: inherit;
  transition: background-color 0.45s ease;
}
:deep(.search-highlight.is-settled) {
  background: color-mix(in srgb, var(--c-primary) 12%, transparent);
}

@keyframes article-fade-up {
  from {
    opacity: 0;
    transform: translateY(14px);
    filter: blur(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: none;
  }
}

.article-anim {
  opacity: 0;
}

.article-ready .article-anim,
.comments-enter {
  animation: article-fade-up 0.62s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.article-anim:nth-child(2) {
  animation-delay: 0.05s;
}
.article-anim:nth-child(3) {
  animation-delay: 0.1s;
}
.article-anim:nth-child(4) {
  animation-delay: 0.15s;
}
.article-anim:nth-child(5) {
  animation-delay: 0.2s;
}
.article-anim:nth-child(6) {
  animation-delay: 0.25s;
}
.article-anim:nth-child(7) {
  animation-delay: 0.3s;
}
.article-anim:nth-child(8) {
  animation-delay: 0.35s;
}

.outdated-notice {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  margin-bottom: 20px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
  font-size: 0.75rem;
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.12);
}

.article-lead :deep(.reading-strip) {
  margin: 0;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

:root.dark .outdated-notice,
.dark .outdated-notice {
  background: rgba(251, 191, 36, 0.08);
  color: #fbbf24;
}

.article-shell {
  padding: 10px 0 4px;
}

.post-footer {
  margin-top: 32px;
  padding: 18px;
  border-radius: 16px;
  background: var(--ld-bg-card);
  box-shadow: 0 8px 24px var(--ld-shadow);
}

.title.text-creative {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--c-text);
  margin-bottom: 10px;
  letter-spacing: 0.03em;
}

.tags-section {
  margin-bottom: 20px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  --tag-color: var(--c-primary);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.7rem;
  color: var(--tag-color);
  text-decoration: none;
  cursor: pointer;
  background: color-mix(in srgb, var(--tag-color) 10%, transparent);
  transition: all 0.2s;
}

.tag-item:hover {
  color: var(--tag-color);
  background: color-mix(in srgb, var(--tag-color) 18%, transparent);
}

.license .content {
  font-size: 0.75rem;
  color: var(--c-text-2);
  line-height: 1.6;
}

.license a {
  color: var(--c-primary);
  text-decoration: none;
}

.surround-post {
  display: flex;
  gap: 14px;
  margin-top: 24px;
}

.surround-link {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: var(--ld-bg-card);
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 6px 18px var(--ld-shadow);
  transition: all 0.2s;
}

.surround-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px
    color-mix(in srgb, var(--c-primary) 12%, var(--ld-shadow));
}

.surround-link :deep(.icon) {
  font-size: 1.2rem;
  flex-shrink: 0;
  color: var(--c-primary);
}

.surround-text {
  flex: 1;
  min-width: 0;
}

.surround-text .title {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--c-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.surround-text .date {
  font-size: 0.65rem;
  color: var(--c-text-2);
  margin-top: 2px;
  display: block;
}

.surround-link.align-end {
  text-align: right;
}

.surround-link.no-link {
  cursor: default;
  opacity: 0.6;
}

.surround-link.no-link:hover {
  transform: none;
  box-shadow: 0 6px 18px var(--ld-shadow);
}

@media (max-width: 640px) {
  .article-main {
    width: 100%;
    max-width: 100%;
    padding-right: 20px;
    padding-left: 20px;
    scrollbar-gutter: auto;
  }

  .back-btn {
    margin-bottom: 14px;
  }

  .post-header {
    margin-bottom: 18px;
  }

  .post-header.has-cover {
    min-height: 220px;
    border-radius: 10px;
  }

  .post-header.has-cover .post-nav {
    top: 14px;
    right: 14px;
    left: 14px;
  }

  .post-header.has-cover .post-info > span:nth-of-type(2),
  .post-header.has-cover .post-info > span:nth-of-type(3) {
    display: none;
  }

  .post-header.has-cover .operations span {
    display: none;
  }

  .post-header.has-cover .post-title {
    right: 18px;
    bottom: 18px;
    left: 18px;
  }

  .post-cover {
    max-height: 240px;
    margin-bottom: 15px;
    border-radius: 12px;
    box-shadow: 0 8px 24px var(--ld-shadow);
  }

  .operations {
    flex-wrap: wrap;
    gap: 6px;
  }

  .z-btn {
    padding: 6px 9px;
  }

  .post-info {
    gap: 8px 10px;
    line-height: 1.5;
  }

  .post-title {
    font-size: 1.35rem;
    line-height: 1.45;
  }

  .md-excerpt {
    align-items: flex-start;
    gap: 11px;
    padding: 15px 14px 16px 13px;
  }

  .article-lead {
    margin-bottom: 18px;
  }

  .excerpt-avatar {
    width: 46px;
    height: 46px;
  }

  .excerpt-content {
    gap: 8px;
  }

  .excerpt-copy {
    font-size: 0.76rem;
    line-height: 1.85;
  }

  .article-shell {
    width: 100%;
    min-width: 0;
    padding-right: 0;
    padding-left: 0;
  }

  .post-footer {
    margin-top: 24px;
    padding: 15px;
    border-radius: 13px;
  }

  .surround-post {
    flex-direction: column;
    gap: 9px;
    margin-top: 18px;
  }

  .surround-link {
    width: 100%;
    padding: 12px;
  }
}

@media (max-width: 900px) {
  .article-page.is-immersive .article-main {
    padding-right: max(16px, env(safe-area-inset-right)) !important;
    padding-left: max(16px, env(safe-area-inset-left)) !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .article-page :deep(.sidebar-right),
  .article-main,
  .article-shell {
    transition: none;
  }

}

@media (prefers-reduced-motion: reduce) {
  .article-anim {
    opacity: 1;
  }
  .article-ready .article-anim,
  .comments-enter {
    animation: none;
  }
}
</style>

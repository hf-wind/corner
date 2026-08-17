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
      <template v-if="!articleLoading">
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
          aria-label="文章导读"
        >
          <div
            v-if="article.excerpt"
            class="md-excerpt"
            ref="excerptRef"
            data-animation="true"
            data-speed="30"
          >
            <span class="excerpt-mark"
              ><Icon name="ph:highlighter-bold"
            /></span>
            <span class="excerpt-content">
              <small>文章摘要</small>
              <span class="excerpt-copy">
                <span ref="excerptTextRef" :data-text="article.excerpt"></span>
                <span
                  ref="excerptCaretRef"
                  class="excerpt-caret"
                  aria-hidden="true"
                  >_</span
                >
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
          <ArticleMarkdown :content="article.content" :editor-id="editorId" />
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

        <ArticleComments :post-id="article.id" />
      </template>
    </main>

    <ArticleSidebar
      v-if="!articleLoading"
      :editor-id="editorId"
      scroll-element="#main-content"
      :progress="readingProgress"
      :show-top="showBackTop"
      :immersive="immersiveMode"
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
import { getDisplayImageUrl } from "~/utils/imagePerformance";
import { gsap } from "gsap";

function coverUrl(source: string) {
  return getDisplayImageUrl(source, 800, 300);
}

const api = useApi();
const route = useRoute();
const slug = route.params.slug as string;
const editorId = "article-preview";

const article = ref<any>({});
const prevArticle = ref<any>(null);
const nextArticle = ref<any>(null);

const shareOpen = ref(false);
const posterOpen = ref(false);

const excerptRef = ref<HTMLElement | null>(null);
const excerptTextRef = ref<HTMLElement | null>(null);
const excerptCaretRef = ref<HTMLElement | null>(null);
const noticeRef = ref<HTMLElement | null>(null);
const articleMainRef = ref<HTMLElement | null>(null);
const articleContentRef = ref<HTMLElement | null>(null);

const articleLoading = ref(true);
const articleReady = ref(false);
const adjacentLoaded = ref(false);
const readingProgress = ref(0);
const showBackTop = ref(false);
const immersiveMode = ref(false);
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

function scrollToTop() {
  articleMainRef.value?.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToComment() {
  const container = articleMainRef.value;
  const target = document.getElementById("comment");
  if (!container || !target) return;
  const cRect = container.getBoundingClientRect();
  const tRect = target.getBoundingClientRect();
  container.scrollBy({ top: tRect.top - cRect.top - 16, behavior: "smooth" });
}

function catalogHeading(item: { text: string; index: number }) {
  const direct = document.getElementById(item.text);
  if (direct) return direct;
  const headings = document.querySelectorAll<HTMLElement>(
    `#${editorId} h1, #${editorId} h2, #${editorId} h3, #${editorId} h4, #${editorId} h5, #${editorId} h6`,
  );
  return headings[item.index - 1] || null;
}

function navigateCatalog(
  event: MouseEvent,
  item: { text: string; level: number; index: number },
) {
  event.preventDefault();
  const container = articleMainRef.value;
  const target = catalogHeading(item);
  if (!container || !target) return;

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const destination = Math.max(
    0,
    container.scrollTop + targetRect.top - containerRect.top - 28,
  );
  const distance = Math.abs(destination - container.scrollTop);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    container.scrollTop = destination;
    return;
  }

  gsap.killTweensOf(container);
  gsap.to(container, {
    scrollTop: destination,
    duration: Math.min(1.02, Math.max(0.48, distance / 3000)),
    ease: "power4.inOut",
    overwrite: true,
  });
}

function setImmersive(active: boolean) {
  immersiveMode.value = active;
  document.documentElement.classList.toggle("article-immersive", active);
}

async function toggleImmersive() {
  if (!immersiveMode.value) {
    setImmersive(true);
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Fullscreen can be denied by browser policy; page-level immersion remains usable.
      }
    }
    return;
  }

  setImmersive(false);
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {
      /* the fullscreen state may have changed between the check and request */
    }
  }
}

function onFullscreenChange() {
  if (!document.fullscreenElement && immersiveMode.value) setImmersive(false);
}

function onPageKeydown(event: KeyboardEvent) {
  if (
    event.key === "Escape" &&
    immersiveMode.value &&
    !document.fullscreenElement
  ) {
    setImmersive(false);
  }
}

let scrollFrame: number | null = null;
let articleResizeObserver: ResizeObserver | null = null;
let excerptTimer: ReturnType<typeof setTimeout> | null = null;

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
}

function handleArticleScroll() {
  if (scrollFrame !== null) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = null;
    updateArticleScrollState();
  });
}

function typeExcerpt() {
  const container = excerptRef.value;
  if (!container || container.dataset.animation === "false") return;
  const el = excerptTextRef.value;
  const caret = excerptCaretRef.value;
  if (!el) return;
  const text = el.dataset.text || "";
  const speed = parseInt(container.dataset.speed || "30");
  const characters = Array.from(text);
  if (excerptTimer) clearTimeout(excerptTimer);
  el.textContent = "";
  if (caret) caret.style.visibility = "visible";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = text;
    if (caret) caret.style.visibility = "hidden";
    return;
  }
  let index = 0;
  function type() {
    if (index < characters.length) {
      el!.textContent += characters[index];
      index++;
      excerptTimer = setTimeout(type, speed);
    } else if (caret) {
      caret.style.visibility = "hidden";
      excerptTimer = null;
    }
  }
  type();
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

onMounted(async () => {
  document.addEventListener("keydown", onPageKeydown);
  document.addEventListener("fullscreenchange", onFullscreenChange);
  await loadArticle();
  await nextTick();
  requestAnimationFrame(() => {
    articleReady.value = true;
  });
  typeExcerpt();
  checkOutdated();
  updateArticleScrollState();

  if (articleContentRef.value) {
    articleResizeObserver = new ResizeObserver(updateArticleScrollState);
    articleResizeObserver.observe(articleContentRef.value);
  }
  void loadAdjacent();
});

onUnmounted(() => {
  document.removeEventListener("keydown", onPageKeydown);
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  setImmersive(false);
  if (document.fullscreenElement) void document.exitFullscreen();
  if (articleMainRef.value) gsap.killTweensOf(articleMainRef.value);
  articleResizeObserver?.disconnect();
  if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
  if (excerptTimer) clearTimeout(excerptTimer);
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
  flex: 1;
  overflow-y: auto;
  padding: 28px var(--article-inline-pad) 60px;
  min-width: 0;
  scrollbar-gutter: stable;
}

.article-main > * {
  width: min(100%, 800px);
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

.article-page.is-immersive .article-main {
  padding-right: clamp(24px, 4vw, 88px);
  padding-left: clamp(24px, 4vw, 88px);
}

.article-page.is-immersive .article-main > * {
  width: min(100%, 760px);
}

.article-page.is-immersive :deep(.sidebar-right) {
  width: 0;
  flex-basis: 0;
  opacity: 0;
  padding-right: 0;
  padding-left: 0;
  overflow: hidden;
  pointer-events: none;
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
  border-top: 1px solid color-mix(in srgb, var(--c-text) 12%, var(--border));
  border-bottom: 1px solid color-mix(in srgb, var(--c-text) 12%, var(--border));
}

.article-lead::before {
  position: absolute;
  top: -1px;
  left: 0;
  width: 72px;
  height: 2px;
  background: var(--c-primary);
  content: "";
}

.md-excerpt {
  display: flex;
  align-items: stretch;
  gap: 16px;
  padding: 19px 8px 21px;
  font-family: var(--font-rounded);
  font-size: 13px;
  line-height: 1.95;
  color: var(--c-text-2);
  position: relative;
  background: transparent;
}

.excerpt-mark,
.excerpt-content,
.excerpt-copy,
.excerpt-caret {
  position: relative;
  z-index: 1;
}

.excerpt-mark {
  display: grid;
  width: 34px;
  flex-shrink: 0;
  padding-top: 3px;
  border-right: 1px solid
    color-mix(in srgb, var(--c-primary) 24%, var(--border));
  color: color-mix(in srgb, var(--c-primary) 84%, var(--c-text));
  font-size: 1rem;
  place-items: start center;
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
  gap: 9px;
  color: var(--c-primary);
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 700;
}

.excerpt-content > small::after {
  width: min(80px, 22vw);
  height: 1px;
  background: color-mix(in srgb, var(--c-primary) 22%, transparent);
  content: "";
}

.excerpt-copy {
  flex: 1;
  min-width: 0;
  color: color-mix(in srgb, var(--c-text) 84%, var(--c-text-2));
  font-family: var(--font-summary);
  font-weight: 500;
  text-wrap: pretty;
}

.excerpt-caret {
  display: inline-block;
  width: 0.65em;
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

@keyframes article-fade-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.article-anim {
  opacity: 0;
}

.article-ready .article-anim,
.comments-enter {
  animation: article-fade-up 0.5s ease both;
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
    gap: 12px;
    padding: 17px 3px 18px;
  }

  .article-lead {
    margin-bottom: 18px;
  }

  .excerpt-mark {
    width: 29px;
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
  .article-loading-state {
    animation: none;
  }
  .article-anim {
    opacity: 1;
  }
  .article-ready .article-anim,
  .comments-enter {
    animation: none;
  }
}
</style>

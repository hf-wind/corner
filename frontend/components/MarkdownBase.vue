<template>
  <div
    ref="wrapperRef"
    class="md-base-wrap"
    :class="{ dark: isDark, 'theme-refreshing': themeRefreshing, 'md-moment': variant === 'moment' }"
    @click.capture="onContentClick"
  >
    <template v-if="mode === 'preview'">
      <BrowserOnly>
        <Transition name="md-base-ready" appear>
          <MdPreview
            v-if="editorReady"
            :id="editorId"
            :model-value="previewContent"
            :theme="mdTheme"
            language="zh-CN"
            :preview-theme="variant === 'moment' ? 'default' : 'smart-blue'"
            code-theme="github"
            :no-highlight="!enabledFeatures.highlight"
            :no-mermaid="!enabledFeatures.mermaid"
            :no-katex="!enabledFeatures.katex"
            :no-echarts="!enabledFeatures.echarts"
            class="md-base-preview"
          />
        </Transition>
      </BrowserOnly>
    </template>
    <template v-else-if="mode === 'html'">
      <div class="md-base-html" v-html="content" />
    </template>
    <ImageLightbox
      v-model="previewOpen"
      v-model:index="previewIndex"
      :images="previewImages"
      label="图片预览"
    />
  </div>
</template>

<script setup lang="ts">
import { MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/preview.css";
import "@/assets/styles/markdown-base.css";
import "@/assets/styles/moment-markdown.css";
import ImageLightbox from "@/components/ImageLightbox.vue";
import {
  configureMarkdownPreview,
  markdownPreviewFeatures,
  normalizeMarkdownPreviewContent,
  type MarkdownPreviewFeatures,
} from "@/utils/configureMarkdownPreview";

const props = withDefaults(
  defineProps<{
    content?: string;
    mode?: "preview" | "html";
    variant?: "article" | "moment";
    editorId?: string;
    articleTitle?: string;
    noMermaid?: boolean;
    noKatex?: boolean;
    noEcharts?: boolean;
  }>(),
  {
    content: "",
    mode: "preview",
    variant: "article",
    editorId: "md-base",
    articleTitle: "",
    noMermaid: false,
    noKatex: false,
    noEcharts: false,
  },
);

const emit = defineEmits<{ rendered: [] }>();

const isDark = ref(false);
const themeRefreshing = ref(false);
const editorReady = ref(false);
const previewContent = computed(() =>
  normalizeMarkdownPreviewContent(props.content || ""),
);
const requestedFeatures = computed(() => {
  const features = markdownPreviewFeatures(previewContent.value);
  if (props.noMermaid) features.mermaid = false;
  if (props.noKatex) features.katex = false;
  if (props.noEcharts) features.echarts = false;
  return features;
});
const enabledFeatures = reactive<MarkdownPreviewFeatures>({
  highlight: false,
  mermaid: false,
  katex: false,
  echarts: false,
});
const mdTheme = computed(() => (isDark.value ? "dark" : "light"));
const wrapperRef = ref<HTMLElement | null>(null);
const previewOpen = ref(false);
const previewIndex = ref(0);
const previewImages = ref<
  Array<{ src: string; alt: string; caption?: string }>
>([]);

let observer: MutationObserver | null = null;
let themeResizeObserver: ResizeObserver | null = null;
let themePositionTimer: ReturnType<typeof setTimeout> | null = null;
let themePositionFrame: number | null = null;
let themeInputAbortController: AbortController | null = null;
let diagramObserver: MutationObserver | null = null;
let diagramInteractionObserver: MutationObserver | null = null;
let headingObserver: MutationObserver | null = null;
let headingSyncFrame: number | null = null;
let diagramRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let diagramStableHeights: number[] = [];
const DIAGRAM_THEME_MIN_DURATION = 900;

type ReadingAnchor = {
  host: HTMLElement;
  blockIndex: number;
  viewportOffset: number;
};

function previewBlocks() {
  return Array.from(
    wrapperRef.value?.querySelectorAll<HTMLElement>(".md-editor-preview > *") ||
      [],
  );
}

function normalizedHeading(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase();
}

function syncArticleHeadingVisibility() {
  headingSyncFrame = null;
  const title = normalizedHeading(props.articleTitle || "");
  const headings = wrapperRef.value?.querySelectorAll<HTMLElement>(
    ".md-editor-preview h1",
  );
  headings?.forEach((heading) => {
    const duplicate = Boolean(
      title &&
      normalizedHeading(heading.innerText || heading.textContent || "") ===
        title,
    );
    heading.hidden = duplicate;
    heading.classList.toggle("article-title-duplicate", duplicate);
  });
}

function scheduleHeadingSync() {
  if (headingSyncFrame !== null) cancelAnimationFrame(headingSyncFrame);
  headingSyncFrame = requestAnimationFrame(syncArticleHeadingVisibility);
}

function mermaidBoxes() {
  return Array.from(
    wrapperRef.value?.querySelectorAll<HTMLElement>(".md-editor-mermaid") || [],
  );
}

function applyStableDiagramHeights() {
  mermaidBoxes().forEach((box, index) => {
    const height = diagramStableHeights[index];
    if (height) box.style.setProperty("--mermaid-stable-height", `${height}px`);
  });
}

function ensureDiagramLoaders() {
  applyStableDiagramHeights();
  for (const box of mermaidBoxes()) {
    if (box.querySelector(":scope > .mermaid-theme-loader")) continue;
    const loader = document.createElement("span");
    const ring = document.createElement("span");
    loader.className = "mermaid-theme-loader";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-label", "图表主题切换中");
    ring.className = "mermaid-loader-ring";
    ring.setAttribute("aria-hidden", "true");
    loader.append(ring);
    box.append(loader);
  }
}

function clearDiagramThemeRefresh() {
  diagramObserver?.disconnect();
  diagramObserver = null;
  if (diagramRefreshTimer) clearTimeout(diagramRefreshTimer);
  diagramRefreshTimer = null;
  themeRefreshing.value = false;
  mermaidBoxes().forEach((box) => {
    box.style.removeProperty("--mermaid-stable-height");
    box.querySelector(":scope > .mermaid-theme-loader")?.remove();
  });
  diagramStableHeights = [];
}

function beginDiagramThemeRefresh() {
  clearDiagramThemeRefresh();
  diagramStableHeights = mermaidBoxes().map(
    (box) => box.getBoundingClientRect().height,
  );
  if (!diagramStableHeights.length) return;
  themeRefreshing.value = true;
  ensureDiagramLoaders();
  if (wrapperRef.value) {
    diagramObserver = new MutationObserver(ensureDiagramLoaders);
    diagramObserver.observe(wrapperRef.value, {
      childList: true,
      subtree: true,
    });
  }
  diagramRefreshTimer = window.setTimeout(
    clearDiagramThemeRefresh,
    DIAGRAM_THEME_MIN_DURATION,
  );
}

function captureReadingAnchor(): ReadingAnchor | null {
  const host = wrapperRef.value?.closest<HTMLElement>(".article-main");
  if (!host) return null;
  const blocks = previewBlocks();
  if (!blocks.length) return null;
  const hostTop = host.getBoundingClientRect().top;
  const threshold = hostTop + Math.min(32, host.clientHeight * 0.08);
  let blockIndex = blocks.findIndex(
    (block) => block.getBoundingClientRect().bottom > threshold,
  );
  if (blockIndex < 0) blockIndex = blocks.length - 1;
  return {
    host,
    blockIndex,
    viewportOffset: blocks[blockIndex].getBoundingClientRect().top - hostTop,
  };
}

function clearThemePositionLock() {
  themeResizeObserver?.disconnect();
  themeResizeObserver = null;
  themeInputAbortController?.abort();
  themeInputAbortController = null;
  if (themePositionTimer) clearTimeout(themePositionTimer);
  themePositionTimer = null;
  if (themePositionFrame !== null) cancelAnimationFrame(themePositionFrame);
  themePositionFrame = null;
}

function lockThemeReadingPosition(anchor: ReadingAnchor) {
  clearThemePositionLock();
  const restore = () => {
    themePositionFrame = null;
    const block = previewBlocks()[anchor.blockIndex];
    if (!block || !block.isConnected || !anchor.host.isConnected) return;
    const currentOffset =
      block.getBoundingClientRect().top -
      anchor.host.getBoundingClientRect().top;
    const delta = currentOffset - anchor.viewportOffset;
    if (Math.abs(delta) > 0.5) anchor.host.scrollTop += delta;
  };
  const scheduleRestore = () => {
    if (themePositionFrame !== null) cancelAnimationFrame(themePositionFrame);
    themePositionFrame = requestAnimationFrame(restore);
  };

  if (wrapperRef.value) {
    themeResizeObserver = new ResizeObserver(scheduleRestore);
    themeResizeObserver.observe(wrapperRef.value);
  }
  themeInputAbortController = new AbortController();
  for (const eventName of ["wheel", "touchstart", "pointerdown"] as const) {
    anchor.host.addEventListener(eventName, clearThemePositionLock, {
      passive: true,
      signal: themeInputAbortController.signal,
    });
  }
  scheduleRestore();
  themePositionTimer = window.setTimeout(clearThemePositionLock, 1600);
}

function collectPreviewImages() {
  if (!wrapperRef.value) return [];
  const selector =
    props.mode === "preview"
      ? ".md-editor-preview img"
      : ".md-base-html img";
  return Array.from(
    wrapperRef.value.querySelectorAll<HTMLImageElement>(selector),
  )
    .filter((item) => Boolean(item.currentSrc || item.src))
    .map((item, index) => ({
      src: item.currentSrc || item.src,
      alt: item.alt || `图片 ${index + 1}`,
      caption: item.alt || undefined,
    }));
}

function onContentClick(event: MouseEvent) {
  if (event.button !== 0) return;
  const selector =
    props.mode === "preview"
      ? ".md-editor-preview img"
      : ".md-base-html img";
  const image = (event.target as HTMLElement).closest<HTMLImageElement>(selector);
  if (!image || !wrapperRef.value?.contains(image)) return;

  const images = collectPreviewImages();
  const index = images.findIndex(
    (item) => item.src === (image.currentSrc || image.src),
  );
  if (index < 0) return;

  event.preventDefault();
  event.stopPropagation();
  previewImages.value = images;
  previewIndex.value = index;
  previewOpen.value = true;
}

onMounted(async () => {
  const sync = async () => {
    const nextDark = document.documentElement.classList.contains("dark");
    if (nextDark === isDark.value) return;
    if (props.mode === "preview") {
      const readingAnchor = captureReadingAnchor();
      beginDiagramThemeRefresh();
      isDark.value = nextDark;
      await nextTick();
      if (readingAnchor) lockThemeReadingPosition(readingAnchor);
      requestAnimationFrame(() => emit("rendered"));
    } else {
      isDark.value = nextDark;
    }
  };
  isDark.value = document.documentElement.classList.contains("dark");
  observer = new MutationObserver(sync);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  if (props.mode === "preview") {
    try {
      await configureMarkdownPreview(requestedFeatures.value);
      Object.assign(enabledFeatures, requestedFeatures.value);
    } catch {
      // 基础 Markdown 仍可阅读，增强模块失败时不阻塞正文。
    }
  }

  editorReady.value = true;
  await nextTick();

  if (props.mode === "preview" && wrapperRef.value) {
    syncArticleHeadingVisibility();
    headingObserver = new MutationObserver(scheduleHeadingSync);
    headingObserver.observe(wrapperRef.value, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    diagramInteractionObserver = new MutationObserver((records) => {
      for (const record of records) {
        const box = record.target as HTMLElement;
        if (box.hasAttribute("data-grab")) continue;
        box
          .querySelector<SVGElement>(":scope > svg")
          ?.style.removeProperty("transform");
      }
    });
    diagramInteractionObserver.observe(wrapperRef.value, {
      attributes: true,
      attributeFilter: ["data-grab"],
      subtree: true,
    });
  }

  requestAnimationFrame(() => {
    if (props.mode === "preview") syncArticleHeadingVisibility();
    emit("rendered");
  });
});

watch(
  () => props.articleTitle,
  () => {
    if (props.mode === "preview") scheduleHeadingSync();
  },
);

onUnmounted(() => {
  observer?.disconnect();
  diagramInteractionObserver?.disconnect();
  headingObserver?.disconnect();
  if (headingSyncFrame !== null) cancelAnimationFrame(headingSyncFrame);
  clearThemePositionLock();
  clearDiagramThemeRefresh();
});
</script>

<style scoped>
.md-base-wrap {
  position: relative;
  min-width: 0;
}

.md-base-ready-enter-active {
  transition:
    opacity 0.45s ease,
    filter 0.45s ease;
}

.md-base-ready-enter-from {
  opacity: 0;
  filter: blur(6px);
}

.md-base-ready-enter-to {
  opacity: 1;
  filter: blur(0);
}

@media (prefers-reduced-motion: reduce) {
  .md-base-ready-enter-active {
    transition: none;
  }
}
</style>

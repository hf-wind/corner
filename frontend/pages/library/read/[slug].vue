<template>
  <main class="reader-shell" :class="`theme-${readerTheme}`">
    <header v-if="!focusMode && !loading && !loadError" class="reader-toolbar">
      <AppLink :to="`/library/${route.params.slug}`" class="reader-back"
        ><Icon name="ph:arrow-left-bold" /> 返回书影</AppLink
      >
      <div class="reader-title">
        <Icon name="ph:book-open-text-bold" /><span>{{
          item?.title || "在线阅读"
        }}</span
        ><b class="reader-progress">{{ progressPercent }}%</b
        ><button
          v-if="savedCfi"
          type="button"
          class="progress-indicator"
          title="已保存阅读进度，点击继续阅读"
          @click="continueReading"
        >
          <i /><span>已保存</span>
        </button>
      </div>
      <div class="reader-actions">
        <button type="button" title="目录" @click="tocOpen = !tocOpen">
          <Icon name="ph:list-bold" /></button
        ><button
          type="button"
          title="阅读设置"
          @click="settingsOpen = !settingsOpen"
        >
          <Icon name="ph:sliders-horizontal-bold" /></button
        ><button type="button" title="沉浸式阅读" @click="focusMode = true">
          <Icon name="ph:corners-out-bold" />
        </button>
      </div>
    </header>
    <section
      ref="stageEl"
      class="reader-stage"
      :class="[{ focus: focusMode, dragging: dragging }]"
      @wheel.prevent="handleWheel"
    >
      <div
        ref="bookEl"
        class="book-view"
        :class="[`fx-${pageEffect}`, { 'is-ready': !loading }]"
        :style="dragStyle"
      />
      <button
        v-if="focusMode"
        type="button"
        class="focus-exit"
        title="退出沉浸式阅读"
        @click="focusMode = false"
      >
        <Icon name="ph:corners-in-bold" />
      </button>
      <Transition name="reader-loader">
        <BookLoader v-if="loading" :label="item?.title || '正在加载'" :stage="loadStage" />
      </Transition>
      <div v-if="loadError && !loading" class="reader-failed">
        <Icon name="ph:book-open-text-bold" />
        <h1>{{ loadError === "timeout" ? "这本书加载太慢了" : loadErrorMessage || "图书资源加载失败" }}</h1>
        <p>
          {{
            loadError === "timeout"
              ? "可能是网络较慢或文件较大，重试通常可以解决。"
              : loadErrorMessage
                ? "可以重试，或返回书影详情检查资源配置。"
                : "资源可能尚未就绪或网络波动，稍后重试即可。"
          }}
        </p>
        <div class="failed-actions">
          <button type="button" class="failed-retry" @click="retryLoad">
            <Icon name="ph:arrows-counter-clockwise-bold" /> 重新加载
          </button>
          <AppLink :to="`/library/${route.params.slug}`">返回书影详情</AppLink>
        </div>
      </div>
      <div v-if="!loading && !loadError && !item?.epubMediaPath" class="reader-empty">
        <Icon name="ph:book-open-text-bold" />
        <h1>这本书还没有绑定 EPUB</h1>
        <AppLink :to="`/library/${route.params.slug}`">返回详情</AppLink>
      </div>
    </section>
    <aside v-if="tocOpen" class="reader-drawer toc-drawer">
      <header>
        <strong>目录</strong
        ><button type="button" @click="tocOpen = false">
          <Icon name="ph:x-bold" />
        </button>
      </header>
      <p v-if="!tocEntries.length" class="drawer-empty">正在读取目录…</p>
      <nav v-else>
        <button
          v-for="(entry, index) in tocEntries"
          :key="`${entry.href}-${index}`"
          type="button"
          @click="openToc(entry.href)"
        >
          {{ entry.label }}
        </button>
      </nav>
    </aside>
    <aside v-if="settingsOpen" class="reader-drawer settings-drawer">
      <header>
        <strong>阅读设置</strong
        ><button type="button" @click="settingsOpen = false">
          <Icon name="ph:x-bold" />
        </button>
      </header>
      <label
        >主题
        <div class="option-row">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            type="button"
            :class="{ active: readerTheme === option.value }"
            @click="setReaderTheme(option.value)"
          >
            {{ option.label }}
          </button>
        </div></label
      ><label
        >字体
        <div class="option-row">
          <button
            v-for="option in fontOptions"
            :key="option.value"
            type="button"
            :class="{ active: readerFont === option.value }"
            @click="
              readerFont = option.value;
              applyReaderTheme();
              persistReaderSettings();
            "
          >
            {{ option.label }}
          </button>
        </div></label
      ><label
        >字号
        <div class="range-row">
          <button type="button" @click="changeFontSize(-1)">−</button
          ><input
            v-model.number="readerFontSize"
            type="range"
            min="14"
            max="26"
            step="1"
            @input="
              applyReaderTheme();
              persistReaderSettings();
            "
          /><button type="button" @click="changeFontSize(1)">＋</button
          ><output>{{ readerFontSize }}px</output>
        </div></label
      ><label
        >行距
        <div class="option-row">
          <button
            v-for="value in [1.65, 1.85, 2.1]"
            :key="value"
            type="button"
            :class="{ active: readerLineHeight === value }"
            @click="
              readerLineHeight = value;
              applyReaderTheme();
              persistReaderSettings();
            "
          >
            {{ value.toFixed(2) }}
          </button>
        </div></label
      ><label
        >字间距
        <div class="range-row">
          <button type="button" @click="changeLetterSpacing(-0.02)">−</button
          ><input
            v-model.number="readerLetterSpacing"
            type="range"
            min="0"
            max="0.2"
            step="0.02"
            @input="
              applyReaderTheme();
              persistReaderSettings();
            "
          /><button type="button" @click="changeLetterSpacing(0.02)">＋</button
          ><output>{{ readerLetterSpacing.toFixed(2) }}em</output>
        </div></label
      ><label
        >翻页效果
        <div class="option-row">
          <button
            v-for="option in effectOptions"
            :key="option.value"
            type="button"
            :class="{ active: pageEffect === option.value }"
            @click="
              pageEffect = option.value;
              persistReaderSettings();
            "
          >
            {{ option.label }}
          </button>
        </div></label
      >
    </aside>
  </main>
</template>

<script setup lang="ts">
import type { LibraryItem } from "@/types/library";
import BookLoader from "@/components/BookLoader.vue";
const { fetchItem: fetchLibraryItem } = useLibraryItem();
// 访客身份：进度键使用稳定客户端 ID；阅读事件批量上报
const { visitorId, queueEvent } = useVisitor();
const route = useRoute();
const { mediaUrl } = useMediaUrl();
const bookEl = ref<HTMLElement | null>(null);
const item = ref<LibraryItem | null>(null);
const loading = ref(true);
const loadError = ref<"" | "network" | "timeout">("");
const loadErrorMessage = ref("");
const loadStage = ref("");
const focusMode = ref(false);
const tocOpen = ref(false);
const settingsOpen = ref(false);
const tocEntries = ref<Array<{ label: string; href: string }>>([]);
const rendition = shallowRef<any>(null);
const book = shallowRef<any>(null);
const stageEl = ref<HTMLElement | null>(null);
const progressCfi = ref("");
const savedCfi = ref("");
const progressPercent = ref(0);
const navigationBusy = ref(false);
const dragging = ref(false);
const dragDx = ref(0);
const dragStyle = ref<Record<string, string>>({});
const contentCleanups: Array<() => void> = [];
const attachedDocuments = new WeakSet<Document>();
const storageKey = computed(
  () => `corner:epub:${visitorId()}:${route.params.slug}`,
);
const readerTheme = ref<"warm-sun" | "mist" | "dawn" | "midnight" | "ink" | "forest">("warm-sun");
const readerFont = ref<"rounded" | "serif" | "sans" | "system" | "misans">("rounded");
const readerFontSize = ref(16);
const readerLineHeight = ref(1.85);
const readerLetterSpacing = ref(0.02);
const pageEffect = ref<"slide" | "curl">("slide");
const themeTouched = ref(false);
const { resolvedTheme } = useTheme();
const themeOptions = [
  { value: "warm-sun", label: "暖阳" },
  { value: "mist", label: "薄雾" },
  { value: "dawn", label: "晨曦" },
  { value: "midnight", label: "深夜" },
  { value: "ink", label: "墨色" },
  { value: "forest", label: "森林" },
] as const;
const fontOptions = [
  { value: "rounded", label: "圆润舒适" },
  { value: "serif", label: "经典衬线" },
  { value: "sans", label: "清晰黑体" },
  { value: "misans", label: "优雅字体" },
  { value: "system", label: "系统字体" },
] as const;
const effectOptions = [
  { value: "slide", label: "平滑滑动" },
  { value: "curl", label: "仿真翻页" },
] as const;
const settingsKey = computed(() => `${storageKey.value}:settings`);
function persistReaderSettings() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    settingsKey.value,
    JSON.stringify({
      theme: readerTheme.value,
      font: readerFont.value,
      size: readerFontSize.value,
      line: readerLineHeight.value,
      letterSpacing: readerLetterSpacing.value,
      effect: pageEffect.value,
    }),
  );
}
function restoreReaderSettings() {
  if (typeof localStorage === "undefined") return;
  try {
    const saved = JSON.parse(localStorage.getItem(settingsKey.value) || "{}");
    if (["warm-sun", "mist", "dawn", "midnight", "ink", "forest"].includes(saved.theme)) {
      readerTheme.value = saved.theme;
      themeTouched.value = true;
    } else if (document.documentElement.classList.contains("dark")) {
      // 未手动选择过阅读主题时，跟随站点深浅模式
      readerTheme.value = "midnight";
    }
    if (["rounded", "serif", "sans", "misans", "system"].includes(saved.font))
      readerFont.value = saved.font;
    if (Number.isFinite(saved.size))
      readerFontSize.value = Math.max(14, Math.min(26, saved.size));
    if (Number.isFinite(saved.line))
      readerLineHeight.value = Math.max(1.5, Math.min(2.3, saved.line));
    if (Number.isFinite(saved.letterSpacing))
      readerLetterSpacing.value = Math.max(0, Math.min(0.2, saved.letterSpacing));
    if (["slide", "curl"].includes(saved.effect))
      pageEffect.value = saved.effect;
  } catch {
    /* ignore malformed local settings */
  }
}
function setReaderTheme(theme: typeof readerTheme.value) {
  readerTheme.value = theme;
  themeTouched.value = true;
  applyReaderTheme();
  persistReaderSettings();
}
function changeFontSize(delta: number) {
  readerFontSize.value = Math.max(
    14,
    Math.min(26, readerFontSize.value + delta),
  );
  applyReaderTheme();
  persistReaderSettings();
}
function changeLetterSpacing(delta: number) {
  readerLetterSpacing.value = Math.max(
    0,
    Math.min(0.2, readerLetterSpacing.value + delta),
  );
  applyReaderTheme();
  persistReaderSettings();
}
function applyReaderTheme() {
  const themes = rendition.value?.themes;
  if (!themes) return;

  // 主题颜色配置
  let palette;
  switch (readerTheme.value) {
    case "midnight":
      palette = { color: "#e8e4d8", background: "#222521" };
      break;
    case "ink":
      palette = { color: "#e0e0e0", background: "#000000" };
      break;
    case "forest":
      palette = { color: "#d4e6d4", background: "#1a2e1a" };
      break;
    case "mist":
      palette = { color: "#39434a", background: "#e9eef0" };
      break;
    case "dawn":
      palette = { color: "#2d2a24", background: "#f5f0e8" };
      break;
    default: // warm-sun
      palette = { color: "#34332f", background: "#fbf7ee" };
  }

  // 字体配置
  let family;
  switch (readerFont.value) {
    case "rounded":
      family = "Nunito Variable, Noto Sans SC Variable, system-ui, sans-serif";
      break;
    case "serif":
      family = "Iowan Old Style, STSong, Songti SC, serif";
      break;
    case "sans":
      family = "Noto Sans SC, system-ui, sans-serif";
      break;
    case "misans":
      family = "MiSans, PingFang SC, Microsoft YaHei, sans-serif";
      break;
    default: // system
      family = "system-ui, sans-serif";
  }

  themes.override("color", palette.color);
  themes.override("background", palette.background);
  themes.override("font-family", family);
  themes.override("font-size", `${readerFontSize.value}px`);
  themes.override("line-height", String(readerLineHeight.value));
  themes.override("letter-spacing", `${readerLetterSpacing.value}em`);
  themes.default({
    html: { "touch-action": "none" },
    body: { "touch-action": "none" },
    img: {
      height: "auto",
      width: "auto",
      "max-width": "100%",
      "max-height": "78vh",
      "object-fit": "contain",
      display: "block",
      margin: "0 auto",
    },
  });
}
/* ---------------- 翻页：手势跟随 + 两种低侵入切换动画 ---------------- */
const EASE_TURN = "cubic-bezier(0.33, 1, 0.68, 1)";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// 拖拽过程中的实时跟手变换
function applyDragTransform(dx: number, width: number) {
  if (pageEffect.value === "curl") {
    const origin = dx < 0 ? "left center" : "right center";
    const angle = clamp((dx / Math.max(width, 1)) * 72, -72, 72);
    dragStyle.value = {
      transformOrigin: origin,
      transform: `perspective(1600px) rotateY(${angle}deg)`,
    };
  } else {
    dragStyle.value = { transform: `translateX(${dx}px)` };
  }
}

function clearDragTransform() {
  dragStyle.value = {};
}

function animateElement(
  keyframes: Keyframe[],
  duration: number,
): Promise<void> | null {
  const el = bookEl.value as (HTMLElement & {
    animate?: (k: Keyframe[], o: KeyframeAnimationOptions) => Animation;
  }) | null;
  if (!el?.animate) return null;
  return el.animate(keyframes, {
    duration,
    easing: EASE_TURN,
    fill: "none",
  }).finished.catch(() => undefined);
}

function exitKeyframes(
  direction: "next" | "prev",
  startDx: number,
  width: number,
): Keyframe[] {
  const sign = direction === "next" ? -1 : 1;
  if (pageEffect.value === "curl") {
    const startAngle = clamp((startDx / Math.max(width, 1)) * 72, -72, 72);
    return [
      {
        transform: `perspective(1600px) rotateY(${startAngle}deg)`,
        filter: "brightness(1)",
      },
      {
        transform: `perspective(1600px) rotateY(${sign * 72}deg)`,
        filter: "brightness(0.84)",
      },
    ];
  }
  return [
    { transform: `translateX(${startDx}px)`, opacity: 1 },
    { transform: `translateX(${sign * width * 0.42}px)`, opacity: 0 },
  ];
}

function enterKeyframes(
  direction: "next" | "prev",
  width: number,
): Keyframe[] {
  const sign = direction === "next" ? -1 : 1;
  if (pageEffect.value === "curl") {
    return [
      {
        transform: `perspective(1600px) rotateY(${-sign * 72}deg)`,
        filter: "brightness(0.86)",
      },
      { transform: "perspective(1600px) rotateY(0deg)", filter: "brightness(1)" },
    ];
  }
  return [
    { transform: `translateX(${-sign * width * 0.42}px)`, opacity: 0 },
    { transform: "translateX(0px)", opacity: 1 },
  ];
}

async function animateTurn(
  direction: "next" | "prev",
  startDx = 0,
): Promise<void> {
  if (navigationBusy.value || !rendition.value) return;
  const el = bookEl.value;
  if (!el) return;
  navigationBusy.value = true;
  const width = el.offsetWidth || 1;
  const duration = pageEffect.value === "curl" ? 300 : 230;
  if (pageEffect.value === "curl") {
    el.style.transformOrigin = direction === "next" ? "left center" : "right center";
  }
  try {
    // 先清掉拖拽残留偏移（退场关键帧自带起点），避免退场结束瞬间跳回
    clearDragTransform();
    const exit = animateElement(exitKeyframes(direction, startDx, width), duration);
    if (exit) await exit;
    await rendition.value[direction]();
    const enter = animateElement(enterKeyframes(direction, width), duration);
    if (enter) await enter;
  } catch {
    /* 翻页被打断时静默恢复 */
  } finally {
    clearDragTransform();
    el.style.transformOrigin = "";
    navigationBusy.value = false;
  }
}

// 松手后未达到翻页阈值：从当前拖拽位置回弹
function animateReleaseBack(): void {
  const el = bookEl.value;
  if (!el?.animate) {
    clearDragTransform();
    return;
  }
  const current =
    pageEffect.value === "curl"
      ? dragStyle.value.transform || "none"
      : dragStyle.value.transform || "none";
  void el
    .animate(
      [
        { transform: current },
        { transform: pageEffect.value === "curl"
            ? "perspective(1600px) rotateY(0deg)"
            : "translateX(0px)" },
      ],
      { duration: 220, easing: EASE_TURN },
    )
    .finished.catch(() => undefined)
    .finally(() => clearDragTransform());
}

function finishDrag(dx: number, dy: number, width: number): void {
  const threshold = Math.max(48, width * 0.18);
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const distance = horizontal ? Math.abs(dx) : Math.abs(dy);
  if (distance < threshold) {
    animateReleaseBack();
    return;
  }
  const direction: "next" | "prev" = (horizontal ? dx < 0 : dy < 0) ? "next" : "prev";
  void animateTurn(direction, horizontal ? dx : 0);
}

function handleKey(event: KeyboardEvent) {
  if (
    ["INPUT", "TEXTAREA", "SELECT"].includes(
      (event.target as HTMLElement)?.tagName,
    )
  )
    return;
  const key = event.key.toLowerCase();
  if (key === "escape") {
    if (focusMode.value) {
      event.preventDefault();
      focusMode.value = false;
    } else if (tocOpen.value) {
      event.preventDefault();
      tocOpen.value = false;
    } else if (settingsOpen.value) {
      event.preventDefault();
      settingsOpen.value = false;
    }
  } else if (["arrowdown", "arrowright", "s", "d"].includes(key)) {
    event.preventDefault();
    void animateTurn("next");
  } else if (["arrowup", "arrowleft", "w", "a"].includes(key)) {
    event.preventDefault();
    void animateTurn("prev");
  }
}
function handleWheel(event: WheelEvent) {
  if (Math.abs(event.deltaY) < 8 && Math.abs(event.deltaX) < 8) return;
  void animateTurn(
    event.deltaY > 0 || event.deltaX > 0 ? "next" : "prev",
  );
}
/* 手势跟随：同时绑定到舞台与 EPUB 内容 iframe（触摸设备上 iframe 会拦截事件） */
function bindPageDrag(target: HTMLElement | Document) {
  let start: { x: number; y: number } | null = null;
  let active = false;

  const point = (event: Event) => {
    const e = event as PointerEvent;
    return { x: e.clientX || 0, y: e.clientY || 0 };
  };

  const onDown = (event: Event) => {
    if (navigationBusy.value || loading.value || !item.value?.epubMediaPath)
      return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button, a, input, textarea, select")
    )
      return;
    start = point(event);
    active = false;
  };
  const onMove = (event: Event) => {
    if (!start) return;
    const p = point(event);
    const dx = p.x - start.x;
    const dy = p.y - start.y;
    if (!active) {
      if (Math.hypot(dx, dy) < 8) return;
      active = true;
      dragging.value = true;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      (event as PointerEvent).preventDefault?.();
    }
    dragDx.value = dx;
    applyDragTransform(dx, bookEl.value?.offsetWidth || 1);
  };
  const onUp = (event: Event) => {
    if (!start) return;
    const p = point(event);
    const width = bookEl.value?.offsetWidth || 1;
    const sx = start.x;
    const sy = start.y;
    start = null;
    dragging.value = false;
    if (!active) return;
    active = false;
    finishDrag(p.x - sx, p.y - sy, width);
  };

  target.addEventListener("pointerdown", onDown);
  target.addEventListener("pointermove", onMove, { passive: false });
  target.addEventListener("pointerup", onUp);
  target.addEventListener("pointercancel", onUp);
}

async function continueReading() {
  if (savedCfi.value && rendition.value) {
    await rendition.value.display(savedCfi.value);
    progressCfi.value = savedCfi.value;
  }
}
async function openToc(href: string) {
  tocOpen.value = false;
  if (!rendition.value) return;
  await rendition.value.display(href);
}
function attachContentEvents() {
  const contents = rendition.value?.getContents?.() || [];
  for (const content of contents) {
    const doc = content.document as Document;
    if (attachedDocuments.has(doc)) continue;
    attachedDocuments.add(doc);
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      handleWheel(event);
    };
    const onKey = (event: KeyboardEvent) => handleKey(event);
    doc.addEventListener("wheel", onWheel, { passive: false });
    doc.addEventListener("keydown", onKey);
    bindPageDrag(doc);
    contentCleanups.push(() => {
      doc.removeEventListener("wheel", onWheel);
      doc.removeEventListener("keydown", onKey);
    });
  }
}
/* EPUB 资源加载：优先读本地缓存（Cache Storage），未命中才请求接口。
   一律以 ArrayBuffer 交给 epub.js（openAs: "epub"），并用 ZIP 魔数校验——
   避免 blob/相对路径被 epub.js 误判为目录而发起 /META-INF/container.xml 请求卡死 */
async function looksLikeZip(buffer: ArrayBuffer): Promise<boolean> {
  if (buffer.byteLength < 64) return false;
  const head = new Uint8Array(buffer.slice(0, 4));
  return head[0] === 0x50 && head[1] === 0x4b && [3, 5, 7].includes(head[2]);
}

async function loadEpubBuffer(url: string): Promise<ArrayBuffer> {
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open("corner:epub-files");
      const cached = await cache.match(url);
      if (cached) {
        const buffer = await cached.arrayBuffer();
        if (await looksLikeZip(buffer)) {
          loadStage.value = "读取本地缓存…";
          return buffer;
        }
        await cache.delete(url);
      }
    } catch {
      /* 缓存读取失败则走网络 */
    }
  }
  loadStage.value = "下载图书资源…";
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "图书资源不存在（404）" : `图书资源请求失败（${response.status}）`);
  }
  const buffer = await response.arrayBuffer();
  if (!(await looksLikeZip(buffer))) {
    throw new Error("资源不是有效的 EPUB 文件");
  }
  loadStage.value = "缓存到本地…";
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open("corner:epub-files");
      await cache.put(url, new Response(buffer.slice(0), { headers: { "content-type": "application/epub+zip" } }));
    } catch {
      /* 缓存写入失败不影响阅读 */
    }
  }
  return buffer;
}

/* 给 display 等可能挂起的 Promise 加看门狗，避免加载动画永远不消失 */
function withTimeout(promise: Promise<unknown>, ms: number, kind: "timeout" | "network") {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(kind)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(kind));
      },
    );
  });
}

function destroyBook() {
  contentCleanups.splice(0).forEach((cleanup) => cleanup());
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (resizeTimer) clearTimeout(resizeTimer);
  rendition.value?.destroy?.();
  book.value?.destroy?.();
  rendition.value = null;
  book.value = null;
  tocEntries.value = [];
}

// 站点明暗切换时，未手动选过阅读主题则跟随
watch(resolvedTheme, (value) => {
  if (themeTouched.value) return;
  readerTheme.value = value === "dark" ? "midnight" : "warm-sun";
  applyReaderTheme();
});

async function retryLoad() {
  destroyBook();
  await load();
}

async function load() {
  loadError.value = "";
  loading.value = true;
  try {
    // 图书数据优先读本地缓存，无缓存再请求
    const { item: cachedItem } = await fetchLibraryItem(
      String(route.params.slug || ""),
    );
    item.value = cachedItem;
    restoreReaderSettings();
    if (!item.value?.epubMediaPath || !bookEl.value) return;
    loadStage.value = "准备阅读器…";
    // @ts-ignore epubjs 当前版本没有类型声明
    const ePub = (await import("epubjs")).default;
    const buffer = await loadEpubBuffer(mediaUrl(item.value.epubMediaPath));
    loadStage.value = "解析图书结构…";
    book.value = ePub(buffer);
    await withTimeout(book.value.opened, 20_000, "timeout");
    rendition.value = book.value.renderTo(bookEl.value, {
      width: "100%",
      height: "100%",
      spread: "none",
    });
    void book.value.locations
      .generate(1600)
      .then(() => {
        if (progressCfi.value) {
          progressPercent.value = Math.round(
            book.value.locations.percentageFromCfi(progressCfi.value) * 100,
          );
        }
      })
      .catch(() => undefined);
    const saved = localStorage.getItem(storageKey.value) || "";
    savedCfi.value = saved;
    loadStage.value = "渲染排版…";
    try {
      await withTimeout(rendition.value.display(saved || undefined), 45000, "timeout");
    } catch (error) {
      if ((error as Error).message === "timeout") throw error;
      savedCfi.value = "";
      await withTimeout(rendition.value.display(), 45000, "timeout");
    }
    loadStage.value = "";
    applyReaderTheme();
    attachContentEvents();
    bindPageDrag(stageEl.value || (bookEl.value.parentElement as HTMLElement));
    rendition.value.on("rendered", attachContentEvents);
    // 容器尺寸变化（沉浸模式切换、旋转屏幕等）时自动重排版
    if (typeof ResizeObserver !== "undefined" && bookEl.value) {
      resizeObserver = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (!rendition.value || !bookEl.value) return;
          try {
            void rendition.value.resize(
              bookEl.value.clientWidth,
              bookEl.value.clientHeight,
            );
          } catch {
            /* 忽略重排版失败 */
          }
        }, 140);
      });
      resizeObserver.observe(bookEl.value);
    }
    book.value.loaded.navigation
      .then((navigation: any) => {
        tocEntries.value = (navigation?.toc || [])
          .map((entry: any) => ({
            label: String(entry.label || "").trim(),
            href: String(entry.href || ""),
          }))
          .filter((entry: any) => entry.label && entry.href);
      })
      .catch(() => undefined);
    rendition.value.on("relocated", (location: any) => {
      const cfi = location?.start?.cfi || "";
      if (!cfi) return;
      progressCfi.value = cfi;

      // 计算进度百分比
      let percentage = 0;

      // 优先使用epubjs的locations计算
      if (book.value?.locations?.length?.()) {
        percentage = book.value.locations.percentageFromCfi(cfi);
      }
      // 如果locations不可用，使用location对象中的percentage
      else if (location?.start?.percentage != null) {
        percentage = location.start.percentage;
      } else if (location?.end?.percentage != null) {
        percentage = location.end.percentage;
      }

      // 确保percentage在0-1之间，然后转换为0-100
      percentage = Math.max(0, Math.min(1, percentage));
      progressPercent.value = Math.round(percentage * 100);

      // 保存进度到localStorage
      localStorage.setItem(storageKey.value, cfi);
      savedCfi.value = cfi;

      // 上报阅读事件
      queueEvent({
        action: "content_read",
        path: cfi,
        contentType: "library",
        contentId: item.value?.id,
        metadata: {
          slug: route.params.slug,
          progress: cfi,
          percentage: progressPercent.value,
        },
      });
    });
  } catch (error) {
    loadError.value = (error as Error)?.message === "timeout" ? "timeout" : "network";
    loadErrorMessage.value = (error as Error)?.message || "";
  } finally {
    loading.value = false;
    loadStage.value = "";
  }
}
watch(focusMode, async () => {
  if (!rendition.value || !progressCfi.value) return;
  await nextTick();
  // 等布局过渡结束再重定位，避免沉浸模式排版异常
  await new Promise((resolve) => setTimeout(resolve, 500));
  try {
    await rendition.value.resize(
      bookEl.value?.clientWidth,
      bookEl.value?.clientHeight,
    );
    await rendition.value.display(progressCfi.value);
  } catch {
    /* 忽略重定位失败 */
  }
});
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  window.addEventListener("keydown", handleKey);
  void load();
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKey);
  destroyBook();
});
useHead({ title: computed(() => `${item.value?.title || "在线阅读"} · 书影`) });
</script>

<style scoped>
.reader-shell {
  --reader-bg: #fbf7ee;
  --reader-ink: #34332f;
  display: flex;
  width: 100%;
  height: 100dvh;
  flex-direction: column;
  background: var(--reader-bg);
  color: var(--reader-ink);
  transition:
    background 0.45s ease,
    color 0.45s ease;
}
.reader-shell.theme-mist {
  --reader-bg: #e9eef0;
  --reader-ink: #39434a;
}
.reader-shell.theme-dawn {
  --reader-bg: #f5f0e8;
  --reader-ink: #2d2a24;
}
.reader-shell.theme-midnight {
  --reader-bg: #222521;
  --reader-ink: #e8e4d8;
}
.reader-shell.theme-ink {
  --reader-bg: #000000;
  --reader-ink: #e0e0e0;
}
.reader-shell.theme-forest {
  --reader-bg: #1a2e1a;
  --reader-ink: #d4e6d4;
}
.reader-toolbar {
  display: flex;
  height: 58px;
  flex: 0 0 58px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 clamp(16px, 4vw, 54px);
  background: color-mix(in srgb, var(--reader-bg) 88%, transparent);
  backdrop-filter: blur(18px);
}
.reader-back,
.reader-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: inherit;
  font-size: 0.7rem;
  text-decoration: none;
}
.reader-back {
  color: color-mix(in srgb, var(--reader-ink) 62%, transparent);
}
.reader-title {
  min-width: 0;
  font-weight: 700;
}
.reader-title > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.reader-progress {
  color: var(--c-primary);
  font-variant-numeric: tabular-nums;
}
.progress-indicator {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 7px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, #43a977 10%, transparent);
  color: #43a977;
  cursor: pointer;
  font: inherit;
  font-size: 0.6rem;
}
.progress-indicator i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #43a977;
  box-shadow: 0 0 0 0 rgb(67 169 119 / 38%);
  animation: reader-breathe 1.8s ease-out infinite;
}
.progress-indicator:hover::after {
  position: absolute;
  z-index: 4;
  top: calc(100% + 8px);
  left: 50%;
  padding: 6px 9px;
  border-radius: 7px;
  background: var(--reader-ink);
  color: var(--reader-bg);
  content: "已保存阅读进度 · 点击继续阅读";
  font-size: 0.56rem;
  white-space: nowrap;
  transform: translateX(-50%);
}
.reader-actions {
  display: flex;
  gap: 6px;
}
.reader-actions button,
.focus-exit {
  display: grid;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 9px;
  background: color-mix(in srgb, var(--reader-ink) 7%, transparent);
  color: inherit;
  cursor: pointer;
  place-items: center;
  transition:
    transform 0.25s ease,
    background 0.25s ease;
}
.reader-actions button:hover,
.focus-exit:hover {
  background: color-mix(in srgb, var(--reader-ink) 14%, transparent);
  transform: translateY(-1px);
}
.reader-stage {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  justify-content: center;
  padding: clamp(18px, 4vw, 48px);
  cursor: grab;
  transition: padding 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}
.reader-stage:active {
  cursor: grabbing;
}
.reader-stage.focus {
  padding: 0;
}
.book-view {
  width: min(880px, 100%);
  height: 100%;
  overflow: hidden;
  border-radius: 18px;
  background: var(--reader-bg);
  box-shadow: 0 12px 50px rgb(20 35 60 / 10%);
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  transition:
    border-radius 0.45s ease,
    box-shadow 0.45s ease,
    width 0.45s ease;
}
.focus .book-view {
  width: 100%;
  max-width: 800px;
  border-radius: 0;
  box-shadow: none;
}
.focus-exit {
  position: fixed;
  z-index: 8;
  top: 16px;
  right: 16px;
  opacity: 0.36;
}
.focus-exit:hover {
  opacity: 1;
}
.reader-loading,
.reader-empty {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 10px;
  color: color-mix(in srgb, var(--reader-ink) 60%, transparent);
}
.reader-failed {
  position: absolute;
  inset: 0;
  z-index: 11;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 10px;
  background: var(--reader-bg);
  color: color-mix(in srgb, var(--reader-ink) 62%, transparent);
  text-align: center;
  padding: 24px;
}
.reader-failed :deep(svg) {
  color: var(--c-primary);
  font-size: 2.4rem;
}
.reader-failed h1 {
  margin: 0;
  color: var(--reader-ink);
  font-size: 1.06rem;
}
.reader-failed p {
  margin: 0;
  max-width: 320px;
  font-size: 0.74rem;
  line-height: 1.7;
}
.failed-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 6px;
}
.failed-retry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border: 0;
  border-radius: 10px;
  background: var(--c-primary);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.74rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.failed-retry:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--c-primary) 30%, transparent);
}
.failed-actions a {
  color: var(--c-primary);
  font-size: 0.72rem;
}
.reader-loading :deep(svg) {
  animation: spin 1s linear infinite;
  font-size: 1.5rem;
}
.reader-empty :deep(svg) {
  color: var(--c-primary);
  font-size: 2.4rem;
}
.reader-empty h1 {
  margin: 0;
  font-size: 1.1rem;
}
.reader-empty a {
  color: var(--c-primary);
  font-size: 0.72rem;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes reader-breathe {
  70% {
    box-shadow: 0 0 0 7px rgb(67 169 119 / 0);
  }
}
@media (max-width: 640px) {
  .reader-toolbar {
    gap: 10px;
    padding: 0 12px;
  }
  .reader-back {
    font-size: 0;
  }
  .reader-back :deep(svg) {
    font-size: 1rem;
  }
  .reader-title {
    flex: 1;
    justify-content: center;
  }
  .reader-title > span {
    max-width: 32vw;
  }
  .progress-indicator span {
    display: none;
  }
  .reader-actions button {
    width: 30px;
    height: 30px;
  }
  .reader-stage {
    padding: 10px;
  }
  .book-view {
    border-radius: 12px;
  }
}
.reader-drawer {
  position: fixed;
  z-index: 12;
  top: 58px;
  right: 18px;
  width: min(340px, calc(100vw - 36px));
  max-height: calc(100dvh - 76px);
  overflow: auto;
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--reader-ink) 14%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--reader-bg) 96%, transparent);
  box-shadow: 0 18px 50px rgb(0 0 0 / 18%);
  backdrop-filter: blur(18px);
  animation: drawer-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.reader-drawer header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.reader-drawer header button {
  display: grid;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: color-mix(in srgb, var(--reader-ink) 8%, transparent);
  color: inherit;
  cursor: pointer;
  place-items: center;
}
.settings-drawer {
  display: grid;
  gap: 16px;
}
.settings-drawer label {
  display: grid;
  gap: 8px;
  color: color-mix(in srgb, var(--reader-ink) 68%, transparent);
  font-size: 0.62rem;
}
.option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.option-row button,
.range-row button {
  padding: 7px 9px;
  border: 1px solid color-mix(in srgb, var(--reader-ink) 14%, transparent);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 0.62rem;
}
.option-row button.active {
  border-color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary) 13%, transparent);
  color: var(--c-primary);
  font-weight: 700;
}
.range-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.range-row input {
  min-width: 0;
  flex: 1;
  accent-color: var(--c-primary);
}
.range-row output {
  min-width: 40px;
  color: var(--reader-ink);
  font-size: 0.6rem;
}
.toc-drawer {
  left: 18px;
  right: auto;
}
.toc-drawer nav {
  display: grid;
  gap: 3px;
}
.toc-drawer nav button {
  padding: 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--reader-ink);
  cursor: pointer;
  font: inherit;
  font-size: 0.68rem;
  text-align: left;
}
.toc-drawer nav button:hover {
  background: color-mix(in srgb, var(--c-primary) 12%, transparent);
  color: var(--c-primary);
}
.drawer-empty {
  color: var(--c-text-3);
  font-size: 0.66rem;
}
@keyframes drawer-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
/* ---- 翻页交互：手势跟手 + Web Animations 切换（低侵入，不依赖容器 keyframes） ---- */
.reader-stage {
  touch-action: none;
}
.reader-stage.dragging {
  cursor: grabbing;
}
.book-view {
  will-change: transform;
  transition: opacity 0.6s ease 0.05s;
}
.book-view.is-ready {
  opacity: 1;
}
.book-view:not(.is-ready) {
  opacity: 0;
}
/* 拖拽中关闭过渡保证跟手 */
.reader-stage.dragging .book-view {
  transition: none;
}

/* ---- 加载界面平滑进入、丝滑消失 ---- */
.reader-loader-enter-active {
  transition: opacity 0.45s ease;
}
.reader-loader-leave-active {
  transition:
    opacity 0.55s cubic-bezier(0.33, 1, 0.68, 1),
    transform 0.55s cubic-bezier(0.33, 1, 0.68, 1);
}
.reader-loader-enter-from {
  opacity: 0;
}
.reader-loader-leave-to {
  opacity: 0;
  transform: scale(1.045);
}
</style>

<template>
  <main class="reader-shell" :class="`theme-${readerTheme}`">
    <header v-if="!focusMode" class="reader-toolbar">
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
      class="reader-stage"
      :class="[
        { focus: focusMode },
        `effect-${pageEffect}`,
        { turning: turningClass },
      ]"
      @wheel.prevent="handleWheel"
      @pointerdown="handlePointerDown"
      @pointerup="handlePointerUp"
    >
      <div ref="bookEl" class="book-view" />
      <button
        v-if="focusMode"
        type="button"
        class="focus-exit"
        title="退出沉浸式阅读"
        @click="focusMode = false"
      >
        <Icon name="ph:corners-in-bold" />
      </button>
      <div v-if="loading" class="reader-loading">
        <Icon name="ph:circle-notch-bold" /><span>正在打开书页…</span>
      </div>
      <div v-if="!loading && !item?.epubMediaPath" class="reader-empty">
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
            min="15"
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
const api = useApi();
const route = useRoute();
const { mediaUrl } = useMediaUrl();
const { visitorId, queueEvent } = useVisitor();
const bookEl = ref<HTMLElement | null>(null);
const item = ref<LibraryItem | null>(null);
const loading = ref(true);
const focusMode = ref(false);
const tocOpen = ref(false);
const settingsOpen = ref(false);
const tocEntries = ref<Array<{ label: string; href: string }>>([]);
const rendition = shallowRef<any>(null);
const book = shallowRef<any>(null);
const progressCfi = ref("");
const savedCfi = ref("");
const progressPercent = ref(0);
const navigationBusy = ref(false);
const turningClass = ref("");
const pointerStart = ref<{ x: number; y: number } | null>(null);
const contentCleanups: Array<() => void> = [];
const attachedDocuments = new WeakSet<Document>();
const storageKey = computed(
  () => `corner:epub:${visitorId()}:${route.params.slug}`,
);
const readerTheme = ref<"paper" | "night" | "mist">("paper");
const readerFont = ref<"sans" | "serif" | "system">("serif");
const readerFontSize = ref(19);
const readerLineHeight = ref(1.85);
const pageEffect = ref<"slide" | "curl">("slide");
const themeOptions = [
  { value: "paper", label: "纸页" },
  { value: "mist", label: "雾灰" },
  { value: "night", label: "夜读" },
] as const;
const fontOptions = [
  { value: "serif", label: "舒阅读" },
  { value: "sans", label: "清晰黑体" },
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
      effect: pageEffect.value,
    }),
  );
}
function restoreReaderSettings() {
  if (typeof localStorage === "undefined") return;
  try {
    const saved = JSON.parse(localStorage.getItem(settingsKey.value) || "{}");
    if (["paper", "night", "mist"].includes(saved.theme))
      readerTheme.value = saved.theme;
    if (["serif", "sans", "system"].includes(saved.font))
      readerFont.value = saved.font;
    if (Number.isFinite(saved.size))
      readerFontSize.value = Math.max(15, Math.min(26, saved.size));
    if (Number.isFinite(saved.line))
      readerLineHeight.value = Math.max(1.5, Math.min(2.3, saved.line));
    if (["slide", "curl"].includes(saved.effect))
      pageEffect.value = saved.effect;
  } catch {
    /* ignore malformed local settings */
  }
}
function setReaderTheme(theme: typeof readerTheme.value) {
  readerTheme.value = theme;
  applyReaderTheme();
  persistReaderSettings();
}
function changeFontSize(delta: number) {
  readerFontSize.value = Math.max(
    15,
    Math.min(26, readerFontSize.value + delta),
  );
  applyReaderTheme();
  persistReaderSettings();
}
function applyReaderTheme() {
  const themes = rendition.value?.themes;
  if (!themes) return;
  const palette =
    readerTheme.value === "night"
      ? { color: "#e8e4d8", background: "#222521" }
      : readerTheme.value === "mist"
        ? { color: "#39434a", background: "#e9eef0" }
        : { color: "#34332f", background: "#fbf7ee" };
  const family =
    readerFont.value === "serif"
      ? "Iowan Old Style, STSong, Songti SC, serif"
      : readerFont.value === "sans"
        ? "Noto Sans SC, system-ui, sans-serif"
        : "system-ui, sans-serif";
  themes.override("color", palette.color);
  themes.override("background", palette.background);
  themes.override("font-family", family);
  themes.override("font-size", `${readerFontSize.value}px`);
  themes.override("line-height", String(readerLineHeight.value));
  themes.default({
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
async function turn(direction: "next" | "prev") {
  if (navigationBusy.value || !rendition.value) return;
  navigationBusy.value = true;
  turningClass.value = direction;
  try {
    await new Promise((resolve) =>
      window.setTimeout(resolve, pageEffect.value === "curl" ? 220 : 140),
    );
    await rendition.value[direction]();
    await new Promise((resolve) =>
      window.setTimeout(resolve, pageEffect.value === "curl" ? 260 : 180),
    );
  } finally {
    turningClass.value = "";
    navigationBusy.value = false;
  }
}
function handleKey(event: KeyboardEvent) {
  if (
    ["INPUT", "TEXTAREA", "SELECT"].includes(
      (event.target as HTMLElement)?.tagName,
    )
  )
    return;
  const key = event.key.toLowerCase();
  if (["arrowdown", "arrowright", "s", "d"].includes(key)) {
    event.preventDefault();
    void turn("next");
  } else if (["arrowup", "arrowleft", "w", "a"].includes(key)) {
    event.preventDefault();
    void turn("prev");
  }
}
function handleWheel(event: WheelEvent) {
  if (Math.abs(event.deltaY) < 8 && Math.abs(event.deltaX) < 8) return;
  void turn(event.deltaY > 0 || event.deltaX > 0 ? "next" : "prev");
}
function handlePointerDown(event: PointerEvent) {
  pointerStart.value = { x: event.clientX, y: event.clientY };
}
function handlePointerUp(event: PointerEvent) {
  if (!pointerStart.value) return;
  const dx = event.clientX - pointerStart.value.x;
  const dy = event.clientY - pointerStart.value.y;
  pointerStart.value = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 34) return;
  void turn(
    Math.abs(dx) > Math.abs(dy)
      ? dx < 0
        ? "next"
        : "prev"
      : dy < 0
        ? "next"
        : "prev",
  );
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
    let start: { x: number; y: number } | null = null;
    const onDown = (event: PointerEvent) => {
      start = { x: event.clientX, y: event.clientY };
    };
    const onUp = (event: PointerEvent) => {
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 34) return;
      void turn(
        Math.abs(dx) > Math.abs(dy)
          ? dx < 0
            ? "next"
            : "prev"
          : dy < 0
            ? "next"
            : "prev",
      );
    };
    doc.addEventListener("wheel", onWheel, { passive: false });
    doc.addEventListener("keydown", onKey);
    doc.addEventListener("pointerdown", onDown);
    doc.addEventListener("pointerup", onUp);
    contentCleanups.push(() => {
      doc.removeEventListener("wheel", onWheel);
      doc.removeEventListener("keydown", onKey);
      doc.removeEventListener("pointerdown", onDown);
      doc.removeEventListener("pointerup", onUp);
    });
  }
}
async function load() {
  try {
    item.value = await api.get<LibraryItem>(`/library/${route.params.slug}`);
    restoreReaderSettings();
    if (!item.value?.epubMediaPath || !bookEl.value) return;
    // @ts-ignore epubjs 当前版本没有类型声明
    const ePub = (await import("epubjs")).default;
    book.value = ePub(mediaUrl(item.value.epubMediaPath));
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
    try {
      await rendition.value.display(saved || undefined);
    } catch {
      savedCfi.value = "";
      await rendition.value.display();
    }
    applyReaderTheme();
    attachContentEvents();
    rendition.value.on("rendered", attachContentEvents);
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
      const generatedPercentage = book.value?.locations?.length?.()
        ? book.value.locations.percentageFromCfi(cfi)
        : undefined;
      const percentage = Number(
        location?.start?.percentage ??
          location?.end?.percentage ??
          generatedPercentage ??
          0,
      );
      progressPercent.value = Math.max(
        0,
        Math.min(100, Math.round(percentage * 100)),
      );
      localStorage.setItem(storageKey.value, cfi);
      savedCfi.value = cfi;
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
  } catch {
    item.value = null;
  } finally {
    loading.value = false;
  }
}
onMounted(() => {
  window.addEventListener("keydown", handleKey);
  void load();
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKey);
  contentCleanups.splice(0).forEach((cleanup) => cleanup());
  rendition.value?.destroy?.();
  book.value?.destroy?.();
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
.reader-shell.theme-night {
  --reader-bg: #222521;
  --reader-ink: #e8e4d8;
}
.reader-toolbar {
  display: flex;
  height: 58px;
  flex: 0 0 58px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 clamp(16px, 4vw, 54px);
  border-bottom: 1px solid
    color-mix(in srgb, var(--reader-ink) 12%, transparent);
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
  transition:
    border-radius 0.45s ease,
    box-shadow 0.45s ease;
}
.focus .book-view {
  width: 100%;
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
.effect-slide.turning .book-view {
  animation: reader-slide 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}
.effect-curl.turning .book-view {
  animation: reader-curl 0.58s cubic-bezier(0.2, 0.7, 0.2, 1);
}
@keyframes reader-slide {
  0% {
    opacity: 0.65;
    transform: translateX(24px);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}
@keyframes reader-curl {
  0% {
    opacity: 0.55;
    transform: perspective(1100px) rotateY(-9deg) translateX(16px);
    transform-origin: left center;
  }
  55% {
    opacity: 0.9;
    transform: perspective(1100px) rotateY(4deg) translateX(-4px);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}
</style>

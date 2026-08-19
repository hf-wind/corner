<template>
  <aside id="z-aside" class="sidebar-right">
    <header class="widget-head">
      <div class="head-title">
        <Icon name="ph:list-bullets-bold" class="head-icon" />
        <span>文章目录</span>
      </div>
      <div class="progress-chip" :title="`已阅读 ${percent}%`">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${percent}%` }" />
        </div>
        <span class="progress-text">{{ percent }}%</span>
      </div>
    </header>

    <div ref="catalogWrapRef" class="catalog-wrap">
      <ClientOnly>
        <MdCatalog
          v-if="resolvedScrollEl"
          :key="catalogKey"
          :editor-id="editorId"
          :scroll-element="resolvedScrollEl"
          :theme="mdTheme"
          :offset-top="110"
          sync-with="preview"
          class="article-md-catalog"
          :on-active="onCatalogActive"
          :on-click="onCatalogClick"
        />
      </ClientOnly>
    </div>

    <div class="pet-dock" v-if="!immersive">
      <slot name="pet" />
    </div>

    <div class="sidebar-actions">
      <button
        type="button"
        class="action-btn visible"
        :title="immersive ? '退出沉浸阅读' : '进入沉浸阅读'"
        @click="emit('toggle-immersive')"
      >
        <Icon
          :name="immersive ? 'ph:corners-in-bold' : 'ph:corners-out-bold'"
        />
      </button>
      <button
        type="button"
        class="action-btn"
        :class="{ visible: showTop }"
        title="回到顶部"
        @click="emit('scroll-top')"
      >
        <Icon name="ph:arrow-up-bold" />
      </button>
      <button
        type="button"
        class="action-btn"
        title="评论区"
        @click="emit('scroll-comment')"
      >
        <Icon name="ph:chat-circle-text-bold" />
      </button>
    </div>
  </aside>

  <Transition name="immersive-ui">
    <div v-if="immersive" class="immersive-ui">
      <button
        type="button"
        class="immersive-catalog-bar"
        :class="{ open: immersiveCatalogOpen }"
        title="文章目录"
        aria-label="文章目录"
        @click="immersiveCatalogOpen = !immersiveCatalogOpen"
      >
        <Icon name="ph:list-bullets-bold" />
        <span class="bar-title">文章目录</span>
        <span class="bar-progress">{{ percent }}%</span>
        <Icon
          :name="
            immersiveCatalogOpen ? 'ph:caret-up-bold' : 'ph:caret-down-bold'
          "
          class="bar-caret"
        />
      </button>

      <Transition name="immersive-catalog">
        <section
          v-if="immersiveCatalogOpen"
          class="immersive-catalog-panel"
          role="dialog"
          aria-label="文章目录"
        >
          <header class="immersive-catalog-head">
            <div>
              <Icon name="ph:list-bullets-bold" class="head-icon" />
              <span>文章目录</span>
            </div>
            <div class="head-right">
              <span class="head-progress">已阅读 {{ percent }}%</span>
              <button
                type="button"
                class="head-close"
                aria-label="收起目录"
                title="收起目录"
                @click="immersiveCatalogOpen = false"
              >
                <Icon name="ph:x-bold" />
              </button>
            </div>
          </header>
          <div
            ref="immersiveCatalogWrapRef"
            class="immersive-catalog-content catalog-wrap"
          >
            <ClientOnly>
              <MdCatalog
                v-if="resolvedScrollEl"
                :key="`${catalogKey}-immersive`"
                :editor-id="editorId"
                :scroll-element="resolvedScrollEl"
                :theme="mdTheme"
                :offset-top="110"
                sync-with="preview"
                class="article-md-catalog"
                :on-active="onCatalogActive"
                :on-click="onCatalogClick"
              />
            </ClientOnly>
          </div>
        </section>
      </Transition>

      <div class="immersive-actions">
        <button
          type="button"
          class="im-action"
          title="去评论区"
          aria-label="去评论区"
          @click="emit('scroll-comment')"
        >
          <Icon name="ph:chat-circle-text-bold" />
        </button>
        <button
          v-if="showTop"
          type="button"
          class="im-action"
          title="回到顶部"
          aria-label="回到顶部"
          @click="emit('scroll-top')"
        >
          <Icon name="ph:arrow-up-bold" />
        </button>
        <button
          type="button"
          class="im-action im-exit"
          title="退出沉浸阅读"
          aria-label="退出沉浸阅读"
          @click="emit('toggle-immersive')"
        >
          <Icon name="ph:corners-in-bold" />
        </button>
      </div>
    </div>
  </Transition>

  <div
    class="mobile-article-tools"
    :class="{ expanded: mobileActionsOpen }"
    v-show="!immersive"
  >
    <Transition name="catalog-backdrop">
      <button
        v-if="mobileCatalogOpen"
        type="button"
        class="mobile-catalog-backdrop"
        aria-label="关闭文章目录"
        @click="mobileCatalogOpen = false"
      />
    </Transition>

    <Transition name="mobile-catalog">
      <section
        v-if="mobileCatalogOpen"
        class="mobile-catalog-panel"
        role="dialog"
        aria-label="文章目录"
      >
        <header class="mobile-catalog-head">
          <div>
            <span class="mobile-catalog-icon"
              ><Icon name="ph:list-bullets-bold"
            /></span>
            <div>
              <strong>文章目录</strong>
              <span>已阅读 {{ percent }}%</span>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭目录"
            @click="mobileCatalogOpen = false"
          >
            <Icon name="ph:x-bold" />
          </button>
        </header>
        <div class="mobile-catalog-progress" aria-hidden="true">
          <i :style="{ width: `${percent}%` }" />
        </div>
        <div
          ref="mobileCatalogWrapRef"
          class="mobile-catalog-content"
          @click="handleMobileCatalogClick"
        >
          <ClientOnly>
            <MdCatalog
              v-if="resolvedScrollEl"
              :key="`${catalogKey}-mobile`"
              :editor-id="editorId"
              :scroll-element="resolvedScrollEl"
              :theme="mdTheme"
              :offset-top="88"
              sync-with="preview"
              class="article-md-catalog"
              :on-active="onCatalogActive"
              :on-click="onCatalogClick"
            />
          </ClientOnly>
        </div>
      </section>
    </Transition>

    <Transition name="mobile-tool-menu">
      <div v-if="mobileActionsOpen" class="mobile-tool-menu">
        <button
          type="button"
          aria-label="文章目录"
          title="文章目录"
          @click="openMobileCatalog"
        >
          <i><Icon name="ph:list-bullets-bold" /></i>
        </button>
        <button
          type="button"
          :aria-label="immersive ? '退出沉浸阅读' : '进入沉浸阅读'"
          :title="immersive ? '退出沉浸阅读' : '进入沉浸阅读'"
          @click="runMobileAction('immersive')"
        >
          <i
            ><Icon
              :name="immersive ? 'ph:corners-in-bold' : 'ph:corners-out-bold'"
          /></i>
        </button>
        <button
          type="button"
          aria-label="去评论区"
          title="去评论区"
          @click="runMobileAction('comment')"
        >
          <i><Icon name="ph:chat-circle-text-bold" /></i>
        </button>
        <button
          type="button"
          aria-label="回到顶部"
          title="回到顶部"
          :class="{ muted: !showTop }"
          @click="runMobileAction('top')"
        >
          <i><Icon name="ph:arrow-up-bold" /></i>
        </button>
      </div>
    </Transition>

    <button
      type="button"
      class="mobile-tool-trigger"
      :class="{ active: mobileActionsOpen }"
      :style="{ '--reading-progress': `${percent * 3.6}deg` }"
      :aria-expanded="mobileActionsOpen"
      :aria-label="mobileActionsOpen ? '收起文章快捷操作' : '展开文章快捷操作'"
      @click="mobileActionsOpen = !mobileActionsOpen"
    >
      <span>
        <Icon :name="mobileActionsOpen ? 'ph:x-bold' : 'ph:compass-bold'" />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { MdCatalog } from "md-editor-v3";
import "md-editor-v3/lib/preview.css";

const props = withDefaults(
  defineProps<{
    editorId?: string;
    scrollElement?: string;
    progress?: number;
    showTop?: boolean;
    immersive?: boolean;
  }>(),
  {
    editorId: "article-preview",
    scrollElement: "#main-content",
    progress: 0,
    showTop: false,
    immersive: false,
  },
);

const emit = defineEmits<{
  "scroll-top": [];
  "scroll-comment": [];
  "catalog-navigate": [
    event: MouseEvent,
    item: { text: string; level: number; index: number },
  ];
  "toggle-immersive": [];
}>();

const catalogWrapRef = ref<HTMLElement | null>(null);
const mobileCatalogWrapRef = ref<HTMLElement | null>(null);
const immersiveCatalogWrapRef = ref<HTMLElement | null>(null);
const immersiveCatalogOpen = ref(false);
const resolvedScrollEl = ref<string | HTMLElement | null>(null);
const isDark = ref(false);
const mobileActionsOpen = ref(false);
const mobileCatalogOpen = ref(false);
const mdTheme = computed(() => (isDark.value ? "dark" : "light"));
const percent = computed(() =>
  Math.round(Math.min(1, Math.max(0, props.progress)) * 100),
);
const catalogKey = computed(() => `${props.editorId}-${mdTheme.value}`);

let observer: MutationObserver | null = null;

function onCatalogActive(_heading: unknown, activeElement?: HTMLElement) {
  const wrap =
    (activeElement?.closest(
      ".catalog-wrap, .mobile-catalog-content",
    ) as HTMLElement | null) ||
    catalogWrapRef.value ||
    immersiveCatalogWrapRef.value;
  if (!activeElement || !wrap) return;
  const wrapRect = wrap.getBoundingClientRect();
  const elRect = activeElement.getBoundingClientRect();
  if (elRect.top < wrapRect.top + 8) {
    wrap.scrollBy({ top: elRect.top - wrapRect.top - 20, behavior: "smooth" });
  } else if (elRect.bottom > wrapRect.bottom - 8) {
    wrap.scrollBy({
      top: elRect.bottom - wrapRect.bottom + 20,
      behavior: "smooth",
    });
  }
}

function openMobileCatalog() {
  mobileActionsOpen.value = false;
  mobileCatalogOpen.value = true;
}

function runMobileAction(action: "top" | "comment" | "immersive") {
  mobileActionsOpen.value = false;
  if (action === "top") emit("scroll-top");
  else if (action === "comment") emit("scroll-comment");
  else emit("toggle-immersive");
}

function onCatalogClick(
  event: MouseEvent,
  item: { text: string; level: number; index: number },
) {
  event.preventDefault();
  emit("catalog-navigate", event, item);
  window.setTimeout(() => {
    mobileCatalogOpen.value = false;
  }, 180);
}

function handleMobileCatalogClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target.closest(".md-editor-catalog-link")) {
    window.setTimeout(() => {
      mobileCatalogOpen.value = false;
    }, 120);
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  mobileCatalogOpen.value = false;
  mobileActionsOpen.value = false;
}

function resolveScrollElement() {
  if (typeof props.scrollElement === "string") {
    const el = document.querySelector(
      props.scrollElement,
    ) as HTMLElement | null;
    resolvedScrollEl.value = el || props.scrollElement;
  } else {
    resolvedScrollEl.value = props.scrollElement;
  }
}

watch(
  () => props.immersive,
  (v) => {
    immersiveCatalogOpen.value = false;
    mobileCatalogOpen.value = false;
    mobileActionsOpen.value = false;
  },
);

onMounted(async () => {
  const sync = () => {
    isDark.value = document.documentElement.classList.contains("dark");
  };
  sync();
  observer = new MutationObserver(sync);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  await nextTick();
  resolveScrollElement();
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  observer?.disconnect();
  document.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.sidebar-right {
  width: var(--article-aside-w, 236px);
  animation: article-sidebar-arrive 0.56s cubic-bezier(0.16, 1, 0.3, 1) both;
  flex-basis: var(--article-aside-w, 236px);
  height: 100dvh;
  flex-shrink: 0;
  padding: 20px 14px 14px;
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: transparent;
}

@keyframes article-sidebar-arrive {
  from { opacity: 0; transform: translate3d(14px, 0, 0); }
  to { opacity: 1; transform: none; }
}

.widget-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
  padding: 0 3px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
}

.head-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--c-text);
  letter-spacing: 0;
  min-width: 0;
}

.head-icon {
  color: var(--c-primary);
  font-size: 0.95rem;
}

.progress-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.progress-track {
  width: 38px;
  height: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border) 90%, transparent);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--c-primary);
  transition: width 0.25s ease;
}

.progress-text {
  font-size: 10px;
  font-weight: 700;
  color: var(--c-primary);
  font-variant-numeric: tabular-nums;
  min-width: 2.4em;
  text-align: right;
}

.catalog-wrap {
  flex: 1 1 0;
  min-height: 72px;
  max-height: none;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 5px 3px 4px 0;
  overscroll-behavior: contain;
}

.catalog-wrap::-webkit-scrollbar {
  width: 3px;
}

.catalog-wrap::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--c-primary) 35%, transparent);
  border-radius: 999px;
}

.catalog-wrap :deep(.article-md-catalog),
.catalog-wrap :deep(.md-editor-catalog) {
  --md-color: var(--c-text-2);
  --md-hover-color: var(--c-primary);
  --md-bk-color: transparent;
  position: relative;
  width: 100%;
}

.catalog-wrap :deep(.md-editor-catalog-dark) {
  --md-color: var(--c-text-2);
  --md-hover-color: var(--c-primary);
  --md-bk-color: transparent;
}

/* override default green (#73d13d) with theme primary */
.catalog-wrap :deep(.md-editor-catalog-indicator) {
  background-color: var(--c-primary) !important;
  width: 2px;
  border-radius: 999px;
  box-shadow: 0 0 8px color-mix(in srgb, var(--c-primary) 45%, transparent);
}

.catalog-wrap :deep(.md-editor-catalog-link span) {
  color: var(--c-text-2) !important;
  display: flex;
  min-height: 28px;
  align-items: center;
  overflow: hidden;
  border-radius: 5px;
  padding: 4px 7px;
  font-family: var(--font-rounded);
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.catalog-wrap :deep(.md-editor-catalog-link span:hover) {
  color: var(--c-primary) !important;
  background: color-mix(in srgb, var(--c-primary) 8%, transparent);
  transform: translateX(2px);
}

.catalog-wrap :deep(.md-editor-catalog-active > span) {
  color: var(--c-primary) !important;
  font-weight: 650;
  background: var(--c-primary-soft);
}

.pet-dock {
  margin-top: auto;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 92px;
  padding: 10px 0 6px;
  border-top: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}

.sidebar-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-shrink: 0;
  padding-top: 6px;
}

.action-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--c-text-3);
  font-size: 0.95rem;
  cursor: pointer;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    opacity 0.2s ease,
    transform 0.18s ease;
  opacity: 0.65;
}

.action-btn.visible {
  opacity: 1;
  color: var(--c-text-2);
}

.action-btn:hover {
  opacity: 1;
  color: var(--c-primary);
  background: var(--c-primary-soft);
  transform: translateY(-1px);
}

.immersive-ui-enter-active,
.immersive-ui-leave-active {
  transition: opacity 0.22s ease;
}

.immersive-ui-enter-from,
.immersive-ui-leave-to {
  opacity: 0;
}

.immersive-catalog-bar {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1180;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ld-bg-card) 86%, transparent);
  color: var(--c-text-2);
  box-shadow: var(--ui-shadow-soft);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  transition:
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.immersive-catalog-bar:hover {
  transform: translateX(-50%) translateY(-1px);
  color: var(--c-primary);
  border-color: color-mix(in srgb, var(--c-primary) 32%, transparent);
  box-shadow: 0 10px 26px
    color-mix(in srgb, var(--c-primary) 10%, var(--ld-shadow));
}

.immersive-catalog-bar .bar-title {
  font-weight: 600;
  color: var(--c-text);
}

.immersive-catalog-bar .bar-progress {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--c-primary);
  font-variant-numeric: tabular-nums;
  min-width: 2.6em;
  text-align: right;
}

.immersive-catalog-bar .bar-caret {
  color: var(--c-text-3);
  font-size: 0.8rem;
  transition: transform 0.22s ease;
}

.immersive-catalog-bar.open .bar-caret {
  transform: rotate(180deg);
}

.immersive-catalog-panel {
  position: fixed;
  top: max(58px, calc(env(safe-area-inset-top) + 46px));
  left: 50%;
  transform: translateX(-50%);
  transform-origin: top center;
  z-index: 1175;
  width: min(380px, calc(100vw - 48px));
  max-height: min(56dvh, 480px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--c-primary) 16%, var(--border));
  border-radius: 20px;
  background: color-mix(in srgb, var(--ld-bg-card) 94%, var(--c-bg-1));
  box-shadow:
    0 32px 80px rgb(0 0 0 / 30%),
    0 0 44px color-mix(in srgb, var(--c-primary) 8%, transparent),
    0 1px 0 color-mix(in srgb, #fff 55%, transparent) inset;
  backdrop-filter: blur(24px) saturate(1.25);
  -webkit-backdrop-filter: blur(24px) saturate(1.25);
}

.immersive-catalog-panel::before {
  content: "";
  position: absolute;
  top: 0;
  left: 14px;
  right: 14px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--c-primary) 55%, transparent),
    transparent
  );
  opacity: 0.8;
  pointer-events: none;
}

.immersive-catalog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  padding: 13px 14px 11px 16px;
  background: color-mix(in srgb, var(--c-primary-soft) 32%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
}

.immersive-catalog-head > div:first-child {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.immersive-catalog-head .head-icon {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 9px;
  color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary) 12%, var(--ld-bg-card));
  box-shadow: 0 4px 12px color-mix(in srgb, var(--c-primary) 12%, transparent);
  font-size: 0.9rem;
}

.immersive-catalog-head > div:first-child span {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.immersive-catalog-head .head-progress {
  font-size: 0.64rem;
  color: var(--c-text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
}

.head-close {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 9px;
  color: var(--c-text-2);
  background: color-mix(in srgb, var(--border) 55%, transparent);
  cursor: pointer;
  font-size: 0.78rem;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.head-close:hover {
  color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary) 14%, transparent);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--c-primary) 16%, transparent);
  transform: rotate(90deg) scale(1.06);
}

.immersive-catalog-content {
  min-height: 120px;
  padding: 10px 14px 16px;
  overscroll-behavior: contain;
}

.immersive-actions {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1180;
  display: flex;
  align-items: center;
  gap: 10px;
}

.im-action {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--ld-bg-card) 88%, transparent);
  color: var(--c-text-2);
  box-shadow: var(--ui-shadow-soft);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-size: 1rem;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.im-action:hover {
  transform: translateY(-2px);
  color: var(--c-primary);
  box-shadow: 0 10px 24px
    color-mix(in srgb, var(--c-primary) 14%, var(--ld-shadow));
}

.im-action.im-exit {
  color: var(--c-primary);
  border-color: color-mix(in srgb, var(--c-primary) 30%, transparent);
  background: color-mix(in srgb, var(--c-primary-soft) 55%, var(--ld-bg-card));
}

.immersive-catalog-enter-active {
  transition:
    opacity 0.28s ease,
    transform 0.42s cubic-bezier(0.32, 0.72, 0, 1);
}

.immersive-catalog-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.22s cubic-bezier(0.55, 0, 0.55, 0.2);
}

.immersive-catalog-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-14px) scale(0.94);
}

.immersive-catalog-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px) scale(0.98);
}

.immersive-catalog-content :deep(.md-editor-catalog-link) {
  animation: cat-item-in 0.34s cubic-bezier(0.32, 0.72, 0, 1) both;
}

.immersive-catalog-content :deep(.md-editor-catalog-link:nth-child(2)) {
  animation-delay: 0.03s;
}

.immersive-catalog-content :deep(.md-editor-catalog-link:nth-child(3)) {
  animation-delay: 0.06s;
}

.immersive-catalog-content :deep(.md-editor-catalog-link:nth-child(4)) {
  animation-delay: 0.09s;
}

.immersive-catalog-content :deep(.md-editor-catalog-link:nth-child(5)) {
  animation-delay: 0.12s;
}

.immersive-catalog-content :deep(.md-editor-catalog-link:nth-child(6)) {
  animation-delay: 0.15s;
}

.immersive-catalog-content :deep(.md-editor-catalog-link:nth-child(7)) {
  animation-delay: 0.18s;
}

.immersive-catalog-content :deep(.md-editor-catalog-link:nth-child(8)) {
  animation-delay: 0.21s;
}

.immersive-catalog-content :deep(.md-editor-catalog-link:nth-child(9)) {
  animation-delay: 0.24s;
}

.immersive-catalog-content :deep(.md-editor-catalog-link:nth-child(10)) {
  animation-delay: 0.27s;
}

.immersive-catalog-content :deep(.md-editor-catalog-link:nth-child(11)) {
  animation-delay: 0.3s;
}

.immersive-catalog-content :deep(.md-editor-catalog-link:nth-child(12)) {
  animation-delay: 0.33s;
}

@keyframes cat-item-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mobile-article-tools {
  display: none;
}

@media (max-width: 900px) {
  .immersive-catalog-bar {
    top: max(12px, env(safe-area-inset-top));
    left: max(12px, env(safe-area-inset-left));
    z-index: 12020;
    transform: none;
  }

  .immersive-catalog-bar:hover {
    transform: translateY(-1px);
  }

  .immersive-catalog-panel {
    top: max(60px, calc(env(safe-area-inset-top) + 58px));
    left: max(12px, env(safe-area-inset-left));
    z-index: 12019;
    width: calc(100vw - 24px);
    max-height: min(68dvh, 540px);
    transform: none;
  }

  .immersive-actions {
    right: max(10px, env(safe-area-inset-right));
    bottom: max(10px, env(safe-area-inset-bottom));
    gap: 8px;
  }

  .im-action {
    width: 38px;
    height: 38px;
    font-size: 0.95rem;
  }

  .mobile-article-tools {
    position: fixed;
    top: 50%;
    right: max(10px, env(safe-area-inset-right));
    left: auto;
    z-index: 1170;
    display: block;
    width: 42px;
    height: 42px;
    transform: translateY(-50%);
  }

  .mobile-tool-trigger {
    --reading-progress: 0deg;
    position: relative;
    z-index: 3;
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    padding: 2px;
    border: 0;
    border-radius: 50%;
    color: var(--c-primary);
    background: conic-gradient(
      var(--c-primary) var(--reading-progress),
      color-mix(in srgb, var(--border) 58%, transparent) 0
    );
    box-shadow: 0 6px 18px color-mix(in srgb, #000 12%, var(--ld-shadow));
    cursor: pointer;
    transition:
      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.2s ease;
  }

  .mobile-tool-trigger > span {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--border) 64%, transparent);
    border-radius: 50%;
    background: color-mix(in srgb, var(--ld-bg-card) 82%, transparent);
    box-shadow: 0 1px 0 color-mix(in srgb, #fff 52%, transparent) inset;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    font-size: 1.05rem;
  }

  .mobile-tool-trigger.active {
    transform: rotate(90deg) scale(0.94);
    box-shadow: 0 5px 14px
      color-mix(in srgb, var(--c-primary) 16%, var(--ld-shadow));
  }

  .mobile-tool-menu {
    position: absolute;
    inset: 0;
    z-index: 3;
    width: 42px;
    height: 42px;
    pointer-events: none;
  }

  .mobile-tool-menu button {
    --scatter-x: 0px;
    --scatter-y: 0px;
    position: absolute;
    top: 2px;
    right: 2px;
    left: auto;
    display: grid;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    color: var(--c-primary);
    background: transparent;
    font-family: inherit;
    cursor: pointer;
    pointer-events: auto;
    transform: translate(var(--scatter-x), var(--scatter-y));
    transition: filter 0.16s ease;
  }

  .mobile-tool-menu button:nth-child(1) {
    --scatter-x: -48px;
    --scatter-y: -51px;
  }

  .mobile-tool-menu button:nth-child(2) {
    --scatter-x: -72px;
    --scatter-y: -18px;
  }

  .mobile-tool-menu button:nth-child(3) {
    --scatter-x: -72px;
    --scatter-y: 22px;
  }

  .mobile-tool-menu button:nth-child(4) {
    --scatter-x: -48px;
    --scatter-y: 57px;
  }

  .mobile-tool-menu button i {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--c-primary) 22%, var(--border));
    border-radius: 50%;
    color: var(--c-primary);
    background: color-mix(in srgb, var(--ld-bg-card) 86%, transparent);
    box-shadow: 0 5px 16px color-mix(in srgb, #000 11%, var(--ld-shadow));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    font-size: 0.9rem;
    font-style: normal;
  }

  .mobile-tool-menu button:active {
    filter: brightness(0.94);
  }

  .mobile-tool-menu button.muted {
    opacity: 0.62;
  }

  .mobile-catalog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1;
    padding: 0;
    border: 0;
    background: rgb(8 15 30 / 46%);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }

  .mobile-catalog-panel {
    position: fixed;
    right: max(12px, env(safe-area-inset-right));
    top: 50%;
    bottom: auto;
    left: auto;
    z-index: 2;
    width: min(360px, calc(100vw - 20px));
    max-height: min(74dvh, 580px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--c-primary) 12%, var(--border));
    border-radius: 16px;
    background: color-mix(in srgb, var(--ld-bg-card) 96%, var(--c-bg-1));
    box-shadow:
      0 24px 64px rgb(0 0 0 / 28%),
      0 1px 0 color-mix(in srgb, #fff 55%, transparent) inset;
    transform: translateY(-50%);
  }

  .mobile-catalog-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 15px 16px 13px;
    background: color-mix(in srgb, var(--c-primary-soft) 42%, transparent);
  }

  .mobile-catalog-head > div {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mobile-catalog-head > div > div {
    display: flex;
    flex-direction: column;
  }

  .mobile-catalog-head strong {
    color: var(--c-text);
    font-size: 0.9rem;
  }

  .mobile-catalog-head > div > div span {
    margin-top: 2px;
    color: var(--c-text-3);
    font-size: 0.64rem;
  }

  .mobile-catalog-icon {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--c-primary) 18%, transparent);
    border-radius: 10px;
    color: var(--c-primary);
    background: var(--ld-bg-card);
    box-shadow: 0 6px 16px color-mix(in srgb, var(--c-primary) 14%, transparent);
  }

  .mobile-catalog-head > button {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 10px;
    color: var(--c-text-2);
    background: var(--c-bg-2);
    cursor: pointer;
  }

  .mobile-catalog-progress {
    height: 2px;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--border) 62%, transparent);
  }

  .mobile-catalog-progress i {
    display: block;
    height: 100%;
    background: var(--c-primary);
    transition: width 0.25s ease;
  }

  .mobile-catalog-content {
    min-height: 92px;
    overflow-y: auto;
    padding: 12px 12px 17px;
    overscroll-behavior: contain;
  }

  .mobile-catalog-content :deep(.article-md-catalog),
  .mobile-catalog-content :deep(.md-editor-catalog) {
    --md-color: var(--c-text-2);
    --md-hover-color: var(--c-primary);
    --md-bk-color: transparent;
    width: 100%;
  }

  .mobile-catalog-content :deep(.md-editor-catalog-link span) {
    min-height: 34px;
    display: flex;
    align-items: center;
    position: relative;
    padding: 6px 9px;
    border-radius: 7px;
    color: var(--c-text-2) !important;
    font-size: 0.76rem;
    line-height: 1.45;
  }

  .mobile-catalog-content :deep(.md-editor-catalog-active > span) {
    color: var(--c-primary) !important;
    background: var(--c-primary-soft);
    font-weight: 700;
  }

  .mobile-catalog-content :deep(.md-editor-catalog-active > span::before) {
    content: "";
    position: absolute;
    top: 6px;
    bottom: 6px;
    left: -1px;
    width: 3px;
    border-radius: 999px;
    background: var(--c-primary);
    box-shadow: 0 0 8px color-mix(in srgb, var(--c-primary) 32%, transparent);
  }

  .mobile-catalog-content :deep(.md-editor-catalog-indicator) {
    display: none;
  }

  .mobile-tool-menu-enter-active,
  .mobile-tool-menu-leave-active {
    transition: opacity 0.2s ease;
  }

  .mobile-tool-menu-enter-active button,
  .mobile-tool-menu-leave-active button {
    transition:
      opacity 0.22s ease,
      transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .mobile-tool-menu-enter-active button:nth-child(2) {
    transition-delay: 0.035s;
  }

  .mobile-tool-menu-enter-active button:nth-child(3) {
    transition-delay: 0.07s;
  }

  .mobile-tool-menu-enter-from button,
  .mobile-tool-menu-leave-to button {
    opacity: 0;
    transform: translate(0, 0) scale(0.55);
  }

  .mobile-catalog-enter-active,
  .mobile-catalog-leave-active {
    transition:
      opacity 0.2s ease,
      transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .mobile-catalog-enter-from,
  .mobile-catalog-leave-to {
    opacity: 0;
    transform: translate3d(18px, -50%, 0) scale(0.98);
  }

  .catalog-backdrop-enter-active,
  .catalog-backdrop-leave-active {
    transition: opacity 0.18s ease;
  }

  .catalog-backdrop-enter-from,
  .catalog-backdrop-leave-to {
    opacity: 0;
  }

  .immersive-catalog-enter-from {
    transform: translateY(-12px) scale(0.97);
  }

  .immersive-catalog-leave-to {
    transform: translateY(-7px) scale(0.98);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-right { animation: none; }
  .immersive-ui-enter-active,
  .immersive-ui-leave-active,
  .immersive-catalog-enter-active,
  .immersive-catalog-leave-active,
  .immersive-catalog-content :deep(.md-editor-catalog-link) {
    transition: none;
    animation: none;
  }
  .mobile-tool-trigger,
  .mobile-tool-menu-enter-active,
  .mobile-tool-menu-leave-active,
  .mobile-catalog-enter-active,
  .mobile-catalog-leave-active,
  .catalog-backdrop-enter-active,
  .catalog-backdrop-leave-active {
    transition: none;
  }
}
</style>

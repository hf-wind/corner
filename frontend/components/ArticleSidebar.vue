<template>
  <aside
    id="z-aside"
    class="sidebar-right"
    :class="{ 'immersive-sidebar': immersive }"
  >
    <header v-if="hasCatalog" class="widget-head">
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

    <div
      v-if="hasCatalog"
      ref="catalogWrapRef"
      class="catalog-wrap"
      :class="{ 'catalog-ready': catalogReady }"
    >
      <nav
        v-if="catalogReady"
        class="article-catalog-tree"
        aria-label="文章目录"
      >
        <button
          v-for="item in catalogItems"
          :key="item.id"
          type="button"
          class="catalog-entry"
          :class="{ active: item.index - 1 === activeCatalogIndex }"
          :style="{
            '--catalog-depth': Math.max(0, item.level - 1),
            '--catalog-order': item.index,
          }"
          :title="item.text"
          :data-catalog-index="item.index - 1"
          @click="onCatalogClick($event, item)"
        >
          <span>{{ item.text }}</span>
        </button>
      </nav>
    </div>

    <div class="pet-dock" v-if="!immersive">
      <slot name="pet" />
    </div>

    <div v-if="!immersive" class="sidebar-actions">
      <button
        type="button"
        class="action-btn visible primary"
        title="去评论区"
        aria-label="去评论区"
        @click="emit('scroll-comment')"
      >
        <Icon name="ph:chat-circle-text-bold" />
      </button>
      <button
        type="button"
        class="action-btn"
        :class="{ visible: showTop }"
        :disabled="!showTop"
        title="回到顶部"
        aria-label="回到顶部"
        @click="emit('scroll-top')"
      >
        <Icon name="ph:arrow-up-bold" />
      </button>
      <button
        type="button"
        class="action-btn visible"
        :title="immersive ? '退出沉浸阅读' : '进入沉浸阅读'"
        @click="emit('toggle-immersive')"
      >
        <Icon name="ph:book-open-text-bold" />
      </button>
    </div>
  </aside>

  <Transition name="immersive-ui">
    <div v-if="immersive" class="immersive-ui">
      <button
        v-if="hasCatalog"
        type="button"
        class="immersive-catalog-bar"
        :class="{ open: immersiveCatalogOpen }"
        title="阅读进度"
        aria-label="阅读进度"
        @click="toggleImmersiveCatalog"
      >
        <LiquidProgress
          class="reading-liquid"
          :progress="percent"
        />
        <Icon name="ph:book-open-text-bold" />
        <span class="bar-title">阅读进度</span>
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
          v-if="hasCatalog && immersiveCatalogOpen"
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
            <nav
              v-if="catalogReady"
              class="article-catalog-tree"
              aria-label="沉浸模式文章目录"
            >
              <button
                v-for="item in catalogItems"
                :key="item.id"
                type="button"
                class="catalog-entry"
                :class="{ active: item.index - 1 === activeCatalogIndex }"
                :style="{
                  '--catalog-depth': Math.max(0, item.level - 1),
                  '--catalog-order': item.index,
                }"
                :title="item.text"
                :data-catalog-index="item.index - 1"
                @click="onCatalogClick($event, item)"
              >
                <span>{{ item.text }}</span>
              </button>
            </nav>
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
          type="button"
          class="im-action"
          :disabled="!showTop"
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
          <Icon name="ph:book-open-bold" />
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
        v-if="hasCatalog && mobileCatalogOpen"
        type="button"
        class="mobile-catalog-backdrop"
        aria-label="关闭文章目录"
        @click="mobileCatalogOpen = false"
      />
    </Transition>

    <Transition name="mobile-catalog">
      <section
        v-if="hasCatalog && mobileCatalogOpen"
        class="mobile-catalog-panel"
        role="dialog"
        aria-label="文章目录"
      >
        <header class="mobile-catalog-head">
          <div>
            <span class="mobile-catalog-icon">
              <Icon name="ph:list-bullets-bold" />
            </span>
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
        >
          <nav
            v-if="catalogReady"
            class="article-catalog-tree"
            aria-label="移动端文章目录"
          >
            <button
              v-for="item in catalogItems"
              :key="item.id"
              type="button"
              class="catalog-entry"
              :class="{ active: item.index - 1 === activeCatalogIndex }"
              :style="{
                '--catalog-depth': Math.max(0, item.level - 1),
                '--catalog-order': item.index,
              }"
              :title="item.text"
              :data-catalog-index="item.index - 1"
              @click="onCatalogClick($event, item)"
            >
              <span>{{ item.text }}</span>
            </button>
          </nav>
        </div>
      </section>
    </Transition>

    <Transition name="mobile-tool-menu">
      <div v-if="mobileActionsOpen" class="mobile-tool-menu">
        <button
          v-show="hasCatalog"
          type="button"
          aria-label="文章目录"
          title="文章目录"
          @click="openMobileCatalog"
        >
          <i>
            <Icon name="ph:list-bullets-bold" />
          </i>
        </button>
        <button
          type="button"
          :aria-label="immersive ? '退出沉浸阅读' : '进入沉浸阅读'"
          :title="immersive ? '退出沉浸阅读' : '进入沉浸阅读'"
          @click="runMobileAction('immersive')"
        >
          <i>
            <Icon
              :name="immersive ? 'ph:corners-in-bold' : 'ph:corners-out-bold'"
            />
          </i>
        </button>
        <button
          type="button"
          aria-label="去评论区"
          title="去评论区"
          @click="runMobileAction('comment')"
        >
          <i>
            <Icon name="ph:chat-circle-text-bold" />
          </i>
        </button>
        <button
          type="button"
          aria-label="回到顶部"
          title="回到顶部"
          :class="{ muted: !showTop }"
          @click="runMobileAction('top')"
        >
          <i>
            <Icon name="ph:arrow-up-bold" />
          </i>
        </button>
      </div>
    </Transition>

    <button
      type="button"
      class="mobile-tool-trigger"
      :class="{ active: mobileActionsOpen }"
      :style="{ '--reading-progress': `${percent}%` }"
      :aria-expanded="mobileActionsOpen"
      :aria-label="mobileActionsOpen ? '收起文章快捷操作' : '展开文章快捷操作'"
      @click="mobileActionsOpen = !mobileActionsOpen"
    >
      <LiquidProgress
        class="mobile-trigger-liquid"
        :progress="percent"
      />
      <span class="mobile-trigger-face">
        <Icon :name="mobileActionsOpen ? 'ph:x-bold' : 'ph:compass-bold'" />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
type CatalogItem = {
  id: string;
  text: string;
  level: number;
  index: number;
};

const props = withDefaults(
  defineProps<{
    editorId?: string;
    scrollElement?: string;
    progress?: number;
    showTop?: boolean;
    immersive?: boolean;
    catalogReady?: boolean;
    catalogItems?: CatalogItem[];
    activeCatalogIndex?: number;
  }>(),
  {
    editorId: "article-preview",
    scrollElement: "#main-content",
    progress: 0,
    showTop: false,
    immersive: false,
    catalogReady: false,
    catalogItems: () => [],
    activeCatalogIndex: 0,
  },
);

const emit = defineEmits<{
  "scroll-top": [];
  "scroll-comment": [];
  "catalog-navigate": [
    event: MouseEvent,
    item: CatalogItem,
  ];
  "toggle-immersive": [];
}>();

const catalogWrapRef = ref<HTMLElement | null>(null);
const mobileCatalogWrapRef = ref<HTMLElement | null>(null);
const immersiveCatalogWrapRef = ref<HTMLElement | null>(null);
const immersiveCatalogOpen = ref(false);
const mobileActionsOpen = ref(false);
const mobileCatalogOpen = ref(false);
const percent = computed(() =>
  Math.round(Math.min(1, Math.max(0, props.progress)) * 100),
);
const hasCatalog = computed(
  () => props.catalogReady && props.catalogItems.length > 0,
);

function articleScrollHost() {
  return typeof props.scrollElement === "string"
    ? (document.querySelector(props.scrollElement) as HTMLElement | null)
    : null;
}

function syncCatalogWrap(
  wrap: HTMLElement | null,
  behavior: ScrollBehavior = "auto",
) {
  if (!wrap || !wrap.offsetParent) return;
  const active = wrap.querySelector<HTMLElement>(
    `[data-catalog-index="${props.activeCatalogIndex}"]`,
  );
  if (!active) {
    wrap.scrollTop = 0;
    return;
  }
  if (props.activeCatalogIndex === 0) {
    wrap.scrollTo({ top: 0, behavior });
    return;
  }
  const wrapRect = wrap.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  const safeTop = wrapRect.top + Math.min(54, wrap.clientHeight * 0.24);
  const safeBottom = wrapRect.bottom - Math.min(54, wrap.clientHeight * 0.24);
  if (activeRect.top >= safeTop && activeRect.bottom <= safeBottom) return;
  wrap.scrollTo({
    top: Math.max(
      0,
      wrap.scrollTop +
        activeRect.top -
        wrapRect.top -
        wrap.clientHeight * 0.3,
    ),
    behavior,
  });
}

function syncOpenCatalogs(behavior: ScrollBehavior = "auto") {
  syncCatalogWrap(catalogWrapRef.value, behavior);
  syncCatalogWrap(immersiveCatalogWrapRef.value, behavior);
  syncCatalogWrap(mobileCatalogWrapRef.value, behavior);
}

async function toggleImmersiveCatalog() {
  const host = articleScrollHost();
  const readingTop = host?.scrollTop ?? 0;
  const opening = !immersiveCatalogOpen.value;
  immersiveCatalogOpen.value = opening;
  if (!opening) return;

  await nextTick();
  requestAnimationFrame(() => {
    if (host) host.scrollTop = readingTop;
    requestAnimationFrame(() => {
      if (host) host.scrollTop = readingTop;
      syncCatalogWrap(immersiveCatalogWrapRef.value);
    });
  });
}

async function openMobileCatalog() {
  const host = articleScrollHost();
  const readingTop = host?.scrollTop ?? 0;
  mobileActionsOpen.value = false;
  mobileCatalogOpen.value = true;
  await nextTick();
  requestAnimationFrame(() => {
    if (host) host.scrollTop = readingTop;
    requestAnimationFrame(() => {
      if (host) host.scrollTop = readingTop;
      syncCatalogWrap(mobileCatalogWrapRef.value);
    });
  });
}

function runMobileAction(action: "top" | "comment" | "immersive") {
  mobileActionsOpen.value = false;
  if (action === "top") emit("scroll-top");
  else if (action === "comment") emit("scroll-comment");
  else emit("toggle-immersive");
}

function onCatalogClick(
  event: MouseEvent,
  item: CatalogItem,
) {
  event.preventDefault();
  mobileCatalogOpen.value = false;
  immersiveCatalogOpen.value = false;
  emit("catalog-navigate", event, item);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  immersiveCatalogOpen.value = false;
  mobileCatalogOpen.value = false;
  mobileActionsOpen.value = false;
}

watch(
  () => props.immersive,
  () => {
    immersiveCatalogOpen.value = false;
    mobileCatalogOpen.value = false;
    mobileActionsOpen.value = false;
  },
);

watch(
  () => props.activeCatalogIndex,
  async () => {
    await nextTick();
    requestAnimationFrame(() => syncOpenCatalogs("smooth"));
  },
);

watch(
  [() => props.catalogReady, () => props.catalogItems.length],
  async () => {
    await nextTick();
    requestAnimationFrame(() => syncOpenCatalogs());
  },
  { flush: "post" },
);

onMounted(async () => {
  await nextTick();
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.sidebar-right {
  position: relative;
  z-index: 3;
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
  isolation: isolate;
}

.sidebar-right::before {
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: 0;
  width: 1px;
  background: linear-gradient(
    180deg,
    transparent,
    color-mix(in srgb, var(--border) 78%, transparent) 10%,
    color-mix(in srgb, var(--border) 78%, transparent) 86%,
    transparent
  );
  content: "";
  pointer-events: none;
}

@keyframes article-sidebar-arrive {
  from {
    opacity: 0;
    transform: translate3d(14px, 0, 0);
  }

  to {
    opacity: 1;
    transform: none;
  }
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

.article-catalog-tree {
  display: grid;
  align-content: start;
  gap: 2px;
  width: 100%;
}

.catalog-wrap.catalog-ready .article-catalog-tree {
  animation: catalog-reveal 0.44s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes catalog-reveal {
  from {
    opacity: 0;
    transform: translate3d(0, 8px, 0);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.catalog-entry {
  --catalog-depth: 0;
  --catalog-order: 0;
  position: relative;
  display: flex;
  width: 100%;
  min-height: 28px;
  align-items: center;
  padding: 5px 7px 5px calc(11px + var(--catalog-depth) * 8px);
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font-family: var(--font-rounded);
  font-size: 11px;
  line-height: 1.45;
  text-align: left;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.catalog-entry span {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  white-space: normal;
}

.catalog-entry:hover {
  color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary) 8%, transparent);
  transform: translateX(2px);
}

.catalog-entry.active {
  color: var(--c-primary);
  font-weight: 650;
  background: color-mix(in srgb, var(--c-primary-soft) 54%, transparent);
}

.catalog-entry.active::before {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: calc(3px + var(--catalog-depth) * 8px);
  width: 2px;
  border-radius: 999px;
  background: var(--c-primary);
  box-shadow: 0 0 7px color-mix(in srgb, var(--c-primary) 34%, transparent);
  content: "";
}

.pet-dock {
  margin-top: auto;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 0;
  padding: 0;
  border-top: 0;
}

.sidebar-actions {
  position: absolute;
  top: 50%;
  right: 14px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 5px;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ld-bg-card) 86%, transparent);
  box-shadow:
    0 12px 34px color-mix(in srgb, #000 10%, var(--ld-shadow)),
    0 1px 0 color-mix(in srgb, #fff 52%, transparent) inset;
  backdrop-filter: blur(18px) saturate(1.12);
  -webkit-backdrop-filter: blur(18px) saturate(1.12);
  transform: translateY(-50%);
}

.action-btn {
  display: grid;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-text-3);
  font-size: 1rem;
  place-items: center;
  cursor: pointer;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    opacity 0.2s ease,
    transform 0.18s ease;
  opacity: 0.42;
}

.action-btn.visible {
  opacity: 1;
  color: var(--c-text-2);
}

.action-btn.primary {
  color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary-soft) 68%, transparent);
}

.action-btn:disabled {
  cursor: default;
  transform: none;
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
  --immersive-bar-bg: color-mix(
    in srgb,
    var(--ld-bg-card) 88%,
    transparent
  );
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1180;
  display: inline-flex;
  overflow: hidden;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 999px;
  background: var(--immersive-bar-bg);
  color: var(--c-text-2);
  box-shadow: var(--ui-shadow-soft);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  font-family: inherit;
  font-size: 0.78rem;
  isolation: isolate;
  cursor: pointer;
  transition:
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.immersive-catalog-bar:hover {
  transform: translateX(-50%) translateY(-1px);
  color: var(--c-primary);
  box-shadow: 0 10px 26px
    color-mix(in srgb, var(--c-primary) 10%, var(--ld-shadow));
}

.immersive-catalog-bar > :not(.reading-liquid) {
  position: relative;
  z-index: 2;
}

.reading-liquid {
  z-index: 0;
  --liquid-fill-top: color-mix(in srgb, var(--c-primary) 10%, transparent);
  --liquid-fill-bottom: color-mix(in srgb, var(--c-primary) 22%, transparent);
  --liquid-wave-front: color-mix(in srgb, var(--c-primary) 17%, var(--immersive-bar-bg));
  --liquid-wave-back: color-mix(in srgb, var(--c-primary) 9%, var(--immersive-bar-bg));
  --liquid-wave-height: 12px;
  --liquid-wave-front-duration: 8.6s;
  --liquid-wave-back-duration: 11.8s;
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
  width: min(420px, calc(100vw - 48px));
  height: min(78dvh, 720px);
  max-height: min(78dvh, 720px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--c-primary) 16%, var(--border));
  border-radius: 12px;
  background: color-mix(in srgb, var(--ld-bg-card) 94%, var(--c-bg-1));
  box-shadow:
    0 22px 56px rgb(0 0 0 / 24%),
    0 0 32px color-mix(in srgb, var(--c-primary) 7%, transparent),
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
  flex: 1;
  min-height: 120px;
  overflow-y: auto;
  padding: 10px 14px 16px;
  overscroll-behavior: contain;
}

.immersive-actions {
  position: fixed;
  right: 20px;
  top: 50%;
  bottom: auto;
  z-index: 1180;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ld-bg-card) 92%, transparent);
  box-shadow:
    0 12px 34px color-mix(in srgb, #000 10%, var(--ld-shadow)),
    0 1px 0 color-mix(in srgb, #fff 52%, transparent) inset;
  backdrop-filter: blur(18px) saturate(1.12);
  -webkit-backdrop-filter: blur(18px) saturate(1.12);
  transform: translateY(-50%);
}

.im-action {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-text-2);
  font-size: 1rem;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    color 0.2s ease,
    background-color 0.2s ease;
}

.im-action:hover:not(:disabled) {
  transform: translateY(-1px);
  color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary-soft) 78%, transparent);
}

.im-action:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--c-primary) 48%, transparent);
  outline-offset: 1px;
}

.im-action:disabled {
  opacity: 0.38;
  cursor: default;
  transform: none;
}

.im-action.im-exit {
  color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary-soft) 68%, transparent);
}

.immersive-catalog-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
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

.immersive-catalog-content .catalog-entry {
  animation: cat-item-in 0.34s cubic-bezier(0.32, 0.72, 0, 1) both;
  animation-delay: min(calc(var(--catalog-order) * 18ms), 180ms);
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
  .sidebar-actions {
    display: none;
  }

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
    height: min(76dvh, 620px);
    max-height: min(76dvh, 620px);
    transform: none;
  }

  .immersive-actions {
    right: max(10px, env(safe-area-inset-right));
    top: 50%;
    bottom: auto;
    gap: 4px;
    padding: 5px;
    transform: translateY(-50%);
  }

  .im-action {
    width: 36px;
    height: 36px;
    font-size: 0.95rem;
  }

  .mobile-article-tools {
    position: fixed;
    top: calc(50% - 21px);
    right: max(10px, env(safe-area-inset-right));
    left: auto;
    z-index: 1170;
    display: block;
    width: 42px;
    height: 42px;
  }

  .mobile-tool-trigger {
    position: relative;
    z-index: 3;
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    overflow: hidden;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--c-primary) 28%, var(--border));
    border-radius: 50%;
    color: var(--c-primary);
    background: color-mix(in srgb, var(--ld-bg-card) 92%, var(--c-primary-soft));
    box-shadow:
      0 8px 22px color-mix(in srgb, #000 10%, var(--ld-shadow)),
      0 1px 0 color-mix(in srgb, #fff 64%, transparent) inset;
    isolation: isolate;
    cursor: pointer;
    transition:
      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.2s ease;
  }

  .mobile-trigger-face {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    place-items: center;
    border-radius: 50%;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    font-size: 1.05rem;
    transition: transform 0.56s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mobile-trigger-liquid {
    z-index: 0;
    --liquid-fill-top: color-mix(in srgb, var(--c-primary) 20%, transparent);
    --liquid-fill-bottom: color-mix(in srgb, var(--c-primary) 44%, transparent);
    --liquid-wave-front: color-mix(in srgb, var(--c-primary) 24%, var(--ld-bg-card));
    --liquid-wave-back: color-mix(in srgb, var(--c-primary) 13%, var(--ld-bg-card));
    --liquid-wave-height: 10px;
    --liquid-wave-front-duration: 7.2s;
    --liquid-wave-back-duration: 9.8s;
  }

  .mobile-tool-trigger.active {
    transform: scale(0.94);
    box-shadow: 0 5px 14px
      color-mix(in srgb, var(--c-primary) 16%, var(--ld-shadow));
  }

  .mobile-tool-trigger.active .mobile-trigger-face {
    transform: rotate(135deg);
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
    --tool-accent: var(--c-primary);
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
    --tool-accent: var(--c-primary);
    --scatter-x: -48px;
    --scatter-y: -51px;
  }

  .mobile-tool-menu button:nth-child(2) {
    --tool-accent: #2b9373;
    --scatter-x: -72px;
    --scatter-y: -18px;
  }

  .mobile-tool-menu button:nth-child(3) {
    --tool-accent: #d08635;
    --scatter-x: -72px;
    --scatter-y: 22px;
  }

  .mobile-tool-menu button:nth-child(4) {
    --tool-accent: #d05768;
    --scatter-x: -48px;
    --scatter-y: 57px;
  }

  .mobile-tool-menu button i {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--tool-accent) 24%, var(--border));
    border-radius: 50%;
    color: var(--tool-accent);
    background: color-mix(in srgb, var(--ld-bg-card) 88%, var(--tool-accent));
    box-shadow:
      0 6px 18px color-mix(in srgb, #000 10%, var(--ld-shadow)),
      0 0 18px color-mix(in srgb, var(--tool-accent) 13%, transparent);
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
    background: rgb(8 15 30 / 34%);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }

  .mobile-catalog-panel {
    position: fixed;
    right: max(10px, env(safe-area-inset-right));
    bottom: max(10px, env(safe-area-inset-bottom));
    left: max(10px, env(safe-area-inset-left));
    z-index: 2;
    width: auto;
    height: min(72dvh, 620px);
    max-height: min(72dvh, 620px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--c-primary) 12%, var(--border));
    border-radius: 12px;
    background: color-mix(in srgb, var(--ld-bg-card) 96%, var(--c-bg-1));
    box-shadow:
      0 18px 48px rgb(0 0 0 / 24%),
      0 1px 0 color-mix(in srgb, #fff 55%, transparent) inset;
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
    flex: 1;
    min-height: 92px;
    overflow-y: auto;
    padding: 12px 12px 17px;
    overscroll-behavior: contain;
  }

  .mobile-catalog-content .catalog-entry {
    min-height: 34px;
    padding-top: 7px;
    padding-bottom: 7px;
    border-radius: 7px;
    font-size: 0.76rem;
    line-height: 1.45;
  }

  .mobile-catalog-content .catalog-entry.active {
    background: var(--c-primary-soft);
    font-weight: 700;
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

  .mobile-tool-menu-enter-active button:nth-child(4) {
    transition-delay: 0.105s;
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
    transform: translate3d(0, 18px, 0) scale(0.99);
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
  .sidebar-right {
    animation: none;
  }

  .immersive-ui-enter-active,
  .immersive-ui-leave-active,
  .immersive-catalog-enter-active,
  .immersive-catalog-leave-active,
  .immersive-catalog-content .catalog-entry {
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

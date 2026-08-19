<template>
  <Teleport to="#corner-pagination-dock" defer>
    <Transition name="dock-pagination">
      <div
        v-if="total > 1 && !hidden"
        class="pagination-anchor"
        :class="{ 'is-devtools-collapsed': isDevtoolsCollapsed }"
      >
        <span class="pagination-glowing" aria-hidden="true" />
        <nav class="corner-pagination" aria-label="分页导航">
          <div
            class="pagination-content"
            :inert="isDevtoolsCollapsed"
            :aria-hidden="isDevtoolsCollapsed"
          >
            <button
              type="button"
              class="page-step"
              title="上一页"
              aria-label="上一页"
              :disabled="modelValue <= 1"
              @click="goTo(modelValue - 1)"
            >
              <Icon name="ph:caret-left-bold" />
            </button>

            <div class="page-indicator" aria-live="polite">
              <Transition :name="slideDirection" mode="out-in">
                <strong :key="modelValue">{{ modelValue }}</strong>
              </Transition>
              <span aria-hidden="true">/</span>
              <small>{{ total }}</small>
            </div>

            <button
              type="button"
              class="page-step"
              title="下一页"
              aria-label="下一页"
              :disabled="modelValue >= total"
              @click="goTo(modelValue + 1)"
            >
              <Icon name="ph:caret-right-bold" />
            </button>
          </div>

          <button
            type="button"
            class="pagination-toggle"
            :aria-expanded="!isDevtoolsCollapsed"
            :title="isDevtoolsCollapsed ? '展开分页' : '折叠分页'"
            :aria-label="isDevtoolsCollapsed ? '展开分页' : '折叠分页'"
            @click="toggleDevtoolsCollapsed"
          >
            <Icon name="ph:book-open-text-bold" />
          </button>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useBottomDockState } from "~/composables/useBottomDockState";

const props = withDefaults(
  defineProps<{
    modelValue: number;
    total: number;
    hidden?: boolean;
    variant?: string;
  }>(),
  {
    modelValue: 1,
    total: 1,
    hidden: false,
    variant: "default",
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: number): void;
  (event: "change", value: number): void;
}>();

const slideDirection = ref<"page-up" | "page-down">("page-up");
const {
  autoCollapsed: dockAutoCollapsed,
  activeBottomDock,
  recordsIntersecting,
  clearAutoCollapse,
  setActiveBottomDock,
  setPaginationVisible,
} = useBottomDockState();
const devtoolsCollapsed = ref(false);
const autoCollapseDismissed = ref(false);
const recordsCollapseDismissed = ref(false);
const mobileViewport = ref(false);
let mobileMedia: MediaQueryList | null = null;
const isDevtoolsCollapsed = computed(
  () =>
    devtoolsCollapsed.value ||
    (dockAutoCollapsed.value && !autoCollapseDismissed.value) ||
    (mobileViewport.value && activeBottomDock.value === "music") ||
    (recordsIntersecting.value && !recordsCollapseDismissed.value),
);
let previousPage = props.modelValue;

watch(dockAutoCollapsed, (collapsed) => {
  if (!collapsed) autoCollapseDismissed.value = false;
});

watch(recordsIntersecting, (intersecting) => {
  if (!intersecting) recordsCollapseDismissed.value = false;
});

watch(isDevtoolsCollapsed, (collapsed) => {
  if (collapsed && activeBottomDock.value === "pagination") {
    setActiveBottomDock(null);
  }
});

watch(
  () => props.total > 1 && !props.hidden,
  (visible) => setPaginationVisible(visible),
  { immediate: true },
);

onMounted(() => {
  mobileMedia = window.matchMedia("(max-width: 640px)");
  syncMobileViewport();
  mobileMedia.addEventListener("change", syncMobileViewport);
});

onUnmounted(() => {
  setPaginationVisible(false);
  mobileMedia?.removeEventListener("change", syncMobileViewport);
  if (activeBottomDock.value === "pagination") setActiveBottomDock(null);
});

watch(
  () => props.modelValue,
  (page) => {
    slideDirection.value = page > previousPage ? "page-up" : "page-down";
    previousPage = page;
  },
);

function goTo(page: number) {
  if (page < 1 || page > props.total || page === props.modelValue) return;
  emit("update:modelValue", page);
  emit("change", page);
}

async function toggleDevtoolsCollapsed() {
  const wasCollapsed = isDevtoolsCollapsed.value;
  if (wasCollapsed && recordsIntersecting.value) {
    const scrollContainer =
      document.querySelector<HTMLElement>(".main-content");
    if (scrollContainer) {
      scrollContainer.scrollBy({
        top: -Math.min(240, window.innerHeight * 0.3),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
    recordsCollapseDismissed.value = true;
    await nextTick();
  }
  if (dockAutoCollapsed.value && !recordsIntersecting.value) {
    autoCollapseDismissed.value = true;
  } else {
    clearAutoCollapse();
  }
  devtoolsCollapsed.value = !wasCollapsed;
  setActiveBottomDock(wasCollapsed ? "pagination" : null);
}

function syncMobileViewport() {
  mobileViewport.value = mobileMedia?.matches ?? false;
}
</script>

<style scoped>
.pagination-anchor {
  position: relative;
  display: flex;
  width: 132px;
  min-width: 132px;
  height: var(--capsule-height);
  flex: 0 0 132px;
  align-items: center;
  transition:
    width 0.6s ease,
    min-width 0.6s ease,
    flex-basis 0.6s ease,
    transform 0.4s ease;
}

.pagination-anchor.is-devtools-collapsed {
  width: 32px;
  min-width: 32px;
  flex-basis: 32px;
  transform: translateY(15px);
}

.corner-pagination {
  position: relative;
  z-index: 2;
  display: flex;
  width: 100%;
  max-width: 100%;
  height: var(--capsule-height);
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
  margin-left: auto;
  padding: 2px 2px 2px 2.5px;
  overflow: hidden;
  border: 1px solid var(--devtools-widget-border);
  border-radius: 100px;
  background-color: var(--devtools-widget-bg);
  color: var(--devtools-widget-fg);
  box-shadow: 2px 2px 8px var(--devtools-widget-shadow);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  user-select: none;
  touch-action: none;
  transition:
    max-width 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    padding 0.5s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.24s ease,
    background-color 0.24s ease,
    box-shadow 0.24s ease,
    opacity 0.2s ease;
}

.pagination-anchor.is-devtools-collapsed .corner-pagination {
  max-width: 32px;
  padding: 0;
}

.pagination-toggle {
  position: absolute;
  z-index: 2;
  top: 50%;
  right: 2px;
  display: flex;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 100%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.78rem;
  opacity: 0.8;
  transform: translateY(-50%);
  transition: opacity 0.2s ease-in-out;
}

.pagination-anchor.is-devtools-collapsed .pagination-toggle {
  inset: 0;
  margin: auto;
  transform: none;
}

.pagination-toggle:hover {
  opacity: 1;
}

.pagination-toggle:active {
  opacity: 0.7;
}

.pagination-toggle:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--c-primary) 58%, transparent);
  outline-offset: 2px;
}

.pagination-content {
  display: flex;
  min-width: 0;
  max-width: 96px;
  align-items: center;
  gap: 1px;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.4s;
}

.pagination-anchor.is-devtools-collapsed .pagination-content {
  opacity: 0;
  pointer-events: none;
}

.pagination-glowing {
  position: absolute;
  z-index: -1;
  top: 50%;
  left: 50%;
  width: 160px;
  height: 160px;
  border-radius: 9999px;
  background-image: linear-gradient(
    45deg,
    var(--c-primary),
    var(--c-primary),
    var(--c-primary)
  );
  opacity: 0;
  filter: blur(60px);
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: all 1s;
}

.pagination-anchor:hover .pagination-glowing {
  opacity: 0.22;
}

.page-step {
  display: grid;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font-size: 0.76rem;
  place-items: center;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-step:hover:not(:disabled) {
  background: var(--c-primary-soft);
  color: var(--c-primary);
  transform: translateY(-1px);
}

.page-step:active:not(:disabled) {
  transform: scale(0.92);
}
.page-step:disabled {
  cursor: default;
  opacity: 0.28;
}
.page-step:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--c-primary) 58%, transparent);
  outline-offset: 2px;
}

.page-indicator {
  display: flex;
  min-width: 37px;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.page-indicator strong {
  min-width: 1.1em;
  color: var(--c-primary);
  font-size: 0.76rem;
  font-weight: 760;
  line-height: 1;
  text-align: center;
}

.page-indicator span,
.page-indicator small {
  color: var(--c-text-3);
  font-size: 0.54rem;
  font-weight: 520;
}

.page-up-enter-active,
.page-up-leave-active,
.page-down-enter-active,
.page-down-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-up-enter-from {
  opacity: 0;
  transform: translateY(55%);
}
.page-up-leave-to {
  opacity: 0;
  transform: translateY(-55%);
}
.page-down-enter-from {
  opacity: 0;
  transform: translateY(-55%);
}
.page-down-leave-to {
  opacity: 0;
  transform: translateY(55%);
}

.dock-pagination-enter-active,
.dock-pagination-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}

.dock-pagination-enter-from,
.dock-pagination-leave-to {
  opacity: 0;
  transform: translate3d(0, 9px, 0) scale(0.96);
}

@media (max-width: 390px) {
  .page-step {
    width: 24px;
    height: 24px;
  }
  .page-indicator {
    min-width: 35px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pagination-anchor,
  .corner-pagination,
  .pagination-glowing,
  .pagination-toggle,
  .pagination-content,
  .page-step,
  .page-up-enter-active,
  .page-up-leave-active,
  .page-down-enter-active,
  .page-down-leave-active,
  .dock-pagination-enter-active,
  .dock-pagination-leave-active {
    transition: none !important;
  }
}
</style>

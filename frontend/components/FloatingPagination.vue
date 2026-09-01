<template>
  <Teleport to="#corner-pagination-dock" defer>
    <Transition name="dock-pagination">
      <div
        v-if="total > 1 && !hidden"
        class="pagination-anchor"
        :class="{ 'is-devtools-collapsed': isDevtoolsCollapsed }"
        @mousemove="bringUp"
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
              <Icon name="ph:caret-left" />
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
              <Icon name="ph:caret-right" />
            </button>
          </div>

          <span class="pagination-toggle" aria-hidden="true">
            <Icon name="ph:list-numbers-bold" />
          </span>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useBottomDockState } from "@/composables/useBottomDockState";

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
  recordsIntersecting,
  setPaginationVisible,
} = useBottomDockState();
const isHovering = ref(false);
const isTouchDevice = ref(false);
let hoverTimer = 0;
const isDevtoolsCollapsed = computed(
  () =>
    !isTouchDevice.value &&
    !isHovering.value &&
    (dockAutoCollapsed.value || recordsIntersecting.value),
);
let previousPage = props.modelValue;

watch(
  () => props.total > 1 && !props.hidden,
  (visible) => setPaginationVisible(visible),
  { immediate: true },
);

onMounted(() => {
  isTouchDevice.value =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(hover: none), (pointer: coarse)").matches;
});

onUnmounted(() => {
  window.clearTimeout(hoverTimer);
  setPaginationVisible(false);
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

function bringUp() {
  if (isTouchDevice.value) return;
  isHovering.value = true;
  window.clearTimeout(hoverTimer);
  hoverTimer = window.setTimeout(() => {
    isHovering.value = false;
  }, 5000);
}
</script>

<style scoped>
.pagination-anchor {
  position: relative;
  display: flex;
  width: 116px;
  min-width: 0;
  max-width: 116px;
  height: var(--capsule-height);
  flex: 0 1 116px;
  align-items: center;
  transition: all 0.6s, max-width 0.6s, padding 0.5s, transform 0.4s, opacity 0.2s;
}

.pagination-anchor.is-devtools-collapsed {
  max-width: 32px;
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
    all 0.6s,
    max-width 0.6s,
    padding 0.5s,
    transform 0.4s,
    opacity 0.2s;
}

.pagination-anchor.is-devtools-collapsed .corner-pagination {
  max-width: 32px;
  padding: 2px 0;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
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
  pointer-events: none;
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
  max-width: 80px;
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
  width: 21px;
  height: 21px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font-size: 0.68rem;
  place-items: center;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-step:hover:not(:disabled) {
  background: color-mix(in srgb, var(--c-primary-soft) 72%, transparent);
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
  min-width: 34px;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.page-indicator strong {
  min-width: 1.1em;
  color: var(--c-primary);
  font-size: 0.7rem;
  font-weight: 760;
  line-height: 1;
  text-align: center;
}

.page-indicator span,
.page-indicator small {
  color: var(--c-text-3);
  font-size: 0.49rem;
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
    width: 21px;
    height: 21px;
  }
  .page-indicator {
    min-width: 34px;
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

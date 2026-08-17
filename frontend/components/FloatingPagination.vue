<template>
  <Teleport to="#corner-pagination-dock" defer>
    <Transition name="dock-pagination">
      <nav
        v-if="total > 1 && !hidden"
        class="corner-pagination"
        aria-label="分页导航"
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
      </nav>
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
const { setPaginationVisible } = useBottomDockState();
let previousPage = props.modelValue;

watch(
  () => props.total > 1 && !props.hidden,
  (visible) => setPaginationVisible(visible),
  { immediate: true },
);

onUnmounted(() => setPaginationVisible(false));

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
</script>

<style scoped>
.corner-pagination {
  display: flex;
  height: var(--capsule-height);
  align-items: center;
  gap: 1px;
  padding: 0 5px;
  border: 0;
  border-radius: 17px;
  background: color-mix(in srgb, var(--ld-bg-card) 90%, transparent);
  color: var(--c-text);
  box-shadow:
    0 10px 30px color-mix(in srgb, #000 12%, var(--ld-shadow)),
    0 1px 0 color-mix(in srgb, #fff 68%, transparent) inset;
  backdrop-filter: blur(18px) saturate(1.28);
  -webkit-backdrop-filter: blur(18px) saturate(1.28);
  transition: box-shadow 0.25s ease;
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
  .corner-pagination {
    height: var(--capsule-height);
    padding: 0 3px;
  }
  .page-step {
    width: 24px;
    height: 24px;
  }
  .page-indicator {
    min-width: 35px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .corner-pagination,
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

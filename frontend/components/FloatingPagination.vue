<template>
  <nav
    v-if="total > 1"
    class="corner-pagination"
    aria-label="分页导航"
  >
    <button
      type="button"
      class="step-btn"
      title="上一页"
      aria-label="上一页"
      :disabled="modelValue <= 1"
      @click="goTo(modelValue - 1)"
    >
      <Icon name="ph:caret-left-bold" />
    </button>

    <div class="page-indicator" aria-live="polite">
      <Transition :name="slideDir" mode="out-in">
        <span :key="modelValue" class="current-page">{{ modelValue }}</span>
      </Transition>
      <span class="divider">/</span>
      <span class="total-page">{{ total }}</span>
    </div>

    <button
      type="button"
      class="step-btn"
      title="下一页"
      aria-label="下一页"
      :disabled="modelValue >= total"
      @click="goTo(modelValue + 1)"
    >
      <Icon name="ph:caret-right-bold" />
    </button>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: number
  total: number
}>(), {
  modelValue: 1,
  total: 1,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'change', value: number): void
}>()

const slideDir = ref<'page-up' | 'page-down'>('page-up')
let previousPage = props.modelValue

watch(() => props.modelValue, (page) => {
  slideDir.value = page > previousPage ? 'page-up' : 'page-down'
  previousPage = page
})

function goTo(page: number) {
  if (page < 1 || page > props.total || page === props.modelValue) return
  emit('update:modelValue', page)
  emit('change', page)
}
</script>

<style scoped>
/* ===== 定位 ===== */
.corner-pagination {
  position: fixed;
  z-index: 70;
  bottom: max(24px, calc(env(safe-area-inset-bottom) + 16px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  height: 42px;
  padding: 0 6px;
  border-radius: 21px;
  background: var(--ld-bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--ui-shadow-soft);
  color: var(--c-text);
  animation: pagination-in 0.4s ease both;
}

@keyframes pagination-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.corner-pagination:hover {
  border-color: color-mix(in srgb, var(--c-primary) 25%, var(--border));
}

/* ===== 步进按钮 ===== */
.step-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font-size: 0.85rem;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s var(--ui-ease-out);
}

.step-btn:hover:not(:disabled) {
  background: var(--c-primary-soft);
  color: var(--c-primary);
  transform: scale(1.08);
}

.step-btn:active:not(:disabled) {
  transform: scale(0.94);
}

.step-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.step-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--c-primary) 60%, transparent);
  outline-offset: 2px;
}

/* ===== 页码指示 ===== */
.page-indicator {
  display: flex;
  align-items: baseline;
  justify-content: center;
  min-width: 40px;
  gap: 2px;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.current-page {
  display: inline-block;
  min-width: 1.2em;
  text-align: center;
  font-size: 0.88rem;
  font-weight: 800;
  line-height: 1;
  color: var(--c-primary);
}

/* 翻页方向动画 */
.page-up-enter-active,
.page-up-leave-active,
.page-down-enter-active,
.page-down-leave-active {
  transition: opacity 0.22s ease, transform 0.28s var(--ui-ease-out);
}

.page-up-enter-from {
  opacity: 0;
  transform: translateY(60%);
}

.page-up-leave-to {
  opacity: 0;
  transform: translateY(-60%);
}

.page-down-enter-from {
  opacity: 0;
  transform: translateY(-60%);
}

.page-down-leave-to {
  opacity: 0;
  transform: translateY(60%);
}

.divider {
  font-size: 0.65rem;
  color: var(--c-text-3);
  transform: translateY(-1px);
}

.total-page {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--c-text-3);
}

@media (prefers-reduced-motion: reduce) {
  .corner-pagination {
    animation: none;
  }
  .page-up-enter-active,
  .page-up-leave-active,
  .page-down-enter-active,
  .page-down-leave-active,
  .step-btn {
    transition: none !important;
  }
}

@media (max-width: 640px) {
  .corner-pagination {
    bottom: max(16px, calc(env(safe-area-inset-bottom) + 12px));
    height: 38px;
  }
  .step-btn {
    width: 30px;
    height: 30px;
  }
  .page-indicator {
    min-width: 36px;
  }
}
</style>

<template>
  <nav
    v-if="total > 1"
    class="premium-pagination"
    :class="[`is-${variant}`, { 'is-collapsed': !isExpanded }]"
    aria-label="分页导航"
    @mouseenter="holdExpanded"
    @mouseleave="scheduleCollapse"
    @focusin="holdExpanded"
    @focusout="scheduleCollapse"
  >
    <div class="pagination-glass-surface">
      <!-- 触发按钮 -->
      <button
        type="button"
        class="action-toggle"
        :title="isExpanded ? '收起分页' : '展开分页'"
        :aria-label="isExpanded ? '收起分页' : '展开分页'"
        @click="toggle"
      >
        <Icon :name="leadIcon" class="toggle-icon" />
      </button>

      <!-- 展开详情区 (利用 Grid 0fr 技巧实现极致丝滑动画) -->
      <div class="expandable-track" :aria-hidden="!isExpanded">
        <div class="track-inner">
          <span class="eyebrow-label">{{ variantLabel }}</span>
          
          <div class="control-group">
            <button 
              type="button" 
              class="step-btn" 
              title="上一页" 
              aria-label="上一页" 
              :tabindex="isExpanded ? 0 : -1" 
              :disabled="modelValue <= 1" 
              @click="goTo(modelValue - 1)"
            >
              <Icon name="ph:caret-left-bold" />
            </button>
            
            <div class="page-indicator">
              <span class="current-page">{{ modelValue }}</span>
              <span class="divider">/</span>
              <span class="total-page">{{ total }}</span>
            </div>
            
            <button 
              type="button" 
              class="step-btn" 
              title="下一页" 
              aria-label="下一页" 
              :tabindex="isExpanded ? 0 : -1" 
              :disabled="modelValue >= total" 
              @click="goTo(modelValue + 1)"
            >
              <Icon name="ph:caret-right-bold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: number
  total: number
  variant?: 'articles' | 'comments' | 'default'
}>(), {
  variant: 'default',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'change', value: number): void
}>()

const isExpanded = ref(true)
let collapseTimer: ReturnType<typeof setTimeout> | undefined

const leadIcon = computed(() => props.variant === 'comments'
  ? 'ph:chat-circle-text-bold'
  : props.variant === 'articles'
    ? 'ph:article-bold'
    : 'ph:compass-bold')

const variantLabel = computed(() => props.variant === 'comments' ? '评论进度' : props.variant === 'articles' ? '文章索引' : '浏览进度')

function scheduleCollapse() {
  if (collapseTimer) clearTimeout(collapseTimer)
  collapseTimer = setTimeout(() => { isExpanded.value = false }, 4000) // 缩短至4秒，体验更紧凑
}

function holdExpanded() {
  if (collapseTimer) clearTimeout(collapseTimer)
  isExpanded.value = true
}

function expandFromInteraction() {
  isExpanded.value = true
  scheduleCollapse()
}

function toggle() {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value) scheduleCollapse()
  else if (collapseTimer) clearTimeout(collapseTimer)
}

function goTo(page: number) {
  if (page < 1 || page > props.total || page === props.modelValue) return
  emit('update:modelValue', page)
  emit('change', page)
  expandFromInteraction()
}

onMounted(scheduleCollapse)
onUnmounted(() => { if (collapseTimer) clearTimeout(collapseTimer) })

watch(() => props.total, (total, previous) => {
  if (total > 1 && previous <= 1) {
    isExpanded.value = true
    scheduleCollapse()
  }
})
</script>

<style scoped>
/* 核心定位 */
.premium-pagination {
  position: fixed;
  z-index: 70;
  bottom: max(24px, calc(env(safe-area-inset-bottom) + 16px));
  left: 50%;
  transform: translateX(-50%);
  color: var(--c-text);
  /* 使用贝塞尔曲线让整体位移更具弹簧感 */
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 玻璃态微质感容器 */
.pagination-glass-surface {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 4px;
  border-radius: 24px;
  background: color-mix(in srgb, var(--ld-bg-card, #ffffff) 85%, transparent);
  backdrop-filter: blur(24px) saturate(1.2);
  /* 多层阴影：环境光边缘 + 核心投影 + 漫反射 */
  box-shadow: 
    0 0 0 1px color-mix(in srgb, var(--c-text) 4%, transparent),
    0 12px 32px -4px color-mix(in srgb, var(--ld-shadow, #000) 12%, transparent),
    0 4px 12px -2px color-mix(in srgb, var(--ld-shadow, #000) 8%, transparent);
  transition: box-shadow 0.4s ease, background-color 0.4s ease;
}

/* 悬浮状态下的光泽提升 */
.premium-pagination:hover .pagination-glass-surface {
  background: color-mix(in srgb, var(--ld-bg-card, #ffffff) 92%, transparent);
  box-shadow: 
    0 0 0 1px color-mix(in srgb, var(--c-text) 6%, transparent),
    0 16px 40px -4px color-mix(in srgb, var(--ld-shadow, #000) 16%, transparent),
    0 6px 16px -2px color-mix(in srgb, var(--ld-shadow, #000) 10%, transparent);
}

/* 触发按钮 */
.action-toggle {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border-radius: 50%;
  border: none;
  background: var(--c-primary);
  color: #ffffff;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.3s ease;
}

.action-toggle:hover {
  transform: scale(1.06);
}

.action-toggle:active {
  transform: scale(0.94);
}

.toggle-icon {
  font-size: 1.1rem;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.is-collapsed .toggle-icon {
  transform: rotate(-180deg);
}

/* === 核心动画技巧：Grid 展开 === */
.expandable-track {
  display: grid;
  grid-template-columns: 1fr;
  transition: grid-template-columns 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.is-collapsed .expandable-track {
  grid-template-columns: 0fr;
}

.track-inner {
  display: flex;
  align-items: center;
  overflow: hidden;
  gap: 16px;
  padding: 0 12px 0 16px;
  white-space: nowrap; /* 防止动画过程中文字换行 */
  opacity: 1;
  /* 展开时：透明度稍稍延后，等待容器撑开 */
  transition: opacity 0.4s ease 0.1s, padding 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.is-collapsed .track-inner {
  padding: 0;
  opacity: 0;
  pointer-events: none;
  /* 收起时：瞬间透明，避免挤压特效 */
  transition: opacity 0.2s ease 0s, padding 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 文本与标签 */
.eyebrow-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--c-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* 控制组背景槽 */
.control-group {
  display: flex;
  align-items: center;
  gap: 4px;
  background: color-mix(in srgb, var(--c-text) 4%, transparent);
  padding: 3px;
  border-radius: 18px;
}

.step-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.25s ease;
}

.step-btn:hover:not(:disabled) {
  background: var(--ld-bg-card, #ffffff);
  color: var(--c-primary);
  box-shadow: 0 2px 6px color-mix(in srgb, var(--ld-shadow, #000) 8%, transparent);
}

.step-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 数字显示器 */
.page-indicator {
  display: flex;
  align-items: baseline;
  justify-content: center;
  min-width: 42px;
  gap: 3px;
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.current-page {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--c-text);
}

.divider {
  font-size: 0.7rem;
  color: var(--c-text-3);
  font-weight: 400;
  transform: translateY(-1px);
}

.total-page {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--c-text-3);
}

/* 差异化主题支持 */
.is-comments .action-toggle {
  background: #5b8bdc;
}

@media (prefers-reduced-motion: reduce) {
  .premium-pagination,
  .pagination-glass-surface,
  .action-toggle,
  .expandable-track,
  .track-inner,
  .toggle-icon,
  .step-btn {
    transition: none !important;
  }
}

@media (max-width: 640px) {
  .premium-pagination {
    bottom: max(16px, calc(env(safe-area-inset-bottom) + 12px));
  }
  .pagination-glass-surface {
    height: 44px;
  }
  .action-toggle {
    width: 36px;
    height: 36px;
    flex-basis: 36px;
  }
  .track-inner {
    gap: 12px;
    padding: 0 8px 0 12px;
  }
}
</style>
<template>
  <nav
    v-if="total > 1"
    class="floating-pagination"
    :class="[`is-${variant}`, { 'is-collapsed': !isExpanded }]"
    aria-label="分页导航"
    @mouseenter="holdExpanded"
    @mouseleave="scheduleCollapse"
    @focusin="holdExpanded"
    @focusout="scheduleCollapse"
  >
    <div class="pagination-halo" aria-hidden="true" />
    <div class="pagination-surface">
      <button
        type="button"
        class="pagination-toggle"
        :title="isExpanded ? '收起分页' : '展开分页'"
        :aria-label="isExpanded ? '收起分页' : '展开分页'"
        @click="toggle"
      >
        <Icon :name="leadIcon" />
      </button>

      <div class="pagination-details" :aria-hidden="!isExpanded">
        <span class="pagination-eyebrow">{{ variantLabel }}</span>
        <div class="pagination-controls">
          <button type="button" class="page-step" title="上一页" aria-label="上一页" :tabindex="isExpanded ? 0 : -1" :disabled="modelValue <= 1" @click="goTo(modelValue - 1)">
            <Icon name="ph:caret-left-bold" />
          </button>
          <span class="page-counter"><b>{{ modelValue }}</b><i />{{ total }}</span>
          <button type="button" class="page-step" title="下一页" aria-label="下一页" :tabindex="isExpanded ? 0 : -1" :disabled="modelValue >= total" @click="goTo(modelValue + 1)">
            <Icon name="ph:caret-right-bold" />
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
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
  collapseTimer = setTimeout(() => { isExpanded.value = false }, 5000)
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
.floating-pagination {
  position: fixed;
  z-index: 70;
  bottom: max(16px, calc(env(safe-area-inset-bottom) + 10px));
  left: 50%;
  width: max-content;
  color: var(--c-text);
  transform: translateX(-50%);
}

.pagination-halo {
  position: absolute;
  inset: 50% auto auto 50%;
  width: 96px;
  height: 46px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-primary) 28%, transparent);
  filter: blur(17px);
  opacity: .62;
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: opacity .38s ease, transform .42s cubic-bezier(.16, 1, .3, 1);
}

.pagination-surface {
  position: relative;
  display: flex;
  height: 42px;
  align-items: center;
  overflow: hidden;
  border-radius: 14px;
  background: color-mix(in srgb, var(--ld-bg-card) 92%, transparent);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--ld-shadow) 74%, transparent), inset 0 1px rgb(255 255 255 / .28);
  backdrop-filter: blur(16px) saturate(1.15);
  transition: border-radius .35s ease, box-shadow .35s ease;
}

.pagination-toggle,
.page-step {
  display: grid;
  border: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
  place-items: center;
}

.pagination-toggle {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 12px;
  background: var(--c-primary);
  box-shadow: 0 6px 14px color-mix(in srgb, var(--c-primary) 32%, transparent);
  color: #fff;
  font-size: 1rem;
  transition: transform .3s cubic-bezier(.16, 1, .3, 1), border-radius .35s ease, background-color .25s ease;
}

.pagination-toggle:hover { transform: rotate(-7deg) scale(1.04); }
.pagination-details { display:flex; width:146px; height:100%; min-width:146px; align-items:center; gap:11px; overflow:hidden; padding:0 10px 0 8px; opacity:1; transform:translateX(0); transition:width .42s cubic-bezier(.16, 1, .3, 1),min-width .42s cubic-bezier(.16, 1, .3, 1),padding .42s cubic-bezier(.16, 1, .3, 1),opacity .2s ease,transform .36s cubic-bezier(.16, 1, .3, 1); }
.pagination-eyebrow { color:var(--c-text-3); font-size:.49rem; font-weight:750; letter-spacing:.1em; white-space:nowrap; }
.pagination-controls { display:flex; align-items:center; gap:3px; }
.page-step { width:24px; height:24px; border-radius:8px; background:transparent; color:var(--c-text-2); font-size:.72rem; transition:background-color .2s ease,color .2s ease,transform .2s ease; }
.page-step:hover:not(:disabled) { background:var(--c-primary-soft); color:var(--c-primary); transform:scale(1.08); }
.page-step:disabled { cursor:default; opacity:.28; }
.page-counter { display:flex; min-width:39px; align-items:center; justify-content:center; gap:4px; color:var(--c-text-3); font-family:var(--font-mono, var(--font-body)); font-size:.62rem; font-variant-numeric:tabular-nums; }
.page-counter b { color:var(--c-primary); font-size:.8rem; }
.page-counter i { display:block; width:8px; height:1px; background:currentColor; opacity:.48; }
.is-comments .pagination-toggle { background:#5b8bdc; }
.is-collapsed .pagination-halo { opacity:.38; transform:translate(-50%, -50%) scale(.72); }
.is-collapsed .pagination-surface { border-radius:50%; box-shadow:0 8px 22px color-mix(in srgb, var(--ld-shadow) 70%, transparent); }
.is-collapsed .pagination-toggle { border-radius:50%; }
.is-collapsed .pagination-details { width:0; min-width:0; padding:0; opacity:0; pointer-events:none; transform:translateX(-8px); }

@media (prefers-reduced-motion: reduce) {
  .pagination-halo,.pagination-surface,.pagination-toggle,.pagination-details,.page-step { transition:none; }
}

@media (max-width:640px) {
  .floating-pagination { bottom:max(12px, calc(env(safe-area-inset-bottom) + 8px)); }
  .pagination-surface,.pagination-toggle { height:40px; }
  .pagination-toggle { width:40px; flex-basis:40px; }
  .pagination-details { width:134px; min-width:134px; gap:8px; }
  .is-collapsed .pagination-details { width:0; min-width:0; }
}
</style>

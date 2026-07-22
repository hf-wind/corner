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
        />
      </ClientOnly>
    </div>

    <div class="sidebar-actions">
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
</template>

<script setup lang="ts">
import { MdCatalog } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'

const props = withDefaults(defineProps<{
  editorId?: string
  scrollElement?: string
  progress?: number
  showTop?: boolean
}>(), {
  editorId: 'article-preview',
  scrollElement: '#main-content',
  progress: 0,
  showTop: false,
})

const emit = defineEmits<{
  'scroll-top': []
  'scroll-comment': []
}>()

const catalogWrapRef = ref<HTMLElement | null>(null)
const resolvedScrollEl = ref<string | HTMLElement | null>(null)
const isDark = ref(false)
const mdTheme = computed(() => (isDark.value ? 'dark' : 'light'))
const percent = computed(() => Math.round(Math.min(1, Math.max(0, props.progress)) * 100))
const catalogKey = computed(() => `${props.editorId}-${mdTheme.value}`)

let observer: MutationObserver | null = null

function onCatalogActive(_heading: unknown, activeElement?: HTMLElement) {
  const wrap = catalogWrapRef.value
  if (!activeElement || !wrap) return
  const wrapRect = wrap.getBoundingClientRect()
  const elRect = activeElement.getBoundingClientRect()
  if (elRect.top < wrapRect.top + 8) {
    wrap.scrollBy({ top: elRect.top - wrapRect.top - 20, behavior: 'smooth' })
  } else if (elRect.bottom > wrapRect.bottom - 8) {
    wrap.scrollBy({ top: elRect.bottom - wrapRect.bottom + 20, behavior: 'smooth' })
  }
}

function resolveScrollElement() {
  if (typeof props.scrollElement === 'string') {
    const el = document.querySelector(props.scrollElement) as HTMLElement | null
    resolvedScrollEl.value = el || props.scrollElement
  } else {
    resolvedScrollEl.value = props.scrollElement
  }
}

onMounted(async () => {
  const sync = () => {
    isDark.value = document.documentElement.classList.contains('dark')
  }
  sync()
  observer = new MutationObserver(sync)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  await nextTick()
  resolveScrollElement()
})

onUnmounted(() => observer?.disconnect())
</script>

<style scoped>
.sidebar-right {
  width: var(--right-w);
  flex-shrink: 0;
  padding: 22px 12px 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: transparent;
}

.widget-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
  padding: 0 2px 8px;
}

.head-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-text);
  letter-spacing: 0.04em;
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
  width: 48px;
  height: 4px;
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
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--c-primary);
  font-variant-numeric: tabular-nums;
  min-width: 2.4em;
  text-align: right;
}

.catalog-wrap {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 2px;
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
  width: 3px;
  border-radius: 999px;
  box-shadow: 0 0 8px color-mix(in srgb, var(--c-primary) 45%, transparent);
}

.catalog-wrap :deep(.md-editor-catalog-link span) {
  color: var(--c-text-2) !important;
  font-size: 0.74rem;
  line-height: 1.45;
  transition: color 0.2s ease, background 0.2s ease;
  border-radius: 6px;
  padding: 2px 6px;
}

.catalog-wrap :deep(.md-editor-catalog-link span:hover) {
  color: var(--c-primary) !important;
  background: color-mix(in srgb, var(--c-primary) 8%, transparent);
}

.catalog-wrap :deep(.md-editor-catalog-active > span) {
  color: var(--c-primary) !important;
  font-weight: 700;
  background: var(--c-primary-soft);
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
  transition: color 0.18s ease, background 0.18s ease, opacity 0.2s ease, transform 0.18s ease;
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
</style>

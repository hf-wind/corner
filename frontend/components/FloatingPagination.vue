<template>
  <!--
    Strict port of Nuxt DevTools floating capsule
    Source: packages/devtools/src/runtime/plugins/view/Main.vue (v1.7)
  -->
  <div
    v-if="total > 1"
    id="fp-pagination-anchor"
    ref="anchorEl"
    :style="[anchorStyle, colorVars]"
    :class="{ 'fp-hide': isMinimized }"
    role="navigation"
    aria-label="分页导航"
    @mousemove="bringUp"
    @mouseleave="onLeave"
  >
    <div class="fp-glowing" />

    <div
      ref="panelEl"
      class="fp-panel"
      :style="panelStyle"
    >
      <!-- lead: click toggles collapse / expand -->
      <button
        type="button"
        class="fp-icon-button fp-lead-button"
        :title="leadLabel"
        :aria-label="leadLabel"
        @click.stop="toggleFold"
      >
        <Icon :name="leadIcon" />
      </button>

      <!-- prev -->
      <button
        type="button"
        class="fp-icon-button fp-panel-content"
        title="上一页"
        aria-label="上一页"
        :disabled="modelValue <= 1"
        @click.stop="goTo(modelValue - 1)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 256 256"
          style="height: 1.15em; width: 1.15em; opacity: 0.55"
        >
          <path
            fill="currentColor"
            d="M164.24 203.76a6 6 0 1 1-8.48 8.48l-80-80a6 6 0 0 1 0-8.48l80-80a6 6 0 0 1 8.48 8.48L88.49 128Z"
          />
        </svg>
      </button>

      <!-- page label — exact Nuxt label structure -->
      <div
        class="fp-panel-content fp-label"
        :title="`第 ${modelValue} / ${total} 页`"
      >
        <div class="fp-label-main">
          {{ modelValue }}
        </div>
        <span class="fp-label-secondary">
          /{{ total }}
        </span>
      </div>

      <!-- next -->
      <button
        type="button"
        class="fp-icon-button fp-panel-content"
        title="下一页"
        aria-label="下一页"
        :disabled="modelValue >= total"
        @click.stop="goTo(modelValue + 1)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 256 256"
          style="height: 1.15em; width: 1.15em; opacity: 0.55"
        >
          <path
            fill="currentColor"
            d="M180.24 132.24l-80 80a6 6 0 0 1-8.48-8.48L167.51 128 91.76 52.24a6 6 0 0 1 8.48-8.48l80 80a6 6 0 0 1 0 8.48"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'

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

const leadIcon = computed(() => props.variant === 'comments'
  ? 'ph:chat-circle-text-bold'
  : props.variant === 'articles'
    ? 'ph:article-bold'
    : 'ph:dots-three-bold')
const leadLabel = computed(() => props.variant === 'comments' ? '评论分页' : props.variant === 'articles' ? '文章分页' : '分页')

/* ── Nuxt Main.vue geometry ─────────────────────────────────────── */
const PANEL_H = 30
const PANEL_MARGIN_BOTTOM = 10
const MINIMIZE_INACTIVE = 5000

const panelEl = ref<HTMLDivElement>()
const anchorEl = ref<HTMLDivElement>()

const windowSize = reactive({ width: 0, height: 0 })
const isHovering = ref(false)
/** after click-collapse, ignore bringUp until pointer leaves */
const pinnedClosed = ref(false)
let _timer: ReturnType<typeof setTimeout> | null = null

/** dark / light tokens — exact Nuxt vars() */
const isDark = ref(false)

const colorVars = computed(() => {
  const dark = isDark.value
  return {
    '--fp-widget-bg': dark ? '#111' : '#ffffff',
    '--fp-widget-fg': dark ? '#F5F5F5' : '#111',
    '--fp-widget-border': dark ? '#3336' : '#efefef',
    '--fp-widget-shadow': dark ? 'rgba(0,0,0,0.3)' : 'rgba(128,128,128,0.1)',
  }
})

function syncDark() {
  isDark.value = document.documentElement.classList.contains('dark')
}

/**
 * Bottom-dock anchor — Nuxt anchorPos case 'bottom':
 *   top: windowHeight - panelMargins.bottom - halfHeight
 *   left: center
 */
const anchorPos = computed(() => {
  const halfHeight = PANEL_H / 2
  return {
    left: windowSize.width / 2,
    top: windowSize.height - PANEL_MARGIN_BOTTOM - halfHeight,
  }
})

const anchorStyle = computed(() => ({
  left: `${anchorPos.value.left}px`,
  top: `${anchorPos.value.top}px`,
} as const))

/**
 * Nuxt isMinimized:
 *   !open && !isHovering && minimizePanelInactive
 */
const isMinimized = computed(() => !isHovering.value)

/**
 * Nuxt panelStyle for position === 'bottom':
 *   expanded:  translate(-50%, -50%)
 *   minimized: translate(-50%, calc(-50% + 15px))
 *              + borderBottomLeft/RightRadius = 0
 */
const panelStyle = computed(() => {
  const style: CSSProperties = {
    transform: isMinimized.value
      ? 'translate(-50%, calc(-50% + 15px))'
      : 'translate(-50%, -50%)',
  }
  if (isMinimized.value) {
    style.borderBottomLeftRadius = '0'
    style.borderBottomRightRadius = '0'
  }
  return style
})

/** Nuxt bringUp() — expand on activity, auto-minimize after idle */
function bringUp() {
  if (pinnedClosed.value)
    return
  isHovering.value = true
  if (_timer)
    clearTimeout(_timer)
  _timer = setTimeout(() => {
    isHovering.value = false
  }, MINIMIZE_INACTIVE)
}

function onLeave() {
  pinnedClosed.value = false
}

/** click lead: fold when open, unfold when collapsed */
function toggleFold() {
  if (isHovering.value) {
    if (_timer)
      clearTimeout(_timer)
    _timer = null
    isHovering.value = false
    pinnedClosed.value = true
  }
  else {
    pinnedClosed.value = false
    bringUp()
  }
}

function goTo(page: number) {
  if (page < 1 || page > props.total || page === props.modelValue)
    return
  emit('update:modelValue', page)
  emit('change', page)
  bringUp()
}

let resizeTimer: ReturnType<typeof setTimeout>
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    const scale = Number.parseFloat(getComputedStyle(document.body).getPropertyValue('zoom')) || 1
    windowSize.width = window.innerWidth
    windowSize.height = window.innerHeight / scale
  }, 100)
}

onMounted(() => {
  onResize()
  syncDark()
  window.addEventListener('resize', onResize)
  // observe theme class flips
  const mo = new MutationObserver(syncDark)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  ;(anchorEl as any)._mo = mo
  // first-paint reveal (Nuxt onMounted → bringUp)
  bringUp()
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (_timer)
    clearTimeout(_timer)
  ;(anchorEl as any)._mo?.disconnect()
})
</script>

<style scoped>
/*
 * Exact CSS from Nuxt DevTools Main.vue
 * Only #nuxt-devtools-* → #fp-pagination-anchor / .fp-* renames
 */

#fp-pagination-anchor {
  width: 0;
  z-index: 9999;
  position: fixed;
  transform-origin: center center;
  transform: translate(-50%, -50%) rotate(0);
  font-family: var(--font-body);
  font-size: 15px !important;
  box-sizing: border-box;
}

#fp-pagination-anchor * {
  box-sizing: border-box;
}

#fp-pagination-anchor button {
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  outline: none;
  color: inherit;
}

#fp-pagination-anchor button:disabled {
  cursor: default;
  opacity: 0.3;
  pointer-events: none;
}

#fp-pagination-anchor .fp-label {
  padding: 0 7px 0 8px;
  font-size: 0.8em;
  line-height: 1em;
  display: flex;
  gap: 3px;
  justify-items: center;
  align-items: center;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

#fp-pagination-anchor .fp-label .fp-label-main {
  opacity: 0.8;
}

#fp-pagination-anchor .fp-label .fp-label-secondary {
  font-size: 0.8em;
  line-height: 0.6em;
  opacity: 0.5;
}

/* lead always visible — click toggles fold */
#fp-pagination-anchor .fp-lead-button {
  flex: none;
  color: var(--c-primary);
  opacity: 1;
}

#fp-pagination-anchor .fp-lead-button :deep(.icon) {
  width: 1.05em;
  height: 1.05em;
}

#fp-pagination-anchor .fp-panel {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%);
  display: flex;
  justify-content: flex-start;
  overflow: hidden;
  align-items: center;
  gap: 2px;
  height: 30px;
  padding: 2px 2px 2px 2.5px;
  border: 1px solid var(--fp-widget-border);
  border-radius: 100px;
  background-color: var(--fp-widget-bg);
  color: var(--fp-widget-fg);
  box-shadow: 2px 2px 8px var(--fp-widget-shadow);
  user-select: none;
  touch-action: none;
  max-width: 150px;
  transition:
    max-width 0.6s ease,
    padding 0.5s ease,
    transform 0.4s ease,
    opacity 0.2s ease,
    border-radius 0.4s ease;
}

/* hide / minimized — exact Nuxt */
#fp-pagination-anchor.fp-hide .fp-panel {
  max-width: 32px;
  padding: 2px 0;
}

#fp-pagination-anchor .fp-panel-content {
  transition: opacity 0.4s ease;
}

#fp-pagination-anchor.fp-hide .fp-panel-content {
  opacity: 0;
}

#fp-pagination-anchor .fp-icon-button {
  border-radius: 100%;
  border-width: 0;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.8;
  transition: opacity 0.2s ease-in-out;
  flex: none;
}

#fp-pagination-anchor .fp-icon-button:hover:not(:disabled) {
  opacity: 1;
}

#fp-pagination-anchor:hover .fp-glowing {
  opacity: 0.6;
}

#fp-pagination-anchor .fp-glowing {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%);
  width: 160px;
  height: 160px;
  opacity: 0;
  transition: opacity 1s ease;
  pointer-events: none;
  z-index: -1;
  border-radius: 9999px;
  background: radial-gradient(circle, color-mix(in srgb, var(--c-primary) 35%, transparent), transparent 65%);
}

@media (prefers-reduced-motion: reduce) {
  #fp-pagination-anchor .fp-panel,
  #fp-pagination-anchor .fp-panel-content,
  #fp-pagination-anchor .fp-icon-button,
  #fp-pagination-anchor .fp-glowing {
    transition: none;
  }
}

@media (max-width: 640px) {
  #fp-pagination-anchor {
    font-size: 14px !important;
    transform: translate(-50%, calc(-50% - env(safe-area-inset-bottom))) rotate(0);
  }

  #fp-pagination-anchor .fp-panel {
    box-shadow: 0 6px 20px var(--fp-widget-shadow);
  }
}

@media print {
  #fp-pagination-anchor {
    display: none;
  }
}
</style>

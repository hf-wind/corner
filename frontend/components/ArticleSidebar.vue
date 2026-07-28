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

  <div class="mobile-article-tools" :class="{ expanded: mobileActionsOpen }">
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
      <section v-if="mobileCatalogOpen" class="mobile-catalog-panel" role="dialog" aria-label="文章目录">
        <header class="mobile-catalog-head">
          <div>
            <span class="mobile-catalog-icon"><Icon name="ph:list-bullets-bold" /></span>
            <div>
              <strong>文章目录</strong>
              <span>已阅读 {{ percent }}%</span>
            </div>
          </div>
          <button type="button" aria-label="关闭目录" @click="mobileCatalogOpen = false">
            <Icon name="ph:x-bold" />
          </button>
        </header>
        <div ref="mobileCatalogWrapRef" class="mobile-catalog-content" @click="handleMobileCatalogClick">
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
            />
          </ClientOnly>
        </div>
      </section>
    </Transition>

    <Transition name="mobile-tool-menu">
      <div v-if="mobileActionsOpen" class="mobile-tool-menu">
        <button type="button" aria-label="文章目录" title="文章目录" @click="openMobileCatalog">
          <i><Icon name="ph:list-bullets-bold" /></i>
        </button>
        <button type="button" aria-label="去评论区" title="去评论区" @click="runMobileAction('comment')">
          <i><Icon name="ph:chat-circle-text-bold" /></i>
        </button>
        <button type="button" aria-label="回到顶部" title="回到顶部" :class="{ muted: !showTop }" @click="runMobileAction('top')">
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
const mobileCatalogWrapRef = ref<HTMLElement | null>(null)
const resolvedScrollEl = ref<string | HTMLElement | null>(null)
const isDark = ref(false)
const mobileActionsOpen = ref(false)
const mobileCatalogOpen = ref(false)
const mdTheme = computed(() => (isDark.value ? 'dark' : 'light'))
const percent = computed(() => Math.round(Math.min(1, Math.max(0, props.progress)) * 100))
const catalogKey = computed(() => `${props.editorId}-${mdTheme.value}`)

let observer: MutationObserver | null = null

function onCatalogActive(_heading: unknown, activeElement?: HTMLElement) {
  const wrap = activeElement?.closest('.catalog-wrap, .mobile-catalog-content') as HTMLElement | null
    || catalogWrapRef.value
  if (!activeElement || !wrap) return
  const wrapRect = wrap.getBoundingClientRect()
  const elRect = activeElement.getBoundingClientRect()
  if (elRect.top < wrapRect.top + 8) {
    wrap.scrollBy({ top: elRect.top - wrapRect.top - 20, behavior: 'smooth' })
  } else if (elRect.bottom > wrapRect.bottom - 8) {
    wrap.scrollBy({ top: elRect.bottom - wrapRect.bottom + 20, behavior: 'smooth' })
  }
}

function openMobileCatalog() {
  mobileActionsOpen.value = false
  mobileCatalogOpen.value = true
}

function runMobileAction(action: 'top' | 'comment') {
  mobileActionsOpen.value = false
  if (action === 'top') emit('scroll-top')
  else emit('scroll-comment')
}

function handleMobileCatalogClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('.md-editor-catalog-link')) {
    window.setTimeout(() => { mobileCatalogOpen.value = false }, 120)
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  mobileCatalogOpen.value = false
  mobileActionsOpen.value = false
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
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  observer?.disconnect()
  document.removeEventListener('keydown', onKeydown)
})
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

.mobile-article-tools {
  display: none;
}

@media (max-width: 900px) {
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
    background: conic-gradient(var(--c-primary) var(--reading-progress), color-mix(in srgb, var(--border) 58%, transparent) 0);
    box-shadow: 0 6px 18px color-mix(in srgb, #000 12%, var(--ld-shadow));
    cursor: pointer;
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s ease;
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
    box-shadow: 0 5px 14px color-mix(in srgb, var(--c-primary) 16%, var(--ld-shadow));
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
    --scatter-x: -70px;
    --scatter-y: 0px;
  }

  .mobile-tool-menu button:nth-child(3) {
    --scatter-x: -48px;
    --scatter-y: 51px;
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
    background: rgb(8 15 30 / 40%);
  }

  .mobile-catalog-panel {
    position: fixed;
    right: max(12px, env(safe-area-inset-right));
    top: 50%;
    bottom: auto;
    left: auto;
    z-index: 2;
    width: min(360px, calc(100vw - 24px));
    max-height: min(72dvh, 560px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--c-primary) 16%, var(--border));
    border-radius: 18px;
    background: var(--ld-bg-card);
    box-shadow: 0 20px 54px rgb(0 0 0 / 22%);
    transform: translateY(-50%);
  }

  .mobile-catalog-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 15px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    background: linear-gradient(135deg, var(--c-primary-soft), transparent 72%);
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
    font-size: 0.86rem;
  }

  .mobile-catalog-head > div > div span {
    margin-top: 2px;
    color: var(--c-text-3);
    font-size: 0.64rem;
  }

  .mobile-catalog-icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: #fff;
    background: linear-gradient(145deg, color-mix(in srgb, var(--c-primary) 78%, #fff), var(--c-primary));
    box-shadow: 0 8px 20px color-mix(in srgb, var(--c-primary) 24%, transparent);
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

  .mobile-catalog-content {
    min-height: 92px;
    overflow-y: auto;
    padding: 13px 12px 18px;
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
    padding: 6px 8px;
    border-radius: 9px;
    color: var(--c-text-2) !important;
    font-size: 0.76rem;
    line-height: 1.45;
  }

  .mobile-catalog-content :deep(.md-editor-catalog-active > span) {
    color: var(--c-primary) !important;
    background: var(--c-primary-soft);
    font-weight: 700;
  }

  .mobile-catalog-content :deep(.md-editor-catalog-indicator) {
    width: 3px;
    border-radius: 999px;
    background-color: var(--c-primary) !important;
  }

  .mobile-tool-menu-enter-active,
  .mobile-tool-menu-leave-active {
    transition: opacity 0.2s ease;
  }

  .mobile-tool-menu-enter-active button,
  .mobile-tool-menu-leave-active button {
    transition: opacity 0.22s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
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
    transition: opacity 0.2s ease, transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
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
}

@media (prefers-reduced-motion: reduce) {
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

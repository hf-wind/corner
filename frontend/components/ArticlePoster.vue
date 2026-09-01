<template>
  <Teleport to="body">
    <Transition name="poster-fade">
      <div v-if="open" class="poster-overlay" @click.self="close">
        <div class="poster-panel" role="dialog" aria-modal="true" aria-label="海报分享">
          <header class="poster-head">
            <div class="poster-head-title">
              <Icon name="ph:image-bold" />
              <span>海报分享</span>
            </div>
            <button type="button" class="icon-btn" aria-label="关闭" @click="close">
              <Icon name="ph:x-bold" />
            </button>
          </header>

          <div class="poster-stage">
            <div ref="posterRef" class="poster-card">
              <div class="poster-cover" :style="coverStyle">
                <div class="poster-cover-mask" />
                <div class="poster-brand">{{ siteTitle }}</div>
              </div>
              <div class="poster-body">
                <h2 class="poster-title">{{ article.title || '未命名文章' }}</h2>
                <p v-if="article.excerpt" class="poster-excerpt">{{ article.excerpt }}</p>
                <div class="poster-meta">
                  <span v-if="article.author">{{ article.author }}</span>
                  <span v-if="article.date">{{ article.date }}</span>
                </div>
                <div class="poster-footer">
                  <div class="poster-tip">
                    <strong>长按或扫码阅读</strong>
                    <span>发现更多精彩内容</span>
                  </div>
                  <img class="poster-qr" :src="qrUrl" alt="二维码" crossorigin="anonymous" />
                </div>
              </div>
            </div>
          </div>

          <div class="poster-actions">
            <button type="button" class="poster-btn primary" :disabled="exporting" @click="download">
              <Icon :name="exporting ? 'ph:spinner-gap-bold' : 'ph:download-simple-bold'" :class="{ spin: exporting }" />
              {{ exporting ? '生成中...' : '保存图片' }}
            </button>
            <button type="button" class="poster-btn" :disabled="exporting" @click="copyImage">
              <Icon :name="copied ? 'ph:check-bold' : 'ph:copy-bold'" />
              {{ copied ? '已复制' : '复制图片' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  article: {
    title?: string
    excerpt?: string
    author?: string
    date?: string
    hero?: string
  }
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const { siteTitle } = useSiteSettings()

const posterRef = ref<HTMLElement | null>(null)
const exporting = ref(false)
const copied = ref(false)

const pageUrl = computed(() => ((typeof window !== 'undefined') ? window.location.href : ''))
const qrUrl = computed(() =>
  `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=8&data=${encodeURIComponent(pageUrl.value || 'https://corner.ink')}`,
)

const coverStyle = computed(() => {
  if (props.article.hero) {
    return {
      backgroundImage: `url(${props.article.hero})`,
    }
  }
  return {
    backgroundImage: 'linear-gradient(145deg, color-mix(in srgb, var(--c-primary) 85%, #6366f1), color-mix(in srgb, var(--c-primary) 55%, #0ea5e9))',
  }
})

function close() {
  emit('update:open', false)
}

async function renderCanvas() {
  if (!posterRef.value) return null
  const html2canvas = (await import('html2canvas')).default
  return html2canvas(posterRef.value, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    logging: false,
  })
}

async function download() {
  exporting.value = true
  try {
    const canvas = await renderCanvas()
    if (!canvas) return
    const link = document.createElement('a')
    const name = (props.article.title || 'poster').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40)
    link.download = `${name}-poster.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } finally {
    exporting.value = false
  }
}

async function copyImage() {
  exporting.value = true
  try {
    const canvas = await renderCanvas()
    if (!canvas) return
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    if (navigator.clipboard && 'ClipboardItem' in window) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      copied.value = true
      setTimeout(() => { copied.value = false }, 1800)
    } else {
      await download()
    }
  } catch {
    await download()
  } finally {
    exporting.value = false
  }
}

watch(() => props.open, (v) => {
  if (!(typeof window !== 'undefined')) return
  document.body.style.overflow = v ? 'hidden' : ''
})

onUnmounted(() => {
  if ((typeof window !== 'undefined')) document.body.style.overflow = ''
})
</script>

<style scoped>
.poster-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: color-mix(in srgb, #000 46%, transparent);
  backdrop-filter: blur(6px);
}

.poster-panel {
  width: min(420px, 100%);
  background: var(--ld-bg-card);
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 24px 60px color-mix(in srgb, #000 28%, transparent);
}

.poster-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.poster-head-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--c-text);
}

.poster-head-title :deep(.icon) {
  color: var(--c-primary);
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 10px;
  background: var(--c-bg-2);
  color: var(--c-text-2);
  cursor: pointer;
  display: grid;
  place-items: center;
}

.icon-btn:hover {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.poster-stage {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}

.poster-card {
  width: 320px;
  border-radius: 20px;
  overflow: hidden;
  background: #0f1218;
  color: #f8fafc;
  box-shadow: 0 18px 40px color-mix(in srgb, #000 35%, transparent);
  font-family: var(--font-heading);
}

.poster-cover {
  position: relative;
  height: 168px;
  background-size: cover;
  background-position: center;
}

.poster-cover-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 20%, rgba(15, 18, 24, 0.88) 100%);
}

.poster-brand {
  position: absolute;
  left: 16px;
  top: 14px;
  z-index: 1;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(8px);
}

.poster-body {
  padding: 4px 18px 18px;
}

.poster-title {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.4;
  margin: 0 0 10px;
}

.poster-excerpt {
  font-size: 0.78rem;
  line-height: 1.65;
  color: rgba(248, 250, 252, 0.72);
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.poster-meta {
  display: flex;
  gap: 12px;
  font-size: 0.7rem;
  color: rgba(248, 250, 252, 0.55);
  margin-bottom: 16px;
}

.poster-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.poster-tip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.poster-tip strong {
  font-size: 0.78rem;
}

.poster-tip span {
  font-size: 0.68rem;
  color: rgba(248, 250, 252, 0.5);
}

.poster-qr {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  background: #fff;
  padding: 4px;
  flex-shrink: 0;
}

.poster-actions {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 8px;
}

.poster-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: var(--c-bg-2);
  color: var(--c-text-1);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s, color 0.15s, opacity 0.15s;
}

.poster-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.poster-btn.primary {
  background: var(--c-primary);
  color: #fff;
}

.poster-btn.primary:hover:not(:disabled) {
  color: #fff;
  opacity: 0.94;
}

.poster-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.poster-fade-enter-active,
.poster-fade-leave-active {
  transition: opacity 0.22s ease;
}

.poster-fade-enter-active .poster-panel,
.poster-fade-leave-active .poster-panel {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.poster-fade-enter-from,
.poster-fade-leave-to {
  opacity: 0;
}

.poster-fade-enter-from .poster-panel,
.poster-fade-leave-to .poster-panel {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 640px) {
  .poster-overlay {
    align-items: start;
    padding: max(12px, env(safe-area-inset-top)) 8px max(12px, env(safe-area-inset-bottom));
    overflow-y: auto;
  }

  .poster-panel {
    width: 100%;
    max-height: none;
    padding: 12px;
    border-radius: 16px;
  }

  .poster-card {
    width: min(320px, 100%);
  }

  .poster-cover {
    height: clamp(132px, 45vw, 168px);
  }

  .poster-body {
    padding: 4px 14px 14px;
  }

  .poster-title {
    font-size: 1rem;
  }

  .poster-qr {
    width: 62px;
    height: 62px;
  }
}
</style>

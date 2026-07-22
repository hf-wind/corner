<template>
  <Teleport to="body">
    <Transition name="share-fade">
      <div v-if="open" class="share-overlay" @click.self="close">
        <div class="share-panel" role="dialog" aria-modal="true" aria-label="文字分享">
          <header class="share-head">
            <div class="share-head-title">
              <Icon name="ph:share-network-bold" />
              <span>文字分享</span>
            </div>
            <button type="button" class="icon-btn" aria-label="关闭" @click="close">
              <Icon name="ph:x-bold" />
            </button>
          </header>

          <div class="share-card">
            <div class="card-badge">Corner Blog</div>
            <h3 class="card-title">{{ article.title }}</h3>
            <p v-if="article.excerpt" class="card-excerpt">{{ article.excerpt }}</p>
            <div class="card-meta">
              <span v-if="article.author"><Icon name="ph:user-bold" />{{ article.author }}</span>
              <span v-if="article.date"><Icon name="ph:calendar-dots-bold" />{{ article.date }}</span>
            </div>
            <div class="card-link">
              <Icon name="ph:link-bold" />
              <span>{{ pageUrl }}</span>
            </div>
          </div>

          <div class="share-actions">
            <button type="button" class="share-btn primary" @click="copyFull">
              <Icon :name="copiedFull ? 'ph:check-bold' : 'ph:clipboard-text-bold'" />
              {{ copiedFull ? '已复制全文' : '复制分享文案' }}
            </button>
            <button type="button" class="share-btn" @click="copyLink">
              <Icon :name="copiedLink ? 'ph:check-bold' : 'ph:link-bold'" />
              {{ copiedLink ? '已复制链接' : '复制链接' }}
            </button>
            <button v-if="canNativeShare" type="button" class="share-btn" @click="nativeShare">
              <Icon name="ph:export-bold" />
              系统分享
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
  }
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const copiedFull = ref(false)
const copiedLink = ref(false)
const pageUrl = computed(() => (import.meta.client ? window.location.href : ''))
const canNativeShare = computed(() => import.meta.client && typeof navigator.share === 'function')

const shareText = computed(() => {
  const title = props.article.title || '未命名文章'
  const excerpt = props.article.excerpt ? `\n\n${props.article.excerpt}` : ''
  return `【Corner Blog】${title}${excerpt}\n\n${pageUrl.value}`
})

function close() {
  emit('update:open', false)
}

async function copyFull() {
  try {
    await navigator.clipboard.writeText(shareText.value)
    copiedFull.value = true
    setTimeout(() => { copiedFull.value = false }, 1800)
  } catch { /* ignore */ }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(pageUrl.value)
    copiedLink.value = true
    setTimeout(() => { copiedLink.value = false }, 1800)
  } catch { /* ignore */ }
}

async function nativeShare() {
  try {
    await navigator.share({
      title: props.article.title || 'Corner Blog',
      text: props.article.excerpt || props.article.title || '',
      url: pageUrl.value,
    })
  } catch { /* user cancel */ }
}

watch(() => props.open, (v) => {
  if (!import.meta.client) return
  document.body.style.overflow = v ? 'hidden' : ''
})

onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<style scoped>
.share-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 20px;
  background: color-mix(in srgb, #000 42%, transparent);
  backdrop-filter: blur(6px);
}

.share-panel {
  width: min(420px, 100%);
  background: var(--ld-bg-card);
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 24px 60px color-mix(in srgb, #000 28%, transparent);
}

.share-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.share-head-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--c-text);
}

.share-head-title :deep(.icon) {
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

.share-card {
  border-radius: 16px;
  padding: 18px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--c-primary) 22%, transparent), transparent 42%),
    linear-gradient(160deg, var(--c-bg-1), var(--ld-bg-card));
  box-shadow: 0 10px 28px var(--ld-shadow);
  margin-bottom: 16px;
}

.card-badge {
  display: inline-flex;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-primary);
  background: var(--c-primary-soft);
  padding: 3px 8px;
  border-radius: 999px;
  margin-bottom: 12px;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.45;
  color: var(--c-text);
  margin: 0 0 10px;
}

.card-excerpt {
  font-size: 0.78rem;
  line-height: 1.65;
  color: var(--c-text-2);
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 0.7rem;
  color: var(--c-text-3);
  margin-bottom: 12px;
}

.card-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.card-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--c-bg) 80%, transparent);
  font-size: 0.68rem;
  color: var(--c-text-2);
  word-break: break-all;
}

.share-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.share-btn {
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
  transition: transform 0.15s, background 0.15s, color 0.15s;
}

.share-btn:hover {
  transform: translateY(-1px);
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.share-btn.primary {
  background: var(--c-primary);
  color: #fff;
}

.share-btn.primary:hover {
  color: #fff;
  opacity: 0.94;
}

.share-fade-enter-active,
.share-fade-leave-active {
  transition: opacity 0.22s ease;
}

.share-fade-enter-active .share-panel,
.share-fade-leave-active .share-panel {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.share-fade-enter-from,
.share-fade-leave-to {
  opacity: 0;
}

.share-fade-enter-from .share-panel,
.share-fade-leave-to .share-panel {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>

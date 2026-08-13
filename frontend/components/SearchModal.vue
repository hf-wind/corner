<template>
  <Teleport to="body">
    <div v-if="visible" class="search-overlay" @click.self="close" @keydown.esc="close">
      <div class="search-panel" ref="panelRef">
        <div class="search-input-wrap">
          <Icon name="ph:magnifying-glass-bold" class="search-prefix" />
          <input ref="inputRef" v-model="query" type="text" placeholder="搜索文章、瞬间、相册、书影和旅程..." @input="onInput" class="search-input">
          <kbd class="search-esc" @click="close">ESC</kbd>
        </div>
        <div class="search-hints" v-if="!query">输入关键词搜索站内全部内容...</div>
        <div class="search-hints" v-if="query && searching">搜索中...</div>
        <div class="search-results" v-if="query && !searching && results.length > 0">
          <AppLink v-for="r in results" :key="`${r.type}:${r.sourceId}`" :to="r.href" class="search-result-row" @click="close">
            <div class="search-row-icon"><Icon :name="r.icon" /></div>
            <div class="search-row-body">
              <div class="search-row-title">{{ r.title }}</div>
              <div class="search-row-desc">{{ r.excerpt }}</div>
            </div>
          </AppLink>
        </div>
        <div class="search-empty" v-if="query && !searching && results.length === 0">未找到相关文章</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const api = useApi()
const query = ref('')
const results = ref<any[]>([])
const searching = ref(false)
const inputRef = ref<HTMLInputElement>()
const panelRef = ref<HTMLDivElement>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function doSearch(q: string) {
  if (!q.trim()) { results.value = []; return }
  searching.value = true
  try {
    const res = await api.get<any[]>('/ai/search', { q, limit: 12 })
    const icons: Record<string, string> = { post: 'ph:article-bold', moment: 'ph:sparkle-bold', album: 'ph:images-square-bold', photo: 'ph:image-bold', library: 'ph:books-bold', place: 'ph:map-pin-bold', journey: 'ph:path-bold', story: 'ph:film-strip-bold' }
    results.value = (res ?? []).map((item: any) => ({
      type: item.type,
      sourceId: item.sourceId,
      href: item.href,
      title: item.title,
      excerpt: item.excerpt || '',
      icon: icons[item.type] || 'ph:sparkle-bold',
    }))
  } catch { results.value = [] }
  searching.value = false
}

function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => doSearch(query.value), 300)
}

function close() {
  query.value = ''
  results.value = []
  emit('close')
}

watch(() => props.visible, (v) => {
  if (v) {
    nextTick(() => inputRef.value?.focus())
  }
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.search-overlay { position: fixed; inset: 0; z-index: 12000; background: rgba(0,0,0,0.4); display: flex; align-items: flex-start; justify-content: center; padding-top: 12vh; backdrop-filter: blur(2px); }
.search-panel { width: min(580px, 90vw); background: var(--ld-bg-card); border-radius: 14px; box-shadow: 0 8px 40px var(--ld-shadow), 0 0 0 1px var(--border); overflow: hidden; animation: slide-down 0.2s ease-out; }
@keyframes slide-down { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
.search-input-wrap { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--border); }
.search-prefix { width: 18px; height: 18px; color: var(--c-text-2); flex-shrink: 0; }
.search-input { flex: 1; border: none; background: transparent; color: var(--c-text); font-family: inherit; font-size: 0.95rem; outline: none; }
.search-input::placeholder { color: var(--c-text-3); }
.search-esc { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); color: var(--c-text-2); cursor: pointer; }
.search-hints { padding: 28px 18px; text-align: center; font-size: 0.82rem; color: var(--c-text-2); }
.search-results { max-height: 360px; overflow-y: auto; }
.search-result-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 18px; cursor: pointer; text-decoration: none; color: inherit; transition: background 0.15s; }
.search-result-row:hover { background: var(--c-primary-soft); }
.search-result-row + .search-result-row { border-top: 1px solid var(--border); }
.search-row-icon { font-size: 1rem; margin-top: 2px; flex-shrink: 0; }
.search-row-body { flex: 1; min-width: 0; }
.search-row-title { font-size: 0.85rem; font-weight: 700; color: var(--c-text); line-height: 1.4; margin-bottom: 2px; }
.search-row-desc { font-size: 0.75rem; color: var(--c-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.search-empty { padding: 28px 18px; text-align: center; font-size: 0.82rem; color: var(--c-text-2); }

@media (max-width: 640px) {
  .search-overlay {
    padding: max(68px, calc(env(safe-area-inset-top) + 60px)) 12px 12px;
    align-items: flex-start;
  }

  .search-panel {
    width: 100%;
    max-height: calc(100dvh - 84px - env(safe-area-inset-top));
    border-radius: 16px;
  }

  .search-input-wrap {
    padding: 13px 14px;
  }

  .search-results {
    max-height: calc(100dvh - 155px - env(safe-area-inset-top));
  }

  .search-result-row {
    padding: 12px 14px;
  }
}
</style>

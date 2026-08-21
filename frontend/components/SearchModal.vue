<template>
  <Teleport to="body">
    <div v-if="visible" class="search-overlay" @click.self="close" @keydown.esc="close">
      <div class="search-panel" ref="panelRef" @keydown="onPanelKeydown">
        <div class="search-input-wrap">
          <Icon name="ph:magnifying-glass-bold" class="search-prefix" />
          <input ref="inputRef" v-model="query" type="text" placeholder="搜索文章、瞬间、相册、书影和旅程..." @input="onInput" class="search-input">
          <kbd class="search-esc" @click="close">ESC</kbd>
        </div>
        <div class="search-history" v-if="!query && history.length">
          <div class="search-section-head"><span>最近搜索</span><button type="button" @click="clearHistory">清空</button></div>
          <button v-for="item in history" :key="item" type="button" class="history-chip" @click="useHistory(item)"><Icon name="ph:clock-counter-clockwise-bold" />{{ item }}</button>
        </div>
        <div class="search-hints" v-if="!query && !history.length">输入关键词搜索站内全部内容...</div>
        <div class="search-hints" v-if="query && searching">搜索中...</div>
        <div class="search-results" v-if="query && !searching && results.length > 0">
          <AppLink v-for="(r, index) in results" :key="`${r.type}:${r.sourceId}`" :to="r.href" class="search-result-row" :class="{ selected: selectedIndex === index }" @pointerenter="selectedIndex = index" @click="rememberAndClose">
            <div class="search-row-icon"><Icon :name="r.icon" /></div>
            <div class="search-row-body">
              <div class="search-row-title" v-html="highlight(r.title)" />
              <div class="search-row-desc" v-html="highlight(r.excerpt)" />
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
const selectedIndex = ref(-1)
const history = ref<string[]>([])
const inputRef = ref<HTMLInputElement>()
const panelRef = ref<HTMLDivElement>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let searchSequence = 0

async function doSearch(q: string) {
  const sequence = ++searchSequence
  if (!q.trim()) { results.value = []; selectedIndex.value = -1; searching.value = false; return }
  searching.value = true
  try {
    const res = await api.get<any[]>('/ai/search', { q, limit: 12 })
    const icons: Record<string, string> = { post: 'ph:article-bold', moment: 'ph:sparkle-bold', album: 'ph:images-square-bold', photo: 'ph:image-bold', library: 'ph:books-bold', place: 'ph:map-pin-bold', journey: 'ph:path-bold', story: 'ph:film-strip-bold', comment: 'ph:chat-circle-text-bold', 'moment-comment': 'ph:chat-circle-text-bold' }
    if (sequence !== searchSequence) return
    results.value = (Array.isArray(res) ? res : []).map((item: any) => ({
      type: item.type,
      sourceId: item.sourceId,
      href: withHighlight(item.href, q),
      title: item.title,
      excerpt: item.excerpt || '',
      icon: icons[item.type] || 'ph:sparkle-bold',
    }))
  } catch { if (sequence === searchSequence) results.value = [] }
  if (sequence === searchSequence) searching.value = false
}

function highlight(value: string) {
  const escaped = String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))
  const keyword = query.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return keyword ? escaped.replace(new RegExp(`(${keyword})`, 'ig'), '<mark>$1</mark>') : escaped
}

function rememberAndClose() {
  const normalized = query.value.trim()
  const next = [normalized, ...history.value.filter((item) => item !== normalized)].filter(Boolean).slice(0, 12)
  history.value = next
  sessionStorage.setItem('corner:search-history', JSON.stringify(next))
  close()
}

function useHistory(value: string) {
  query.value = value
  void doSearch(value)
}

function clearHistory() {
  history.value = []
  sessionStorage.removeItem('corner:search-history')
}

function withHighlight(href: string, value: string) {
  if (!href || !value.trim()) return href
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}highlight=${encodeURIComponent(value.trim().slice(0, 80))}`
}

function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => doSearch(query.value), 300)
}

function close() {
  searchSequence += 1
  query.value = ''
  results.value = []
  searching.value = false
  selectedIndex.value = -1
  emit('close')
}

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' && results.value.length) { event.preventDefault(); selectedIndex.value = (selectedIndex.value + 1) % results.value.length }
  if (event.key === 'ArrowUp' && results.value.length) { event.preventDefault(); selectedIndex.value = (selectedIndex.value - 1 + results.value.length) % results.value.length }
  if (event.key === 'Enter' && selectedIndex.value >= 0) { event.preventDefault(); (panelRef.value?.querySelectorAll<HTMLElement>('.search-result-row')[selectedIndex.value])?.click() }
}

watch(() => props.visible, (v) => {
  if (v) {
    try { history.value = JSON.parse(sessionStorage.getItem('corner:search-history') || '[]') } catch { history.value = [] }
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
.search-history { padding: 14px 18px 18px; }
.search-section-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; color:var(--c-text-3); font-size:.68rem; }
.search-section-head button { border:0; background:transparent; color:var(--c-primary); cursor:pointer; font:inherit; }
.history-chip { display:inline-flex; align-items:center; gap:6px; margin:0 6px 6px 0; padding:6px 9px; border:1px solid var(--border); border-radius:999px; background:var(--c-bg-1); color:var(--c-text-2); cursor:pointer; font:inherit; font-size:.68rem; transition:.18s ease; }
.history-chip:hover { border-color:var(--c-primary); color:var(--c-primary); transform:translateY(-1px); }
.search-results { max-height: 360px; overflow-y: auto; }
.search-result-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 18px; cursor: pointer; text-decoration: none; color: inherit; transition: background 0.15s; }
.search-result-row:hover, .search-result-row.selected { background: var(--c-primary-soft); box-shadow:inset 3px 0 var(--c-primary); }
.search-result-row + .search-result-row { border-top: 1px solid var(--border); }
.search-row-icon { font-size: 1rem; margin-top: 2px; flex-shrink: 0; }
.search-row-body { flex: 1; min-width: 0; }
.search-row-title { font-size: 0.85rem; font-weight: 700; color: var(--c-text); line-height: 1.4; margin-bottom: 2px; user-select: text; }
.search-row-desc { font-size: 0.75rem; color: var(--c-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; user-select: text; }
.search-row-title :deep(mark), .search-row-desc :deep(mark) { padding:0 .12em; border-radius:3px; background:color-mix(in srgb,var(--c-primary) 25%,transparent); color:inherit; }
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

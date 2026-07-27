<template>
  <transition name="emoji-panel-fade">
    <div v-if="open" class="emoji-picker">
      <div v-if="loading && !packs.length" class="emoji-loading">加载中...</div>
      <template v-else>
        <div class="emoji-sidebar">
          <button
            v-for="(pack, index) in packs"
            :key="pack.id"
            type="button"
            :class="{ active: activePackIndex === index }"
            :title="pack.name"
            @click="activePackIndex = index"
          >
            {{ shortName(pack.name) }}
          </button>
        </div>
        <div class="emoji-grid-wrap" @scroll.passive="onScroll">
          <div class="emoji-grid">
            <template v-if="activePack?.type === 'animated'">
              <button
                v-for="item in activePack.items"
                :key="item.id"
                type="button"
                class="emoji-item emoji-img-item"
                :title="item.label || item.char || '表情'"
                @click="emitSelect(item)"
                @mouseenter="onHover($event, item.imageUrl)"
                @mousemove="onMove"
                @mouseleave="onLeave"
              >
                <img
                  :src="mediaUrl(item.imageUrl)"
                  :alt="item.label || item.char || 'emoji'"
                  loading="lazy"
                >
              </button>
            </template>
            <template v-else>
              <button
                v-for="item in activePack?.items || []"
                :key="item.id"
                type="button"
                class="emoji-item"
                :title="item.label || item.char || '表情'"
                @click="emitSelect(item)"
              >
                {{ item.char || '🙂' }}
              </button>
            </template>
          </div>
        </div>
      </template>
      <div v-show="previewUrl" class="emoji-hover-preview" :style="previewStyle">
        <img :src="mediaUrl(previewUrl)" alt="">
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
type EmojiItem = {
  id: string
  char?: string
  label?: string
  imageUrl?: string
}

type EmojiPack = {
  id: string
  name: string
  type: 'static' | 'animated'
  enabled?: boolean
  items: EmojiItem[]
}

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  select: [payload: { char?: string; imageUrl?: string; label?: string }]
}>()

const api = useApi()
const { mediaUrl } = useMediaUrl()
const loading = ref(false)
const packs = ref<EmojiPack[]>([])
const activePackIndex = ref(0)
const pageMap = ref<Record<string, number>>({})
const loadingMap = ref<Record<string, boolean>>({})
const previewUrl = ref('')
const previewStyle = ref<Record<string, string>>({})

const activePack = computed(() => packs.value[activePackIndex.value] || null)

watch(() => props.open, (value) => {
  if (value && !packs.value.length) void loadPacks()
  if (!value) onLeave()
})

async function loadPacks() {
  loading.value = true
  try {
    const data = await api.get<any[]>('/emoji-packs')
    packs.value = (data || [])
      .filter((pack: any) => pack.enabled)
      .map((pack: any) => ({
        ...pack,
        items: Array.isArray(pack.items) ? pack.items : [],
      }))
    pageMap.value = Object.fromEntries(packs.value.map((pack) => [pack.id, 1]))
  } catch {
    packs.value = []
  } finally {
    loading.value = false
  }
}

function shortName(name: string) {
  return String(name || '')
    .replace(/[·.\s]/g, '')
    .slice(0, 4) || '包'
}

function emitSelect(item: EmojiItem) {
  emit('select', {
    char: item.char,
    imageUrl: item.imageUrl,
    label: item.label,
  })
}

async function onScroll(event: Event) {
  const pack = activePack.value
  if (!pack) return

  const element = event.target as HTMLElement
  if (element.scrollTop + element.clientHeight < element.scrollHeight - 60) return
  if (loadingMap.value[pack.id]) return

  const nextPage = (pageMap.value[pack.id] || 1) + 1
  loadingMap.value = { ...loadingMap.value, [pack.id]: true }

  try {
    const data = await api.get<any>(`/emoji-packs/${pack.id}/items`, { page: nextPage, limit: 48 })
    const nextItems = Array.isArray(data?.items) ? data.items : []
    if (!nextItems.length) return
    const existingIds = new Set(pack.items.map((item) => item.id))
    pack.items.push(...nextItems.filter((item: EmojiItem) => !existingIds.has(item.id)))
    pageMap.value = { ...pageMap.value, [pack.id]: nextPage }
  } catch {
    // keep current pack items
  } finally {
    loadingMap.value = { ...loadingMap.value, [pack.id]: false }
  }
}

function onHover(event: MouseEvent, url?: string) {
  if (!url || !url.startsWith('/uploads')) return
  previewUrl.value = url
  onMove(event)
}

function onMove(event: MouseEvent) {
  let x = event.clientX + 12
  let y = event.clientY - 40
  const width = 84
  const height = 84
  if (x + width > window.innerWidth - 8) x = event.clientX - 12 - width
  if (y + height > window.innerHeight - 8) y = window.innerHeight - 8 - height
  if (y < 8) y = 8
  previewStyle.value = { left: `${x}px`, top: `${y}px` }
}

function onLeave() {
  previewUrl.value = ''
  previewStyle.value = {}
}
</script>

<style scoped>
.emoji-picker {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 70;
  display: flex;
  width: min(420px, 88vw);
  height: 380px;
  overflow: hidden;
  border-radius: 16px;
  background: var(--ld-bg-card);
  box-shadow:
    0 22px 44px color-mix(in srgb, var(--ld-shadow) 45%, transparent),
    0 0 0 1px color-mix(in srgb, var(--border) 65%, transparent);
}

.emoji-panel-fade-enter-active,
.emoji-panel-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.emoji-panel-fade-enter-from,
.emoji-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.emoji-loading {
  display: grid;
  flex: 1;
  place-items: center;
  color: var(--c-text-3);
  font-size: 0.84rem;
}

.emoji-sidebar {
  display: flex;
  width: 72px;
  flex-shrink: 0;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  background: var(--c-bg-2);
  padding: 8px 0;
}

.emoji-sidebar button {
  height: 42px;
  border: 0;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  transition: background 0.12s ease, color 0.12s ease;
}

.emoji-sidebar button.active {
  background: var(--ld-bg-card);
  color: var(--c-primary);
  font-weight: 700;
  box-shadow: inset 3px 0 0 var(--c-primary);
}

.emoji-sidebar button:hover:not(.active) {
  background: var(--c-bg);
  color: var(--c-text);
}

.emoji-grid-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: flex-start;
}

.emoji-item {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  font-size: 1.8rem;
  transition: background 0.12s ease;
}

.emoji-item:hover {
  background: var(--c-bg-2);
}

.emoji-img-item img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: contain;
}

.emoji-hover-preview {
  position: fixed;
  z-index: 999;
  pointer-events: none;
}

.emoji-hover-preview img {
  width: 100px;
  height: 100px;
  object-fit: contain;
}

@media (max-width: 640px) {
  .emoji-picker {
    position: fixed;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    max-height: 44vh;
    border-radius: 18px 18px 0 0;
  }
}
</style>

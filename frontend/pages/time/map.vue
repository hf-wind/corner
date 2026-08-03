<template>
  <main class="memory-map-page">
    <section class="map-canvas-shell" :class="{ hidden: mobileMode === 'list' }">
      <div ref="mapEl" class="map-canvas" />
      <section class="map-brand" aria-label="地图说明">
        <span>WIND & MEMORY · 风隅地图</span>
        <h1>在地点里翻阅时间</h1>
        <p>每一个坐标，都保存着一段公开的记忆。</p>
        <div><strong>{{ result.totalMemories || 0 }}</strong><small>条记忆 · 右键拖动可切换视角</small></div>
      </section>
      <div v-if="mapError" class="map-state error"><Icon name="ph:warning-circle-bold" /><span>{{ mapError }}</span></div>
      <div v-else-if="loading" class="map-state"><Icon name="ph:spinner-gap-bold" class="spinning" /><span>正在寻找视野里的记忆</span></div>
      <div class="map-legend" aria-label="点位图例">
        <span><i class="legend-marker moment">✦</i>瞬间</span>
        <span><i class="legend-marker album">▣</i>相册</span>
        <span><i class="legend-marker photo">●</i>照片</span>
      </div>
      <Transition name="memory-focus">
        <article v-if="selectedMemory" class="map-focus-card">
          <button type="button" class="focus-close" title="关闭详情" aria-label="关闭详情" @click="clearSelection"><Icon name="ph:x-bold" /></button>
          <div class="focus-cover" :class="selectedMemory.type">
            <img v-if="selectedMemory.thumbnail" :src="mediaUrl(selectedMemory.thumbnail)" :alt="selectedMemory.title">
            <Icon v-else :name="typeIcon(selectedMemory.type)" />
          </div>
          <div class="focus-copy">
            <div class="focus-meta"><span><Icon :name="typeIcon(selectedMemory.type)" />{{ typeLabel(selectedMemory.type) }}</span><time>{{ formatDate(selectedMemory.occurredAt) }}</time></div>
            <h2>{{ selectedMemory.title }}</h2>
            <p>{{ selectedMemory.excerpt || `${selectedMemory.placeName}的一段记忆。` }}</p>
            <footer><span><Icon name="ph:map-pin-fill" />{{ selectedMemory.placeName }} · {{ precisionLabel(selectedMemory.precision) }}</span><NuxtLink :to="selectedMemory.href">查看详情 <Icon name="ph:arrow-up-right-bold" /></NuxtLink></footer>
          </div>
        </article>
      </Transition>
    </section>

    <aside class="memory-panel" :class="{ hidden: mobileMode === 'map' }">
      <div class="filters">
        <div class="type-filter">
          <button v-for="option in typeOptions" :key="option.value" type="button" :class="{ active: types.includes(option.value) }" @click="toggleType(option.value)"><Icon :name="option.icon" />{{ option.label }}</button>
        </div>
        <PublicSelectMenu v-model="year" :options="yearOptions" icon="ph:calendar-blank-bold" label="年份筛选" @update:model-value="selectYear" />
        <PublicSelectMenu v-model="place" :options="mapPlaceOptions" icon="ph:map-pin-line-bold" label="地点筛选" empty-text="当前视野暂无地点" @update:model-value="selectPlace" />
      </div>

      <div class="panel-meta"><span>{{ result.returned }} 个可见点位</span><small v-if="result.truncated">视野结果已限制为 500 项</small></div>
      <div ref="listEl" class="memory-list">
        <template v-for="item in result.items" :key="item.id">
        <article v-if="item.kind === 'memory'" :id="`map-memory-${safeId(item.id)}`" :class="['memory-card', item.type, { active: selectedId === item.id }]" @click="selectMemory(item, true, true)">
          <img v-if="item.thumbnail" :src="mediaUrl(item.thumbnail)" :alt="item.title" loading="lazy">
          <div v-else class="memory-icon"><Icon :name="typeIcon(item.type)" /></div>
          <div class="memory-copy"><div><span>{{ typeLabel(item.type) }}</span><time>{{ formatDate(item.occurredAt) }}</time></div><h2>{{ item.title }}</h2><p>{{ item.excerpt || `${item.placeName}的一段记忆。` }}</p><footer><span><Icon name="ph:map-pin-fill" />{{ item.placeName }} · {{ precisionLabel(item.precision) }}</span><NuxtLink :to="item.href">查看 <Icon name="ph:arrow-up-right-bold" /></NuxtLink></footer></div>
        </article>
        <button v-else type="button" class="cluster-card" @click="openCluster(item)"><span><strong>{{ item.count }}</strong><small>条记忆</small></span><div><h2>一组相邻的时光</h2><p>{{ clusterSummary(item) }}</p></div><Icon name="ph:magnifying-glass-plus-bold" /></button>
        </template>
        <div v-if="!loading && !result.items.length" class="empty"><Icon name="ph:map-pin-line" /><h2>当前视野没有公开记忆</h2><p>移动地图去别处看看。</p></div>
      </div>
    </aside>

    <nav class="mobile-switch" aria-label="地图和列表切换"><button type="button" :class="{ active: mobileMode === 'map' }" @click="mobileMode = 'map'"><Icon name="ph:map-trifold-bold" />地图</button><button type="button" :class="{ active: mobileMode === 'list' }" @click="mobileMode = 'list'"><Icon name="ph:list-bullets-bold" />列表</button></nav>
  </main>
</template>

<script setup lang="ts">
import { AmapAdapter, type MapAdapter, type MapBounds, type MapInitialView, wgs84ToGcj02 } from '~/utils/map-adapter'
import type { MapMemoryType, MemoryMapCluster, MemoryMapItem, MemoryMapResult } from '~/types/memory-map'

const api = useApi()
const route = useRoute()
const { mediaUrl } = useMediaUrl()
const { selectMemory: selectSharedMemory } = useMemorySelection()
const mapEl = ref<HTMLElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const adapter = shallowRef<MapAdapter | null>(null)
const result = ref<MemoryMapResult>({ items: [], totalMemories: 0, returned: 0, truncated: false, places: [] })
const types = ref<MapMemoryType[]>(['moment', 'album', 'photo'])
const year = ref(String(route.query.year || ''))
const place = ref(String(route.query.place || ''))
const selectedId = ref(String(route.query.memory || ''))
const loading = ref(true)
const mapError = ref('')
const mobileMode = ref<'map' | 'list'>('map')
let requestController: AbortController | null = null
let requestTimer: number | undefined
let requestSequence = 0
let initialMemoryFocused = false
let revealInitialResult = !selectedId.value && !route.query.lng && !route.query.lat

const typeOptions = [
  { value: 'moment' as const, label: '瞬间', icon: 'ph:sparkle-bold' },
  { value: 'album' as const, label: '相册', icon: 'ph:images-square-bold' },
  { value: 'photo' as const, label: '照片', icon: 'ph:image-bold' },
]
const years = Array.from({ length: 30 }, (_, index) => new Date().getFullYear() - index)
const yearOptions = computed(() => [
  { value: '', label: '全部年份', icon: 'ph:calendar-blank-bold' },
  ...years.map(item => ({ value: String(item), label: `${item} 年`, icon: 'ph:calendar-blank-bold' })),
])
const mapPlaceOptions = computed(() => [
  { value: '', label: '全部地点', icon: 'ph:globe-hemisphere-east-bold', count: result.value.totalMemories },
  ...result.value.places.map(item => ({ value: item.slug, label: item.name, icon: 'ph:map-pin-fill' })),
])
const selectedMemory = computed(() => result.value.items.find(
  (item): item is MemoryMapItem => item.kind === 'memory' && item.id === selectedId.value,
) || null)

onMounted(async () => {
  if (!mapEl.value) return
  try {
    const longitude = Number(route.query.lng)
    const latitude = Number(route.query.lat)
    const hasInitialPoint = Number.isFinite(longitude) && Number.isFinite(latitude)
    const initialPoint = hasInitialPoint
      ? route.query.cs === 'wgs84' ? wgs84ToGcj02(longitude, latitude) : { longitude, latitude }
      : null
    const initialView: MapInitialView | undefined = initialPoint
      ? { ...initialPoint, zoom: selectedId.value ? 17 : 13 }
      : window.matchMedia('(max-width: 900px)').matches
        ? { longitude: 112.8, latitude: 34.5, zoom: 4.25 }
        : undefined
    const map = new AmapAdapter()
    await map.mount(mapEl.value, initialView)
    adapter.value = map
    map.onViewChange(scheduleLoad)
    map.onSelect((item) => {
      if (item.kind === 'cluster') void expandCluster(item)
      else selectMemory(item, true, false)
    })
    scheduleLoad(0)
  } catch (error: any) {
    mapError.value = error?.message || '地图初始化失败'
    loading.value = false
  }
})

onUnmounted(() => {
  if (requestTimer) window.clearTimeout(requestTimer)
  requestController?.abort()
  adapter.value?.destroy()
})

watch([types, year, place], () => {
  scheduleLoad(0)
}, { deep: true })

function scheduleLoad(delay = 260) {
  if (requestTimer) window.clearTimeout(requestTimer)
  requestTimer = window.setTimeout(loadMap, delay)
}

async function loadMap(boundsOverride?: MapBounds, zoomOverride?: number) {
  const map = adapter.value
  if (!map) return
  const sequence = ++requestSequence
  requestController?.abort()
  requestController = new AbortController()
  loading.value = true
  try {
    const bounds = boundsOverride || map.bounds()
    const next = await api.get<MemoryMapResult>('/memories/map', {
      ...bounds,
      zoom: zoomOverride ?? map.zoom(),
      types: types.value.join(','),
      year: year.value || undefined,
      place: place.value || undefined,
    }, { signal: requestController.signal })
    if (sequence !== requestSequence) return
    result.value = next
    map.setItems(next.items, selectedId.value)
    if (revealInitialResult) {
      const [onlyItem] = next.items
      if (next.items.length === 1 && onlyItem) {
        map.setCenter(onlyItem.longitude, onlyItem.latitude, onlyItem.kind === 'cluster' ? 9.6 : 13.5)
      }
      revealInitialResult = false
    }
    if (!initialMemoryFocused && selectedId.value) {
      const selected = next.items.find((item): item is MemoryMapItem => item.kind === 'memory' && item.id === selectedId.value)
      if (selected) focusSelectedMemory(selected)
      initialMemoryFocused = true
    }
  } catch (error: any) {
    if (error?.name !== 'AbortError') mapError.value = error?.message || '地图记忆加载失败'
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function selectMemory(item: MemoryMapItem, center = false, scroll = false) {
  selectedId.value = item.id
  selectSharedMemory({ id: item.id, type: item.type, href: item.href })
  adapter.value?.setItems(result.value.items, item.id)
  if (center) {
    focusSelectedMemory(item)
  }
  if (scroll) {
    mobileMode.value = 'list'
    nextTick(() => document.getElementById(`map-memory-${safeId(item.id)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }
}
function focusSelectedMemory(item: MemoryMapItem) {
  adapter.value?.focusMemory(item.longitude, item.latitude, item.type)
}
function clearSelection() {
  selectedId.value = ''
  adapter.value?.setItems(result.value.items)
}
async function expandCluster(item: MemoryMapCluster) {
  adapter.value?.setCenter(item.longitude, item.latitude, 15)
  await loadMap(paddedBounds(item.bounds), 15)
  mobileMode.value = 'map'
}
function openCluster(item: MemoryMapCluster) { void expandCluster(item) }
function selectYear(value: string) { year.value = value }
function selectPlace(value: string) { place.value = value }
function clusterSummary(item: MemoryMapCluster) { return [`${item.types.moment} 个瞬间`, `${item.types.album} 册相册`, `${item.types.photo} 张照片`].filter(text => !text.startsWith('0 ')).join(' · ') }

function toggleType(type: MapMemoryType) {
  types.value = types.value.includes(type) ? types.value.filter((item) => item !== type) : [...types.value, type]
  if (!types.value.length) types.value = [type]
}
function paddedBounds(bounds: MapBounds) { const d = .008; return { west: bounds.west - d, south: bounds.south - d, east: bounds.east + d, north: bounds.north + d } }
function safeId(value: string) { return value.replace(/[^a-z0-9_-]/gi, '-') }
function typeIcon(type: MapMemoryType) { return type === 'moment' ? 'ph:sparkle-bold' : type === 'album' ? 'ph:images-square-bold' : 'ph:image-bold' }
function typeLabel(type: MapMemoryType) { return type === 'moment' ? '瞬间' : type === 'album' ? '相册' : '照片' }
function precisionLabel(value: string) { return ({ exact: '精确位置', place: '地点范围', city: '城市范围', province: '省级范围' } as Record<string, string>)[value] || '公开位置' }
function formatDate(value?: string | null) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}` }
useHead({ title: '风隅地图' })
</script>

<style scoped>
.cluster-card{display:grid;width:100%;grid-template-columns:54px minmax(0,1fr) 28px;gap:12px;align-items:center;padding:12px;border:1px solid color-mix(in srgb,var(--c-primary) 25%,var(--border));border-radius:10px;background:linear-gradient(135deg,var(--c-primary-soft),var(--ld-bg-card));color:var(--c-text);text-align:left;cursor:pointer}.cluster-card>span{display:flex;width:54px;height:54px;align-items:center;justify-content:center;flex-direction:column;border-radius:50%;background:var(--c-primary);color:#fff}.cluster-card strong{font-size:1rem;line-height:1}.cluster-card small{margin-top:3px;font-size:.46rem}.cluster-card h2{font-size:.78rem}.cluster-card p{margin-top:5px;color:var(--c-text-3);font-size:.56rem}.cluster-card>svg{color:var(--c-primary);font-size:1rem}
.memory-map-page{display:grid;width:100%;height:100%;min-width:0;grid-template-columns:minmax(0,1fr) minmax(330px,30vw);background:var(--c-bg)}.map-canvas-shell{position:relative;min-width:0;overflow:hidden;background:var(--c-bg-2)}.map-canvas{position:absolute;inset:0}.map-brand{position:absolute;top:20px;left:22px;display:flex;flex-direction:column;padding:11px 14px;border:1px solid color-mix(in srgb,var(--border) 76%,transparent);border-radius:10px;background:color-mix(in srgb,var(--ld-bg-card) 88%,transparent);box-shadow:0 10px 32px rgb(0 0 0/12%);backdrop-filter:blur(14px)}.map-brand span{color:var(--c-primary);font-size:.5rem;font-weight:700;letter-spacing:.18em}.map-brand strong{margin-top:3px;color:var(--c-text);font-family:var(--font-serif);font-size:1rem}.map-state{position:absolute;top:20px;left:50%;display:flex;align-items:center;gap:7px;padding:10px 14px;border-radius:9px;background:color-mix(in srgb,var(--ld-bg-card) 92%,transparent);box-shadow:0 8px 28px rgb(0 0 0/10%);color:var(--c-text-2);font-size:.68rem;transform:translateX(-50%);backdrop-filter:blur(12px)}.map-state.error{color:#d14d4d}.map-legend{position:absolute;bottom:18px;left:22px;display:flex;gap:12px;padding:8px 11px;border-radius:8px;background:color-mix(in srgb,var(--ld-bg-card) 88%,transparent);color:var(--c-text-3);font-size:.58rem;backdrop-filter:blur(12px)}.map-legend span{display:flex;align-items:center;gap:5px}.map-legend i{width:7px;height:7px;border-radius:50%}.map-legend .moment{background:#7564df}.map-legend .album{background:#d58a4a}.map-legend .photo{background:#2b9c84}.memory-panel{display:flex;min-width:0;min-height:0;flex-direction:column;border-left:1px solid var(--border);background:var(--c-bg)}.panel-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:24px 22px 18px}.panel-head>div>span{color:var(--c-primary);font-size:.52rem;font-weight:700;letter-spacing:.18em}.panel-head h1{margin:7px 0 0;color:var(--c-text);font-size:1.24rem}.panel-head p{max-width:310px;margin:7px 0 0;color:var(--c-text-3);font-size:.62rem;line-height:1.65}.panel-head>strong{color:var(--c-primary);font-family:var(--font-serif);font-size:1.7rem;white-space:nowrap}.panel-head>strong small{color:var(--c-text-3);font-family:var(--font-body);font-size:.55rem;font-weight:500}.filters{display:flex;flex-wrap:wrap;gap:8px;padding:0 22px 14px}.type-filter{display:flex;gap:4px}.type-filter button,.place-filter,.filters select{min-height:31px;border:1px solid var(--border);border-radius:7px;background:var(--ld-bg-card);color:var(--c-text-3);font-size:.6rem}.type-filter button,.place-filter{display:flex;align-items:center;gap:4px;padding:0 9px;cursor:pointer}.type-filter button.active{border-color:color-mix(in srgb,var(--c-primary) 50%,var(--border));background:var(--c-primary-soft);color:var(--c-primary)}.filters select{padding:0 8px;outline:0}.place-filter{max-width:160px;color:var(--c-primary)}.panel-meta{display:flex;align-items:center;justify-content:space-between;padding:9px 22px;border-block:1px solid var(--border);color:var(--c-text-3);font-size:.56rem}.panel-meta small{color:#c98545}.memory-list{display:grid;min-height:0;flex:1;align-content:start;gap:9px;padding:14px 14px 28px;overflow-y:auto}.memory-card{display:grid;min-width:0;grid-template-columns:72px minmax(0,1fr);gap:12px;padding:9px;border:1px solid color-mix(in srgb,var(--border) 78%,transparent);border-radius:10px;background:var(--ld-bg-card);cursor:pointer;transition:border-color .18s,transform .18s,box-shadow .18s}.memory-card:hover,.memory-card.active{border-color:color-mix(in srgb,var(--c-primary) 48%,var(--border));box-shadow:0 10px 28px color-mix(in srgb,var(--ld-shadow) 46%,transparent);transform:translateY(-1px)}.memory-card img,.memory-icon{width:72px;height:72px;border-radius:7px;object-fit:cover}.memory-icon{display:grid;background:var(--c-primary-soft);color:var(--c-primary);font-size:1.35rem;place-items:center}.memory-copy{min-width:0}.memory-copy>div{display:flex;align-items:center;justify-content:space-between;color:var(--c-text-3);font-size:.51rem}.memory-copy>div>span{color:var(--c-primary);font-weight:700;letter-spacing:.08em}.memory-copy h2{margin:5px 0 0;overflow:hidden;color:var(--c-text);font-size:.8rem;text-overflow:ellipsis;white-space:nowrap}.memory-copy p{display:-webkit-box;margin:4px 0 0;overflow:hidden;color:var(--c-text-3);font-size:.58rem;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:1}.memory-copy footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px;color:var(--c-text-3);font-size:.53rem}.memory-copy footer span,.memory-copy footer a{display:flex;align-items:center;gap:3px}.memory-copy footer span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.memory-copy footer a{flex:none;color:var(--c-primary);text-decoration:none}.empty{display:grid;min-height:260px;place-items:center;align-content:center;color:var(--c-text-3);text-align:center}.empty>svg{color:var(--c-primary);font-size:2rem}.empty h2{margin-top:10px;color:var(--c-text);font-size:.9rem}.empty p{margin-top:5px;font-size:.6rem}.mobile-switch{display:none}.spinning{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}:global(.corner-map-marker),:global(.corner-map-cluster){font-family:var(--font-body);cursor:pointer}:global(.corner-map-marker){display:grid;width:34px;height:34px;padding:0;border:3px solid #fff;border-radius:50%;box-shadow:0 6px 18px rgb(0 0 0/24%);color:#fff;place-items:center}:global(.corner-map-marker.moment){background:#7564df}:global(.corner-map-marker.album){background:#d58a4a}:global(.corner-map-marker.photo){background:#2b9c84}:global(.corner-map-marker.selected){outline:3px solid color-mix(in srgb,var(--c-primary) 35%,transparent);transform:scale(1.15)}:global(.corner-map-cluster){display:flex;min-width:52px;height:52px;align-items:center;justify-content:center;flex-direction:column;padding:0 8px;border:3px solid rgb(255 255 255/92%);border-radius:50%;background:color-mix(in srgb,var(--c-primary) 82%,#27304a);box-shadow:0 7px 22px rgb(0 0 0/26%);color:#fff}:global(.corner-map-cluster strong){font-size:.85rem;line-height:1}:global(.corner-map-cluster span){margin-top:2px;font-size:.42rem}:global(.amap-logo),:global(.amap-copyright){opacity:.55}@media(max-width:900px){.memory-map-page{position:relative;display:block}.map-canvas-shell,.memory-panel{width:100%;height:100%}.map-canvas-shell.hidden,.memory-panel.hidden{display:none}.memory-panel{border-left:0;padding-top:max(64px,calc(env(safe-area-inset-top) + 56px))}.panel-head{padding-inline:16px}.filters{padding-inline:16px}.panel-meta{padding-inline:16px}.memory-list{padding-bottom:88px}.map-brand{top:max(66px,calc(env(safe-area-inset-top) + 60px));left:14px}.map-state{top:max(68px,calc(env(safe-area-inset-top) + 62px))}.map-legend{bottom:82px;left:14px}.mobile-switch{position:fixed;z-index:200;right:50%;bottom:calc(16px + env(safe-area-inset-bottom));display:flex;padding:4px;border:1px solid color-mix(in srgb,var(--border) 72%,transparent);border-radius:12px;background:color-mix(in srgb,var(--ld-bg-card) 92%,transparent);box-shadow:0 10px 30px rgb(0 0 0/18%);transform:translateX(50%);backdrop-filter:blur(14px)}.mobile-switch button{display:flex;min-width:82px;height:36px;align-items:center;justify-content:center;gap:5px;border:0;border-radius:8px;background:transparent;color:var(--c-text-3);font-size:.68rem}.mobile-switch button.active{background:var(--c-primary-soft);color:var(--c-primary)}}
/* The map is the canvas; controls float above it like a field notebook. */
.memory-map-page { position: relative; display: block; overflow: hidden; }
.map-canvas-shell { position: absolute; inset: 0; }
.map-brand { z-index:10; width:min(330px,calc(100% - 390px)); min-width:250px; padding:16px 18px; border-radius:16px; pointer-events:none; }
.map-brand h1 { margin:7px 0 0; color:var(--c-text); font-family:var(--font-serif); font-size:1.22rem; font-weight:550; }
.map-brand p { margin:5px 0 0; color:var(--c-text-3); font-size:.59rem; line-height:1.55; }
.map-brand>div { display:flex; align-items:baseline; gap:7px; margin-top:11px; }
.map-brand>div strong { color:var(--c-primary); font-family:var(--font-serif); font-size:1.5rem; line-height:1; }
.map-brand>div small { color:var(--c-text-3); font-size:.5rem; }
.memory-panel { position:absolute; z-index:20; top:18px; right:18px; width:min(326px,calc(100% - 36px)); max-height:calc(100% - 36px); overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 72%,transparent); border-radius:16px; background:color-mix(in srgb,var(--c-bg) 86%,transparent); box-shadow:0 16px 44px rgb(22 30 45 / 18%); backdrop-filter:blur(18px); }
.memory-panel .filters { padding:15px 14px 12px; }
.memory-panel .panel-meta { padding-inline:14px; }
.memory-panel .memory-list { padding:10px; }
.type-filter { width:100%; }
.type-filter button { flex:1; justify-content:center; }
.filters .place-filter { position:relative; width:132px; max-width:none; padding:0; color:var(--c-text-2); }
.filters .place-filter>button { display:flex; width:100%; height:32px; box-sizing:border-box; align-items:center; justify-content:space-between; gap:6px; padding:0 9px; border:1px solid color-mix(in srgb,var(--border) 82%,transparent); border-radius:9px; background:color-mix(in srgb,var(--ld-bg-card) 96%,transparent); box-shadow:0 4px 14px color-mix(in srgb,var(--ld-shadow) 22%,transparent); color:inherit; font:inherit; font-size:.62rem; cursor:pointer; }
.filters .place-filter>button.active,.filters .place-filter>button:hover { border-color:color-mix(in srgb,var(--c-primary) 42%,var(--border)); background:var(--c-primary-soft); color:var(--c-primary); }
.filters .place-filter>button span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.filters .place-menu { position:absolute; z-index:30; top:38px; right:0; width:100%; max-height:280px; overflow-y:auto; box-sizing:border-box; padding:7px; border:1px solid var(--border); border-radius:11px; background:var(--ld-bg-card); box-shadow:0 14px 32px color-mix(in srgb,var(--ld-shadow) 55%,transparent); }
.filters .place-menu button { display:flex; width:100%; align-items:center; justify-content:space-between; gap:6px; padding:8px 7px; border:0; border-radius:7px; background:transparent; color:var(--c-text-2); cursor:pointer; font:inherit; }
.filters .place-menu button:hover,.filters .place-menu button.selected { background:var(--c-primary-soft); color:var(--c-primary); }
.filters .place-menu button span { display:flex; min-width:0; align-items:center; gap:5px; overflow:hidden; font-size:.62rem; text-overflow:ellipsis; white-space:nowrap; }
.filters .place-menu button em { min-width:20px; padding:2px 4px; border-radius:999px; background:var(--c-bg-2); color:var(--c-text-3); font-size:.5rem; font-style:normal; text-align:center; }
.filters .place-menu p { margin:4px; padding:9px 4px; color:var(--c-text-3); font-size:.56rem; line-height:1.6; text-align:center; }
.memory-list { max-height:344px; grid-template-rows:repeat(4,minmax(0,auto)); overflow-y:auto; scrollbar-gutter:stable; }
.memory-card { grid-template-columns:52px minmax(0,1fr); gap:9px; padding:8px; border-radius:12px; }
.memory-card img,.memory-icon { width:52px; height:52px; border-radius:9px; }
.memory-copy h2 { margin-top:3px; font-size:.74rem; }
.memory-copy p { margin-top:3px; font-size:.55rem; }
.memory-copy footer { margin-top:5px; font-size:.5rem; }
:global(.corner-map-marker.has-image) { overflow: hidden; background: var(--c-bg); }
:global(.corner-map-marker.has-image img) { width: 100%; height: 100%; object-fit: cover; }
.map-legend { z-index:210; bottom:0; left:0; gap:9px; min-height:48px; padding:8px 12px 10px; border-radius:0 11px 0 0; background:color-mix(in srgb,var(--ld-bg-card) 97%,transparent); box-shadow:0 9px 24px rgb(0 0 0/.14); }
.map-legend .legend-marker { display:grid; width:20px; height:20px; border:2px solid #fff; color:#fff; font-size:.55rem; font-style:normal; line-height:1; place-items:center; box-shadow:0 3px 9px rgb(0 0 0/.18); }
.map-legend .legend-marker.moment { border-radius:50%; background:#7564df; }
.map-legend .legend-marker.album { border-radius:5px; background:#d58a4a; box-shadow:2px 2px 0 rgb(213 138 74/.28),0 3px 9px rgb(0 0 0/.18); }
.map-legend .legend-marker.photo { border-radius:50% 50% 50% 4px; background:#2b9c84; transform:rotate(-45deg); }
:global(.corner-map-marker) { width:36px; height:36px; border-radius:50%; animation:marker-in .48s cubic-bezier(.16,1,.3,1) both; transition:transform .28s cubic-bezier(.16,1,.3,1),box-shadow .28s; }
:global(.corner-map-marker.album) { border-radius:8px; box-shadow:4px 4px 0 rgb(213 138 74/.28),0 7px 18px rgb(0 0 0/.22); }
:global(.corner-map-marker.photo) { width:34px; height:34px; border-radius:50% 50% 50% 8px; transform:rotate(-45deg); }
:global(.corner-map-marker.photo > *) { transform:rotate(45deg); }
:global(.corner-map-marker.selected) { box-shadow:0 10px 26px rgb(0 0 0/.3); transform:scale(1.18); }
:global(.corner-map-marker.photo.selected) { transform:rotate(-45deg) scale(1.18); }
:global(.corner-map-marker:hover) { box-shadow:0 11px 28px rgb(0 0 0/.32); transform:translateY(-2px) scale(1.08); }
:global(.corner-map-marker.photo:hover) { transform:rotate(-45deg) translate(1px,-1px) scale(1.08); }
:global(.corner-map-marker.selected:hover) { transform:translateY(-2px) scale(1.18); }
:global(.corner-map-marker.photo.selected:hover) { transform:rotate(-45deg) translate(1px,-1px) scale(1.18); }
:global(.corner-map-cluster) { animation:marker-in .48s cubic-bezier(.16,1,.3,1) both; }
:global(.amap-logo),:global(.amap-copyright) { opacity:.72; }
.map-focus-card { position:absolute; z-index:18; left:calc(50% - 154px); bottom:52px; display:grid; width:min(430px,calc(100% - 390px)); min-width:340px; grid-template-columns:116px minmax(0,1fr); gap:14px; padding:11px; border:1px solid color-mix(in srgb,var(--border) 72%,transparent); border-radius:12px; background:color-mix(in srgb,var(--ld-bg-card) 94%,transparent); box-shadow:0 18px 48px rgb(0 0 0/.22); transform:translateX(-50%); backdrop-filter:blur(18px); }
.focus-close { position:absolute; z-index:2; top:7px; right:7px; display:grid; width:27px; height:27px; padding:0; border:1px solid var(--border); border-radius:50%; background:color-mix(in srgb,var(--ld-bg-card) 90%,transparent); color:var(--c-text-3); cursor:pointer; place-items:center; }
.focus-close:hover { color:var(--c-primary); }
.focus-cover { display:grid; width:116px; height:116px; overflow:hidden; border-radius:9px; background:var(--c-primary-soft); color:var(--c-primary); font-size:2rem; place-items:center; }
.focus-cover img { width:100%; height:100%; object-fit:cover; }
.focus-copy { min-width:0; padding:5px 27px 3px 0; }
.focus-meta,.focus-meta span,.focus-copy footer,.focus-copy footer>span,.focus-copy footer>a { display:flex; align-items:center; }
.focus-meta { justify-content:space-between; gap:10px; color:var(--c-text-3); font-size:.54rem; }
.focus-meta span { gap:4px; color:var(--c-primary); font-weight:700; letter-spacing:.06em; }
.focus-copy h2 { margin:8px 0 0; overflow:hidden; color:var(--c-text); font-family:var(--font-serif); font-size:1rem; text-overflow:ellipsis; white-space:nowrap; }
.focus-copy p { display:-webkit-box; margin:6px 0 0; overflow:hidden; color:var(--c-text-3); font-size:.58rem; line-height:1.65; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.focus-copy footer { justify-content:space-between; gap:10px; margin-top:11px; font-size:.53rem; }
.focus-copy footer>span { min-width:0; gap:3px; overflow:hidden; color:var(--c-text-3); text-overflow:ellipsis; white-space:nowrap; }
.focus-copy footer>a { flex:none; gap:3px; color:var(--c-primary); text-decoration:none; }
.memory-focus-enter-active,.memory-focus-leave-active { transition:opacity .3s ease,transform .42s cubic-bezier(.16,1,.3,1); }
.memory-focus-enter-from,.memory-focus-leave-to { opacity:0; transform:translate(-50%,18px) scale(.97); }
@keyframes marker-in { from { opacity:0; translate:0 12px; scale:.72; } to { opacity:1; translate:0 0; scale:1; } }
@media (max-width: 900px) {
  .map-canvas-shell { inset: 0; }
  .memory-panel { inset: 0; width: 100%; border: 0; border-radius: 0; box-shadow: none; backdrop-filter: none; }
  .map-brand { top:max(66px,calc(env(safe-area-inset-top) + 60px)); width:min(330px,calc(100% - 28px)); min-width:0; }
  .memory-list { max-height:none; }
  .map-legend { top:auto; bottom:0; left:0; }
  .mobile-switch { right:10px; transform:none; }
  .map-focus-card { position:fixed; left:14px; right:14px; bottom:76px; width:auto; min-width:0; grid-template-columns:82px minmax(0,1fr); gap:10px; transform:none; }
  .focus-cover { width:82px; height:82px; }
  .focus-copy { padding-top:2px; }
  .focus-copy p { -webkit-line-clamp:1; }
  .focus-copy footer { margin-top:7px; }
  .memory-focus-enter-from,.memory-focus-leave-to { transform:translateY(18px) scale(.97); }
}
</style>

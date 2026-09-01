<template>
  <div class="place-picker">
    <div v-if="modelValue" class="selected-place">
      <span><Icon name="ph:map-pin-fill" /></span>
      <div><strong>{{ modelValue.name }}</strong><small>{{ placeRegion(modelValue) || modelValue.address || '已选择地点' }}</small></div>
      <button type="button" title="移除地点" aria-label="移除地点" @click="clearPlace"><Icon name="ph:x-bold" /></button>
    </div>

    <a-input-search
      v-model:value="keyword"
      allow-clear
      :loading="searching"
      placeholder="搜索已有地点或高德地点"
      @search="searchPlaces"
    />

    <div v-if="keyword.trim() && (localPlaces.length || providerPlaces.length)" class="place-results">
      <section v-if="localPlaces.length">
        <span>已有地点</span>
        <button v-for="place in localPlaces" :key="place.id" type="button" @click="selectExisting(place)">
          <Icon name="ph:map-pin-line-bold" />
          <span><strong>{{ place.name }}</strong><small>{{ placeRegion(place) || place.address }}</small></span>
          <em>复用</em>
        </button>
      </section>
      <section v-if="providerPlaces.length">
        <span>高德地点</span>
        <button v-for="place in providerPlaces" :key="`${place.providerId}-${place.name}`" type="button" :disabled="creating" @click="resolveCandidate(place)">
          <Icon name="ph:magnifying-glass-bold" />
          <span><strong>{{ place.name }}</strong><small>{{ place.address || placeRegion(place) }}</small></span>
          <em>选用</em>
        </button>
      </section>
    </div>
    <p v-else-if="keyword.trim() && !searching && searched" class="result-empty">没有匹配地点，可直接在地图上点选。</p>

    <div class="map-shell">
      <div ref="mapElement" class="map-canvas" />
      <div v-if="mapLoading" class="map-state"><Icon name="ph:spinner-gap-bold" class="spinning" />加载地图</div>
      <div v-else-if="mapError" class="map-state"><Icon name="ph:map-trifold" />{{ mapError }}</div>
      <button v-if="pickedCandidate" type="button" class="confirm-point" :disabled="creating" @click="resolveCandidate(pickedCandidate)">
        <Icon :name="creating ? 'ph:spinner-gap-bold' : 'ph:map-pin-plus-bold'" :class="{ spinning: creating }" />{{ creating ? '正在识别' : '使用此位置' }}
      </button>
    </div>
    <p class="picker-hint"><Icon name="ph:magic-wand-bold" />选择搜索结果或地图点位，系统会自动复用或创建地点</p>
  </div>
</template>

<script setup lang="ts">
import type { Place, PlaceCandidate } from '@/types/place'

const props = defineProps<{ modelValue: Place | null }>()
const emit = defineEmits<{
  'update:modelValue': [place: Place | null]
  select: [payload: { place: Place | null; source: 'manual' | 'map' }]
}>()

const api = useApi()
const toast = useToast()
const mapElement = ref<HTMLElement | null>(null)
const keyword = ref('')
const searching = ref(false)
const searched = ref(false)
const mapLoading = ref(true)
const mapError = ref('')
const localPlaces = ref<Place[]>([])
const providerPlaces = ref<PlaceCandidate[]>([])
const pickedCandidate = ref<PlaceCandidate | null>(null)
const creating = ref(false)
let map: any
let marker: any
let searchTimer: ReturnType<typeof setTimeout> | undefined

function placeRegion(place: Partial<Place>) {
  return [place.province, place.city].filter((value, index, values) => value && values.indexOf(value) === index).join(' · ')
}

function clearPlace() {
  emit('update:modelValue', null)
  emit('select', { place: null, source: 'manual' })
  marker?.setMap(null)
  marker = null
}

function setMapPoint(location?: { longitude: number; latitude: number }) {
  if (!map || !location) return
  const position = [location.longitude, location.latitude]
  if (!marker) marker = new (window as any).AMap.Marker({ position })
  else marker.setPosition(position)
  marker.setMap(map)
  map.setZoomAndCenter(15, position)
}

function selectExisting(place: Place) {
  emit('update:modelValue', place)
  emit('select', { place, source: 'manual' })
  setMapPoint(place.mapLocation)
  keyword.value = ''
  localPlaces.value = []
  providerPlaces.value = []
}

async function resolveCandidate(candidate: PlaceCandidate) {
  if (!candidate?.name?.trim()) {
    toast.warning('未能识别地点名称，请重新选择')
    return
  }
  creating.value = true
  try {
    const place = await api.post<Place>('/places/resolve', {
      name: candidate.name.trim(),
      address: candidate.address?.trim() || null,
      city: candidate.city?.trim() || null,
      province: candidate.province?.trim() || null,
      country: candidate.country?.trim() || '中国',
      longitude: candidate.mapLocation.longitude,
      latitude: candidate.mapLocation.latitude,
      coordinateSystem: 'gcj02',
      type: 'poi',
    })
    emit('update:modelValue', place)
    emit('select', { place, source: 'map' })
    keyword.value = ''
    localPlaces.value = []
    providerPlaces.value = []
    pickedCandidate.value = null
    setMapPoint(place.mapLocation)
    toast.success('地点已自动关联')
  } catch (error: any) {
    toast.error(error?.message || '地点关联失败')
  } finally {
    creating.value = false
  }
}

async function searchPlaces() {
  const value = keyword.value.trim()
  if (!value) {
    localPlaces.value = []
    providerPlaces.value = []
    searched.value = false
    return
  }
  searching.value = true
  try {
    const [localResult, providerResult] = await Promise.allSettled([
      api.get<any>('/places', { search: value, limit: 8, scope: 'admin' }),
      value.length >= 2 ? api.get<PlaceCandidate[]>('/places/provider/search', { keywords: value, limit: 8 }) : Promise.resolve([]),
    ])
    localPlaces.value = localResult.status === 'fulfilled' ? localResult.value.items || [] : []
    providerPlaces.value = providerResult.status === 'fulfilled' ? providerResult.value : []
    searched.value = true
  } finally {
    searching.value = false
  }
}

async function pickMapPoint(event: any) {
  const location = { longitude: event.lnglat.getLng(), latitude: event.lnglat.getLat() }
  setMapPoint(location)
  try {
    const candidate = await api.get<PlaceCandidate>('/places/provider/reverse', location)
    pickedCandidate.value = candidate
  } catch (error: any) {
    pickedCandidate.value = { name: '地图选点', mapLocation: location, type: 'poi' }
    toast.warning(error?.message || '地址反查失败，可手动填写地点名称')
  }
}

function loadAmap() {
  const key = String(import.meta.env.VITE_AMAP_WEB_KEY || '').trim()
  const securityCode = String(import.meta.env.VITE_AMAP_SECURITY_CODE || '').trim()
  if (!key || !securityCode) return Promise.reject(new Error('地图密钥尚未配置'))
  const existing = (window as any).AMap
  if (existing) return Promise.resolve(existing)
  const cached = (window as any).__cornerAmapPromise
  if (cached) return cached
  ;(window as any)._AMapSecurityConfig = { securityJsCode: securityCode }
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`
    script.async = true
    script.onload = () => resolve((window as any).AMap)
    script.onerror = () => reject(new Error('地图加载失败'))
    document.head.appendChild(script)
  })
  ;(window as any).__cornerAmapPromise = promise
  return promise
}

async function initializeMap() {
  try {
    const AMap = await loadAmap() as any
    if (!mapElement.value) return
    map = new AMap.Map(mapElement.value, { zoom: 11, center: [120.58, 30.0], viewMode: '2D' })
    map.on('click', pickMapPoint)
    setMapPoint(props.modelValue?.mapLocation)
  } catch (error: any) {
    mapError.value = error?.message || '地图暂时不可用'
  } finally {
    mapLoading.value = false
  }
}

watch(keyword, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { void searchPlaces() }, 350)
})
watch(() => props.modelValue?.id, () => setMapPoint(props.modelValue?.mapLocation))
onMounted(initializeMap)
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  map?.destroy()
})
</script>

<style scoped>
.place-picker { position:relative; display:grid; gap:10px; }
.selected-place { display:grid; grid-template-columns:32px minmax(0,1fr) 26px; align-items:center; gap:8px; padding:9px; border:1px solid color-mix(in srgb,var(--c-primary) 30%,var(--border)); border-radius:7px; background:var(--c-primary-soft); }
.selected-place>span { display:grid; width:30px; height:30px; border-radius:6px; background:var(--ld-bg-card); color:var(--c-primary); place-items:center; }
.selected-place div { display:flex; min-width:0; flex-direction:column; }.selected-place strong { overflow:hidden; color:var(--c-text); font-size:.76rem; text-overflow:ellipsis; white-space:nowrap; }.selected-place small { margin-top:2px; overflow:hidden; color:var(--c-text-3); font-size:.61rem; text-overflow:ellipsis; white-space:nowrap; }
.selected-place button { display:grid; width:26px; height:26px; padding:0; border:0; border-radius:5px; background:transparent; color:var(--c-text-3); cursor:pointer; place-items:center; }.selected-place button:hover { background:var(--ld-bg-card); color:var(--c-primary); }
.place-results { position:absolute; z-index:20; top:84px; right:0; left:0; max-height:280px; padding:7px; overflow:auto; border:1px solid var(--border); border-radius:7px; background:var(--ld-bg-card); box-shadow:0 12px 28px var(--ld-shadow); }
.place-results section>span { display:block; padding:5px 7px; color:var(--c-text-3); font-size:.58rem; }.place-results button { display:grid; width:100%; grid-template-columns:20px minmax(0,1fr) auto; align-items:center; gap:7px; padding:8px 7px; border:0; border-radius:5px; background:transparent; color:var(--c-text-2); cursor:pointer; text-align:left; }.place-results button:hover { background:var(--c-primary-soft); color:var(--c-primary); }.place-results button>span { display:flex; min-width:0; flex-direction:column; }.place-results strong,.place-results small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.place-results strong { font-size:.7rem; }.place-results small { margin-top:2px; color:var(--c-text-3); font-size:.57rem; }.place-results em { color:var(--c-primary); font-size:.55rem; font-style:normal; }
.result-empty { margin:0; color:var(--c-text-3); font-size:.62rem; }
.map-shell { position:relative; height:190px; overflow:hidden; border:1px solid var(--border); border-radius:7px; background:var(--c-bg-1); }.map-canvas { width:100%; height:100%; }.map-state { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; gap:6px; background:var(--c-bg-1); color:var(--c-text-3); font-size:.65rem; }.confirm-point { position:absolute; right:8px; bottom:8px; display:flex; align-items:center; gap:5px; padding:7px 9px; border:1px solid var(--c-primary); border-radius:6px; background:var(--ld-bg-card); box-shadow:0 5px 16px var(--ld-shadow); color:var(--c-primary); cursor:pointer; font:inherit; font-size:.62rem; }
.picker-hint { display:flex; align-items:center; gap:5px; margin:0; color:var(--c-text-3); font-size:.58rem; line-height:1.5; }
.spinning { animation:spin .8s linear infinite; } @keyframes spin { to { transform:rotate(360deg); } }
</style>

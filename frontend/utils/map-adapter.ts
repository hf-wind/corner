import type { MemoryMapCluster, MemoryMapItem } from '~/types/memory-map'

export type MapBounds = { west: number; south: number; east: number; north: number }
export type MapMarkerItem = MemoryMapItem | MemoryMapCluster
export type MapInitialView = { longitude: number; latitude: number; zoom: number }

function normalizeLongitude(value: number) {
  if (!Number.isFinite(value)) return 0
  const normalized = ((value + 180) % 360 + 360) % 360 - 180
  return normalized === -180 && value > 0 ? 180 : normalized
}

export interface MapAdapter {
  mount(container: HTMLElement, initialView?: MapInitialView): Promise<void>
  destroy(): void
  bounds(): MapBounds
  zoom(): number
  center(): { longitude: number; latitude: number }
  setCenter(longitude: number, latitude: number, zoom?: number): void
  fitBounds(bounds: MapBounds): void
  setItems(items: MapMarkerItem[], selectedId?: string): void
  onViewChange(handler: () => void): void
  onSelect(handler: (item: MapMarkerItem) => void): void
}

function outsideChina(longitude: number, latitude: number) {
  return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271
}

export function wgs84ToGcj02(longitude: number, latitude: number) {
  if (outsideChina(longitude, latitude)) return { longitude, latitude }
  const pi = Math.PI
  const a = 6378245
  const eccentricity = 0.006693421622965943
  const x = longitude - 105
  const y = latitude - 35
  let deltaLatitude = -100 + 2 * x + 3 * y + .2 * y * y + .1 * x * y + .2 * Math.sqrt(Math.abs(x))
  deltaLatitude += (20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2 / 3
  deltaLatitude += (20 * Math.sin(y * pi) + 40 * Math.sin(y / 3 * pi)) * 2 / 3
  deltaLatitude += (160 * Math.sin(y / 12 * pi) + 320 * Math.sin(y * pi / 30)) * 2 / 3
  let deltaLongitude = 300 + x + 2 * y + .1 * x * x + .1 * x * y + .1 * Math.sqrt(Math.abs(x))
  deltaLongitude += (20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2 / 3
  deltaLongitude += (20 * Math.sin(x * pi) + 40 * Math.sin(x / 3 * pi)) * 2 / 3
  deltaLongitude += (150 * Math.sin(x / 12 * pi) + 300 * Math.sin(x / 30 * pi)) * 2 / 3
  const radLatitude = latitude / 180 * pi
  let magic = Math.sin(radLatitude)
  magic = 1 - eccentricity * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  deltaLatitude = deltaLatitude * 180 / ((a * (1 - eccentricity)) / (magic * sqrtMagic) * pi)
  deltaLongitude = deltaLongitude * 180 / (a / sqrtMagic * Math.cos(radLatitude) * pi)
  return { longitude: longitude + deltaLongitude, latitude: latitude + deltaLatitude }
}

let amapLoader: Promise<any> | null = null

function loadAmap() {
  if (amapLoader) return amapLoader
  const key = String(import.meta.env.VITE_AMAP_WEB_KEY || '').trim()
  if (!key) return Promise.reject(new Error('高德地图 JS Key 尚未配置'))
  const securityJsCode = String(import.meta.env.VITE_AMAP_SECURITY_CODE || '').trim()
  if (securityJsCode) (window as any)._AMapSecurityConfig = { securityJsCode }
  if ((window as any).AMap) return Promise.resolve((window as any).AMap)
  amapLoader = new Promise((resolve, reject) => {
    const callback = `cornerAmapReady${Date.now()}`
    ;(window as any)[callback] = () => {
      delete (window as any)[callback]
      resolve((window as any).AMap)
    }
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&callback=${callback}`
    script.async = true
    script.onerror = () => reject(new Error('高德地图脚本加载失败'))
    document.head.appendChild(script)
  })
  return amapLoader
}

function markerHtml(item: MapMarkerItem, selected: boolean) {
  if (item.kind === 'cluster') {
    return `<button class="corner-map-cluster${selected ? ' selected' : ''}" type="button"><strong>${item.count}</strong><span>处记忆</span></button>`
  }
  const icon = item.type === 'moment' ? '✦' : item.type === 'album' ? '▣' : '●'
  const image = item.thumbnail
    ? `<img src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy">`
    : `<span>${icon}</span>`
  return `<button class="corner-map-marker ${item.type}${item.thumbnail ? ' has-image' : ''}${selected ? ' selected' : ''}" type="button">${image}</button>`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character)
}

export class AmapAdapter implements MapAdapter {
  private AMap: any
  private map: any
  private markers: any[] = []
  private themeObserver: MutationObserver | null = null
  private viewHandler: () => void = () => undefined
  private selectHandler: (item: MapMarkerItem) => void = () => undefined

  async mount(container: HTMLElement, initialView?: MapInitialView) {
    this.AMap = await loadAmap()
    this.map = new this.AMap.Map(container, {
      zoom: initialView?.zoom ?? 5,
      center: [initialView?.longitude ?? 104.2, initialView?.latitude ?? 35.8],
      mapStyle: this.mapStyle(),
      viewMode: '2D',
      animateEnable: false,
      showLabel: true,
    })
    this.map.on('moveend', () => this.viewHandler())
    this.map.on('zoomend', () => this.viewHandler())
    this.themeObserver = new MutationObserver(() => this.map?.setMapStyle?.(this.mapStyle()))
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  }

  destroy() {
    this.markers = []
    this.themeObserver?.disconnect()
    this.themeObserver = null
    this.map?.destroy()
    this.map = null
  }

  private mapStyle() {
    return document.documentElement.classList.contains('dark')
      ? 'amap://styles/darkblue'
      : 'amap://styles/whitesmoke'
  }

  bounds(): MapBounds {
    const bounds = this.map.getBounds()
    const southWest = bounds.getSouthWest()
    const northEast = bounds.getNorthEast()
    return {
      west: normalizeLongitude(southWest.lng),
      south: Math.max(-90, Math.min(90, southWest.lat)),
      east: normalizeLongitude(northEast.lng),
      north: Math.max(-90, Math.min(90, northEast.lat)),
    }
  }

  zoom() { return this.map.getZoom() }

  center() {
    const center = this.map.getCenter()
    return { longitude: center.lng, latitude: center.lat }
  }

  setCenter(longitude: number, latitude: number, zoom?: number) {
    this.map.setZoomAndCenter(zoom || this.map.getZoom(), [longitude, latitude], false)
  }

  fitBounds(bounds: MapBounds) {
    this.map.setBounds(new this.AMap.Bounds(
      [normalizeLongitude(bounds.west), bounds.south],
      [normalizeLongitude(bounds.east), bounds.north],
    ), false, [60, 60, 60, 60])
  }

  setItems(items: MapMarkerItem[], selectedId?: string) {
    if (this.markers.length) this.map.remove(this.markers)
    const samePositionCounts = new Map<string, number>()
    const samePositionIndexes = new Map<string, number>()
    for (const item of items) {
      const key = `${item.longitude.toFixed(6)}:${item.latitude.toFixed(6)}`
      samePositionCounts.set(key, (samePositionCounts.get(key) || 0) + 1)
    }
    this.markers = items.map((item) => {
      const positionKey = `${item.longitude.toFixed(6)}:${item.latitude.toFixed(6)}`
      const positionCount = samePositionCounts.get(positionKey) || 1
      const positionIndex = samePositionIndexes.get(positionKey) || 0
      samePositionIndexes.set(positionKey, positionIndex + 1)
      const angle = positionCount > 1 ? (positionIndex / positionCount) * Math.PI * 2 - Math.PI / 2 : 0
      const offset = positionCount > 1 ? [Math.cos(angle) * 18, Math.sin(angle) * 18] : [0, 0]
      const marker = new this.AMap.Marker({
        position: [item.longitude, item.latitude],
        content: markerHtml(item, item.id === selectedId),
        anchor: 'center',
        offset: new this.AMap.Pixel(offset[0], offset[1]),
        zIndex: item.id === selectedId ? 300 : item.kind === 'cluster' ? 180 : 120,
      })
      marker.on('click', () => this.selectHandler(item))
      return marker
    })
    if (this.markers.length) this.map.add(this.markers)
  }

  onViewChange(handler: () => void) { this.viewHandler = handler }
  onSelect(handler: (item: MapMarkerItem) => void) { this.selectHandler = handler }
}

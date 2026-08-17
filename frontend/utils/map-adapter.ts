import type { MemoryMapCluster, MemoryMapItem } from '~/types/memory-map'

export type MapBounds = {
  west: number
  south: number
  east: number
  north: number
}
export type MapMarkerItem = MemoryMapItem | MemoryMapCluster
export type MapInitialView = {
  longitude: number
  latitude: number
  zoom: number
}

function normalizeLongitude(value: number) {
  if (!Number.isFinite(value)) return 0
  const normalized = ((((value + 180) % 360) + 360) % 360) - 180
  return normalized === -180 && value > 0 ? 180 : normalized
}

export interface MapAdapter {
  mount(container: HTMLElement, initialView?: MapInitialView): Promise<void>
  destroy(): void
  bounds(): MapBounds
  zoom(): number
  center(): { longitude: number; latitude: number }
  setCenter(longitude: number, latitude: number, zoom?: number): void
  flyTo(
    longitude: number,
    latitude: number,
    zoom: number,
    rotation?: number,
  ): void
  focusMemory(
    longitude: number,
    latitude: number,
    type: MemoryMapItem['type'],
  ): void
  fitBounds(bounds: MapBounds): void
  setItems(items: MapMarkerItem[], selectedId?: string): void
  setPath(points: Array<{ longitude: number; latitude: number }>): void
  onViewChange(handler: () => void): void
  onSelect(handler: (item: MapMarkerItem) => void): void
}

function outsideChina(longitude: number, latitude: number) {
  return (
    longitude < 72.004 ||
    longitude > 137.8347 ||
    latitude < 0.8293 ||
    latitude > 55.8271
  )
}

export function wgs84ToGcj02(longitude: number, latitude: number) {
  if (outsideChina(longitude, latitude)) return { longitude, latitude }
  const pi = Math.PI
  const a = 6378245
  const eccentricity = 0.006693421622965943
  const x = longitude - 105
  const y = latitude - 35
  let deltaLatitude =
    -100 +
    2 * x +
    3 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x))
  deltaLatitude +=
    ((20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2) / 3
  deltaLatitude +=
    ((20 * Math.sin(y * pi) + 40 * Math.sin((y / 3) * pi)) * 2) / 3
  deltaLatitude +=
    ((160 * Math.sin((y / 12) * pi) + 320 * Math.sin((y * pi) / 30)) * 2) / 3
  let deltaLongitude =
    300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  deltaLongitude +=
    ((20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2) / 3
  deltaLongitude +=
    ((20 * Math.sin(x * pi) + 40 * Math.sin((x / 3) * pi)) * 2) / 3
  deltaLongitude +=
    ((150 * Math.sin((x / 12) * pi) + 300 * Math.sin((x / 30) * pi)) * 2) / 3
  const radLatitude = (latitude / 180) * pi
  let magic = Math.sin(radLatitude)
  magic = 1 - eccentricity * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  deltaLatitude =
    (deltaLatitude * 180) /
    (((a * (1 - eccentricity)) / (magic * sqrtMagic)) * pi)
  deltaLongitude =
    (deltaLongitude * 180) / ((a / sqrtMagic) * Math.cos(radLatitude) * pi)
  return {
    longitude: longitude + deltaLongitude,
    latitude: latitude + deltaLatitude,
  }
}

let amapLoader: Promise<any> | null = null

function loadAmap() {
  if (amapLoader) return amapLoader
  const key = String(import.meta.env.VITE_AMAP_WEB_KEY || '').trim()
  if (!key) return Promise.reject(new Error('高德地图 JS Key 尚未配置'))
  const securityJsCode = String(
    import.meta.env.VITE_AMAP_SECURITY_CODE || '',
  ).trim()
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

function markerHtml(
  item: MapMarkerItem,
  selected: boolean,
  stack: MapMarkerItem[] = [],
) {
  if (item.kind === 'cluster') {
    return `<button class="corner-map-cluster${selected ? ' selected' : ''}" type="button" aria-label="展开 ${item.count} 处记忆"><strong>${item.count}</strong><span>处记忆</span></button>`
  }
  if (stack.length > 1) {
    const previews = stack
      .slice(0, 3)
      .map((entry, index) => {
        if (entry.kind === 'memory' && entry.thumbnail) {
          return `<img src="${escapeHtml(entry.thumbnail)}" alt="" loading="lazy" style="--stack-index:${index}">`
        }
        return `<i style="--stack-index:${index}" aria-hidden="true"></i>`
      })
      .join('')
    return `<button class="corner-map-stack${selected ? ' selected' : ''}" type="button" aria-label="浏览此处 ${stack.length} 条记忆">${previews}<strong>${stack.length}</strong></button>`
  }
  const icon = item.type === 'moment' ? '✦' : item.type === 'album' ? '▣' : '●'
  const image = item.thumbnail
    ? `<img src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy">`
    : `<span aria-hidden="true">${icon}</span>`
  const label = escapeHtml(
    `${item.type === 'moment' ? '瞬间' : item.type === 'album' ? '相册' : '照片'}：${item.title}`,
  )
  return `<button class="corner-map-marker ${item.type}${item.thumbnail ? ' has-image' : ''}${selected ? ' selected' : ''}" type="button" aria-label="${label}" title="${label}">${image}</button>`
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ] || character,
  )
}

export class AmapAdapter implements MapAdapter {
  private AMap: any
  private map: any
  private markers: any[] = []
  private markerGroups: Map<
    string,
    {
      marker: any
      items: MapMarkerItem[]
      signature: string
      selected: boolean
    }
  > = new Map()
  private pathLine: any = null
  private markerItems: Map<string, MapMarkerItem> = new Map()
  private markerById: Map<string, any> = new Map()
  private selectedId = ''
  private suppressViewEventsUntil = 0
  private themeObserver: MutationObserver | null = null
  private viewHandler: () => void = () => undefined
  private selectHandler: (item: MapMarkerItem) => void = () => undefined

  async mount(container: HTMLElement, initialView?: MapInitialView) {
    this.AMap = await loadAmap()
    this.map = new this.AMap.Map(container, {
      zoom: initialView?.zoom ?? 5,
      center: [initialView?.longitude ?? 104.2, initialView?.latitude ?? 35.8],
      mapStyle: this.mapStyle(),
      viewMode: '3D',
      pitch: 42,
      rotation: 0,
      pitchEnable: true,
      rotateEnable: true,
      dragEnable: true,
      zoomEnable: true,
      animateEnable: true,
      showLabel: true,
    })
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, 2800)
      this.map.on('complete', () => {
        window.clearTimeout(timer)
        resolve()
      })
    })
    const notifyViewChange = () => {
      if (Date.now() >= this.suppressViewEventsUntil) this.viewHandler()
    }
    this.map.on('moveend', notifyViewChange)
    this.map.on('zoomend', notifyViewChange)
    this.themeObserver = new MutationObserver(() =>
      this.map?.setMapStyle?.(this.mapStyle()),
    )
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }

  destroy() {
    this.markers = []
    if (this.pathLine) this.map?.remove(this.pathLine)
    this.pathLine = null
    this.markerItems.clear()
    this.markerById.clear()
    this.markerGroups.clear()
    this.selectedId = ''
    this.themeObserver?.disconnect()
    this.themeObserver = null
    this.map?.destroy()
    this.map = null
  }

  private mapStyle() {
    return document.documentElement.classList.contains('dark')
      ? 'amap://styles/grey'
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

  zoom() {
    return this.map.getZoom()
  }

  center() {
    const center = this.map.getCenter()
    return { longitude: center.lng, latitude: center.lat }
  }

  setCenter(longitude: number, latitude: number, zoom?: number) {
    this.suppressViewEventsUntil = Date.now() + 1400
    this.map.setZoomAndCenter(
      zoom || this.map.getZoom(),
      [longitude, latitude],
      false,
      760,
    )
  }

  flyTo(longitude: number, latitude: number, zoom: number, rotation = 0) {
    this.suppressViewEventsUntil = Date.now() + 2300
    this.map.setZoomAndCenter(zoom, [longitude, latitude], false, 1500)
    this.map.setPitch?.(46, false, 1500)
    this.map.setRotation?.(rotation, false, 1500)
  }

  focusMemory(
    longitude: number,
    latitude: number,
    type: MemoryMapItem['type'],
  ) {
    const zoom = type === 'photo' ? 17.6 : 16.8
    this.suppressViewEventsUntil = Date.now() + 1900
    this.map.setZoomAndCenter(zoom, [longitude, latitude], false, 980)
    this.map.setPitch?.(48, false, 980)
    this.map.setRotation?.(0, false, 980)
  }

  fitBounds(bounds: MapBounds) {
    this.suppressViewEventsUntil = Date.now() + 1200
    this.map.setBounds(
      new this.AMap.Bounds(
        [normalizeLongitude(bounds.west), bounds.south],
        [normalizeLongitude(bounds.east), bounds.north],
      ),
      false,
      [60, 60, 60, 60],
    )
  }

  setItems(items: MapMarkerItem[], selectedId?: string) {
    const nextSelectedId = selectedId || ''
    const grouped = new Map<string, MapMarkerItem[]>()
    for (const item of items) {
      const key =
        item.kind === 'cluster'
          ? `cluster:${item.id}`
          : `point:${item.longitude.toFixed(6)}:${item.latitude.toFixed(6)}`
      const group = grouped.get(key) || []
      group.push(item)
      grouped.set(key, group)
    }

    for (const [key, group] of this.markerGroups) {
      if (grouped.has(key)) continue
      this.map.remove(group.marker)
      this.markerGroups.delete(key)
    }

    this.markerItems.clear()
    this.markerById.clear()
    for (const item of items) {
      this.markerItems.set(item.id, item)
    }

    for (const [key, groupItems] of grouped) {
      const activeItem =
        groupItems.find((item) => item.id === nextSelectedId) || groupItems[0]
      const isSelected = groupItems.some((item) => item.id === nextSelectedId)
      const signature = groupItems
        .map(
          (item) =>
            `${item.id}:${item.kind === 'cluster' ? item.count : item.thumbnail || ''}`,
        )
        .join('|')
      const zIndex = isSelected
        ? 300
        : activeItem.kind === 'cluster'
          ? 180
          : groupItems.length > 1
            ? 160
            : 120
      let group = this.markerGroups.get(key)
      if (!group) {
        const marker = new this.AMap.Marker({
          position: [activeItem.longitude, activeItem.latitude],
          content: markerHtml(activeItem, isSelected, groupItems),
          anchor: 'center',
          zIndex,
        })
        marker.on('click', () => {
          const current = this.markerGroups.get(key)?.items || []
          if (!current.length) return
          const selectedIndex = current.findIndex(
            (item) => item.id === this.selectedId,
          )
          const next = current[(selectedIndex + 1) % current.length]
          this.selectHandler(next)
        })
        group = { marker, items: groupItems, signature, selected: isSelected }
        this.markerGroups.set(key, group)
        this.map.add(marker)
      } else {
        const contentChanged =
          group.signature !== signature || group.selected !== isSelected
        group.items = groupItems
        group.signature = signature
        group.selected = isSelected
        if (contentChanged)
          group.marker.setContent(
            markerHtml(activeItem, isSelected, groupItems),
          )
        if (typeof group.marker.setzIndex === 'function')
          group.marker.setzIndex(zIndex)
        else group.marker.setOptions?.({ zIndex })
      }
      for (const item of groupItems) this.markerById.set(item.id, group.marker)
    }

    this.markers = [...this.markerGroups.values()].map((group) => group.marker)
    this.selectedId = nextSelectedId
  }

  setPath(points: Array<{ longitude: number; latitude: number }>) {
    if (this.pathLine) this.map.remove(this.pathLine)
    this.pathLine = null
    if (points.length < 2) return
    this.pathLine = new this.AMap.Polyline({
      path: points.map((point) => [point.longitude, point.latitude]),
      strokeColor: '#d69a3a',
      strokeWeight: 5,
      strokeOpacity: 0.82,
      lineJoin: 'round',
      lineCap: 'round',
      showDir: true,
      zIndex: 80,
    })
    this.map.add(this.pathLine)
  }

  onViewChange(handler: () => void) {
    this.viewHandler = handler
  }
  onSelect(handler: (item: MapMarkerItem) => void) {
    this.selectHandler = handler
  }
}

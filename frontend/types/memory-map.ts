export type MapMemoryType = 'moment' | 'album' | 'photo'

export type MemoryMapItem = {
  id: string
  kind: 'memory'
  type: MapMemoryType
  title: string
  excerpt?: string | null
  occurredAt?: string | null
  href: string
  thumbnail?: string | null
  longitude: number
  latitude: number
  precision: 'exact' | 'place' | 'city' | 'province'
  placeName: string
  placeSlug?: string
}

export type MemoryMapCluster = {
  id: string
  kind: 'cluster'
  longitude: number
  latitude: number
  count: number
  types: Record<MapMemoryType, number>
  bounds: { west: number; south: number; east: number; north: number }
  sampleIds: string[]
}

export type MemoryMapResult = {
  items: Array<MemoryMapItem | MemoryMapCluster>
  totalMemories: number
  returned: number
  truncated: boolean
  places: Array<{ slug: string; name: string }>
}

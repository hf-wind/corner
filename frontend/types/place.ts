export type MapLocation = { longitude: number; latitude: number }

export type Place = {
  id: string
  name: string
  slug: string
  address?: string | null
  city?: string | null
  province?: string | null
  country?: string | null
  type?: string
  momentCount?: number
  mapLocation?: MapLocation
}

export type PlaceCandidate = Omit<Place, 'id' | 'slug'> & {
  providerId?: string
  mapLocation: MapLocation
}

export type PublicLocation = {
  name: string
  slug?: string
  city?: string
  province?: string
  country?: string
  latitude?: number
  longitude?: number
  precision: 'exact' | 'place' | 'city' | 'province'
}

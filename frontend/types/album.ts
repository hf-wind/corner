import type { Place } from './place'

export type AlbumMedia = {
  id: string
  path: string
  originalPath?: string | null
  originalName?: string | null
  width?: number | null
  height?: number | null
}

export type AlbumItem = {
  id?: string
  mediaId: string
  sort: number
  caption?: string | null
  happenedAt?: string | null
  placeId?: string | null
  place?: Place | null
  momentId?: string | null
  locationVisibility: 'public' | 'blurred' | 'private'
  locationPrecision: 'exact' | 'place' | 'city' | 'province'
  locationSource?: 'manual' | 'exif' | 'map' | 'imported' | null
  locationExactConfirmedAt?: string | null
  media: AlbumMedia
  metadata?: any
}

export type Album = {
  id: string
  title: string
  slug: string
  description?: string | null
  status?: 'draft' | 'published'
  coverMediaId?: string | null
  cover?: AlbumMedia | null
  coverMedia?: AlbumMedia | null
  happenedAt?: string | null
  placeId?: string | null
  place?: Place | null
  publicLocation?: any
  locationVisibility?: 'public' | 'blurred' | 'private'
  locationPrecision?: 'exact' | 'place' | 'city' | 'province'
  locationExactConfirmedAt?: string | null
  publishedAt?: string | null
  itemCount?: number
  items?: AlbumItem[]
}

import type { Place, PublicLocation } from './place'

export type LibraryType = 'book' | 'film'
export type LibraryPublishStatus = 'draft' | 'published' | 'private'

export interface LibraryItem {
  id: string
  type: LibraryType
  title: string
  originalTitle?: string | null
  slug: string
  coverImage?: string | null
  creator?: string | null
  summary?: string | null
  reflection?: string | null
  highlights: string[]
  quotes: string[]
  genres: string[]
  cast: string[]
  publishStatus: LibraryPublishStatus
  needsPublish?: boolean
  progressStatus?: string | null
  rating?: number | null
  rank?: number | null
  recommended: boolean
  experienceDate?: string | null
  placeId?: string | null
  place?: Place | null
  locationVisibility?: 'public' | 'blurred' | 'private'
  locationPrecision?: 'exact' | 'place' | 'city' | 'province'
  locationSource?: 'manual' | 'map' | 'exif' | 'imported' | null
  locationExactConfirmedAt?: string | null
  publicLocation?: PublicLocation | null
  releaseYear?: number | null
  country?: string | null
  language?: string | null
  director?: string | null
  runtimeMinutes?: number | null
  episodeCount?: number | null
  platform?: string | null
  viewCount: number
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
}

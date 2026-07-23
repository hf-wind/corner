const UNSPLASH_HOST = 'images.unsplash.com'

export function getDisplayImageUrl(
  source: string | undefined,
  width: number,
  height: number,
  quality = 75,
) {
  if (!source) return ''

  try {
    const url = new URL(source)
    if (url.hostname !== UNSPLASH_HOST) return source

    url.searchParams.set('auto', 'format')
    url.searchParams.set('fit', 'crop')
    url.searchParams.set('w', String(width))
    url.searchParams.set('h', String(height))
    url.searchParams.set('q', String(quality))
    return url.toString()
  } catch {
    // relative path (e.g. /uploads/...) — resolve via API base
    const config = useRuntimeConfig()
    const base = (config.public.apiBase as string).replace(/\/api\/?$/, '')
    if (source.startsWith('/')) return `${base}${source}`
    if (source.startsWith('~/')) return source
    return `${base}/${source}`
  }
}

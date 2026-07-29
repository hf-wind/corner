export function useMediaUrl() {
  const config = useRuntimeConfig()
  const imageBase = computed(() => {
    const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')
    // In development /api is proxied by Vite, while production uses the same
    // origin behind nginx. Uploaded files live beside that API prefix.
    if (!apiBase || apiBase === '/api') return ''
    return apiBase.replace(/\/api\/?$/, '')
  })

  function mediaUrl(path?: string | null) {
    if (!path) return ''
    if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path
    const normalized = path.startsWith('/') ? path : `/${path}`
    return `${imageBase.value}${normalized}`
  }

  return { imageBase, mediaUrl }
}

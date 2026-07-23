export function useMediaUrl() {
  const config = useRuntimeConfig()
  const imageBase = computed(() => (config.public.apiBase as string).replace(/\/api\/?$/, ''))

  function mediaUrl(path?: string | null) {
    if (!path) return ''
    if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path
    if (path.startsWith('/')) return `${imageBase.value}${path}`
    return `${imageBase.value}/${path}`
  }

  return { imageBase, mediaUrl }
}

const DEFAULT_SITE_TITLE = '风隅随笔'
const DEFAULT_SITE_DESCRIPTION = '听风于隅，漫写人间'

let loadPromise: Promise<void> | null = null

export function useSiteSettings() {
  const siteTitle = useState('site-title', () => DEFAULT_SITE_TITLE)
  const siteDescription = useState('site-description', () => DEFAULT_SITE_DESCRIPTION)
  const loaded = useState('site-settings-loaded', () => false)

  async function loadSiteSettings() {
    if (loaded.value) return
    if (loadPromise) return loadPromise

    const api = useApi()
    loadPromise = api.get<Record<string, unknown>>('/settings/site').then((settings) => {
      const title = settings?.site_title
      const description = settings?.site_description
      if (typeof title === 'string' && title.trim()) siteTitle.value = title.trim()
      if (typeof description === 'string' && description.trim()) siteDescription.value = description.trim()
      loaded.value = true
    }).catch(() => {
      // Defaults keep the public site usable while the API is unavailable.
    }).finally(() => {
      loadPromise = null
    })

    return loadPromise
  }

  function updateSiteSetting(key: 'site_title' | 'site_description', value: string) {
    const normalized = value.trim()
    if (!normalized) return
    if (key === 'site_title') siteTitle.value = normalized
    else siteDescription.value = normalized
  }

  return {
    siteTitle,
    siteDescription,
    loadSiteSettings,
    updateSiteSetting,
  }
}

function envEnabled(value: string | undefined, fallback = true) {
  if (value === undefined || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

export function useFeatureFlags() {
  const circleEnabled = useState('feature-circle-enabled', () => true)
  const loaded = useState('feature-circle-loaded', () => false)
  async function loadCircleFeature() {
    if (loaded.value) return
    try {
      const result = await useApi().get<{ enabled?: boolean }>('/circle/status')
      circleEnabled.value = result?.enabled !== false
    } catch {
      // Keep the menu visible when the status endpoint is unavailable.
    } finally {
      loaded.value = true
    }
  }
  return {
    albumsEnabled: envEnabled(import.meta.env.VITE_FEATURE_ALBUMS_ENABLED, true),
    mapEnabled: envEnabled(import.meta.env.VITE_FEATURE_MAP_ENABLED, true),
    placesEnabled: envEnabled(import.meta.env.VITE_FEATURE_PLACES_ENABLED, true),
    constellationEnabled: envEnabled(import.meta.env.VITE_FEATURE_CONSTELLATION_ENABLED, true),
    storiesEnabled: envEnabled(import.meta.env.VITE_FEATURE_STORIES_ENABLED, false),
    footprintsEnabled: envEnabled(import.meta.env.VITE_FEATURE_FOOTPRINTS_ENABLED, true),
    guestbookEnabled: envEnabled(import.meta.env.VITE_FEATURE_GUESTBOOK_ENABLED, true),
    circleEnabled,
    loadCircleFeature,
  }
}

function envEnabled(value: string | undefined, fallback = true) {
  if (value === undefined || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

export function useFeatureFlags() {
  return {
    albumsEnabled: envEnabled(import.meta.env.VITE_FEATURE_ALBUMS_ENABLED, true),
    mapEnabled: envEnabled(import.meta.env.VITE_FEATURE_MAP_ENABLED, true),
    placesEnabled: envEnabled(import.meta.env.VITE_FEATURE_PLACES_ENABLED, true),
    constellationEnabled: envEnabled(import.meta.env.VITE_FEATURE_CONSTELLATION_ENABLED, true),
    storiesEnabled: envEnabled(import.meta.env.VITE_FEATURE_STORIES_ENABLED, false),
  }
}

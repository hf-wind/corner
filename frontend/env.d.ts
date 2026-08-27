/// <reference types="vite/client" />

declare module 'virtual:app-icons' {
  import type { IconifyIcon } from '@iconify/types'
  const icons: Record<string, IconifyIcon>
  export default icons
}

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_API_PROXY_TARGET?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_TURNSTILE_SITE_KEY?: string
  readonly VITE_TURNSTILE_ENABLED?: string
  readonly VITE_AMAP_WEB_KEY?: string
  readonly VITE_AMAP_SECURITY_CODE?: string
  readonly VITE_FEATURE_ALBUMS_ENABLED?: string
  readonly VITE_FEATURE_MAP_ENABLED?: string
  readonly VITE_FEATURE_PLACES_ENABLED?: string
  readonly VITE_FEATURE_CONSTELLATION_ENABLED?: string
  readonly VITE_FEATURE_STORIES_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly client: boolean
  readonly server: boolean
}

declare module 'vue-router' {
  interface RouteMeta {
    layout?: 'default' | 'admin' | 'welcome' | false
    requiresAuth?: boolean
  }
}

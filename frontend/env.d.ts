/// <reference types="vite/client" />

declare module 'virtual:app-icons' {
  import type { IconifyIcon } from '@iconify/types'
  const icons: Record<string, IconifyIcon>
  export default icons
}

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_API_PROXY_TARGET?: string
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

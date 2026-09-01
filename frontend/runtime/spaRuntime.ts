import { ref, type Ref } from 'vue'
import type { RouteLocationRaw, Router } from 'vue-router'

const sharedValues = new Map<string, Ref<unknown>>()
let activeRouter: Router | undefined

export function setSpaRouter(router: Router) {
  activeRouter = router
}

export function useSharedState<T>(key: string, init: () => T): Ref<T>
export function useSharedState<T = undefined>(key: string): Ref<T | undefined>
export function useSharedState<T>(key: string, init?: () => T): Ref<T | undefined> {
  if (!sharedValues.has(key)) sharedValues.set(key, ref() as Ref<unknown>)
  const value = sharedValues.get(key) as Ref<T | undefined>
  if (value.value === undefined && init) value.value = init()
  return value
}

export function useAppConfig() {
  const configuredBase = String(import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
  return {
    public: {
      apiBase: configuredBase || '/api',
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
  }
}

export function routerNavigate(to: RouteLocationRaw, options: { replace?: boolean } = {}) {
  if (!activeRouter) throw new Error('Router is not ready')
  return options.replace ? activeRouter.replace(to) : activeRouter.push(to)
}

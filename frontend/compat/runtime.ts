import { ref, type Ref } from 'vue'
import type { RouteLocationRaw, Router } from 'vue-router'

const state = new Map<string, Ref<unknown>>()
let activeRouter: Router | undefined

export function setCompatRouter(router: Router) {
  activeRouter = router
}

export function useState<T>(key: string, init: () => T): Ref<T>
export function useState<T = undefined>(key: string): Ref<T | undefined>
export function useState<T>(key: string, init?: () => T): Ref<T | undefined> {
  if (!state.has(key)) state.set(key, ref() as Ref<unknown>)
  const value = state.get(key) as Ref<T | undefined>
  if (value.value === undefined && init) value.value = init()
  return value
}

export function useRuntimeConfig() {
  const configuredBase = String(import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
  return {
    public: {
      apiBase: configuredBase || '/api',
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    }
  }
}

export function navigateTo(to: RouteLocationRaw, options: { replace?: boolean } = {}) {
  if (!activeRouter) throw new Error('Router is not ready')
  return options.replace ? activeRouter.replace(to) : activeRouter.push(to)
}

export function definePageMeta(_meta: Record<string, unknown>) {
  // Route metadata is declared centrally in router.ts.
}

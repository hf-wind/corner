export type AuthUser = {
  id: string
  username: string
  email?: string
  avatar?: string | null
  bio?: string | null
  role?: string
}

const USER_PATHS = ['/admin/profile', '/admin/messages']
const PROFILE_TTL = 5 * 60 * 1000
let refreshing: Promise<void> | null = null
let lastProfileRefreshAt = 0
let lastProfileToken: string | null = null

function storedToken() {
  return typeof window === 'undefined' ? null : String(useClientState().get('auth', 'token', '')) || null
}

function storedUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const value = useClientState().get('auth', 'user', null)
  return value && typeof value === 'object' ? value as AuthUser : null
}

export function useAuth() {
  const user = useSharedState<AuthUser | null>('auth-user', storedUser)
  const token = useSharedState<string | null>('auth-token', storedToken)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => {
    const role = String(user.value?.role || '').toLowerCase().trim()
    return role === 'admin'
  })

  function readStorage() {
    if (typeof window === 'undefined') return
    token.value = storedToken()
    user.value = storedUser()
  }

  async function refreshProfile(force = false) {
    if (typeof window === 'undefined') return
    readStorage()
    if (!token.value) return
    if (!force && lastProfileToken === token.value && Date.now() - lastProfileRefreshAt < PROFILE_TTL) return
    if (refreshing) return refreshing
    refreshing = (async () => {
      try {
        const api = useApi()
        const profile = await api.get<AuthUser & { role?: string }>('/auth/profile')
        if (!profile) return
        // Guard against race: session may have been cleared during the request
        if (!token.value) return
        setSession(token.value, {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          avatar: profile.avatar,
          bio: profile.bio,
          role: profile.role || 'user',
        })
        lastProfileToken = token.value
        lastProfileRefreshAt = Date.now()
      } catch {
        /* keep cached session */
      } finally {
        refreshing = null
      }
    })()
    return refreshing
  }

  function setSession(accessToken: string, nextUser: AuthUser) {
    token.value = accessToken
    user.value = nextUser
    if (typeof window !== 'undefined') {
      const state = useClientState()
      state.set('auth', 'token', accessToken)
      state.set('auth', 'user', nextUser)
    }
  }

  function clearSession() {
    token.value = null
    user.value = null
    lastProfileToken = null
    lastProfileRefreshAt = 0
    if (typeof window !== 'undefined') {
      try {
        const state = useClientState()
        state.remove('auth', 'token')
        state.remove('auth', 'user')
      } catch {
        // ignore storage errors
      }
    }
  }

  function panelHome() {
    return isAdmin.value ? '/admin' : '/home'
  }

  function lastPublicPath() {
    if (typeof window === 'undefined') return '/home'
    const target = String(useClientState().getSession('lastPublicRoute', ''))
    if (!target.startsWith('/') || target.startsWith('//')) return '/home'
    if (/^\/(?:admin|login|register)(?:\/|$)/.test(target)) return '/home'
    return target
  }

  function isUserAreaPath(path: string) {
    return USER_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
  }

  function canAccessAdminPath(path: string) {
    if (!path.startsWith('/admin')) return true
    if (isAdmin.value) return true
    return isUserAreaPath(path)
  }

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    readStorage,
    refreshProfile,
    setSession,
    clearSession,
    panelHome,
    lastPublicPath,
    isUserAreaPath,
    canAccessAdminPath,
  }
}

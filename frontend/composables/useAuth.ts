export type AuthUser = {
  id: string
  username: string
  email?: string
  avatar?: string | null
  bio?: string | null
  role?: string
}

const USER_PATHS = ['/admin/profile', '/admin/messages']

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const token = useState<string | null>('auth-token', () => null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => {
    const role = String(user.value?.role || '').toLowerCase().trim()
    return role === 'admin'
  })

  function readStorage() {
    if (!import.meta.client) return
    token.value = localStorage.getItem('token')
    try {
      user.value = JSON.parse(localStorage.getItem('user') ?? 'null') as AuthUser | null
    } catch {
      user.value = null
    }
  }

  let refreshing: Promise<void> | null = null
  async function refreshProfile() {
    if (!import.meta.client) return
    readStorage()
    if (!token.value) return
    if (refreshing) return refreshing
    refreshing = (async () => {
      try {
        const api = useApi()
        const profile = await api.get<AuthUser & { role?: string }>('/auth/profile')
        if (!profile) return
        setSession(token.value!, {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          avatar: profile.avatar,
          bio: profile.bio,
          role: profile.role || 'user',
        })
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
    if (import.meta.client) {
      localStorage.setItem('token', accessToken)
      localStorage.setItem('user', JSON.stringify(nextUser))
    }
  }

  function clearSession() {
    token.value = null
    user.value = null
    if (import.meta.client) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  function panelHome() {
    return isAdmin.value ? '/admin' : '/admin/profile'
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
    isUserAreaPath,
    canAccessAdminPath,
  }
}

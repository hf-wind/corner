type JsonRecord = Record<string, unknown>

const KEYS = {
  visitor: 'corner:visitor',
  site: 'corner:site',
  ai: 'corner:ai',
  auth: 'corner:auth',
  session: 'corner:session',
} as const

const legacy = {
  visitorId: 'corner:visitor:id',
  nickname: 'corner:visitor:nickname',
  aiGuestId: 'corner:ai:guest-id',
  theme: 'theme',
  fontPreset: 'font-preset',
  sidebar: 'corner-admin-sidebar-collapsed',
  token: 'token',
  user: 'user',
} as const

function read(key: string): JsonRecord {
  if (typeof window === 'undefined') return {}
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

function readSession(key: string): JsonRecord {
  if (typeof window === 'undefined') return {}
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch { return {} }
}

function write(key: string, value: JsonRecord) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value))
}

function migrate() {
  if (typeof window === 'undefined') return
  const visitor = read(KEYS.visitor)
  const site = read(KEYS.site)
  const ai = read(KEYS.ai)
  const auth = read(KEYS.auth)
  const session = readSession(KEYS.session)
  const visitorId = localStorage.getItem(legacy.visitorId)
  const nickname = localStorage.getItem(legacy.nickname)
  const aiGuestId = localStorage.getItem(legacy.aiGuestId)
  const theme = localStorage.getItem(legacy.theme)
  const sidebar = localStorage.getItem(legacy.sidebar)
  const fontPreset = localStorage.getItem(legacy.fontPreset)
  const token = localStorage.getItem(legacy.token)
  const storedUser = localStorage.getItem(legacy.user)
  if (!session.id) session.id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  if (visitorId && !visitor.visitorId) visitor.visitorId = visitorId
  if (nickname && !visitor.nickname) visitor.nickname = nickname
  if (aiGuestId && !ai.guestId) ai.guestId = aiGuestId
  if (theme && !site.theme) site.theme = theme
  if (sidebar !== null && site.adminSidebarCollapsed === undefined) site.adminSidebarCollapsed = sidebar === '1'
  if (fontPreset && !site.fontPreset) site.fontPreset = fontPreset
  if (token && !auth.token) auth.token = token
  if (storedUser && !auth.user) { try { auth.user = JSON.parse(storedUser) } catch { /* ignore malformed legacy user */ } }
  write(KEYS.visitor, visitor)
  write(KEYS.site, site)
  write(KEYS.ai, ai)
  write(KEYS.auth, auth)
  write(KEYS.session, session)
  ;[legacy.visitorId, legacy.nickname, legacy.aiGuestId, legacy.theme, legacy.fontPreset, legacy.sidebar, legacy.token, legacy.user, 'corner:circle:reading'].forEach((key) => localStorage.removeItem(key))
}

let migrated = false
export function useClientState() {
  if (!migrated) { migrate(); migrated = true }
  return {
    keys: KEYS,
    get(scope: keyof typeof KEYS, key: string, fallback = '') {
      const value = read(KEYS[scope])[key]
      return value === undefined || value === null ? fallback : value
    },
    set(scope: keyof typeof KEYS, key: string, value: unknown) {
      const data = read(KEYS[scope]); data[key] = value; write(KEYS[scope], data)
    },
    remove(scope: keyof typeof KEYS, key: string) {
      const data = read(KEYS[scope]); delete data[key]; write(KEYS[scope], data)
    },
    getSession(key: string, fallback = '') {
      if (typeof window === 'undefined') return fallback
      const value = readSession(KEYS.session)[key]
      return value === undefined || value === null ? fallback : value
    },
    setSession(key: string, value: unknown) {
      if (typeof window === 'undefined') return
      const data = readSession(KEYS.session); data[key] = value; sessionStorage.setItem(KEYS.session, JSON.stringify(data))
    },
    removeSession(key: string) {
      if (typeof window === 'undefined') return
      const data = readSession(KEYS.session); delete data[key]; sessionStorage.setItem(KEYS.session, JSON.stringify(data))
    },
  }
}

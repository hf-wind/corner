export type AppNotification = {
  id: string
  title: string
  type: string
  content?: string | null
  link?: string | null
  read: boolean
  createdAt: string
}

type NotificationEventPayload =
  | { type: 'notification'; data: AppNotification }
  | { type: 'unread-count'; data: { count: number } }

let eventSource: EventSource | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let connectedToken: string | null = null

export function useNotifications() {
  const api = useApi()
  const config = useRuntimeConfig()
  const { token, isLoggedIn } = useAuth()
  const unreadCount = useState<number>('notifications-unread-count', () => 0)
  const latestItems = useState<AppNotification[]>('notifications-latest-items', () => [])
  const latestLoading = useState<boolean>('notifications-latest-loading', () => false)

  function applyRealtimePayload(payload: NotificationEventPayload) {
    if (payload.type === 'unread-count') {
      unreadCount.value = Math.max(0, Number(payload.data?.count) || 0)
      return
    }

    if (payload.type === 'notification' && payload.data?.id) {
      const existing = latestItems.value.findIndex(item => item.id === payload.data.id)
      if (existing >= 0) latestItems.value.splice(existing, 1)
      latestItems.value.unshift(payload.data)
      latestItems.value = latestItems.value.slice(0, 8)
      if (!payload.data.read && existing < 0) unreadCount.value += 1
    }
  }

  function parseEvent(event: MessageEvent, forcedType?: NotificationEventPayload['type']) {
    try {
      const parsed = JSON.parse(event.data)
      applyRealtimePayload(forcedType ? { type: forcedType, data: parsed } as NotificationEventPayload : parsed)
    } catch { /* ignore malformed keepalive events */ }
  }

  async function loadLatest() {
    if (!isLoggedIn.value) return
    latestLoading.value = true
    try {
      const response = await api.get<{ items?: AppNotification[] }>('/notifications', { limit: 8 })
      latestItems.value = response.items ?? []
    } catch {
      // 限流或短暂网络失败时保留已有通知，避免轮询产生未处理异常。
    } finally {
      latestLoading.value = false
    }
  }

  async function refreshUnread() {
    if (!isLoggedIn.value) {
      unreadCount.value = 0
      return
    }
    try {
      const response = await api.get<{ count: number }>('/notifications/unread-count')
      unreadCount.value = Math.max(0, Number(response.count) || 0)
    } catch { /* the realtime connection will retry */ }
  }

  function disconnectRealtime(clearState = false) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    eventSource?.close()
    eventSource = null
    connectedToken = null
    if (clearState) {
      unreadCount.value = 0
      latestItems.value = []
    }
  }

  function connectRealtime() {
    const accessToken = token.value
    if (!isLoggedIn.value || !accessToken) {
      disconnectRealtime(true)
      return
    }
    if (eventSource && connectedToken === accessToken) return

    disconnectRealtime()
    connectedToken = accessToken
    eventSource = new EventSource(
      `${config.public.apiBase}/notifications/stream?token=${encodeURIComponent(accessToken)}`,
    )
    eventSource.onmessage = event => parseEvent(event)
    // Compatibility with older servers that used the payload type as the SSE event name.
    eventSource.addEventListener('notification', event => parseEvent(event as MessageEvent, 'notification'))
    eventSource.addEventListener('unread-count', event => parseEvent(event as MessageEvent, 'unread-count'))
    eventSource.onopen = () => { void refreshUnread() }
    eventSource.onerror = () => {
      eventSource?.close()
      eventSource = null
      connectedToken = null
      if (!isLoggedIn.value || reconnectTimer) return
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connectRealtime()
      }, 3000)
    }
  }

  async function markNotificationRead(id: string) {
    await api.post(`/notifications/${id}/read`)
    const item = latestItems.value.find(entry => entry.id === id)
    if (item && !item.read) item.read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  async function markAllNotificationsRead() {
    await api.post('/notifications/read-all')
    latestItems.value.forEach(item => { item.read = true })
    unreadCount.value = 0
  }

  async function removeNotification(id: string, wasUnread = false) {
    await api.delete(`/notifications/${id}`)
    latestItems.value = latestItems.value.filter(item => item.id !== id)
    if (wasUnread) unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  return {
    unreadCount,
    latestItems,
    latestLoading,
    loadLatest,
    refreshUnread,
    connectRealtime,
    disconnectRealtime,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
  }
}

<template>
  <div v-if="isLoggedIn" class="notif-bell-wrap" ref="bellRef">
    <button class="notif-bell" type="button" @click="togglePanel" title="通知">
      <Icon name="ph:bell-bold" />
      <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>
    <Teleport to="body">
      <Transition name="notif-panel">
        <div v-if="panelOpen" class="notif-panel" :style="panelStyle">
          <div class="notif-header">
            <span class="notif-title">通知</span>
            <button
              v-if="unreadCount > 0"
              class="notif-read-all"
              type="button"
              @click="markAllRead"
            >全部已读</button>
          </div>
        <div class="notif-list">
          <div v-if="loading" class="notif-loading">
            <div class="notif-spinner" />
          </div>
          <div v-else-if="items.length === 0" class="notif-empty">暂无通知</div>
          <div
            v-for="item in items"
            :key="item.id"
            class="notif-item"
            :class="{ unread: !item.read }"
            @click="readItem(item)"
          >
            <div class="notif-item-icon">
              <Icon v-if="item.type === 'comment'" name="ph:chat-circle-text-bold" />
              <Icon v-else-if="item.type === 'reply'" name="ph:arrow-bend-double-up-left-bold" />
              <Icon v-else-if="item.type === 'like'" name="ph:heart-bold" />
              <Icon v-else name="ph:bell-bold" />
            </div>
            <div class="notif-item-body">
              <div class="notif-item-title">{{ item.title }}</div>
              <div v-if="item.content" class="notif-item-text">{{ item.content }}</div>
              <div class="notif-item-time">{{ formatTime(item.createdAt) }}</div>
            </div>
          </div>
        </div>
        <NuxtLink v-if="items.length > 0" to="/admin/messages" class="notif-footer" @click="panelOpen = false">
          查看全部
        </NuxtLink>
      </div>
    </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const { isLoggedIn } = useAuth()
const api = useApi()

const bellRef = ref<HTMLElement>()
const panelOpen = ref(false)
const loading = ref(false)
const unreadCount = ref(0)
const items = ref<any[]>([])

let pollTimer: ReturnType<typeof setInterval> | null = null

function onClickOutside(e: MouseEvent) {
  if (bellRef.value && !bellRef.value.contains(e.target as Node)) {
    panelOpen.value = false
  }
}

function togglePanel() {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value) loadNotifications()
}

const panelStyle = computed(() => {
  if (!bellRef.value) return {}
  const rect = bellRef.value.getBoundingClientRect()
  return {
    position: 'fixed',
    bottom: `${window.innerHeight - rect.top + 8}px`,
    right: `${window.innerWidth - rect.right}px`,
  }
})

async function loadNotifications() {
  loading.value = true
  try {
    const res = await api.get<any>('/notifications', { limit: 8 })
    items.value = res.items ?? []
  } catch { /* ignore */ }
  loading.value = false
}

async function fetchUnreadCount() {
  if (!isLoggedIn.value) return
  try {
    const res = await api.get<{ count: number }>('/notifications/unread-count')
    unreadCount.value = res.count ?? 0
  } catch { /* ignore */ }
}

async function markAllRead() {
  try {
    await api.post('/notifications/read-all')
    items.value.forEach(i => i.read = true)
    unreadCount.value = 0
  } catch { /* ignore */ }
}

async function readItem(item: any) {
  if (!item.read) {
    try {
      await api.post(`/notifications/${item.id}/read`)
      item.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch { /* ignore */ }
  }
  if (item.link) {
    panelOpen.value = false
    navigateTo(item.link)
  }
}

function formatTime(date: string) {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(() => {
  fetchUnreadCount()
  pollTimer = setInterval(fetchUnreadCount, 30000)
  document.addEventListener('click', onClickOutside, true)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('click', onClickOutside, true)
})
</script>

<style scoped>
.notif-bell-wrap {
  position: relative;
}

.notif-bell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--c-text-2);
  cursor: pointer;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.15s;
  position: relative;
}

.notif-bell:hover {
  background: var(--c-bg-soft);
  color: var(--c-text);
}

.notif-badge {
  position: absolute;
  top: 2px;
  right: 1px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  pointer-events: none;
}

.notif-panel {
  position: fixed;
  width: 300px;
  max-height: 380px;
  background: var(--c-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 32px var(--ld-shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 9998;
}

.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.notif-title {
  font-size: 13px;
  font-weight: 650;
  color: var(--c-text);
}

.notif-read-all {
  font-size: 12px;
  color: var(--c-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  transition: background 0.15s;
}

.notif-read-all:hover {
  background: var(--c-primary-soft);
}

.notif-list {
  flex: 1;
  overflow-y: auto;
  max-height: 280px;
}

.notif-empty {
  text-align: center;
  padding: 24px 0;
  color: var(--c-text-3);
  font-size: 13px;
}

.notif-loading {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.notif-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--c-bg-3);
  border-top-color: var(--c-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.notif-item {
  display: flex;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.notif-item:hover {
  background: var(--c-bg-1);
}

.notif-item.unread {
  background: var(--c-primary-soft);
}

.notif-item.unread:hover {
  background: hsl(220deg 100% 60% / 18%);
}

.notif-item-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--c-bg-2);
  color: var(--c-primary);
  font-size: 14px;
}

.notif-item-body {
  flex: 1;
  min-width: 0;
}

.notif-item-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text);
  line-height: 1.4;
}

.notif-item-text {
  font-size: 11px;
  color: var(--c-text-2);
  line-height: 1.4;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notif-item-time {
  font-size: 11px;
  color: var(--c-text-3);
  margin-top: 2px;
}

.notif-footer {
  display: block;
  text-align: center;
  padding: 10px;
  font-size: 12px;
  color: var(--c-primary);
  border-top: 1px solid var(--border);
  text-decoration: none;
  transition: background 0.15s;
}

.notif-footer:hover {
  background: var(--c-bg-1);
}

.notif-panel-enter-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.notif-panel-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.notif-panel-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}

.notif-panel-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

<template>
  <div v-if="isLoggedIn" class="notif-bell-wrap" ref="bellRef">
    <button class="notif-bell" type="button" @click="togglePanel" title="通知">
      <Icon name="ph:bell-bold" />
      <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>
    <Teleport to="body">
      <Transition name="notif-backdrop">
        <button
          v-if="panelOpen"
          type="button"
          class="notif-backdrop"
          aria-label="关闭通知"
          @click="panelOpen = false"
        />
      </Transition>
      <Transition name="notif-panel">
        <section v-if="panelOpen" ref="panelRef" class="notif-panel" :style="panelStyle" role="dialog" aria-label="消息通知">
          <div class="notif-header">
            <div class="notif-heading">
              <span class="notif-heading-icon"><Icon name="ph:bell-ringing-bold" /></span>
              <div>
                <span class="notif-title">消息通知</span>
                <span class="notif-subtitle">{{ unreadCount > 0 ? `${unreadCount} 条未读消息` : '所有消息都已读' }}</span>
              </div>
            </div>
            <div class="notif-header-actions">
              <button
                v-if="unreadCount > 0"
                class="notif-read-all"
                type="button"
                @click="markAllRead"
              >全部已读</button>
              <button type="button" class="notif-close" aria-label="关闭通知" @click="panelOpen = false">
                <Icon name="ph:x-bold" />
              </button>
            </div>
          </div>
        <div class="notif-list">
          <div v-if="loading" class="notif-loading">
            <div class="notif-spinner" />
          </div>
          <div v-else-if="items.length === 0" class="notif-empty">
            <span class="notif-empty-icon"><Icon name="ph:tray-bold" /></span>
            <strong>暂时没有新消息</strong>
            <span>有新动态时会在这里提醒你</span>
          </div>
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
      </section>
    </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const { isLoggedIn } = useAuth()
const {
  unreadCount,
  latestItems: items,
  latestLoading: loading,
  loadLatest,
  markNotificationRead,
  markAllNotificationsRead,
} = useNotifications()

const bellRef = ref<HTMLElement>()
const panelRef = ref<HTMLElement>()
const panelOpen = ref(false)
const panelPos = ref<{ position: string; top: string; left: string }>({ position: 'fixed', top: '0px', left: '0px' })
let onScroll: (() => void) | null = null
let onResize: (() => void) | null = null

function onClickOutside(e: MouseEvent) {
  if (bellRef.value && !bellRef.value.contains(e.target as Node) && !panelRef.value?.contains(e.target as Node)) {
    panelOpen.value = false
  }
}

function updatePanelPosition() {
  if (!bellRef.value) return
  const rect = bellRef.value.getBoundingClientRect()
  const panelWidth = Math.min(320, window.innerWidth - 24)
  const left = Math.min(Math.max(12, rect.right - panelWidth), window.innerWidth - panelWidth - 12)
  const panelHeight = panelRef.value?.getBoundingClientRect().height || 240
  const below = rect.bottom + 8
  const above = rect.top - panelHeight - 8
  const top = below + panelHeight <= window.innerHeight - 12 ? below : Math.max(12, above)
  panelPos.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
  }
}

function togglePanel() {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value) {
    updatePanelPosition()
    void loadLatest().finally(() => nextTick(updatePanelPosition))
    onScroll = () => updatePanelPosition()
    onResize = () => updatePanelPosition()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
  } else {
    stopPositionListeners()
  }
}

function stopPositionListeners() {
  if (onScroll) { window.removeEventListener('scroll', onScroll); onScroll = null }
  if (onResize) { window.removeEventListener('resize', onResize); onResize = null }
}

const panelStyle = computed(() => panelPos.value)

async function markAllRead() {
  try {
    await markAllNotificationsRead()
  } catch { /* ignore */ }
}

async function readItem(item: any) {
  if (!item.read) {
    try {
      await markNotificationRead(item.id)
    } catch { /* ignore */ }
  }
  panelOpen.value = false
  navigateTo({ path: '/admin/messages', query: { notification: item.id } })
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
  void loadLatest()
  document.addEventListener('click', onClickOutside, true)
})

onUnmounted(() => {
  stopPositionListeners()
  document.removeEventListener('click', onClickOutside, true)
})

watch(panelOpen, (v) => {
  if (!v) stopPositionListeners()
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
  width: min(320px, calc(100vw - 24px));
  max-height: min(380px, calc(100dvh - 24px));
  background: var(--c-bg);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: 0 22px 64px color-mix(in srgb, #000 22%, var(--ld-shadow));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 12020;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.notif-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 12019;
  padding: 0;
  border: 0;
  background: rgb(8 15 30 / 38%);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}

.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 15px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, var(--c-primary-soft), transparent 75%);
}

.notif-heading,
.notif-header-actions {
  display: flex;
  align-items: center;
}

.notif-heading {
  gap: 10px;
  min-width: 0;
}

.notif-heading-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 11px;
  color: #fff;
  background: linear-gradient(145deg, color-mix(in srgb, var(--c-primary) 76%, #fff), var(--c-primary));
  box-shadow: 0 7px 16px color-mix(in srgb, var(--c-primary) 25%, transparent);
}

.notif-heading > div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.notif-header-actions {
  gap: 5px;
}

.notif-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--c-text);
}

.notif-subtitle {
  margin-top: 2px;
  color: var(--c-text-3);
  font-size: 10px;
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

.notif-close {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  color: var(--c-text-3);
  background: transparent;
  cursor: pointer;
}

.notif-close:hover {
  color: var(--c-text);
  background: var(--c-bg-2);
}

.notif-list {
  flex: 1;
  overflow-y: auto;
  max-height: min(280px, calc(100dvh - 124px));
}

.notif-empty {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  text-align: center;
  padding: 28px 16px;
  color: var(--c-text-3);
  font-size: 11px;
}

.notif-empty strong {
  color: var(--c-text-2);
  font-size: 13px;
}

.notif-empty-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  margin-bottom: 4px;
  border-radius: 14px;
  color: var(--c-primary);
  background: var(--c-primary-soft);
  font-size: 20px;
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

.notif-backdrop-enter-active,
.notif-backdrop-leave-active {
  transition: opacity 0.18s ease;
}

.notif-backdrop-enter-from,
.notif-backdrop-leave-to {
  opacity: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .notif-backdrop {
    display: block;
  }

  .notif-panel {
    top: auto !important;
    right: max(12px, env(safe-area-inset-right));
    bottom: max(12px, env(safe-area-inset-bottom));
    left: max(12px, env(safe-area-inset-left)) !important;
    width: auto;
    max-height: min(72dvh, 560px);
    border-radius: 22px;
  }

  .notif-list {
    max-height: min(52dvh, 400px);
  }

  .notif-item {
    padding: 12px 14px;
  }
}
</style>

<template>
  <div class="messages-page">
    <a-card :bordered="false" class="section-card" size="small">
      <template #title>
        <div class="card-header">
          <span>我的消息</span>
          <a-space>
            <a-badge :count="unreadCount" :overflow-count="99">
              <a-button size="small" @click="filterType = 'unread'; loadNotifications()">未读</a-button>
            </a-badge>
            <a-button size="small" @click="filterType = 'all'; loadNotifications()">全部</a-button>
            <a-button size="small" @click="markAllRead" :disabled="unreadCount === 0">全部已读</a-button>
          </a-space>
        </div>
      </template>

      <a-spin :spinning="loading">
        <div v-if="notifications.length === 0" class="empty">
          <Icon name="ph:bell-slash-bold" class="empty-icon" />
          <div class="empty-title">暂无消息</div>
        </div>
        <div v-else class="notification-list">
          <div
            v-for="item in notifications"
            :key="item.id"
            class="notification-item"
            :class="{ unread: !item.read }"
            @click="handleClick(item)"
          >
            <div class="notification-icon">
              <Icon v-if="item.type === 'comment'" name="ph:chat-circle-text-bold" />
              <Icon v-else-if="item.type === 'reply'" name="ph:arrow-bend-left-down-bold" />
              <Icon v-else-if="item.type === 'like'" name="ph:heart-bold" />
              <Icon v-else name="ph:bell-bold" />
            </div>
            <div class="notification-content">
              <div class="notification-title">{{ item.title }}</div>
              <div class="notification-text">{{ item.content }}</div>
              <div class="notification-time">{{ formatTime(item.createdAt) }}</div>
            </div>
            <div class="notification-actions">
              <a-button v-if="!item.read" type="link" size="small" @click.stop="markRead(item)">标为已读</a-button>
              <a-button type="link" size="small" danger @click.stop="deleteNotification(item)">删除</a-button>
            </div>
          </div>
        </div>
        <div v-if="totalPages > 1" class="pagination-wrap">
          <a-pagination
            v-model:current="currentPage"
            :total="total"
            :pageSize="pageSize"
            size="small"
            @change="loadNotifications"
          />
        </div>
      </a-spin>
    </a-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const loading = ref(true)
const notifications = ref<any[]>([])
const unreadCount = ref(0)
const total = ref(0)
const totalPages = ref(0)
const currentPage = ref(1)
const pageSize = 20
const filterType = ref<'all' | 'unread'>('all')

onMounted(() => {
  loadNotifications()
  loadUnreadCount()
})

async function loadNotifications() {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, limit: pageSize }
    const res = await api.get<any>('/notifications', { params })
    let items = res.items || []
    if (filterType.value === 'unread') {
      items = items.filter((i: any) => !i.read)
    }
    notifications.value = items
    total.value = res.total || 0
    totalPages.value = res.totalPages || 0
  } catch (e: any) {
    console.error('加载消息失败:', e)
  }
  loading.value = false
}

async function loadUnreadCount() {
  try {
    const res = await api.get<any>('/notifications/unread-count')
    unreadCount.value = res.count || 0
  } catch {}
}

async function handleClick(item: any) {
  if (!item.read) {
    await markRead(item)
  }
  if (item.link) {
    navigateTo(item.link)
  }
}

async function markRead(item: any) {
  try {
    await api.post(`/notifications/${item.id}/read`)
    item.read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch {
    toast.error('操作失败')
  }
}

async function markAllRead() {
  try {
    await api.post('/notifications/read-all')
    notifications.value.forEach(i => i.read = true)
    unreadCount.value = 0
    toast.success('已全部标为已读')
  } catch {
    toast.error('操作失败')
  }
}

async function deleteNotification(item: any) {
  try {
    await api.delete(`/notifications/${item.id}`)
    notifications.value = notifications.value.filter(i => i.id !== item.id)
    if (!item.read) unreadCount.value = Math.max(0, unreadCount.value - 1)
    total.value--
  } catch {
    toast.error('删除失败')
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
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  return d.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.messages-page { max-width: 640px; }
.section-card { border-radius: 10px; }
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  text-align: center;
}
.empty-icon {
  font-size: 2.4rem;
  color: var(--c-text-3);
  margin-bottom: 12px;
}
.empty-title {
  font-size: 0.95rem;
  font-weight: 650;
  color: var(--c-text);
}
.notification-list {
  display: flex;
  flex-direction: column;
}
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--border, #f0f0f0);
  cursor: pointer;
  transition: background 0.15s;
}
.notification-item:hover {
  background: var(--c-bg-2, #f8f9fa);
}
.notification-item.unread {
  background: color-mix(in srgb, var(--c-primary, #5b8def) 5%, transparent);
}
.notification-item.unread:hover {
  background: color-mix(in srgb, var(--c-primary, #5b8def) 10%, transparent);
}
.notification-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  flex-shrink: 0;
  background: var(--c-bg-2, #f0f0f0);
  color: var(--c-primary, #5b8def);
}
.notification-content {
  flex: 1;
  min-width: 0;
}
.notification-title {
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--c-text);
}
.notification-text {
  margin-top: 4px;
  font-size: 0.82rem;
  color: var(--c-text-2, #666);
  line-height: 1.5;
}
.notification-time {
  margin-top: 4px;
  font-size: 0.72rem;
  color: var(--c-text-3, #999);
}
.notification-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}
.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 16px 0 8px;
}
</style>

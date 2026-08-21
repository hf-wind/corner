<template>
  <div class="messages-page admin-page-shell">
    <header class="admin-page-head"><div><span>ACCOUNT</span><h1>我的消息</h1><p>集中查看评论、回复、点赞和系统通知。</p></div></header>
    <div class="table-toolbar">
      <a-select v-model:value="filterType" style="width: 150px">
        <a-select-option value="all">全部消息</a-select-option>
        <a-select-option value="unread">未读消息</a-select-option>
      </a-select>
      <a-button type="primary" @click="applyFilter"><Icon name="ph:funnel-bold" /> 筛选</a-button>
      <a-button @click="resetFilter"><Icon name="ph:arrow-counter-clockwise-bold" /> 重置</a-button>
      <span class="toolbar-spacer" />
      <a-button @click="markAllRead" :disabled="unreadCount === 0"><Icon name="ph:checks-bold" /> 全部已读</a-button>
      <AdminRefreshButton :loading="loading" @click="loadNotifications" />
    </div>
    <div class="admin-table-shell">
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
              <Icon v-else-if="item.type === 'guestbook'" name="ph:note-pencil-bold" />
              <Icon v-else name="ph:bell-bold" />
            </div>
            <div class="notification-content">
              <div class="notification-title">{{ item.title }}</div>
              <div class="notification-text">{{ item.content }}</div>
              <div class="notification-time">{{ formatTime(item.createdAt) }}</div>
            </div>
            <div class="notification-actions">
              <a-button v-if="!item.read" type="link" size="small" @click.stop="markRead(item)"><Icon name="ph:check-bold" /> 标为已读</a-button>
              <a-button type="link" size="small" danger @click.stop="deleteNotification(item)"><Icon name="ph:trash-bold" /> 删除</a-button>
            </div>
          </div>
        </div>
        <AdminPagination v-model:current="currentPage" :total="total" :page-size="pageSize" :show-size-changer="false" @change="loadNotifications" />
      </a-spin>
    </div>

    <a-modal v-model:open="detail.open" :title="detail.item?.title || '消息详情'" width="min(560px, calc(100vw - 32px))">
      <div v-if="detail.item" class="message-detail">
        <div class="message-detail-meta">
          <span>{{ notificationTypeLabel(detail.item.type) }}</span>
          <time>{{ formatDetailTime(detail.item.createdAt) }}</time>
        </div>
        <p>{{ detail.item.content || '暂无详细内容' }}</p>
      </div>
      <template #footer>
        <a-button @click="detail.open = false"><Icon name="ph:x-bold" /> 关闭</a-button>
        <a-button v-if="detail.item?.link" type="primary" @click="goToLinkedPage"><Icon name="ph:arrow-square-out-bold" /> 查看相关页面</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const route = useRoute()
const {
  unreadCount,
  refreshUnread,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification: removeSharedNotification,
} = useNotifications()
const loading = ref(true)
const notifications = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20
const filterType = ref<'all' | 'unread'>('all')
const detail = reactive({ open: false, item: null as any })

onMounted(async () => {
  await Promise.all([loadNotifications(), loadUnreadCount()])
  const notificationId = String(route.query.notification || '')
  const item = notifications.value.find(entry => entry.id === notificationId)
  if (item) await handleClick(item)
})

async function loadNotifications() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: pageSize,
      unread: filterType.value === 'unread' ? true : undefined,
    }
    const res = await api.get<any>('/notifications', params)
    notifications.value = res.items || []
    total.value = res.total || 0
  } catch (e: any) {
    notifications.value = []
    total.value = 0
    toast.error(e?.message || '加载消息失败')
  } finally {
    loading.value = false
  }
}

function applyFilter() {
  currentPage.value = 1
  void loadNotifications()
}

function resetFilter() {
  filterType.value = 'all'
  applyFilter()
}

async function loadUnreadCount() {
  await refreshUnread()
}

async function handleClick(item: any) {
  if (!item.read) {
    await markRead(item)
  }
  detail.item = item
  detail.open = true
}

function goToLinkedPage() {
  const link = detail.item?.link
  detail.open = false
  if (link) void navigateTo(link)
}

function notificationTypeLabel(type: string) {
  return ({ comment: '评论提醒', reply: '回复提醒', like: '点赞提醒', guestbook: '时光留言审核', system: '系统通知' } as Record<string, string>)[type] || '消息提醒'
}

async function markRead(item: any) {
  try {
    await markNotificationRead(item.id)
    item.read = true
    if (filterType.value === 'unread') await loadNotifications()
  } catch {
    toast.error('操作失败')
  }
}

async function markAllRead() {
  try {
    await markAllNotificationsRead()
    if (filterType.value === 'unread') await loadNotifications()
    else notifications.value.forEach(i => i.read = true)
    toast.success('已全部标为已读')
  } catch {
    toast.error('操作失败')
  }
}

async function deleteNotification(item: any) {
  Modal.confirm({ title: '删除消息', content: `确认删除「${item.title || '这条消息'}」？删除后无法恢复。`, okText: '删除', cancelText: '取消', okType: 'danger', onOk: async () => {
    try {
      await removeSharedNotification(item.id, !item.read)
      const nextTotal = Math.max(0, total.value - 1)
      currentPage.value = Math.min(currentPage.value, Math.max(1, Math.ceil(nextTotal / pageSize)))
      await loadNotifications()
    }
    catch { toast.error('删除失败') }
  } })
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

function formatDetailTime(date: string) {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN', { hour12: false })
}
</script>

<style scoped>
.messages-page { width: 100%; }
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
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
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
.message-detail { padding:2px 0; }
.message-detail-meta { display:flex; align-items:center; justify-content:space-between; gap:12px; color:var(--c-text-3); font-size:.75rem; }
.message-detail-meta span { padding:3px 7px; border-radius:999px; background:var(--c-primary-soft); color:var(--c-primary); }
.message-detail p { margin:16px 0 4px; color:var(--c-text-1); font-size:.88rem; line-height:1.85; white-space:pre-wrap; word-break:break-word; }
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

@media (max-width: 640px) {
  .notification-item { gap:10px; padding:12px 4px; }
  .notification-actions { flex-direction:row; }
  .notification-text { display:-webkit-box; overflow:hidden; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
}
</style>

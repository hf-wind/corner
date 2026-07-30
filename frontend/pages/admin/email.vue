<template>
  <div class="email-logs-page">
    <a-card :bordered="false" class="section-card" size="small">
      <template #title>
        <div class="card-header">
          <span>邮件记录</span>
          <div class="filter-bar">
            <a-select v-model:value="filterType" placeholder="邮件类型" allowClear class="type-filter" @change="loadLogs">
              <a-select-option value="verification">验证码</a-select-option>
              <a-select-option value="comment_notification">评论通知</a-select-option>
              <a-select-option value="reply_notification">回复通知</a-select-option>
              <a-select-option value="like_notification">点赞通知</a-select-option>
            </a-select>
            <a-select v-model:value="filterStatus" placeholder="发送状态" allowClear class="status-filter" @change="loadLogs">
              <a-select-option value="pending">待发送</a-select-option>
              <a-select-option value="sending">发送中</a-select-option>
              <a-select-option value="sent">已发送</a-select-option>
              <a-select-option value="failed">失败</a-select-option>
            </a-select>
            <a-button @click="loadLogs">刷新</a-button>
          </div>
        </div>
      </template>

      <a-spin :spinning="loading">
        <a-table :dataSource="logs" :columns="columns" :pagination="pagination" :scroll="{ x: 1420 }" @change="handleTableChange" rowKey="id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'type'">
              <a-tag :color="getTypeColor(record.type)">{{ getTypeLabel(record.type) }}</a-tag>
            </template>
            <template v-if="column.key === 'status'">
              <a-tag :color="getStatusColor(record.status)">{{ getStatusLabel(record.status) }}</a-tag>
            </template>
            <template v-if="column.key === 'content'">
              <span v-if="record.content" class="content-text">{{ truncate(stripHtml(record.content), 50) }}</span>
              <span v-else>-</span>
            </template>
            <template v-if="column.key === 'subject'">
              <a-tooltip :title="record.subject"><span class="subject-text">{{ record.subject }}</span></a-tooltip>
            </template>
            <template v-if="column.key === 'createdAt'">
              {{ formatDate(record.createdAt) }}
            </template>
            <template v-if="column.key === 'sentAt'">
              {{ record.sentAt ? formatDate(record.sentAt) : '-' }}
            </template>
            <template v-if="column.key === 'error'">
              <a-tooltip v-if="record.error" :title="record.error">
                <span class="error-text">{{ truncate(record.error, 30) }}</span>
              </a-tooltip>
              <span v-else>-</span>
            </template>
            <template v-if="column.key === 'actions'">
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
            </template>
          </template>
        </a-table>
      </a-spin>
    </a-card>

    <a-modal v-model:open="detail.open" title="邮件详情" width="640px" :footer="null" @cancel="detail.open = false">
      <div v-if="detail.item" class="detail-wrap">
        <div class="detail-row">
          <span class="detail-label">收件人</span>
          <span class="detail-value">{{ detail.item.to }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">主题</span>
          <span class="detail-value">{{ detail.item.subject }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">类型</span>
          <a-tag :color="getTypeColor(detail.item.type)">{{ getTypeLabel(detail.item.type) }}</a-tag>
        </div>
        <div class="detail-row">
          <span class="detail-label">状态</span>
          <a-tag :color="getStatusColor(detail.item.status)">{{ getStatusLabel(detail.item.status) }}</a-tag>
        </div>
        <div class="detail-row">
          <span class="detail-label">创建时间</span>
          <span class="detail-value">{{ formatDate(detail.item.createdAt) }}</span>
        </div>
        <div class="detail-row" v-if="detail.item.sentAt">
          <span class="detail-label">发送时间</span>
          <span class="detail-value">{{ formatDate(detail.item.sentAt) }}</span>
        </div>
        <div class="detail-section" v-if="detail.item.content">
          <div class="detail-section-title">邮件内容</div>
          <div class="detail-content" v-html="detail.item.content"></div>
        </div>
        <div class="detail-section" v-if="detail.item.error">
          <div class="detail-section-title">错误信息</div>
          <div class="detail-error">{{ detail.item.error }}</div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const loading = ref(false)
const logs = ref<any[]>([])
const filterType = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
const detail = reactive({ open: false, item: null as any })

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const columns = [
  { title: '收件人', dataIndex: 'to', key: 'to', width: 180 },
  { title: '主题', dataIndex: 'subject', key: 'subject', width: 300 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 110 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '内容', dataIndex: 'content', key: 'content', width: 300 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150 },
  { title: '发送时间', dataIndex: 'sentAt', key: 'sentAt', width: 150 },
  { title: '错误信息', dataIndex: 'error', key: 'error', width: 180 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' as const },
]

onMounted(() => {
  loadLogs()
})

async function loadLogs() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      limit: pagination.pageSize,
    }
    if (filterType.value) params.type = filterType.value
    if (filterStatus.value) params.status = filterStatus.value

    const res = await api.get<any>('/email/logs', params)
    logs.value = res.items || []
    pagination.total = res.total || 0
  } catch (e: any) {
    console.error('加载邮件记录失败:', e)
  } finally {
    loading.value = false
  }
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadLogs()
}

function openDetail(record: any) {
  detail.item = record
  detail.open = true
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    verification: 'blue',
    comment_notification: 'green',
    reply_notification: 'purple',
    comment_moderation_notification: 'cyan',
    like_notification: 'red',
  }
  return colors[type] || 'default'
}

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    verification: '验证码',
    comment_notification: '评论通知',
    reply_notification: '回复通知',
    comment_moderation_notification: '评论审核',
    like_notification: '点赞通知',
  }
  return labels[type] || type
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'orange',
    sending: 'blue',
    sent: 'green',
    failed: 'red',
  }
  return colors[status] || 'default'
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: '待发送',
    sending: '发送中',
    sent: '已发送',
    failed: '失败',
  }
  return labels[status] || status
}

function formatDate(date: string) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(text: string, length: number) {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

function stripHtml(html: string) {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}
</script>

<style scoped>
.email-logs-page {
  padding: 0;
}

.section-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; }
.type-filter { width: 140px; }
.status-filter { width: 120px; }
.subject-text { display: block; overflow: hidden; color: var(--c-text); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }

.error-text {
  color: #ef4444;
  font-size: 0.82rem;
}

.content-text {
  font-size: 0.82rem;
  color: var(--color-text-secondary, #666);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}

.detail-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detail-label {
  font-weight: 500;
  color: var(--color-text-secondary, #666);
  min-width: 80px;
  flex-shrink: 0;
}

.detail-value {
  color: var(--color-text, #333);
  flex: 1;
}

.detail-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
  margin-top: 4px;
}

.detail-section-title {
  font-weight: 500;
  color: var(--color-text-secondary, #666);
  margin-bottom: 8px;
  font-size: 13px;
}

.detail-content {
  background: var(--c-bg-1);
  padding: 12px;
  border-radius: 6px;
  line-height: 1.6;
  font-size: 13px;
}

@media (max-width: 700px) {
  .card-header { align-items: stretch; flex-direction: column; gap: 10px; }
  .filter-bar, .type-filter, .status-filter { width: 100%; }
}

.detail-content :deep(img) {
  max-width: 100%;
}

.detail-error {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  padding: 12px;
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 13px;
}
</style>

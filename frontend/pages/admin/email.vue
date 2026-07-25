<template>
  <div class="email-logs-page">
    <a-card :bordered="false" class="section-card" size="small">
      <template #title>
        <div class="card-header">
          <span>邮件记录</span>
          <a-space>
            <a-select v-model:value="filterType" placeholder="邮件类型" allowClear style="width:140px" @change="loadLogs">
              <a-select-option value="verification">验证码</a-select-option>
              <a-select-option value="comment_notification">评论通知</a-select-option>
              <a-select-option value="reply_notification">回复通知</a-select-option>
              <a-select-option value="like_notification">点赞通知</a-select-option>
            </a-select>
            <a-select v-model:value="filterStatus" placeholder="发送状态" allowClear style="width:120px" @change="loadLogs">
              <a-select-option value="pending">待发送</a-select-option>
              <a-select-option value="sending">发送中</a-select-option>
              <a-select-option value="sent">已发送</a-select-option>
              <a-select-option value="failed">失败</a-select-option>
            </a-select>
            <a-button @click="loadLogs">刷新</a-button>
          </a-space>
        </div>
      </template>

      <a-spin :spinning="loading">
        <a-table :dataSource="logs" :columns="columns" :pagination="pagination" @change="handleTableChange" rowKey="id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'type'">
              <a-tag :color="getTypeColor(record.type)">{{ getTypeLabel(record.type) }}</a-tag>
            </template>
            <template v-if="column.key === 'status'">
              <a-tag :color="getStatusColor(record.status)">{{ getStatusLabel(record.status) }}</a-tag>
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
          </template>
        </a-table>
      </a-spin>
    </a-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const loading = ref(false)
const logs = ref<any[]>([])
const filterType = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const columns = [
  { title: '收件人', dataIndex: 'to', key: 'to', width: 200 },
  { title: '主题', dataIndex: 'subject', key: 'subject', width: 250 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
  { title: '发送时间', dataIndex: 'sentAt', key: 'sentAt', width: 160 },
  { title: '错误信息', dataIndex: 'error', key: 'error', width: 200 },
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

    const res = await api.get<any>('/email/logs', { params })
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

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    verification: 'blue',
    comment_notification: 'green',
    reply_notification: 'purple',
    like_notification: 'red',
  }
  return colors[type] || 'default'
}

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    verification: '验证码',
    comment_notification: '评论通知',
    reply_notification: '回复通知',
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

.error-text {
  color: #ef4444;
  font-size: 0.82rem;
}
</style>

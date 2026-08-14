<template>
  <div>
    <div class="table-toolbar">
      <a-space>
        <a-select v-model:value="statusFilter" style="width: 140px" @change="loadApplications(1)">
          <a-select-option value="">全部</a-select-option>
          <a-select-option value="pending">待审核</a-select-option>
          <a-select-option value="approved">已通过</a-select-option>
          <a-select-option value="rejected">已拒绝</a-select-option>
        </a-select>
        <a-button :loading="loading" @click="loadApplications(pagination.current)">刷新</a-button>
      </a-space>
    </div>

    <a-spin :spinning="loading">
      <a-card :bordered="false" class="list-card" size="small">
        <a-table
          :dataSource="applications"
          :columns="columns"
          rowKey="id"
          size="small"
          :pagination="pagination"
          :locale="{ emptyText: '暂无申请' }"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'siteUrl'">
              <a :href="record.siteUrl" target="_blank" class="friend-link">{{ record.siteUrl }}</a>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
            </template>
            <template v-else-if="column.key === 'aiReviewResult'">
              <a-tooltip :title="record.aiReview || '暂无 AI 审核信息'">
                <a-tag :color="aiColor(record.aiReviewResult)">{{ aiText(record.aiReviewResult) }}</a-tag>
              </a-tooltip>
            </template>
            <template v-else-if="column.key === 'createdAt'">
              {{ formatTime(record.createdAt) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button v-if="record.status !== 'approved'" type="link" size="small" @click="handleApprove(record)">通过</a-button>
              <a-button v-if="record.status !== 'rejected'" type="link" size="small" danger @click="openReject(record)">拒绝</a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
            </template>
          </template>
        </a-table>
      </a-card>
    </a-spin>

    <a-modal v-model:open="detailDialog.open" title="申请详情" width="640px" :footer="null">
      <a-descriptions v-if="detailDialog.record" bordered size="small" :column="1">
        <a-descriptions-item label="站点名称">{{ detailDialog.record.siteName }}</a-descriptions-item>
        <a-descriptions-item label="站点地址">
          <a :href="detailDialog.record.siteUrl" target="_blank">{{ detailDialog.record.siteUrl }}</a>
        </a-descriptions-item>
        <a-descriptions-item label="友链页面">
          <a :href="detailDialog.record.friendPageUrl" target="_blank">{{ detailDialog.record.friendPageUrl }}</a>
        </a-descriptions-item>
        <a-descriptions-item label="联系邮箱">{{ detailDialog.record.contactEmail }}</a-descriptions-item>
        <a-descriptions-item label="头像">{{ detailDialog.record.siteAvatar || '-' }}</a-descriptions-item>
        <a-descriptions-item label="RSS">{{ detailDialog.record.siteRssUrl || '-' }}</a-descriptions-item>
        <a-descriptions-item label="描述">{{ detailDialog.record.siteDescription || '-' }}</a-descriptions-item>
        <a-descriptions-item label="AI 审核">{{ detailDialog.record.aiReview || '-' }}</a-descriptions-item>
        <a-descriptions-item label="拒绝原因">{{ detailDialog.record.rejectReason || '-' }}</a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <a-modal v-model:open="rejectDialog.open" title="拒绝申请" width="420px" @ok="confirmReject" @cancel="rejectDialog.open = false">
      <a-textarea v-model:value="rejectDialog.reason" placeholder="请输入拒绝理由" :rows="4" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const loading = ref(true)
const applications = ref<any[]>([])
const statusFilter = ref('')
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: false,
})
const rejectDialog = reactive({ open: false, application: null as any, reason: '' })
const detailDialog = reactive({ open: false, record: null as any })

const columns = [
  { title: '站点名称', dataIndex: 'siteName', key: 'siteName', width: 140 },
  { title: '站点 URL', key: 'siteUrl', width: 260 },
  { title: '邮箱', dataIndex: 'contactEmail', key: 'contactEmail', width: 180 },
  { title: '状态', key: 'status', width: 90 },
  { title: 'AI 审核', key: 'aiReviewResult', width: 100 },
  { title: '申请时间', dataIndex: 'createdAt', key: 'createdAt', width: 150 },
  { title: '操作', key: 'actions', width: 230, fixed: 'right' as const },
]

onMounted(() => loadApplications(1))

function statusColor(status: string) {
  return status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'orange'
}

function statusText(status: string) {
  return status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : '待审核'
}

function aiColor(result?: string) {
  return result === 'approved' || result === 'manual_approved'
    ? 'blue'
    : result === 'rejected' || result === 'manual_rejected'
      ? 'red'
      : 'orange'
}

function aiText(result?: string) {
  return result === 'approved'
    ? 'AI 通过'
    : result === 'rejected'
      ? 'AI 拒绝'
      : result === 'manual_approved'
        ? '人工通过'
        : result === 'manual_rejected'
          ? '人工拒绝'
          : '待审核'
}

function formatTime(value?: string) {
  return value ? String(value).slice(0, 16).replace('T', ' ') : ''
}

async function loadApplications(page: number) {
  loading.value = true
  try {
    const params: Record<string, any> = { page, limit: pagination.pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await api.get<any>('/friend-link/applications', params)
    applications.value = res?.items ?? []
    pagination.total = res?.total ?? 0
    pagination.current = page
  } catch (e: any) {
    applications.value = []
    toast.error(e?.message || '加载申请失败')
  } finally {
    loading.value = false
  }
}

function handleTableChange(pag: any) {
  loadApplications(pag.current)
}

function openDetail(record: any) {
  detailDialog.record = record
  detailDialog.open = true
}

async function handleApprove(record: any) {
  try {
    const updated = await api.post<any>(`/friend-link/applications/${record.id}/approve`)
    Object.assign(record, updated)
    toast.success('已通过并加入友链')
  } catch (e: any) {
    toast.error(e?.message || '操作失败')
  }
}

function openReject(record: any) {
  rejectDialog.application = record
  rejectDialog.reason = record.rejectReason || ''
  rejectDialog.open = true
}

async function confirmReject() {
  if (!rejectDialog.application) return
  const reason = rejectDialog.reason?.trim()
  if (!reason) {
    toast.warning('请输入拒绝理由')
    return
  }
  try {
    const updated = await api.post<any>(`/friend-link/applications/${rejectDialog.application.id}/reject`, { reason })
    Object.assign(rejectDialog.application, updated)
    toast.success('已拒绝')
    rejectDialog.open = false
  } catch (e: any) {
    toast.error(e?.message || '操作失败')
  }
}

async function handleDelete(record: any) {
  Modal.confirm({
    title: '删除确认',
    content: `确认删除「${record.siteName}」的申请？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await api.delete(`/friend-link/applications/${record.id}`)
        applications.value = applications.value.filter((item) => item.id !== record.id)
        pagination.total = Math.max(0, pagination.total - 1)
        toast.success('已删除')
      } catch (e: any) {
        toast.error(e?.message || '删除失败')
      }
    },
  })
}
</script>

<style scoped>
.table-toolbar { margin-bottom: 12px; }
.list-card { border-radius: 8px; }
.friend-link { color: var(--c-primary); font-size: 0.78rem; text-decoration: none; }
.friend-link:hover { text-decoration: underline; }
</style>

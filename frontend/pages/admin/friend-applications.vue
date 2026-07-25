<template>
  <div>
    <div class="table-toolbar">
      <a-select v-model:value="statusFilter" style="width: 140px" @change="loadApplications(1)">
        <a-select-option value="">全部</a-select-option>
        <a-select-option value="pending">待审核</a-select-option>
        <a-select-option value="approved">已通过</a-select-option>
        <a-select-option value="rejected">已拒绝</a-select-option>
      </a-select>
    </div>

    <a-spin :spinning="loading">
      <a-card :bordered="false" class="list-card" size="small">
        <a-table :dataSource="applications" :columns="columns" rowKey="id" size="small" :pagination="pagination" :locale="{ emptyText: '暂无申请' }" @change="handleTableChange">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'siteUrl'">
              <a :href="record.siteUrl" target="_blank" class="friend-link">{{ record.siteUrl }}</a>
            </template>
            <template v-if="column.key === 'status'">
              <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
            </template>
            <template v-if="column.key === 'aiReviewResult'">
              <a-tag v-if="record.aiReviewResult === 'approved'" color="blue">通过</a-tag>
              <a-tag v-else-if="record.aiReviewResult === 'rejected'" color="default">拒绝</a-tag>
              <a-tag v-else color="orange">审核中...</a-tag>
            </template>
            <template v-if="column.key === 'createdAt'">{{ record.createdAt?.slice(0, 16) || '' }}</template>
            <template v-if="column.key === 'actions'">
              <a-button v-if="record.status === 'pending'" type="link" size="small" @click="handleApprove(record)">通过</a-button>
              <a-button v-if="record.status === 'pending'" type="link" size="small" danger @click="openReject(record)">拒绝</a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
            </template>
          </template>
        </a-table>
      </a-card>
    </a-spin>

    <a-modal v-model:open="rejectDialog.open" title="拒绝申请" width="400px" @ok="confirmReject" @cancel="rejectDialog.open = false">
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

const columns = [
  { title: '站点名称', dataIndex: 'siteName', key: 'siteName', width: 120 },
  { title: '站点URL', key: 'siteUrl', minWidth: 180 },
  { title: '邮箱', dataIndex: 'contactEmail', key: 'contactEmail', width: 160 },
  { title: '状态', key: 'status', width: 80 },
  { title: 'AI审核', key: 'aiReviewResult', width: 80 },
  { title: '申请时间', dataIndex: 'createdAt', key: 'createdAt', width: 140 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' as const },
]

function statusColor(s: string) { return s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'orange' }
function statusText(s: string) { return s === 'approved' ? '已通过' : s === 'rejected' ? '已拒绝' : '待审核' }

onMounted(() => loadApplications(1))

async function loadApplications(page: number) {
  loading.value = true
  try {
    const params: Record<string, any> = { page, limit: pagination.pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await api.get<any>('/friend-link/applications', params)
    applications.value = res?.items ?? []
    pagination.total = res?.total ?? 0
    pagination.current = page
  } catch { applications.value = [] }
  loading.value = false
}

function handleTableChange(pag: any) {
  loadApplications(pag.current)
}

async function handleApprove(record: any) {
  try {
    await api.post(`/friend-link/applications/${record.id}/approve`)
    record.status = 'approved'
    toast.success('已通过')
  } catch { toast.error('操作失败') }
}

function openReject(record: any) {
  rejectDialog.application = record
  rejectDialog.reason = ''
  rejectDialog.open = true
}

async function confirmReject() {
  if (!rejectDialog.application) return
  const reason = rejectDialog.reason?.trim()
  if (!reason) { toast.warning('请输入拒绝理由'); return }
  try {
    await api.post(`/friend-link/applications/${rejectDialog.application.id}/reject`, { reason })
    rejectDialog.application.status = 'rejected'
    toast.success('已拒绝')
    rejectDialog.open = false
  } catch { toast.error('操作失败') }
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
        applications.value = applications.value.filter(a => a.id !== record.id)
        toast.success('已删除')
      } catch { toast.error('删除失败') }
    },
  })
}
</script>

<style scoped>
.table-toolbar { margin-bottom:12px; }
.list-card { border-radius:8px; }
.friend-link { color:var(--c-primary); font-size:0.78rem; text-decoration:none; }
.friend-link:hover { text-decoration:underline; }
</style>

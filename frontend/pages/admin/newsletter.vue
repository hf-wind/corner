<template>
  <div class="newsletter-admin admin-page-shell">
    <header class="admin-page-head"><div><span>CONTENT MANAGEMENT</span><h1>订阅周报</h1><p>管理邮件订阅者与周报发送计划。</p></div></header>

    <div class="table-toolbar newsletter-config-toolbar">
      <strong>发送计划</strong>
      <span class="toolbar-spacer" />
      <span class="last-sent">上次发送：{{ form.lastSentAt ? formatDate(form.lastSentAt) : '尚未发送过' }}</span>
      <AdminRefreshButton :loading="loading" @click="loadAll()" />
    </div>
    <section class="newsletter-config admin-table-shell">
      <div class="section-heading">
        <div><p>设置周报发送时间与当前运行状态。</p></div>
      </div>
      <div class="panel-body">
        <div class="config-form">
          <div class="config-item switch-item">
            <label for="newsletter-enabled">启用周报</label>
            <span class="config-control"><a-switch id="newsletter-enabled" v-model:checked="form.enabled" /></span>
          </div>
          <div class="config-item">
            <label>发送时间</label>
            <div class="config-controls">
              <a-select v-model:value="form.day" class="day-select">
                <a-select-option v-for="(label, idx) in DAY_LABELS" :key="idx + 1" :value="idx + 1">每{{ label }}</a-select-option>
              </a-select>
              <a-select v-model:value="form.time" class="time-select">
                <a-select-option v-for="t in TIME_OPTIONS" :key="t" :value="t">{{ t }}</a-select-option>
              </a-select>
            </div>
          </div>
          <a-button type="primary" :loading="configSaving" @click="saveConfig"><Icon name="ph:floppy-disk-bold" /> 保存设置</a-button>
        </div>
        <p class="config-tip">到点时若上一周期没有新发布的内容，本期会自动跳过，直到有新内容再恢复发送。</p>
      </div>
    </section>

    <div class="table-toolbar newsletter-toolbar">
      <strong>订阅者</strong>
      <span class="toolbar-description">管理已订阅邮箱及确认状态。</span>
      <span class="toolbar-spacer" />
      <div class="filter-bar">
          <a-input v-model:value="query.q" placeholder="搜索邮箱" allow-clear class="search-input" @press-enter="applyFilters" />
          <a-select v-model:value="query.status" placeholder="全部状态" allow-clear class="status-filter">
            <a-select-option value="active">已订阅</a-select-option>
            <a-select-option value="pending">待确认</a-select-option>
            <a-select-option value="unsubscribed">已退订</a-select-option>
          </a-select>
          <a-button type="primary" @click="applyFilters"><Icon name="ph:magnifying-glass-bold" /> 搜索</a-button>
          <a-button type="primary" ghost @click="addOpen = true"><Icon name="ph:plus-bold" /> 添加订阅</a-button>
      </div>
    </div>
    <section class="admin-table-shell">

      <a-spin :spinning="loading">
        <a-table :data-source="items" :columns="columns" :pagination="false" row-key="id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'email'">
              <span class="sub-email">{{ record.email }}</span>
            </template>
            <template v-if="column.key === 'status'">
              <a-tag :color="getStatusColor(record.status)">{{ getStatusLabel(record.status) }}</a-tag>
            </template>
            <template v-if="column.key === 'source'">
              {{ getSourceLabel(record.source) }}
            </template>
            <template v-if="column.key === 'createdAt'">
              {{ formatDate(record.createdAt) }}
            </template>
            <template v-if="column.key === 'actions'">
              <div class="admin-row-actions">
                <a-button v-if="record.status !== 'active'" type="link" size="small" @click="setStatus(record, 'active')"><Icon name="ph:check-bold" />启用</a-button>
                <a-button v-else type="link" size="small" @click="setStatus(record, 'unsubscribed')"><Icon name="ph:prohibit-bold" />停用</a-button>
                <a-button type="link" size="small" danger @click="removeSubscriber(record)"><Icon name="ph:trash-bold" />删除</a-button>
              </div>
            </template>
          </template>
        </a-table>
      </a-spin>
      <AdminPagination v-model:current="pagination.current" v-model:page-size="pagination.pageSize" :total="pagination.total" @change="handlePagination" />
    </section>

    <a-modal v-model:open="addOpen" title="添加订阅" ok-text="添加" cancel-text="取消" :confirm-loading="adding" @ok="addSubscriber">
      <p class="add-tip">手动添加的邮箱将跳过确认流程，直接标记为已订阅。</p>
      <a-input v-model:value="addEmail" type="email" placeholder="you@example.com" @press-enter="addSubscriber" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'

const api = useApi()
const toast = useToast()

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`)

const loading = ref(false)
const configSaving = ref(false)
const form = reactive({ enabled: false, day: 1, time: '06:00', lastSentAt: '' })

const items = ref<any[]>([])
const query = reactive({ status: undefined as string | undefined, q: '' })
const pagination = reactive({ current: 1, pageSize: 20, total: 0 })

const addOpen = ref(false)
const adding = ref(false)
const addEmail = ref('')

const columns = [
  { title: '邮箱', key: 'email', dataIndex: 'email' },
  { title: '状态', key: 'status', dataIndex: 'status', width: 110 },
  { title: '来源', key: 'source', dataIndex: 'source', width: 120 },
  { title: '订阅时间', key: 'createdAt', dataIndex: 'createdAt', width: 180 },
  { title: '操作', key: 'actions', width: 170 },
]

function formatDate(date?: string) {
  if (!date) return '-'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return String(date)
  return d.toLocaleString('zh-CN', { hour12: false })
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = { active: 'green', pending: 'orange', unsubscribed: 'default' }
  return colors[status] || 'default'
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = { active: '已订阅', pending: '待确认', unsubscribed: '已退订' }
  return labels[status] || status
}

function getSourceLabel(source: string) {
  const labels: Record<string, string> = { article: '文章页', admin: '后台添加' }
  return labels[source] || source || '-'
}

async function loadConfig() {
  try {
    Object.assign(form, await api.get<any>('/newsletter/admin/config'))
  } catch (error: any) {
    toast.error(error?.message || '加载配置失败')
  }
}

async function loadSubscribers() {
  loading.value = true
  try {
    const result = await api.get<any>('/newsletter/admin/subscribers', {
      page: String(pagination.current),
      limit: String(pagination.pageSize),
      status: query.status || '',
      q: query.q,
    })
    items.value = result.items || []
    pagination.total = result.total || 0
  } catch (error: any) {
    toast.error(error?.message || '加载订阅列表失败')
  } finally {
    loading.value = false
  }
}

function loadAll() {
  loadConfig()
  void loadSubscribers()
}

async function saveConfig() {
  configSaving.value = true
  try {
    Object.assign(form, await api.put<any>('/newsletter/admin/config', {
      enabled: form.enabled,
      day: form.day,
      time: form.time,
    }))
    toast.success('发送计划已更新')
  } catch (error: any) {
    toast.error(error?.message || '保存配置失败')
  } finally {
    configSaving.value = false
  }
}

function applyFilters() {
  pagination.current = 1
  void loadSubscribers()
}

function handlePagination(page: number, pageSize: number) {
  pagination.current = page
  pagination.pageSize = pageSize
  void loadSubscribers()
}

async function setStatus(record: any, status: string) {
  try {
    const updated = await api.patch<any>(`/newsletter/admin/subscribers/${record.id}`, { status })
    Object.assign(record, updated)
    toast.success('状态已更新')
  } catch (error: any) {
    toast.error(error?.message || '更新失败')
  }
}

function removeSubscriber(record: any) {
  Modal.confirm({
    title: '删除这条订阅记录？',
    content: `确认删除 ${record.email} 的订阅记录？此操作不可恢复。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await api.delete(`/newsletter/admin/subscribers/${record.id}`)
        toast.success('已删除')
        void loadSubscribers()
      } catch (error: any) {
        toast.error(error?.message || '删除失败')
      }
    },
  })
}

async function addSubscriber() {
  if (!addEmail.value.trim()) return void toast.warning('请输入邮箱')
  adding.value = true
  try {
    await api.post('/newsletter/admin/subscribers', { email: addEmail.value.trim() })
    toast.success('已添加')
    addEmail.value = ''
    addOpen.value = false
    pagination.current = 1
    void loadSubscribers()
  } catch (error: any) {
    toast.error(error?.message || '添加失败')
  } finally {
    adding.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped>
.newsletter-admin {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-heading,
.newsletter-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.section-heading {
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--border);
}

.section-heading h2,
.newsletter-toolbar strong {
  margin: 0;
  color: var(--c-text);
  font-size: 0.86rem;
}

.section-heading p,
.newsletter-toolbar .toolbar-description {
  margin: 4px 0 0;
  color: var(--c-text-3);
  font-size: 0.68rem;
}

.last-sent {
  color: var(--c-text-3);
  font-size: 0.76rem;
}

.panel-body {
  padding: 18px;
}

.config-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 30px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 32px;
  color: var(--c-text-2);
  font-size: 0.85rem;
}

.config-item > label { white-space: nowrap; }
.config-control { display: inline-flex; align-items: center; }

.config-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.day-select { width: 126px; }
.time-select { width: 104px; }

.config-tip {
  margin: 10px 0 0;
  color: var(--c-text-3);
  font-size: 0.75rem;
}

.filter-bar .search-input {
  width: 220px;
}

.filter-bar .status-filter {
  width: 120px;
}

.newsletter-toolbar { margin-bottom: 0; }
.newsletter-toolbar .filter-bar { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.newsletter-config-toolbar .last-sent { margin-top: 0; }
.newsletter-toolbar .toolbar-description { margin-top: 0; }

.sub-email {
  color: var(--c-text);
  font-size: 0.84rem;
}

.add-tip {
  margin: 0 0 12px;
  color: var(--c-text-3);
  font-size: 0.78rem;
}

@media (max-width: 720px) {
  .section-heading,
  .newsletter-toolbar { align-items: stretch; flex-direction: column; }
  .newsletter-toolbar .filter-bar { width: 100%; justify-content: stretch; }
  .newsletter-toolbar .filter-bar > * { flex: 1 1 140px; }
  .newsletter-toolbar .search-input,
  .newsletter-toolbar .status-filter { width: auto; }
  .config-form { align-items: stretch; flex-direction: column; }
  .config-form > .ant-btn { width: 100%; }
}
</style>

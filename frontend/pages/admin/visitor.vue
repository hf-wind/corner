<template>
  <div class="visitor-admin">
    <header class="admin-heading">
      <div><h1>访客时光</h1><p>审核留言与漂流瓶，管理途经这座角落的旅人。</p></div>
      <a-button :loading="loadingStats" @click="loadStats"><Icon name="ph:arrows-clockwise-bold" /> 刷新统计</a-button>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-icon"><Icon name="ph:users-three-bold" /></span>
        <div><strong>{{ stats.visitors }}</strong><small>累计访客</small></div>
      </div>
      <div class="stat-card">
        <span class="stat-icon"><Icon name="ph:user-fill" /></span>
        <div><strong>{{ stats.todayVisitors }}</strong><small>今日访客</small></div>
      </div>
      <div class="stat-card">
        <span class="stat-icon"><Icon name="ph:footprints-bold" /></span>
        <div><strong>{{ stats.visits }}</strong><small>足迹记录</small></div>
      </div>
      <div class="stat-card">
        <span class="stat-icon"><Icon name="ph:note-pencil-bold" /></span>
        <div><strong>{{ stats.messages }}</strong><small>留言总数</small><i v-if="stats.pendingMessages" class="pending-dot">{{ stats.pendingMessages }} 待审</i></div>
      </div>
      <div class="stat-card">
        <span class="stat-icon"><Icon name="solar:bottle-outline" /></span>
        <div><strong>{{ stats.bottles }}</strong><small>漂流瓶总数</small><i v-if="stats.pendingBottles" class="pending-dot">{{ stats.pendingBottles }} 待审</i></div>
      </div>
    </div>

    <a-tabs v-model:active-key="activeTab" class="visitor-tabs">
      <a-tab-pane key="messages" :tab="`留言与漂流瓶${pendingTotal ? `（${pendingTotal} 待审）` : ''}`">
        <div class="table-toolbar">
          <a-space>
            <a-select v-model:value="msgFilter.type" style="width: 130px" @change="loadMessages(1)">
              <a-select-option value="">全部类型</a-select-option>
              <a-select-option value="message">留言</a-select-option>
              <a-select-option value="bottle">漂流瓶</a-select-option>
            </a-select>
            <a-select v-model:value="msgFilter.status" style="width: 130px" @change="loadMessages(1)">
              <a-select-option value="">全部状态</a-select-option>
              <a-select-option value="approved">已通过</a-select-option>
              <a-select-option value="rejected">已拒绝</a-select-option>
              <a-select-option value="caught">已被捞起</a-select-option>
              <a-select-option value="pending">待审核</a-select-option>
            </a-select>
            <a-button :loading="loadingMsgs" @click="loadMessages(msgPagination.current)">刷新</a-button>
          </a-space>
        </div>
        <a-spin :spinning="loadingMsgs">
          <a-card :bordered="false" class="list-card" size="small">
            <a-table
              :data-source="messages"
              :columns="msgColumns"
              row-key="id"
              size="small"
              :pagination="msgPagination"
              :scroll="{ x: 980 }"
              :locale="{ emptyText: '暂无内容' }"
              @change="handleMsgChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'content'">
                  <div class="content-cell">
                    <a-tag :color="record.type === 'bottle' ? 'blue' : 'cyan'" class="type-tag">{{ record.type === 'bottle' ? '漂流瓶' : '留言' }}</a-tag>
                    <span :class="{ 'is-caught': record.status === 'caught' }">{{ record.content }}</span>
                  </div>
                </template>
                <template v-else-if="column.key === 'nickname'"><span class="nick-cell">{{ record.nickname || '无名旅人' }}</span></template>
                <template v-else-if="column.key === 'account'">
                  <template v-if="record.account">
                    <a-tag color="green" class="acct-tag">登录</a-tag>
                    <span class="acct-cell">{{ record.account.username }}<small v-if="record.account.email">{{ record.account.email }}</small></span>
                  </template>
                  <span v-else class="acct-guest">访客</span>
                </template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
                  <a-tooltip v-if="record.aiReview" :title="record.aiReview"><a-tag color="purple" class="ai-tag">AI</a-tag></a-tooltip>
                  <a-tooltip v-if="record.rejectReason" :title="record.rejectReason"><a-tag color="red" class="ai-tag">拒因</a-tag></a-tooltip>
                </template>
                <template v-else-if="column.key === 'createdAt'">{{ formatTime(record.createdAt) }}</template>
                <template v-else-if="column.key === 'actions'">
                  <a-button v-if="record.status !== 'approved' && record.status !== 'caught'" type="link" size="small" @click="handleApprove(record)">通过</a-button>
                  <a-button v-if="record.status !== 'rejected' && record.status !== 'caught'" type="link" size="small" danger @click="openReject(record)">拒绝</a-button>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-spin>
      </a-tab-pane>

      <a-tab-pane key="profiles" :tab="'访客列表'">
        <div class="table-toolbar">
          <a-space>
            <a-input v-model:value="profileFilter.keyword" placeholder="搜索昵称" allow-clear style="width: 200px" @press-enter="loadProfiles(1)" @change="loadProfiles(1)" />
            <a-select v-model:value="profileFilter.banned" style="width: 120px" @change="loadProfiles(1)">
              <a-select-option value="">全部状态</a-select-option>
              <a-select-option value="false">正常</a-select-option>
              <a-select-option value="true">已封禁</a-select-option>
            </a-select>
            <a-button :loading="loadingProfiles" @click="loadProfiles(profilePagination.current)">刷新</a-button>
          </a-space>
        </div>
        <a-spin :spinning="loadingProfiles">
          <a-card :bordered="false" class="list-card" size="small">
            <a-table
              :data-source="profiles"
              :columns="profileColumns"
              row-key="id"
              size="small"
              :pagination="profilePagination"
              :scroll="{ x: 800 }"
              :locale="{ emptyText: '暂无访客' }"
              @change="handleProfileChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'nickname'">
                  <span class="nick-cell">{{ record.nickname || '无名旅人' }}</span>
                  <a-tag v-if="record.isBanned" color="red" class="banned-tag">已封禁</a-tag>
                </template>
                <template v-else-if="column.key === 'counts'">
                  <span class="count-cell">访 {{ record.visitCount }} · 言 {{ record.messageCount }} · 瓶 {{ record.bottleCount }} · 捞 {{ record.caughtCount }}</span>
                </template>
                <template v-else-if="column.key === 'achievements'">
                  <a-tag color="gold">{{ record.achievementCount }} 枚</a-tag>
                </template>
                <template v-else-if="column.key === 'lastSeen'">
                  {{ formatTime(record.lastSeenAt) }}<span v-if="record.firstSeenAt" class="first-seen">初访 {{ formatTime(record.firstSeenAt) }}</span>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <a-button v-if="!record.isBanned" type="link" size="small" danger @click="handleBan(record, true)">封禁</a-button>
                  <a-button v-else type="link" size="small" @click="handleBan(record, false)">解封</a-button>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-spin>
      </a-tab-pane>
    </a-tabs>

    <a-modal v-model:open="rejectDialog.open" title="拒绝这条内容" width="420px" @ok="confirmReject" @cancel="rejectDialog.open = false">
      <a-textarea v-model:value="rejectDialog.reason" placeholder="请输入拒绝理由" :rows="4" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const activeTab = ref('messages')
const loadingStats = ref(false)
const stats = reactive({ visitors: 0, todayVisitors: 0, visits: 0, messages: 0, bottles: 0, pendingMessages: 0, pendingBottles: 0 })

const pendingTotal = computed(() => stats.pendingMessages + stats.pendingBottles)

const loadingMsgs = ref(false)
const messages = ref<any[]>([])
const msgFilter = reactive({ type: '', status: '' })
const msgPagination = reactive({ current: 1, pageSize: 20, total: 0, showSizeChanger: false })
const msgColumns = [
  { title: '内容', key: 'content', minWidth: 320 },
  { title: '署名', key: 'nickname', width: 110 },
  { title: '账号', key: 'account', width: 150 },
  { title: '状态', key: 'status', width: 110 },
  { title: '时间', key: 'createdAt', width: 150 },
  { title: '操作', key: 'actions', width: 130, fixed: 'right' as const },
]

const loadingProfiles = ref(false)
const profiles = ref<any[]>([])
const profileFilter = reactive({ keyword: '', banned: '' })
const profilePagination = reactive({ current: 1, pageSize: 20, total: 0, showSizeChanger: false })
const profileColumns = [
  { title: '昵称', key: 'nickname', width: 160 },
  { title: '数据', key: 'counts', minWidth: 220 },
  { title: '成就', key: 'achievements', width: 90 },
  { title: '最近到访', key: 'lastSeen', width: 230 },
  { title: '操作', key: 'actions', width: 90, fixed: 'right' as const },
]

const rejectDialog = reactive({ open: false, record: null as any, reason: '' })

onMounted(() => {
  void loadStats()
  void loadMessages(1)
  void loadProfiles(1)
})

function statusColor(status: string) {
  return status === 'approved' ? 'green' : status === 'rejected' ? 'red' : status === 'caught' ? 'blue' : 'orange'
}
function statusText(status: string) {
  return status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : status === 'caught' ? '已捞起' : '待审核'
}
function formatTime(value?: string) {
  return value ? String(value).slice(0, 16).replace('T', ' ') : ''
}

async function loadStats() {
  loadingStats.value = true
  try {
    const res = await api.get<any>('/visitor/admin/stats')
    Object.assign(stats, res)
  } catch (e: any) {
    toast.error(e?.message || '加载统计失败')
  } finally {
    loadingStats.value = false
  }
}

async function loadMessages(page: number) {
  loadingMsgs.value = true
  try {
    const params: Record<string, any> = { page, pageSize: msgPagination.pageSize }
    if (msgFilter.type) params.type = msgFilter.type
    if (msgFilter.status) params.status = msgFilter.status
    const res = await api.get<any>('/visitor/admin/messages', params)
    messages.value = res?.items ?? []
    msgPagination.total = res?.total ?? 0
    msgPagination.current = page
  } catch (e: any) {
    messages.value = []
    toast.error(e?.message || '加载失败')
  } finally {
    loadingMsgs.value = false
  }
}

function handleMsgChange(pag: any) {
  loadMessages(pag.current)
}

async function handleApprove(record: any) {
  try {
    const updated = await api.post<any>(`/visitor/admin/messages/${record.id}/approve`)
    record.status = updated.status
    toast.success('已通过')
    void loadStats()
  } catch (e: any) {
    toast.error(e?.message || '操作失败')
  }
}

function openReject(record: any) {
  rejectDialog.record = record
  rejectDialog.reason = record.rejectReason || ''
  rejectDialog.open = true
}

async function confirmReject() {
  if (!rejectDialog.record) return
  const reason = rejectDialog.reason?.trim()
  if (!reason) {
    toast.warning('请输入拒绝理由')
    return
  }
  try {
    const updated = await api.post<any>(`/visitor/admin/messages/${rejectDialog.record.id}/reject`, { reason })
    rejectDialog.record.status = updated.status
    toast.success('已拒绝')
    rejectDialog.open = false
    void loadStats()
  } catch (e: any) {
    toast.error(e?.message || '操作失败')
  }
}

async function loadProfiles(page: number) {
  loadingProfiles.value = true
  try {
    const params: Record<string, any> = { page, pageSize: profilePagination.pageSize }
    if (profileFilter.keyword.trim()) params.keyword = profileFilter.keyword.trim()
    if (profileFilter.banned !== '') params.banned = profileFilter.banned
    const res = await api.get<any>('/visitor/admin/profiles', params)
    profiles.value = res?.items ?? []
    profilePagination.total = res?.total ?? 0
    profilePagination.current = page
  } catch (e: any) {
    profiles.value = []
    toast.error(e?.message || '加载访客失败')
  } finally {
    loadingProfiles.value = false
  }
}

function handleProfileChange(pag: any) {
  loadProfiles(pag.current)
}

function handleBan(record: any, ban: boolean) {
  Modal.confirm({
    title: ban ? '封禁该访客' : '解除封禁',
    content: ban ? `封禁后「${record.nickname || '无名旅人'}」将无法再留言、投瓶或起名。` : `解除「${record.nickname || '无名旅人'}」的封禁？`,
    okText: ban ? '封禁' : '解封',
    okType: ban ? 'danger' : 'primary',
    cancelText: '取消',
    onOk: async () => {
      try {
        const updated = await api.post<any>(`/visitor/admin/profiles/${record.id}/${ban ? 'ban' : 'unban'}`)
        record.isBanned = updated.isBanned
        toast.success(ban ? '已封禁' : '已解封')
      } catch (e: any) {
        toast.error(e?.message || '操作失败')
      }
    },
  })
}
</script>

<style scoped>
.visitor-admin { width: min(1220px, 100%); margin: 0 auto; }
.admin-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
.admin-heading h1 { margin: 0 0 3px; color: var(--c-text); font-size: 1.5rem; }
.admin-heading p { margin: 0; color: var(--c-text-3); font-size: .76rem; }

.stats-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
.stat-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 10px; background: var(--ld-bg-card); position: relative; }
.stat-icon { display: grid; width: 38px; height: 38px; flex: 0 0 38px; place-items: center; border-radius: 10px; background: color-mix(in srgb, var(--c-primary) 10%, transparent); color: var(--c-primary); font-size: 1.05rem; }
.stat-card strong { display: block; color: var(--c-text); font-size: 1.1rem; line-height: 1.2; }
.stat-card small { color: var(--c-text-3); font-size: .64rem; }
.pending-dot { position: absolute; top: 8px; right: 10px; padding: 1px 6px; border-radius: 8px; background: color-mix(in srgb, var(--c-primary) 14%, transparent); color: var(--c-primary); font-size: .58rem; font-style: normal; }

.visitor-tabs :deep(.ant-tabs-nav) { margin-bottom: 12px; }
.table-toolbar { margin-bottom: 12px; }
.list-card { border-radius: 8px; }
.content-cell { display: flex; align-items: center; gap: 8px; min-width: 0; }
.content-cell span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.content-cell .is-caught { color: var(--c-text-3); }
.type-tag { flex: 0 0 auto; }
.nick-cell { color: var(--c-text); font-size: .78rem; }
.acct-cell { display: inline-flex; flex-direction: column; line-height: 1.35; color: var(--c-text); font-size: .74rem; }
.acct-cell small { color: var(--c-text-3); font-size: .62rem; }
.acct-guest { color: var(--c-text-3); font-size: .72rem; }
.acct-tag { margin-right: 6px; }
.ai-tag { margin-left: 4px; }
.banned-tag { margin-left: 6px; }
.count-cell { color: var(--c-text-2); font-size: .72rem; white-space: nowrap; }
.first-seen { display: block; margin-top: 2px; color: var(--c-text-4); font-size: .6rem; }

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .admin-heading { align-items: flex-start; flex-direction: column; }
}
</style>

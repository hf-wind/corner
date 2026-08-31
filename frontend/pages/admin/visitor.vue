<template>
  <div class="visitor-admin admin-page-shell">
    <header class="admin-page-head">
      <div><span>{{ contentOnly ? 'CONTENT MANAGEMENT' : 'ACCESS MANAGEMENT' }}</span><h1>{{ contentOnly ? contentTitle : '访问管理' }}</h1><p>{{ contentOnly ? `${contentTitle}独立审核与追溯，不混入访问身份统计。` : '沿未登记访客、登记访客与登录用户链路查看访问和操作。' }}</p></div>
      <AdminRefreshButton :loading="loadingStats" @click="loadStats" />
    </header>

    <div v-if="!contentOnly" class="stats-grid">
      <div class="stat-card">
        <span class="stat-icon"><Icon name="ph:users-three-bold" /></span>
        <div><strong>{{ stats.visitors }}</strong><small>累计访客</small></div>
      </div>
      <div class="stat-card identity-stat"><span class="stat-icon"><Icon name="ph:user-focus-bold" /></span><div><strong>{{ stats.identity?.anonymous || 0 }}</strong><small>未登记访问</small></div></div>
      <div class="stat-card identity-stat"><span class="stat-icon"><Icon name="ph:identification-badge-bold" /></span><div><strong>{{ stats.identity?.registered || 0 }}</strong><small>登记访客访问</small></div></div>
      <div class="stat-card identity-stat"><span class="stat-icon"><Icon name="ph:user-circle-gear-bold" /></span><div><strong>{{ stats.identity?.users || 0 }}</strong><small>登录用户访问</small></div></div>
      <div class="stat-card identity-stat"><span class="stat-icon"><Icon name="ph:book-open-text-bold" /></span><div><strong>{{ stats.contentReads?.articles || 0 }}</strong><small>文章阅读</small></div></div>
      <div class="stat-card identity-stat"><span class="stat-icon"><Icon name="ph:wind-bold" /></span><div><strong>{{ stats.contentReads?.circle || 0 }}</strong><small>风讯角阅读</small></div></div>
      <div class="stat-card identity-stat"><span class="stat-icon"><Icon name="ph:robot-bold" /></span><div><strong>{{ stats.ai?.experiences || 0 }}</strong><small>AI 体验次数</small></div></div>
      <div class="stat-card identity-stat"><span class="stat-icon"><Icon name="ph:chat-circle-text-bold" /></span><div><strong>{{ stats.ai?.sessions || 0 }}</strong><small>AI 会话数量</small></div></div>
      <div class="stat-card">
        <span class="stat-icon"><Icon name="ph:user-fill" /></span>
        <div><strong>{{ stats.todayVisitors }}</strong><small>今日访客</small></div>
      </div>
      <div class="stat-card">
        <span class="stat-icon"><Icon name="ph:footprints-bold" /></span>
        <div><strong>{{ stats.visits }}</strong><small>足迹记录</small></div>
      </div>
    </div>

    <a-tabs v-model:active-key="activeTab" class="visitor-tabs">
      <a-tab-pane v-if="isAccessPage" key="profiles" tab="身份档案" />
      <a-tab-pane v-if="contentOnly" key="messages" :tab="`留言${stats.pendingMessages ? `（${stats.pendingMessages} 待审）` : ''}`" />
      <a-tab-pane v-if="contentOnly" key="bottles" :tab="`漂流瓶${stats.pendingBottles ? `（${stats.pendingBottles} 待审）` : ''}`" />
    </a-tabs>

    <div v-if="activeTab === 'messages' || activeTab === 'bottles'" class="message-review-pane">
        <div class="table-toolbar">
            <a-input v-model:value="msgFilter.keyword" allow-clear placeholder="搜索内容、署名或账号" class="message-search" @press-enter="loadMessages(1)">
              <template #prefix><Icon name="ph:magnifying-glass" /></template>
            </a-input>
            <a-select v-if="!contentOnly" v-model:value="msgFilter.type" style="width: 130px">
              <a-select-option value="">全部类型</a-select-option>
              <a-select-option value="message">留言</a-select-option>
              <a-select-option value="bottle">漂流瓶</a-select-option>
            </a-select>
            <a-select v-model:value="msgFilter.status" style="width: 130px">
              <a-select-option value="">全部状态</a-select-option>
              <a-select-option value="approved">已通过</a-select-option>
              <a-select-option value="rejected">已拒绝</a-select-option>
              <a-select-option value="caught">已被捞起</a-select-option>
              <a-select-option value="pending">待审核</a-select-option>
            </a-select>
            <a-button type="primary" @click="loadMessages(1)"><Icon name="ph:magnifying-glass-bold" /> 搜索</a-button>
            <a-button @click="resetMessageFilters"><Icon name="ph:arrow-counter-clockwise-bold" /> 重置</a-button>
            <span class="toolbar-spacer" />
            <AdminRefreshButton :loading="loadingMsgs" @click="loadMessages(msgPagination.current)" />
        </div>
        <a-spin :spinning="loadingMsgs">
          <div class="admin-table-shell">
            <a-table
              :data-source="messages"
              :columns="msgColumns"
              row-key="id"
              size="small"
              :pagination="false"
              :scroll="{ x: 980 }"
              :locale="{ emptyText: '暂无内容' }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'content'">
                  <div class="content-cell">
                    <a-tag :color="record.type === 'bottle' ? 'blue' : 'cyan'" class="type-tag">{{ record.type === 'bottle' ? '漂流瓶' : '留言' }}</a-tag>
                    <span class="content-ellipsis" :class="{ 'is-caught': record.status === 'caught' }">{{ record.content }}</span>
                  </div>
                </template>
                <template v-else-if="column.key === 'nickname'"><span class="nick-cell">{{ record.nickname || '未署名' }}</span></template>
                <template v-else-if="column.key === 'account'">
                  <template v-if="record.account">
                    <a-tag color="green" class="acct-tag">登录</a-tag>
                    <span class="acct-cell">{{ record.account.username }}<small v-if="record.account.email">{{ record.account.email }}</small></span>
                  </template>
                  <span v-else class="acct-guest">访客</span>
                </template>
                <template v-else-if="column.key === 'source'">
                  <span class="source-cell"><strong>{{ record.visitor?.region || record.originRegion || '未定位' }}</strong><small>{{ deviceText(record.visitor) }}</small></span>
                </template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
                </template>
                <template v-else-if="column.key === 'createdAt'">{{ formatTime(record.createdAt) }}</template>
                <template v-else-if="column.key === 'actions'">
                  <a-button type="link" size="small" @click="openDetail(record)"><Icon name="ph:eye-bold" /> 详情</a-button>
                  <a-button v-if="record.status !== 'approved' && record.status !== 'caught'" type="link" size="small" @click="handleApprove(record)"><Icon name="ph:check-bold" /> 通过</a-button>
                  <a-button v-if="record.status !== 'rejected' && record.status !== 'caught'" type="link" size="small" danger @click="openReject(record)"><Icon name="ph:x-bold" /> 拒绝</a-button>
                </template>
              </template>
            </a-table>
            <AdminPagination v-model:current="msgPagination.current" :page-size="msgPagination.pageSize" :total="msgPagination.total" :show-size-changer="false" @change="loadMessages" />
          </div>
        </a-spin>
    </div>

    <div v-if="activeTab === 'profiles'" class="visitor-profile-pane">
        <div class="table-toolbar">
            <a-input v-model:value="profileFilter.keyword" placeholder="搜索昵称" allow-clear style="width: 220px" @press-enter="loadProfiles(1)"><template #prefix><Icon name="ph:magnifying-glass" /></template></a-input>
            <a-select v-model:value="profileFilter.type" style="width: 140px">
              <a-select-option value="">全部身份</a-select-option>
              <a-select-option value="user">登录用户</a-select-option>
              <a-select-option value="registered">登记访客</a-select-option>
              <a-select-option value="anonymous">未登记访客</a-select-option>
            </a-select>
            <a-button type="primary" @click="loadProfiles(1)"><Icon name="ph:magnifying-glass-bold" /> 搜索</a-button>
            <a-button @click="resetProfileFilters"><Icon name="ph:arrow-counter-clockwise-bold" /> 重置</a-button>
            <span class="toolbar-spacer" />
            <AdminRefreshButton :loading="loadingProfiles" @click="loadProfiles(profilePagination.current)" />
        </div>
        <a-spin :spinning="loadingProfiles">
          <div class="admin-table-shell">
            <a-table
              :data-source="profiles"
              :columns="profileColumns"
              row-key="id"
              size="small"
              :pagination="false"
              :scroll="{ x: 800 }"
              :locale="{ emptyText: '暂无访客' }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'nickname'">
                  <span class="nick-cell">{{ record.nickname || '未署名' }}</span>
                  <a-tag :color="identityColor(record.identity)" class="identity-tag">{{ identityText(record.identity) }}</a-tag>
                </template>
                <template v-else-if="column.key === 'region'">
                  <span class="region-cell">{{ record.region || '未定位' }}</span>
                </template>
                <template v-else-if="column.key === 'environment'"><span class="source-cell"><strong>{{ record.browser || '未知浏览器' }} · {{ record.os || '未知系统' }}</strong><small>{{ record.device || '未知设备' }} · 标识 {{ record.clientId || '-' }}</small></span></template>
                <template v-else-if="column.key === 'counts'">
                  <div class="access-counts"><span>访问 {{ record.access?.visits ?? record.visitCount }}</span><span>文章阅读 {{ record.access?.articles || 0 }}</span><span>风讯角阅读 {{ record.access?.circle || 0 }}</span><span>站点操作 {{ record.access?.operations || 0 }}</span><span>AI 体验 {{ record.ai?.experiences || 0 }}</span><span>AI 会话 {{ record.ai?.sessions || 0 }}</span><span>反馈 {{ record.ai?.feedback || 0 }}（有帮助 {{ record.ai?.helpful || 0 }}）</span></div>
                </template>
                <template v-else-if="column.key === 'achievements'">
                  <a-tag color="gold">{{ record.achievementCount }} 枚</a-tag>
                </template>
                <template v-else-if="column.key === 'lastSeen'">
                  {{ formatTime(record.lastSeenAt) }}<span v-if="record.firstSeenAt" class="first-seen">初访 {{ formatTime(record.firstSeenAt) }}</span>
                </template>
                <template v-else-if="column.key === 'session'"><a-button type="link" size="small" :disabled="!record.conversationId" @click="openSession(record)"><Icon name="ph:chat-circle-text-bold" /> 查看</a-button></template>
                <template v-else-if="column.key === 'profileDetail'"><a-button type="link" size="small" @click="openProfileDetail(record)" title="查看身份档案"><Icon name="ph:identification-card-bold" /></a-button></template>
              </template>
            </a-table>
            <AdminPagination v-model:current="profilePagination.current" :page-size="profilePagination.pageSize" :total="profilePagination.total" :show-size-changer="false" @change="loadProfiles" />
          </div>
        </a-spin>
    </div>

    <a-modal v-model:open="profileDialog.open" title="访问身份档案" width="680px" :footer="null">
      <div v-if="profileDialog.record" class="detail-body">
        <div class="detail-row"><span class="detail-label">身份链路</span><a-tag :color="identityColor(profileDialog.record.identity)">{{ identityText(profileDialog.record.identity) }}</a-tag></div>
        <div class="detail-row"><span class="detail-label">昵称 / 账号</span><span>{{ profileDialog.record.nickname || '未登记' }}<template v-if="profileDialog.record.account"> · {{ profileDialog.record.account.username }}（{{ profileDialog.record.account.email || '无邮箱' }}）</template></span></div>
        <div class="detail-row"><span class="detail-label">客户端标识</span><span>{{ profileDialog.record.clientId || '-' }}</span></div>
        <div class="detail-row"><span class="detail-label">IP 摘要</span><span>{{ profileDialog.record.ipHash || '-' }}</span></div>
        <div class="detail-row"><span class="detail-label">位置与环境</span><span>{{ profileDialog.record.region || '未定位' }} · {{ profileDialog.record.browser || '未知浏览器' }} · {{ profileDialog.record.os || '未知系统' }} · {{ profileDialog.record.device || '未知设备' }}</span></div>
        <div class="detail-row"><span class="detail-label">访问统计</span><span>访问 {{ profileDialog.record.access?.visits || 0 }} 次 · 文章 {{ profileDialog.record.access?.articles || 0 }} · 风讯角 {{ profileDialog.record.access?.circle || 0 }} · 站点操作 {{ profileDialog.record.access?.operations || 0 }}</span></div>
        <div class="detail-row"><span class="detail-label">AI 统计</span><span>体验 {{ profileDialog.record.ai?.experiences || 0 }} · 会话 {{ profileDialog.record.ai?.sessions || 0 }} · 反馈 {{ profileDialog.record.ai?.feedback || 0 }}（有帮助 {{ profileDialog.record.ai?.helpful || 0 }}）</span></div>
        <div v-if="profileDialog.record.ai?.feedbackItems?.length" class="detail-row detail-row-block"><span class="detail-label">AI 反馈记录</span><div class="event-list"><article v-for="item in profileDialog.record.ai.feedbackItems" :key="item.id"><span>{{ item.helpful ? '有帮助' : '没帮助' }} · {{ item.scene || '聊天' }}</span><small>{{ formatTime(item.createdAt) }}</small></article></div></div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="detailDialog.open"
      :title="detailDialog.record ? (detailDialog.record.type === 'bottle' ? '漂流瓶详情' : '留言详情') : ''"
      width="720px"
      :footer="null"
    >
      <div v-if="detailDialog.record" class="detail-body">
        <div class="detail-row"><span class="detail-label">类型</span><a-tag :color="detailDialog.record.type === 'bottle' ? 'blue' : 'cyan'">{{ detailDialog.record.type === 'bottle' ? '漂流瓶' : '留言' }}</a-tag></div>
        <div class="detail-row detail-row-block"><span class="detail-label">内容</span><p class="detail-content">{{ detailDialog.record.content }}</p></div>
        <div class="detail-row"><span class="detail-label">署名</span><span>{{ detailDialog.record.nickname || '未署名' }}</span></div>
        <div class="detail-row"><span class="detail-label">账号</span><span v-if="detailDialog.record.account">{{ detailDialog.record.account.username }}<small v-if="detailDialog.record.account.email">（{{ detailDialog.record.account.email }}）</small></span><span v-else class="acct-guest">访客</span></div>
        <div class="detail-row"><span class="detail-label">访客摘要</span><span>{{ detailDialog.record.visitor?.id || '-' }}<small v-if="detailDialog.record.visitor?.ipHash"> · IP {{ detailDialog.record.visitor.ipHash }}</small></span></div>
        <div class="detail-row"><span class="detail-label">位置与设备</span><span>{{ detailDialog.record.visitor?.region || detailDialog.record.originRegion || '未定位' }} · {{ deviceText(detailDialog.record.visitor) }}</span></div>
        <div class="detail-row"><span class="detail-label">访问记录</span><span>{{ detailDialog.record.visitor?.visitCount || 0 }} 次 · 最近 {{ formatTime(detailDialog.record.visitor?.lastSeenAt) || '未知' }}</span></div>
        <div class="detail-row"><span class="detail-label">状态</span><a-tag :color="statusColor(detailDialog.record.status)">{{ statusText(detailDialog.record.status) }}</a-tag></div>
        <div v-if="detailDialog.record.aiReview" class="detail-row"><span class="detail-label">AI 审核</span><span>{{ detailDialog.record.aiReview }}</span></div>
        <div v-if="detailDialog.record.rejectReason" class="detail-row"><span class="detail-label">拒绝原因</span><span>{{ detailDialog.record.rejectReason }}</span></div>
        <template v-if="detailDialog.record.type === 'bottle'">
          <div class="detail-row"><span class="detail-label">漂流状态</span><span>{{ detailDialog.record.originRegion || '未知起点' }} → {{ detailDialog.record.currentRegion || '仍在漂流' }} · 累计捞起 {{ detailDialog.record.catchCount || 0 }} 次</span></div>
          <div v-if="detailDialog.record.catchEvents?.length" class="detail-row detail-row-block">
            <span class="detail-label">捞起记录</span>
            <div class="event-list">
              <article v-for="event in detailDialog.record.catchEvents" :key="event.id">
                <span><strong>{{ event.catcher?.nickname || event.catcher?.id || '未知旅人' }}</strong><a-tag>{{ resolutionText(event.resolution) }}</a-tag></span>
                <small>{{ event.catcherRegion || event.catcher?.region || '未知地区' }} · {{ formatTime(event.caughtAt) }}<template v-if="event.releasedAt"> · 离手 {{ formatTime(event.releasedAt) }}</template></small>
              </article>
            </div>
          </div>
          <div v-if="detailDialog.record.chain?.length" class="detail-row detail-row-block">
            <span class="detail-label">完整接力</span>
            <ol class="chain-list">
              <li v-for="(node, index) in detailDialog.record.chain" :key="node.id"><i>{{ index + 1 }}</i><div><strong>{{ node.nickname || '未署名' }} · {{ node.originRegion || '未知地区' }}</strong><p>{{ node.content }}</p><small>{{ formatTime(node.createdAt) }} · {{ statusText(node.status) }}</small></div></li>
            </ol>
          </div>
        </template>
        <div class="detail-row"><span class="detail-label">提交时间</span><span>{{ formatTime(detailDialog.record.createdAt) }}</span></div>
      </div>
    </a-modal>

    <a-modal v-model:open="sessionDialog.open" width="100vw" wrap-class-name="session-modal" :footer="null" centered>
      <template #title><div class="session-title"><span class="session-title-icon"><Icon name="ph:chat-circle-text-bold" /></span><div><strong>{{ sessionDialog.record?.nickname || '未登记访客' }} · AI 会话</strong><small>{{ identityText(sessionDialog.record?.identity) }} · {{ sessionDialog.record?.region || '未定位' }} · {{ sessionDialog.record?.conversationId || '暂无会话标识' }}</small></div></div></template>
      <a-spin :spinning="sessionDialog.loading"><div v-if="sessionDialog.detail?.messages?.length" class="session-viewer"><div class="session-summary"><span><Icon name="ph:clock-bold" /> {{ sessionDialog.detail.messages.length }} 条消息</span><span><Icon name="ph:calendar-blank-bold" /> 最近 {{ formatTime(sessionDialog.detail.messages.at(-1)?.createdAt) || '未知' }}</span></div><div class="session-messages"><article v-for="message in sessionDialog.detail.messages" :key="message.id" :class="message.role"><header><span class="message-role"><Icon :name="message.role === 'user' ? 'ph:user-bold' : 'ph:sparkle-bold'" />{{ message.role === 'user' ? '访问者' : 'AI 助手' }}</span><time>{{ formatTime(message.createdAt) }}</time></header><div class="message-content"><AdminMarkdown :content="message.content" /></div></article></div></div><a-empty v-else-if="!sessionDialog.loading" description="暂无 AI 会话记录" /></a-spin>
    </a-modal>

    <a-modal v-model:open="rejectDialog.open" title="拒绝这条内容" width="420px" @ok="confirmReject" @cancel="rejectDialog.open = false">
      <a-textarea v-model:value="rejectDialog.reason" placeholder="请输入拒绝理由" :rows="4" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const route = useRoute()
const isAccessPage = computed(() => route.path === '/admin/visitor' && String(route.query.section || '') !== 'content')
const contentType = computed<'message' | 'bottle'>(() => String(route.query.tab || '') === 'bottles' ? 'bottle' : 'message')
const contentOnly = computed(() => !isAccessPage.value)
const contentTitle = computed(() => contentType.value === 'bottle' ? '漂流瓶管理' : '留言管理')
const initialTab = String(route.query.tab || '')
const activeTab = ref(isAccessPage.value ? (['messages', 'bottles'].includes(initialTab) ? initialTab : 'profiles') : (contentType.value === 'bottle' ? 'bottles' : 'messages'))
const loadingStats = ref(false)
const stats = reactive({ visitors: 0, todayVisitors: 0, visits: 0, messages: 0, bottles: 0, pendingMessages: 0, pendingBottles: 0, identity: {}, contentReads: {}, ai: {} } as any)

const pendingTotal = computed(() => stats.pendingMessages + stats.pendingBottles)

const loadingMsgs = ref(false)
const messages = ref<any[]>([])
const msgFilter = reactive({ keyword: '', type: contentType.value, status: '' })
const msgPagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: false })
const msgColumns = [
  { title: '内容', key: 'content', minWidth: 280 },
  { title: '署名', key: 'nickname', width: 110 },
  { title: '账号', key: 'account', width: 150 },
  { title: '来源', key: 'source', width: 150 },
  { title: '状态', key: 'status', width: 110 },
  { title: '时间', key: 'createdAt', width: 150 },
  { title: '操作', key: 'actions', width: 170, fixed: 'right' as const },
]
function resetMessageFilters() { Object.assign(msgFilter, { keyword: '', type: contentType.value, status: '' }); void loadMessages(1) }

const loadingProfiles = ref(false)
const profiles = ref<any[]>([])
const profileFilter = reactive({ keyword: '', type: '' })
const profilePagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: false })
const profileColumns = [
  { title: '昵称', key: 'nickname', width: 160 },
  { title: '地区', key: 'region', width: 130 },
  { title: '访问环境', key: 'environment', minWidth: 220 },
  { title: '访问与行为', key: 'counts', minWidth: 360 },
  { title: '成就', key: 'achievements', width: 90 },
  { title: '最近到访', key: 'lastSeen', width: 230 },
  { title: 'AI 会话', key: 'session', width: 100, fixed: 'right' as const },
  { title: '档案', key: 'profileDetail', width: 76, fixed: 'right' as const },
]
function resetProfileFilters() { Object.assign(profileFilter, { keyword: '', type: '' }); void loadProfiles(1) }

const rejectDialog = reactive({ open: false, record: null as any, reason: '' })
const detailDialog = reactive({ open: false, record: null as any })
const sessionDialog = reactive<any>({ open: false, loading: false, record: null, detail: null })
const profileDialog = reactive<any>({ open: false, record: null })

onMounted(() => {
  void loadStats()
  if (activeTab.value === 'profiles') void loadProfiles(1)
  else void loadMessages(1)
})
watch(contentOnly, (onlyContent) => {
  activeTab.value = onlyContent ? (contentType.value === 'bottle' ? 'bottles' : 'messages') : (['messages', 'bottles'].includes(String(route.query.tab || '')) ? String(route.query.tab) : 'profiles')
  if (activeTab.value === 'profiles') void loadProfiles(1)
  else void loadMessages(1)
})
watch(activeTab, (key) => {
  if (key === 'messages' || key === 'bottles') {
    msgFilter.type = key === 'bottles' ? 'bottle' : 'message'
    void loadMessages(1)
  }
})
watch(() => route.query.tab, (value) => {
  if (!contentOnly.value) return
  const next = String(value || '') === 'bottles' ? 'bottles' : 'messages'
  if (activeTab.value !== next) activeTab.value = next
})

function statusColor(status: string) {
  return status === 'approved' ? 'green' : status === 'rejected' ? 'red' : status === 'caught' ? 'blue' : 'orange'
}
function statusText(status: string) {
  return status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : status === 'caught' ? '已捞起' : '待审核'
}
function identityText(identity?: string) {
  return identity === 'user' ? '登录用户' : identity === 'registered' ? '登记访客' : '未登记'
}
function identityColor(identity?: string) {
  return identity === 'user' ? 'green' : identity === 'registered' ? 'blue' : 'default'
}
function openDetail(record: any) {
  detailDialog.record = record
  detailDialog.open = true
}
function openProfileDetail(record: any) { profileDialog.record = record; profileDialog.open = true }
async function openSession(record: any) {
  if (!record.conversationId) return
  Object.assign(sessionDialog, { open: true, loading: true, record, detail: null })
  try { sessionDialog.detail = await api.get(`/ai/admin/conversations/${encodeURIComponent(record.conversationId)}`, { page: 1, pageSize: 100 }) }
  catch (error: any) { toast.error(error?.message || '会话加载失败') }
  finally { sessionDialog.loading = false }
}
function formatTime(value?: string) {
  return value ? String(value).slice(0, 16).replace('T', ' ') : ''
}
function deviceText(visitor?: any) {
  if (!visitor) return '未知设备'
  return [visitor.device, visitor.browser, visitor.os].filter(Boolean).join(' · ') || '未知设备'
}
function resolutionText(value?: string) {
  return ({ holding: '持有中', relayed: '已接力', returned: '已放回', expired: '已过期' } as Record<string, string>)[value || ''] || '已记录'
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
    if (msgFilter.keyword.trim()) params.keyword = msgFilter.keyword.trim()
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
    if (profileFilter.type) params.type = profileFilter.type
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

</script>

<style scoped>
.visitor-admin { width: min(1220px, 100%); margin: 0 auto; }
.admin-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
.admin-heading h1 { margin: 0 0 3px; color: var(--c-text); font-size: 1.5rem; }
.admin-heading p { margin: 0; color: var(--c-text-3); font-size: .76rem; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
.stat-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 10px; background: var(--ld-bg-card); position: relative; }
.stat-icon { display: grid; width: 38px; height: 38px; flex: 0 0 38px; place-items: center; border-radius: 10px; background: color-mix(in srgb, var(--c-primary) 10%, transparent); color: var(--c-primary); font-size: 1.05rem; }
.stat-card strong { display: block; color: var(--c-text); font-size: 1.1rem; line-height: 1.2; }
.stat-card small { color: var(--c-text-3); font-size: .64rem; }
.pending-dot { position: absolute; top: 8px; right: 10px; padding: 1px 6px; border-radius: 8px; background: color-mix(in srgb, var(--c-primary) 14%, transparent); color: var(--c-primary); font-size: .58rem; font-style: normal; }

.visitor-tabs :deep(.ant-tabs-nav) { margin-bottom: 12px; }
.table-toolbar { margin-bottom: 12px; flex-wrap:wrap; }
.toolbar-spacer { flex:1; }
.message-search { width: 240px; }
.list-card { border-radius: 8px; }
.content-cell { display: flex; align-items: center; gap: 8px; min-width: 0; }
.content-cell span {  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.content-ellipsis { display: block; }
.content-cell .is-caught { color: var(--c-text-3); }
.type-tag { flex: 0 0 auto; }
.nick-cell { color: var(--c-text); font-size: .78rem; }
.acct-cell { display: inline-flex; flex-direction: column; line-height: 1.35; color: var(--c-text); font-size: .74rem; }
.acct-cell small { color: var(--c-text-3); font-size: .62rem; }
.acct-guest { color: var(--c-text-3); font-size: .72rem; }
.source-cell { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.source-cell strong { color: var(--c-text-2); font-size: .7rem; font-weight: 600; }
.source-cell small { overflow: hidden; color: var(--c-text-4); font-size: .58rem; text-overflow: ellipsis; white-space: nowrap; }
.acct-tag { margin-right: 6px; }
.ai-tag { margin-left: 4px; }
.identity-tag {
  display: inline-flex;
  width: auto !important;
  max-width: 100%;
  align-items: center;
  margin-left: 6px;
  white-space: nowrap;
}
.region-cell { color: var(--c-text-2); font-size: .7rem; }
.count-cell { color: var(--c-text-2); font-size: .72rem; white-space: nowrap; }
.access-counts{display:flex;flex-wrap:wrap;gap:5px}.access-counts span{padding:3px 6px;border-radius:5px;background:var(--c-bg-1);color:var(--c-text-2);font-size:.61rem;white-space:nowrap}.access-counts span:nth-child(-n+3){color:var(--c-primary)}
.first-seen { display: block; margin-top: 2px; color: var(--c-text-4); font-size: .6rem; }
.detail-body { display: flex; flex-direction: column; gap: 12px; }
.detail-row { display: grid; grid-template-columns: 84px minmax(0, 1fr); align-items: start; gap: 12px; color: var(--c-text-2); font-size: .78rem; }
.detail-row :deep(.ant-tag) { width:max-content; max-width:100%; justify-self:start; }
.detail-row-block { grid-template-columns: 84px minmax(0, 1fr); }
.detail-label { color: var(--c-text-3); font-size: .65rem; }
.detail-content { margin: 0; padding: 10px 12px; border-radius: 8px; background: var(--c-bg-1); color: var(--c-text); line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
.event-list { display: grid; gap: 7px; }
.event-list article { display: flex; justify-content: space-between; gap: 10px; padding: 9px 11px; border: 1px solid var(--border); border-radius: 8px; background: var(--c-bg-1); }
.event-list article > span { display: flex; align-items: center; gap: 7px; }
.event-list small { color: var(--c-text-3); font-size: .62rem; }
.chain-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.chain-list li { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 9px; }
.chain-list i { display: grid; width: 24px; height: 24px; border-radius: 50%; background: var(--c-primary-soft); color: var(--c-primary); font-size: .62rem; font-style: normal; place-items: center; }
.chain-list strong { color: var(--c-text-2); font-size: .68rem; }
.chain-list p { margin: 3px 0; color: var(--c-text); font-size: .76rem; line-height: 1.6; white-space: pre-wrap; }
.chain-list small { color: var(--c-text-4); font-size: .58rem; }
.session-messages { display:grid; gap:10px; max-height:58vh; overflow:auto; }
.session-messages article { max-width:88%; padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:var(--c-bg-1); }
.session-messages article.user { margin-left:auto; background:var(--c-primary-soft); }
.session-messages header { display:flex; justify-content:space-between; gap:12px; margin-bottom:6px; font-size:.65rem; }
.session-messages time { color:var(--c-text-3); }
.session-title { display:flex; align-items:center; gap:10px; min-width:0; }.session-title-icon { display:grid; width:34px; height:34px; border-radius:9px; background:var(--c-primary-soft); color:var(--c-primary); place-items:center; }.session-title div { display:flex; min-width:0; flex-direction:column; gap:3px; }.session-title strong { overflow:hidden; font-size:.82rem; text-overflow:ellipsis; white-space:nowrap; }.session-title small { overflow:hidden; color:var(--c-text-3); font-size:.58rem; text-overflow:ellipsis; white-space:nowrap; }.session-viewer { display:flex; min-height:min(72vh,720px); flex-direction:column; gap:12px; }.session-summary { display:flex; flex-wrap:wrap; gap:14px; padding:9px 12px; border:1px solid var(--border); border-radius:8px; background:var(--c-bg-1); color:var(--c-text-3); font-size:.6rem; }.session-summary span { display:flex; align-items:center; gap:5px; }.session-messages { flex:1; max-height:calc(100vh - 190px); padding:4px 8px 18px 2px; overflow:auto; overscroll-behavior:contain; }.session-messages article { max-width:min(860px,90%); padding:13px 15px; border-radius:10px; box-shadow:0 4px 18px color-mix(in srgb,var(--ld-shadow) 55%,transparent); }.message-role { display:inline-flex; align-items:center; gap:5px; color:var(--c-text-2); font-weight:650; }.message-content { color:var(--c-text-1); font-size:.72rem; line-height:1.75; }.message-content :deep(p:first-child) { margin-top:0; }.message-content :deep(p:last-child) { margin-bottom:0; }.session-modal :deep(.ant-modal) { max-width:100vw; top:0; padding-bottom:0; }.session-modal :deep(.ant-modal-content) { min-height:calc(100vh - 16px); border-radius:14px 14px 0 0; }.session-modal :deep(.ant-modal-body) { min-height:calc(100vh - 106px); padding:8px 24px 24px; }

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .admin-heading { align-items: flex-start; flex-direction: column; }
  .message-search { width: min(100%, 280px); }
  .event-list article { align-items: flex-start; flex-direction: column; }
}
</style>

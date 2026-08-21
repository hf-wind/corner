<template>
  <section class="ai-usage-overview" aria-labelledby="ai-usage-title">
    <header class="usage-head">
      <div><span>AI USAGE</span><h2 id="ai-usage-title">使用统计</h2><p>请求、Token、反馈与模型消耗统一汇总。</p></div>
      <div class="usage-actions">
        <a-input v-model:value="query" allow-clear placeholder="身份 / 邮箱 / 地区" @press-enter="page = 1" />
        <a-button type="primary" @click="page = 1"><Icon name="ph:magnifying-glass-bold" /> 搜索</a-button>
        <a-button @click="resetQuery"><Icon name="ph:arrow-counter-clockwise-bold" /> 重置</a-button>
        <AdminRefreshButton :loading="loading" @click="load(page)" />
      </div>
    </header>
    <div class="usage-metrics">
      <article v-for="item in metrics" :key="item.label"><Icon :name="item.icon" /><span><small>{{ item.label }}</small><strong>{{ item.value }}</strong><em>{{ item.note }}</em></span></article>
    </div>
    <div class="admin-table-shell usage-table">
      <a-table :data-source="filteredActors" :columns="columns" row-key="conversationId" size="small" :pagination="false" :scroll="{ x: 1420 }" :locale="{ emptyText: '暂无 AI 使用记录' }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actor'"><strong>{{ record.name || '匿名访客' }}</strong><small>{{ record.email || record.region || '未关联档案' }}</small></template>
          <template v-else-if="column.key === 'calls'">{{ formatNumber(record.calls) }} / {{ formatNumber(record.messageCount) }} 条</template>
          <template v-else-if="column.key === 'profile'"><span class="actor-meta">{{ record.actorType === 'guest' ? '访客' : '注册用户' }} · {{ record.region || '未知地区' }}<br>{{ record.browser || '未知浏览器' }} · {{ record.device || '未知设备' }}</span></template>
          <template v-else-if="column.key === 'input'">{{ formatNumber(record.inputTokens) }}</template>
          <template v-else-if="column.key === 'output'">{{ formatNumber(record.outputTokens) }}</template>
          <template v-else-if="column.key === 'total'">{{ formatNumber(record.totalTokens) }}</template>
          <template v-else-if="column.key === 'cost'">¥{{ formatCost(record.estimatedCostCnyMin) }} - ¥{{ formatCost(record.estimatedCostCny) }}</template>
          <template v-else-if="column.key === 'actions'"><a-button type="link" size="small" :disabled="!record.conversationId" @click="openConversation(record)"><Icon name="ph:eye-bold" /> 查看会话</a-button></template>
        </template>
      </a-table>
      <AdminPagination v-model:current="page" :page-size="pageSize" :total="usage.actorPagination?.total || 0" :show-size-changer="false" @change="load" />
    </div>
    <p v-if="usage.pricing?.modelTier" class="pricing-note">{{ usage.pricing.modelTier }} · {{ usage.pricing.period === 'peak' ? '高峰时段' : '空闲时段' }}，费用为历史记录估算区间。</p>

    <a-modal v-model:open="conversation.open" :title="`${conversation.actor?.name || '访客'} · 会话记录`" width="760px" :footer="null" @cancel="closeConversation">
      <a-spin :spinning="conversation.loading">
        <div v-if="conversation.detail?.messages?.length" class="conversation-messages">
          <article v-for="message in conversation.detail.messages" :key="message.id" :class="message.role">
            <header><strong>{{ message.role === 'user' ? '用户' : 'AI' }}</strong><time>{{ formatTime(message.createdAt) }}</time></header>
            <AdminMarkdown :content="message.content" />
          </article>
        </div>
        <a-empty v-else-if="!conversation.loading" description="暂无会话消息" />
        <AdminPagination v-if="conversation.detail" v-model:current="conversation.page" :page-size="conversation.pageSize" :total="conversation.detail.total || 0" :show-size-changer="false" @change="loadConversation" />
      </a-spin>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
const api = useApi()
const toast = useToast()
const loading = ref(false)
const query = ref('')
const analytics = ref<any>({})
const usage = ref<any>({})
const page = ref(1)
const pageSize = 10
const conversation = reactive<any>({ open: false, loading: false, actor: null, detail: null, page: 1, pageSize: 50 })
const columns = [
  { title: '身份', key: 'actor', minWidth: 180 },
  { title: '请求 / 消息', key: 'calls', width: 132 },
  { title: '访问环境', key: 'profile', width: 190 },
  { title: '输入 Token', key: 'input', width: 120 },
  { title: '输出 Token', key: 'output', width: 120 },
  { title: 'Token 合计', key: 'total', width: 120 },
  { title: '估算费用', key: 'cost', width: 190 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' as const },
]
const metrics = computed(() => [
  { label: 'AI 使用量', value: formatNumber(analytics.value.total), note: '前台体验事件', icon: 'ph:sparkle-bold' },
  { label: '请求数量', value: formatNumber(usage.value.totals?.calls || analytics.value.chats), note: '模型与会话调用', icon: 'ph:paper-plane-tilt-bold' },
  { label: 'Token 使用量', value: formatNumber(usage.value.totals?.totalTokens), note: `输入 ${formatNumber(usage.value.totals?.inputTokens)} · 输出 ${formatNumber(usage.value.totals?.outputTokens)}`, icon: 'ph:brackets-curly-bold' },
  { label: '模型费用', value: `¥${formatCost(usage.value.totals?.estimatedCostCny)}`, note: usage.value.pricing?.modelTier || '按记录估算', icon: 'ph:currency-circle-dollar-bold' },
  { label: '回答好评率', value: `${Number(analytics.value.helpfulRate || 0)}%`, note: `${formatNumber(analytics.value.feedbackTotal)} 次反馈`, icon: 'ph:thumbs-up-bold' },
])
const filteredActors = computed(() => {
  const q = query.value.trim().toLocaleLowerCase()
  if (!q) return usage.value.actors || []
  return (usage.value.actors || []).filter((record: any) => [record.name, record.email, record.region, record.browser, record.device, record.actorType].some(value => String(value || '').toLocaleLowerCase().includes(q)))
})
function resetQuery() { query.value = ''; page.value = 1 }
function formatNumber(value?: number) { return Number(value || 0).toLocaleString('zh-CN') }
function formatCost(value?: number) { return Number(value || 0).toFixed(6) }
function formatTime(value?: string) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '' }
async function load(target = page.value) {
  page.value = target
  loading.value = true
  try {
    const [analyticsResult, usageResult] = await Promise.all([
      api.get('/ai/admin/analytics'),
      api.get('/ai/admin/usage', { page: target, pageSize }),
    ])
    analytics.value = analyticsResult || {}
    usage.value = usageResult || {}
  } catch (error: any) {
    analytics.value = {}
    usage.value = {}
    toast.error(error?.message || 'AI 使用统计加载失败')
  } finally { loading.value = false }
}
async function openConversation(actor: any) {
  Object.assign(conversation, { open: true, actor, detail: null, page: 1 })
  await loadConversation(1)
}
async function loadConversation(target = conversation.page) {
  if (!conversation.actor?.conversationId) return
  conversation.page = target
  conversation.loading = true
  try {
    conversation.detail = await api.get(`/ai/admin/conversations/${encodeURIComponent(conversation.actor.conversationId)}`, { page: target, pageSize: conversation.pageSize })
  } catch (error: any) {
    conversation.detail = null
    toast.error(error?.message || '会话加载失败')
  } finally { conversation.loading = false }
}
function closeConversation() { Object.assign(conversation, { actor: null, detail: null, page: 1 }) }
onMounted(load)
</script>

<style scoped>
.ai-usage-overview { margin-bottom: 18px; }
.usage-head { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:12px; }
.usage-actions { display:flex; align-items:center; justify-content:flex-end; flex-wrap:wrap; gap:8px; min-width:0; }
.usage-actions .ant-input { width:min(220px, 100%); }
.usage-head span { color:var(--c-primary); font-size:.58rem; letter-spacing:.12em; }.usage-head h2 { margin:3px 0 0; font-size:1rem; }.usage-head p { margin:3px 0 0; color:var(--c-text-3); font-size:.68rem; }
.usage-metrics { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; margin-bottom:12px; }.usage-metrics article { display:flex; align-items:center; gap:10px; min-width:0; padding:13px; border:1px solid var(--border); border-radius:8px; background:var(--ld-bg-card); }.usage-metrics article>svg { width:30px; height:30px; padding:7px; flex:0 0 auto; border-radius:7px; background:var(--c-primary-soft); color:var(--c-primary); }.usage-metrics span { min-width:0; }.usage-metrics small,.usage-metrics em { display:block; overflow:hidden; color:var(--c-text-3); font-size:.58rem; font-style:normal; text-overflow:ellipsis; white-space:nowrap; }.usage-metrics strong { display:block; margin:2px 0; font-size:.86rem; }
.usage-table strong,.usage-table small { display:block; }.usage-table small { margin-top:2px; color:var(--c-text-3); font-size:.65rem; }.actor-meta { color:var(--c-text-3); font-size:.65rem; line-height:1.6; }.pricing-note { margin:8px 0 0; color:var(--c-text-3); font-size:.62rem; }
.conversation-messages { display:grid; gap:10px; max-height:58vh; overflow:auto; }.conversation-messages article { max-width:88%; padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:var(--c-bg-1); }.conversation-messages article.user { margin-left:auto; background:var(--c-primary-soft); }.conversation-messages header { display:flex; justify-content:space-between; gap:12px; margin-bottom:6px; font-size:.65rem; }.conversation-messages time { color:var(--c-text-3); }
@media(max-width:1100px){.usage-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.usage-head{align-items:stretch;flex-direction:column}.usage-actions{justify-content:stretch}.usage-actions .ant-input{width:100%}.usage-actions .ant-btn{flex:1 1 auto}.usage-metrics{grid-template-columns:1fr}}
</style>

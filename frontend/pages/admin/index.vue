<template>
  <div class="dashboard admin-page-shell">
    <header class="dashboard-head admin-page-head">
      <div><span>站点工作台</span><h1>{{ greeting }}</h1><p>{{ today }}，内容、互动、AI 与运行状态都汇总在这里。</p><small class="daily-quote">{{ dailyQuote }}</small></div>
      <div class="head-actions"><a-button @click="router.push('/')"><Icon name="ph:arrow-square-out-bold" /> 前台</a-button><a-button type="primary" @click="router.push('/admin/posts/create')"><Icon name="ph:plus-bold" /> 写文章</a-button></div>
    </header>

    <a-spin :spinning="loading" class="dashboard-spin">
      <section class="metric-grid" aria-label="核心指标">
        <button v-for="metric in metrics" :key="metric.label" type="button" class="metric" @click="router.push(metric.to)">
          <span :class="metric.tone"><Icon :name="metric.icon" /></span>
          <div><small>{{ metric.label }}</small><strong>{{ formatNumber(metric.value) }}</strong><p>{{ metric.note }}</p></div>
          <Icon name="ph:caret-right-bold" class="metric-arrow" />
        </button>
      </section>

      <section class="analytics-grid" aria-label="趋势图表">
        <article class="chart-panel chart-wide">
          <header><div><h2>访问趋势</h2><p>最近 14 天实际到访次数</p></div><strong>{{ formatNumber(trendTotal(data.trends.visits)) }}</strong></header>
          <div v-show="hasVisits" ref="visitChartEl" class="chart-canvas" />
          <a-empty v-if="!hasVisits" class="chart-empty" description="暂无访问趋势数据" />
        </article>
        <article class="chart-panel">
          <header><div><h2>内容发布</h2><p>文章、瞬间、相册与书影</p></div></header>
          <div v-show="hasContentTrends" ref="contentChartEl" class="chart-canvas" />
          <a-empty v-if="!hasContentTrends" class="chart-empty" description="暂无内容发布数据" />
        </article>
        <article class="chart-panel">
          <header><div><h2>AI 消耗</h2><p>每日调用与输入/输出 Token</p></div></header>
          <div v-show="hasAiTrends" ref="aiChartEl" class="chart-canvas" />
          <a-empty v-if="!hasAiTrends" class="chart-empty" description="暂无 AI 调用数据" />
        </article>
        <article class="chart-panel">
          <header><div><h2>身份链路</h2><p>未登记、登记访客与登录用户访问</p></div></header>
          <div v-show="hasIdentityTrends" ref="identityChartEl" class="chart-canvas" />
          <a-empty v-if="!hasIdentityTrends" class="chart-empty" description="暂无身份访问数据" />
        </article>
      </section>
      <a-alert v-if="chartError" class="chart-error" type="error" show-icon message="图表渲染失败" description="统计数据已经加载，但图表组件初始化失败。请刷新页面重试。" />

      <div class="dashboard-grid">
        <section class="panel content-panel">
          <header class="panel-head"><div><h2>内容矩阵</h2><p>保存版本与公开状态</p></div><a-button type="link" @click="router.push('/admin/posts')">内容管理 <Icon name="ph:arrow-right-bold" /></a-button></header>
          <div class="content-matrix">
            <button v-for="row in contentRows" :key="row.label" type="button" @click="router.push(row.to)">
              <span class="row-icon"><Icon :name="row.icon" /></span><div><strong>{{ row.label }}</strong><small>共 {{ formatNumber(row.total) }} 项</small></div>
              <dl :class="{ 'has-unpublished': row.showUnpublished }"><div><dt>公开</dt><dd>{{ row.published }}</dd></div><div><dt>草稿</dt><dd>{{ row.draft }}</dd></div><div v-if="row.showUnpublished"><dt>下架</dt><dd>{{ row.unpublished }}</dd></div><div><dt>私密</dt><dd>{{ row.private }}</dd></div></dl>
            </button>
          </div>
          <footer class="structure-strip"><span><b>{{ data.content.categories }}</b> 分类</span><span><b>{{ data.content.tags }}</b> 标签</span><span><b>{{ data.content.media }}</b> 媒体</span><span><b>{{ formatNumber(data.content.likes) }}</b> 点赞</span></footer>
        </section>

        <section class="panel review-panel">
          <header class="panel-head"><div><h2>审核队列</h2><p>前台所有待确认互动</p></div><span class="pending-count" :class="{ clear: !data.pending.total }">{{ data.pending.total }}</span></header>
          <div class="review-list">
            <button v-for="item in reviewRows" :key="item.label" type="button" @click="router.push(item.to)"><span><Icon :name="item.icon" />{{ item.label }}</span><strong>{{ item.value }}</strong><Icon name="ph:caret-right" /></button>
          </div>
          <div class="review-state" :class="{ attention: data.pending.total }"><Icon :name="data.pending.total ? 'ph:warning-circle-bold' : 'ph:check-circle-bold'" /><span><strong>{{ data.pending.total ? '有内容等待处理' : '审核队列已清空' }}</strong><small>{{ data.pending.total ? '建议优先处理被 AI 转交或拦截的内容。' : '评论、友链申请、留言和漂流瓶均无待办。' }}</small></span></div>
        </section>

        <section class="panel community-panel">
          <header class="panel-head"><div><h2>用户与访客</h2><p>账号、足迹与时光海互动</p></div><a-button type="link" @click="router.push('/admin/visitor')">访问管理 <Icon name="ph:arrow-right-bold" /></a-button></header>
          <div class="community-grid"><div><Icon name="ph:user-circle-bold" /><span><strong>{{ data.community.users }}</strong><small>注册账号</small></span></div><div><Icon name="ph:users-three-bold" /><span><strong>{{ data.community.visitors }}</strong><small>访问档案</small></span></div><div><Icon name="ph:footprints-bold" /><span><strong>{{ data.community.visitsToday }}</strong><small>今日访问</small></span></div><div><Icon name="ph:note-pencil-bold" /><span><strong>{{ data.community.messages }}</strong><small>留言</small></span></div><div><Icon name="solar:bottle-outline" /><span><strong>{{ data.community.bottles }}</strong><small>漂流瓶</small></span></div></div>
          <div class="identity-strip"><span><b>{{ data.community.identity?.anonymous || 0 }}</b> 未登记访问</span><span><b>{{ data.community.identity?.registered || 0 }}</b> 登记访客访问</span><span><b>{{ data.community.identity?.users || 0 }}</b> 登录用户访问</span><span><b>{{ data.community.contentReads?.articles || 0 }}</b> 文章阅读</span><span><b>{{ data.community.contentReads?.circle || 0 }}</b> 风讯角阅读</span></div>
        </section>

        <section class="panel ai-panel">
          <header class="panel-head"><div><h2>AI 用量</h2><p>会话调用与 Token 消耗</p></div><a-button type="link" @click="router.push('/admin/ai')">用量详情 <Icon name="ph:arrow-right-bold" /></a-button></header>
          <div class="ai-total"><span><Icon name="ph:sparkle-bold" /></span><div><small>累计会话调用</small><strong>{{ formatNumber(data.ai.calls) }}</strong></div><em>近 30 天 {{ formatNumber(data.ai.recentCalls) }} 次</em></div>
          <div class="token-bars"><div><span>输入 Token <b>{{ compactNumber(data.ai.inputTokens) }}</b></span><i><u :style="{ width: tokenPercent(data.ai.inputTokens) }" /></i></div><div><span>输出 Token <b>{{ compactNumber(data.ai.outputTokens) }}</b></span><i><u :style="{ width: tokenPercent(data.ai.outputTokens) }" /></i></div></div>
        </section>

        <section class="panel activity-panel">
          <header class="panel-head"><div><h2>近期动态</h2><p>最新发布与社区回应</p></div></header>
          <div v-if="data.recent.length" class="activity-list"><button v-for="item in data.recent" :key="`${item.type}-${item.id}`" type="button" @click="router.push(item.href)"><span><Icon :name="activityIcon(item.type)" /></span><div><small>{{ item.label }}</small><strong>{{ item.title }}</strong></div><time>{{ relativeTime(item.timestamp) }}</time></button></div>
          <div v-else class="empty-state"><Icon name="ph:clock-counter-clockwise" />暂无近期动态</div>
        </section>

        <section class="panel quick-panel">
          <header class="panel-head"><div><h2>快捷操作</h2><p>高频管理入口</p></div></header>
          <div class="quick-grid"><button v-for="item in quickActions" :key="item.to" type="button" @click="router.push(item.to)"><Icon :name="item.icon" /><span><strong>{{ item.label }}</strong><small>{{ item.note }}</small></span><Icon name="ph:arrow-up-right-bold" /></button></div>
        </section>
      </div>

      <footer class="system-strip"><span><i :class="{ offline: data.system.database !== 'online' }" /><strong>{{ data.system.database === 'online' ? '数据库正常' : '数据库异常' }}</strong></span><span><Icon name="ph:clock-bold" />{{ data.system.uptime || '等待状态' }}</span><span><Icon name="ph:cpu-bold" />{{ data.system.cpuCores || '—' }} 核</span><span><Icon name="ph:memory-bold" />{{ data.system.memoryUsage || '—' }}</span><span><Icon name="ph:code-bold" />{{ data.system.nodeVersion || 'Node' }}</span><a-button type="link" @click="router.push('/admin/info')"><Icon name="ph:info-bold" /> 系统详情</a-button></footer>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import type * as ECharts from 'echarts/core'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })
const api = useApi()
const router = useRouter()
const { user } = useAuth()
const { resolvedTheme } = useTheme()
const loading = ref(true)
const toast = useToast()
const chartError = ref(false)
const visitChartEl = ref<HTMLElement | null>(null)
const contentChartEl = ref<HTMLElement | null>(null)
const aiChartEl = ref<HTMLElement | null>(null)
const identityChartEl = ref<HTMLElement | null>(null)
let echarts: typeof import('echarts/core') | null = null
let visitChart: ECharts.ECharts | null = null
let contentChart: ECharts.ECharts | null = null
let aiChart: ECharts.ECharts | null = null
let identityChart: ECharts.ECharts | null = null
let chartResizeObserver: ResizeObserver | null = null
const emptyStatus = () => ({ published: 0, unpublished: 0, draft: 0, private: 0 })
const data = reactive<any>({ content: { posts: emptyStatus(), moments: emptyStatus(), albums: emptyStatus(), library: emptyStatus(), categories: 0, tags: 0, media: 0, views: 0, likes: 0 }, community: { users: 0, visitors: 0, visitsToday: 0, messages: 0, bottles: 0, identity: {}, contentReads: {} }, pending: { articleComments: 0, momentComments: 0, friendApplications: 0, messages: 0, bottles: 0, total: 0 }, ai: { calls: 0, recentCalls: 0, inputTokens: 0, outputTokens: 0 }, trends: { dates: [], visits: [], content: { posts: [], moments: [], albums: [], library: [] }, ai: { calls: [], inputTokens: [], outputTokens: [] }, identity: { anonymous: [], registered: [], users: [], articles: [], circle: [] } }, recent: [], system: {} })
const hour = new Date().getHours()
const greeting = computed(() => `${hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'}，${user.value?.username || '管理员'}`)
const today = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
const hasVisits = computed(() => (data.trends.visits || []).some((value: number) => Number(value) > 0))
const hasContentTrends = computed(() => ['posts', 'moments', 'albums', 'library'].some(key => (data.trends.content?.[key] || []).some((value: number) => Number(value) > 0)))
const hasAiTrends = computed(() => ['calls', 'inputTokens', 'outputTokens'].some(key => (data.trends.ai?.[key] || []).some((value: number) => Number(value) > 0)))
const hasIdentityTrends = computed(() => ['anonymous', 'registered', 'users'].some(key => (data.trends.identity?.[key] || []).some((value: number) => Number(value) > 0)))
const dailyQuotes = ['把每一次访问都变成可回看的轨迹。', '今天也为站点留下一点新的光。', '内容在被看见时，才开始拥有下一段旅程。', '慢慢整理，站点会越来越接近你想要的样子。']
const dailyQuote = computed(() => dailyQuotes[new Date().getDate() % dailyQuotes.length])
const statusTotal = (status: Record<string, number>) => Object.values(status || {}).reduce((sum, value) => sum + Number(value || 0), 0)
const publishedTotal = computed(() => ['posts', 'moments', 'albums', 'library'].reduce((sum, key) => sum + Number(data.content[key]?.published || 0), 0))
const metrics = computed(() => [
  { label: '公开内容', value: publishedTotal.value, note: '文章、瞬间、相册与书影', icon: 'ph:files-bold', tone: 'primary', to: '/admin/posts' },
  { label: '累计阅读', value: data.content.views, note: '公开文章浏览总量', icon: 'ph:eye-bold', tone: 'green', to: '/admin/posts' },
  { label: '待处理', value: data.pending.total, note: '评论、友链与访客审核', icon: 'ph:shield-warning-bold', tone: 'amber', to: '/admin/comments' },
  { label: '访客档案', value: data.community.visitors, note: `今日 ${data.community.visitsToday} 次到访`, icon: 'ph:users-three-bold', tone: 'blue', to: '/admin/visitor' },
  { label: '媒体资源', value: data.content.media, note: '图片、视频、音频与文档', icon: 'ph:image-square-bold', tone: 'rose', to: '/admin/media' },
  { label: 'AI Token', value: data.ai.inputTokens + data.ai.outputTokens, note: `${formatNumber(data.ai.calls)} 次会话调用`, icon: 'ph:sparkle-bold', tone: 'violet', to: '/admin/ai' },
])
const contentRows = computed(() => [
  { label: '文章', icon: 'ph:article-bold', to: '/admin/posts', showUnpublished: true, ...statusRow(data.content.posts) },
  { label: '瞬间', icon: 'ph:sparkle-bold', to: '/admin/moments', ...statusRow(data.content.moments) },
  { label: '相册', icon: 'ph:images-square-bold', to: '/admin/albums', ...statusRow(data.content.albums) },
  { label: '书影', icon: 'ph:books-bold', to: '/admin/library', ...statusRow(data.content.library) },
])
const reviewRows = computed(() => [
  { label: '文章评论', value: data.pending.articleComments, icon: 'ph:article-bold', to: '/admin/comments' },
  { label: '瞬间评论', value: data.pending.momentComments, icon: 'ph:sparkle-bold', to: '/admin/comments?section=moment' },
  { label: '友链申请', value: data.pending.friendApplications, icon: 'ph:handshake-bold', to: '/admin/comments?section=applications' },
  { label: '访客留言', value: data.pending.messages, icon: 'ph:note-pencil-bold', to: '/admin/visitor-messages' },
  { label: '漂流瓶', value: data.pending.bottles, icon: 'solar:bottle-outline', to: '/admin/visitor-bottles' },
])
const quickActions = [{ to: '/admin/moments/create', icon: 'ph:sparkle-bold', label: '写瞬间', note: '记录此刻' }, { to: '/admin/media', icon: 'ph:image-square-bold', label: '媒体库', note: '整理素材' }, { to: '/admin/library/create', icon: 'ph:books-bold', label: '记书影', note: '添加收藏' }, { to: '/admin/settings', icon: 'ph:sliders-horizontal-bold', label: '站点设置', note: '检查配置' }]

function statusRow(status: Record<string, number>) { return { total: statusTotal(status), published: Number(status?.published || 0), unpublished: Number(status?.unpublished || 0), draft: Number(status?.draft || 0), private: Number(status?.private || 0) } }
function formatNumber(value: number) { return Number(value || 0).toLocaleString('zh-CN') }
function compactNumber(value: number) { return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0)) }
function tokenPercent(value: number) { const total = Number(data.ai.inputTokens || 0) + Number(data.ai.outputTokens || 0); return `${total ? Math.max(8, Math.round(Number(value || 0) / total * 100)) : 0}%` }
function activityIcon(type: string) { return ({ post: 'ph:article-bold', moment: 'ph:sparkle-bold', album: 'ph:images-square-bold', library: 'ph:books-bold', comment: 'ph:chat-circle-text-bold', guestbook: 'ph:note-pencil-bold', like: 'ph:heart-bold' } as Record<string, string>)[type] || 'ph:clock-bold' }
function relativeTime(value?: string) { if (!value) return '-'; const diff = Date.now() - new Date(value).getTime(); if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`; if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`; return `${Math.floor(diff / 86400000)} 天前` }
function trendTotal(values: number[]) { return (values || []).reduce((sum, value) => sum + Number(value || 0), 0) }

function numericSeries(value: unknown, length: number) {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length }, (_, index) => {
    const next = Number(source[index])
    return Number.isFinite(next) ? next : 0
  })
}

function normalizeDashboardPayload(payload: any) {
  const source = payload && typeof payload === 'object' ? payload : {}
  const rawTrends = source.trends && typeof source.trends === 'object' ? source.trends : {}
  const rawContent = rawTrends.content && typeof rawTrends.content === 'object' ? rawTrends.content : {}
  const rawAi = rawTrends.ai && typeof rawTrends.ai === 'object' ? rawTrends.ai : {}
  const rawIdentity = rawTrends.identity && typeof rawTrends.identity === 'object' ? rawTrends.identity : {}
  const candidates = [rawTrends.dates, rawTrends.visits, rawContent.posts, rawContent.moments, rawContent.albums, rawContent.library, rawAi.calls, rawAi.inputTokens, rawAi.outputTokens, rawIdentity.anonymous, rawIdentity.registered, rawIdentity.users]
  const length = Math.max(0, ...candidates.map((value) => Array.isArray(value) ? value.length : 0))
  const dates = Array.from({ length }, (_, index) => String(Array.isArray(rawTrends.dates) ? rawTrends.dates[index] || '' : ''))
  return {
    ...source,
    trends: {
      dates,
      visits: numericSeries(rawTrends.visits, length),
      content: {
        posts: numericSeries(rawContent.posts, length),
        moments: numericSeries(rawContent.moments, length),
        albums: numericSeries(rawContent.albums, length),
        library: numericSeries(rawContent.library, length),
      },
      ai: {
        calls: numericSeries(rawAi.calls, length),
        inputTokens: numericSeries(rawAi.inputTokens, length),
        outputTokens: numericSeries(rawAi.outputTokens, length),
      },
      identity: {
        anonymous: numericSeries(rawIdentity.anonymous, length),
        registered: numericSeries(rawIdentity.registered, length),
        users: numericSeries(rawIdentity.users, length),
        articles: numericSeries(rawIdentity.articles, length),
        circle: numericSeries(rawIdentity.circle, length),
      },
    },
  }
}

function chartTheme() {
  const styles = getComputedStyle(document.documentElement)
  const resolveColor = (name: string, fallback: string) => {
    const raw = styles.getPropertyValue(name).trim()
    if (!raw || raw.includes('var(')) return fallback
    const probe = document.createElement('span')
    probe.style.color = raw
    document.body.appendChild(probe)
    const resolved = getComputedStyle(probe).color
    probe.remove()
    return resolved && resolved !== 'rgba(0, 0, 0, 0)' ? resolved : fallback
  }
  return {
    text: resolveColor('--c-text-3', '#6b7280'),
    line: resolveColor('--border', '#e5e7eb'),
    primary: resolveColor('--c-primary', '#1677ff'),
  }
}

function withAlpha(color: string | undefined, opacity: number) {
  if (!color) return `rgba(22, 119, 255, ${opacity})`
  const alpha = Math.min(1, Math.max(0, opacity))
  if (/^hsl\([^/]+\)$/i.test(color)) {
    return color.replace(/\)$/, ` / ${Math.round(alpha * 100)}%)`)
  }
  if (/^#[\da-f]{6}$/i.test(color)) {
    return `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
  }
  return color
}

function renderCharts() {
  if (!echarts) return
  try {
    const theme = chartTheme()
    const trends = normalizeDashboardPayload({ trends: data.trends }).trends
    const labels = trends.dates.map((date: string, index: number) => String(date || `第 ${index + 1} 天`).slice(5))
    const base = { animation: false, animationDuration: 0, animationDurationUpdate: 0, textStyle: { color: theme.text, fontFamily: 'var(--font-body)' }, grid: { left: 42, right: 16, top: 28, bottom: 30 }, tooltip: { trigger: 'axis' as const, transitionDuration: 0, axisPointer: { animation: false as const } }, xAxis: { type: 'category' as const, data: labels, boundaryGap: false, axisLine: { lineStyle: { color: theme.line } }, axisTick: { show: false }, axisLabel: { color: theme.text } }, yAxis: { type: 'value' as const, minInterval: 1, splitLine: { lineStyle: { color: theme.line, type: 'dashed' as const } }, axisLabel: { color: theme.text } } }
    if (hasVisits.value && visitChartEl.value) { visitChart ||= echarts.init(visitChartEl.value); visitChart.setOption({ ...base, series: [{ name: '访问', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: trends.visits, lineStyle: { width: 3, color: theme.primary }, itemStyle: { color: theme.primary }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: withAlpha(theme.primary, 0.33) }, { offset: 1, color: withAlpha(theme.primary, 0.02) }] } } }] }, true) }
    if (hasContentTrends.value && contentChartEl.value) { contentChart ||= echarts.init(contentChartEl.value); contentChart.setOption({ ...base, legend: { top: 0, textStyle: { color: theme.text } }, xAxis: { ...base.xAxis, boundaryGap: true }, series: [{ name: '文章', type: 'bar', stack: 'content', data: trends.content.posts, itemStyle: { color: theme.primary } }, { name: '瞬间', type: 'bar', stack: 'content', data: trends.content.moments, itemStyle: { color: '#43a977' } }, { name: '相册', type: 'bar', stack: 'content', data: trends.content.albums, itemStyle: { color: '#d49a32' } }, { name: '书影', type: 'bar', stack: 'content', data: trends.content.library, itemStyle: { color: '#bd5268' } }] }, true) }
    if (hasAiTrends.value && aiChartEl.value) { aiChart ||= echarts.init(aiChartEl.value); aiChart.setOption({ ...base, legend: { top: 0, textStyle: { color: theme.text } }, series: [{ name: '输入 Token', type: 'line', smooth: true, data: trends.ai.inputTokens, itemStyle: { color: '#795bbe' } }, { name: '输出 Token', type: 'line', smooth: true, data: trends.ai.outputTokens, itemStyle: { color: '#d49a32' } }, { name: '调用', type: 'bar', data: trends.ai.calls, itemStyle: { color: withAlpha(theme.primary, 0.33) } }] }, true) }
    if (hasIdentityTrends.value && identityChartEl.value) { identityChart ||= echarts.init(identityChartEl.value); identityChart.setOption({ ...base, legend: { top: 0, textStyle: { color: theme.text } }, series: [{ name: '未登记', type: 'line', smooth: true, data: trends.identity.anonymous, itemStyle: { color: '#8b95a5' } }, { name: '登记访客', type: 'line', smooth: true, data: trends.identity.registered, itemStyle: { color: '#3e80c2' } }, { name: '登录用户', type: 'line', smooth: true, data: trends.identity.users, itemStyle: { color: '#43a977' } }] }, true) }
    chartError.value = false
  } catch (error) {
    chartError.value = true
    console.error('仪表盘图表渲染失败:', error)
  }
}

function resizeCharts() { visitChart?.resize(); contentChart?.resize(); aiChart?.resize(); identityChart?.resize() }

onMounted(async () => {
  try { Object.assign(data, normalizeDashboardPayload(await api.get<any>('/stats/admin-dashboard'))) }
  catch (error: any) { toast.error(error?.message || '仪表盘数据加载失败') }
  finally { loading.value = false }
  await nextTick()
  try { echarts = (await import('~/utils/echartsLite')).default } catch { chartError.value = true }
  renderCharts()
  chartResizeObserver = new ResizeObserver(resizeCharts)
  ;[visitChartEl.value, contentChartEl.value, aiChartEl.value, identityChartEl.value].filter(Boolean).forEach(element => chartResizeObserver?.observe(element!))
})
watch(resolvedTheme, async () => {
  await nextTick()
  renderCharts()
})
onUnmounted(() => { chartResizeObserver?.disconnect(); visitChart?.dispose(); contentChart?.dispose(); aiChart?.dispose(); identityChart?.dispose() })
useHead({ title: '仪表盘' })
</script>

<style scoped>
.dashboard{width:min(1240px,100%);margin:0 auto;color:var(--c-text)}.dashboard-head>div:first-child>span{color:var(--c-primary);font-size:.6rem;font-weight:700}.dashboard-head h1{margin:5px 0 0;font-size:1.55rem}.dashboard-head p{margin:5px 0 0;color:var(--c-text-3);font-size:.7rem}.daily-quote{display:block;margin-top:7px;color:var(--c-primary);font-size:.62rem}.head-actions{display:flex;gap:8px}.dashboard-spin{display:block;min-height:480px}.metric-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:12px}.metric{display:grid;min-height:94px;grid-template-columns:36px minmax(0,1fr) 10px;align-items:center;gap:9px;padding:13px;border:1px solid var(--border);border-radius:8px;background:var(--ld-bg-card);color:inherit;cursor:pointer;font:inherit;text-align:left;transition:border-color .18s,transform .18s}.metric:hover{border-color:color-mix(in srgb,var(--c-primary) 46%,var(--border));transform:translateY(-2px)}.metric>span{display:grid;width:36px;height:36px;border-radius:8px;background:var(--c-primary-soft);color:var(--c-primary);font-size:1rem;place-items:center}.metric>span.green{background:rgb(55 151 104 / 12%);color:#379768}.metric>span.amber{background:rgb(207 142 43 / 13%);color:#c47d17}.metric>span.blue{background:rgb(62 128 194 / 12%);color:#3e80c2}.metric>span.rose{background:rgb(196 80 103 / 11%);color:#bd5268}.metric>span.violet{background:rgb(121 91 190 / 11%);color:#795bbe}.metric small{color:var(--c-text-3);font-size:.55rem}.metric strong{display:block;margin-top:2px;font-size:1.15rem;font-variant-numeric:tabular-nums}.metric p{margin:3px 0 0;color:var(--c-text-4);font-size:.48rem}.metric-arrow{color:var(--c-text-4);font-size:.55rem}
.chart-error{margin-bottom:12px}.dashboard-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.8fr);gap:12px}.panel{min-width:0;padding:16px;border:1px solid var(--border);border-radius:8px;background:var(--ld-bg-card)}.panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.panel-head h2{margin:0;font-size:.82rem}.panel-head p{margin:3px 0 0;color:var(--c-text-3);font-size:.54rem}.panel-head :deep(.ant-btn-link){height:auto;padding:0;font-size:.58rem}.content-matrix{display:grid}.content-matrix>button{display:grid;width:100%;grid-template-columns:34px minmax(90px,1fr) minmax(240px,1.2fr);align-items:center;gap:10px;padding:10px 2px;border:0;border-top:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left}.content-matrix>button:hover{background:var(--c-primary-soft)}.row-icon{display:grid;width:32px;height:32px;border-radius:8px;background:var(--c-bg-2);color:var(--c-primary);place-items:center}.content-matrix strong{font-size:.7rem}.content-matrix small{display:block;margin-top:2px;color:var(--c-text-3);font-size:.52rem}.content-matrix dl{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0}.content-matrix dl.has-unpublished{grid-template-columns:repeat(4,1fr)}.content-matrix dl>div{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-radius:6px;background:var(--c-bg-1)}.content-matrix dt{color:var(--c-text-3);font-size:.5rem}.content-matrix dd{margin:0;font-size:.65rem;font-weight:700}.structure-strip{display:flex;gap:18px;padding-top:11px;border-top:1px solid var(--border);color:var(--c-text-3);font-size:.53rem}.structure-strip b{color:var(--c-text);font-size:.66rem}.pending-count{display:grid;min-width:28px;height:24px;padding:0 7px;border-radius:999px;background:rgb(207 142 43 / 14%);color:#bd7510;font-size:.68rem;font-weight:700;place-items:center}.pending-count.clear{background:rgb(55 151 104 / 12%);color:#379768}.review-list{display:grid}.review-list button{display:grid;grid-template-columns:minmax(0,1fr) auto 12px;align-items:center;gap:8px;padding:9px 2px;border:0;border-top:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;font:inherit}.review-list button>span{display:flex;align-items:center;gap:7px;color:var(--c-text-2);font-size:.62rem}.review-list button>span :deep(svg){color:var(--c-primary)}.review-list strong{font-size:.7rem}.review-list button>svg{color:var(--c-text-4);font-size:.55rem}.review-state{display:flex;gap:9px;margin-top:10px;padding:11px;border-radius:8px;background:rgb(55 151 104 / 9%);color:#379768}.review-state.attention{background:rgb(207 142 43 / 10%);color:#bd7510}.review-state>svg{margin-top:2px;font-size:1rem}.review-state span{display:flex;flex-direction:column}.review-state strong{font-size:.63rem}.review-state small{margin-top:3px;color:var(--c-text-3);font-size:.5rem;line-height:1.5}
.analytics-grid{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:12px;margin-bottom:12px}.chart-panel{min-width:0;padding:15px;border:1px solid var(--border);border-radius:8px;background:var(--ld-bg-card)}.chart-panel header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.chart-panel h2{margin:0;font-size:.76rem}.chart-panel p{margin:3px 0 0;color:var(--c-text-3);font-size:.52rem}.chart-panel header>strong{font-size:1rem;font-variant-numeric:tabular-nums}.chart-canvas{width:100%;height:220px;margin-top:4px}.chart-empty{display:grid;height:220px;place-items:center}
.community-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.community-grid>div{display:flex;min-width:0;align-items:center;gap:8px;padding:10px;border-radius:8px;background:var(--c-bg-1)}.community-grid>div>svg{flex:0 0 auto;color:var(--c-primary);font-size:1rem}.community-grid span{display:flex;min-width:0;flex-direction:column}.community-grid strong{font-size:.78rem}.community-grid small{color:var(--c-text-3);font-size:.48rem}.ai-total{display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:9px;padding:11px;border-radius:8px;background:var(--c-bg-1)}.ai-total>span{display:grid;width:38px;height:38px;border-radius:8px;background:var(--c-primary-soft);color:var(--c-primary);place-items:center}.ai-total small{color:var(--c-text-3);font-size:.5rem}.ai-total strong{display:block;font-size:1rem}.ai-total em{color:var(--c-text-3);font-size:.52rem;font-style:normal}.token-bars{display:grid;gap:10px;margin-top:13px}.token-bars>div>span{display:flex;justify-content:space-between;color:var(--c-text-3);font-size:.54rem}.token-bars b{color:var(--c-text);font-weight:700}.token-bars i{display:block;height:5px;margin-top:5px;overflow:hidden;border-radius:99px;background:var(--c-bg-2)}.token-bars u{display:block;height:100%;border-radius:inherit;background:var(--c-primary);text-decoration:none;transition:width .45s}.activity-list{display:grid}.activity-list button{display:grid;width:100%;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:9px;padding:8px 2px;border:0;border-top:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left}.activity-list button>span{display:grid;width:28px;height:28px;border-radius:7px;background:var(--c-bg-2);color:var(--c-primary);place-items:center}.activity-list div{min-width:0}.activity-list small{color:var(--c-primary);font-size:.48rem}.activity-list strong{display:block;overflow:hidden;margin-top:2px;font-size:.62rem;text-overflow:ellipsis;white-space:nowrap}.activity-list time{color:var(--c-text-4);font-size:.48rem}.empty-state{display:grid;min-height:150px;align-content:center;justify-items:center;gap:7px;color:var(--c-text-3);font-size:.6rem}.empty-state>svg{font-size:1.4rem}.quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.quick-grid button{display:grid;min-height:58px;grid-template-columns:30px minmax(0,1fr) 12px;align-items:center;gap:7px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--c-bg-1);color:inherit;cursor:pointer;font:inherit;text-align:left}.quick-grid button>svg:first-child{color:var(--c-primary);font-size:1rem}.quick-grid strong{display:block;font-size:.6rem}.quick-grid small{display:block;margin-top:2px;color:var(--c-text-3);font-size:.47rem}.quick-grid button>svg:last-child{color:var(--c-text-4);font-size:.55rem}.system-strip{display:flex;flex-wrap:wrap;align-items:center;gap:16px;margin-top:12px;padding:10px 13px;border:1px solid var(--border);border-radius:8px;background:var(--ld-bg-card);color:var(--c-text-3);font-size:.52rem}.system-strip span{display:flex;align-items:center;gap:5px}.system-strip span:first-child{margin-right:auto;color:var(--c-text-2)}.system-strip i{width:7px;height:7px;border-radius:50%;background:#43a977;box-shadow:0 0 0 4px rgb(67 169 119 / 12%)}.system-strip i.offline{background:#d65f5f;box-shadow:0 0 0 4px rgb(214 95 95 / 12%)}.system-strip :deep(.ant-btn-link){height:auto;padding:0;font-size:.52rem}
@media(max-width:1160px){.metric-grid{grid-template-columns:repeat(3,1fr)}.analytics-grid{grid-template-columns:1fr 1fr}.chart-wide{grid-column:1/-1}.community-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:900px){.dashboard-grid,.analytics-grid{grid-template-columns:1fr}.chart-wide{grid-column:auto}.dashboard-head{align-items:flex-start;flex-direction:column}}@media(max-width:620px){.metric-grid{grid-template-columns:1fr 1fr}.metric{grid-template-columns:34px minmax(0,1fr);min-height:82px}.metric-arrow{display:none}.chart-canvas{height:200px}.content-matrix>button{grid-template-columns:32px minmax(0,1fr)}.content-matrix dl{grid-column:1/-1}.community-grid{grid-template-columns:1fr 1fr}.quick-grid{grid-template-columns:1fr}.head-actions{width:100%}.head-actions :deep(.ant-btn){flex:1}.system-strip span:first-child{width:100%;margin-right:0}}@media(max-width:430px){.metric-grid{grid-template-columns:1fr}.community-grid{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.metric,.token-bars u{transition:none}}
.identity-strip{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);color:var(--c-text-3);font-size:.54rem}.identity-strip span{padding:5px 8px;border-radius:6px;background:var(--c-bg-1)}.identity-strip b{color:var(--c-primary);font-size:.68rem}
</style>

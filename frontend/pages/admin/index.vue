<template>
  <div class="dashboard">
    <header class="dashboard-head">
      <div><span>CONTROL CENTER · 站点总览</span><h1>{{ greeting }}</h1><p>{{ today }}，这里汇总了内容与站点的最新状态。</p></div>
      <div class="head-actions">
        <a-button @click="router.push('/')"><Icon name="ph:arrow-square-out-bold" />查看前台</a-button>
        <a-button type="primary" @click="router.push('/admin/posts/create')"><Icon name="ph:plus-bold" />写文章</a-button>
      </div>
    </header>

    <a-spin :spinning="loading" class="dashboard-spin">
      <section class="stat-grid" aria-label="核心数据">
        <article v-for="item in statCards" :key="item.label" class="stat-card">
          <span class="stat-icon" :class="item.tone"><Icon :name="item.icon" /></span>
          <div><small>{{ item.label }}</small><strong>{{ item.value }}</strong><p>{{ item.note }}</p></div>
          <i class="stat-track"><span :style="{ width: `${item.progress}%` }" /></i>
        </article>
      </section>

      <div class="dashboard-grid">
        <section class="panel recent-panel">
          <header class="panel-head"><div><span><Icon name="ph:clock-counter-clockwise-bold" />最近内容</span><small>刚刚发生的创作动态</small></div><a-button type="link" @click="router.push('/admin/posts')">全部文章 <Icon name="ph:arrow-right-bold" /></a-button></header>
          <div v-if="recentPosts.length" class="recent-list">
            <button v-for="post in recentPosts" :key="post.slug" type="button" @click="router.push(`/admin/posts/${post.slug}`)">
              <span class="post-status" :class="post.status"><Icon :name="post.status === 'published' ? 'ph:check-bold' : 'ph:pencil-simple-bold'" /></span>
              <div><strong>{{ post.title }}</strong><p><span>{{ post.category?.name || '未分类' }}</span><time>{{ formatDate(post.updatedAt || post.publishedAt || post.createdAt) }}</time></p></div>
              <span class="post-views"><Icon name="ph:eye-bold" />{{ post.viewCount || 0 }}</span>
              <Icon name="ph:caret-right-bold" class="row-arrow" />
            </button>
          </div>
          <div v-else class="panel-empty"><Icon name="ph:article" /><span>还没有内容记录</span></div>
        </section>

        <section class="panel moderation-panel">
          <header class="panel-head"><div><span><Icon name="ph:shield-check-bold" />互动待办</span><small>需要你确认的站点回应</small></div><span class="pending-badge" :class="{ clear: pendingTotal === 0 }">{{ pendingTotal }}</span></header>
          <div class="moderation-score">
            <div><strong>{{ pendingTotal ? '有待处理事项' : '互动区很清爽' }}</strong><p>{{ pendingTotal ? '及时处理能让讨论保持流畅。' : '所有评论都已完成审核。' }}</p></div>
            <span><Icon :name="pendingTotal ? 'ph:bell-ringing-bold' : 'ph:check-circle-bold'" /></span>
          </div>
          <div class="moderation-rows">
            <div><span><Icon name="ph:article-bold" />文章评论</span><strong>{{ pending.article }}</strong></div>
            <div><span><Icon name="ph:sparkle-bold" />瞬间评论</span><strong>{{ pending.moment }}</strong></div>
          </div>
          <a-button block @click="router.push('/admin/comments')">前往审核 <Icon name="ph:arrow-right-bold" /></a-button>
        </section>

        <section class="panel overview-panel">
          <header class="panel-head"><div><span><Icon name="ph:chart-donut-bold" />内容结构</span><small>站点知识脉络</small></div></header>
          <div class="overview-chart">
            <div class="donut" :style="donutStyle"><span><strong>{{ radar.posts }}</strong><small>篇文章</small></span></div>
            <dl>
              <div><dt><i class="category" />分类</dt><dd>{{ radar.categories }}</dd></div>
              <div><dt><i class="tag" />标签</dt><dd>{{ radar.tags }}</dd></div>
              <div><dt><i class="like" />点赞</dt><dd>{{ radar.likes }}</dd></div>
            </dl>
          </div>
        </section>

        <section class="panel quick-panel">
          <header class="panel-head"><div><span><Icon name="ph:lightning-bold" />快速入口</span><small>高频管理操作</small></div></header>
          <div class="quick-grid">
            <button v-for="item in quickActions" :key="item.to" type="button" @click="router.push(item.to)"><span><Icon :name="item.icon" /></span><div><strong>{{ item.label }}</strong><small>{{ item.note }}</small></div><Icon name="ph:arrow-up-right-bold" /></button>
          </div>
        </section>
      </div>

      <footer class="system-strip">
        <span><i /><strong>服务运行中</strong></span>
        <span><Icon name="ph:clock-bold" />运行 {{ system.uptime || `${siteDays} 天` }}</span>
        <span><Icon name="ph:cpu-bold" />{{ system.cpuCores || '—' }} 核</span>
        <span><Icon name="ph:database-bold" />{{ system.memoryUsage || '等待数据' }}</span>
        <span><Icon name="ph:code-bold" />{{ system.nodeVersion || 'Node' }}</span>
      </footer>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const router = useRouter()
const { user } = useAuth()
const loading = ref(true)
const radar = reactive({ posts: 0, views: 0, comments: 0, likes: 0, categories: 0, tags: 0 })
const pending = reactive({ article: 0, moment: 0 })
const recentPosts = ref<any[]>([])
const system = reactive({ uptime: '', cpuCores: 0, memoryUsage: '', nodeVersion: '' })
const siteDays = Math.max(1, Math.floor((Date.now() - new Date('2026-01-14T00:00:00+08:00').getTime()) / 86400000))
const pendingTotal = computed(() => pending.article + pending.moment)
const hour = new Date().getHours()
const greeting = computed(() => `${hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'}，${user.value?.username || '管理员'}`)
const today = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())

const statCards = computed(() => [
  { label: '已发布文章', value: radar.posts, icon: 'ph:article-bold', tone: 'violet', note: `${radar.categories} 个内容分类`, progress: Math.min(100, radar.posts * 4) },
  { label: '累计阅读', value: radar.views.toLocaleString('zh-CN'), icon: 'ph:eye-bold', tone: 'green', note: '站点内容总浏览量', progress: Math.min(100, Math.max(8, Math.log10(radar.views + 1) * 24)) },
  { label: '收到回应', value: radar.comments, icon: 'ph:chat-circle-text-bold', tone: 'amber', note: `${pendingTotal.value} 条等待审核`, progress: Math.min(100, radar.comments * 5) },
  { label: '运行时间', value: `${siteDays}天`, icon: 'ph:heartbeat-bold', tone: 'blue', note: '持续记录与维护', progress: Math.min(100, (siteDays % 365) / 3.65) },
])
const quickActions = [
  { to: '/admin/moments/create', icon: 'ph:sparkle-bold', label: '写瞬间', note: '记录此刻' },
  { to: '/admin/media', icon: 'ph:image-square-bold', label: '媒体库', note: '整理素材' },
  { to: '/admin/library/create', icon: 'ph:books-bold', label: '记书影', note: '添加收藏' },
  { to: '/admin/settings', icon: 'ph:sliders-horizontal-bold', label: '站点设置', note: '调整配置' },
]
const donutStyle = computed(() => {
  const categoryPart = Math.min(55, Math.max(15, radar.categories * 5))
  const tagPart = Math.min(75, categoryPart + Math.max(18, radar.tags * 2))
  return { background: `conic-gradient(var(--c-primary) 0 ${categoryPart}%, #4caf83 ${categoryPart}% ${tagPart}%, #d99a3d ${tagPart}% 100%)` }
})

function formatDate(value?: string) {
  if (!value) return '未标日期'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '未标日期' : `${date.getMonth() + 1}月${date.getDate()}日`
}

onMounted(async () => {
  const [radarResult, postsResult, articleComments, momentComments, systemResult] = await Promise.allSettled([
    api.get<any>('/stats/radar'),
    api.get<any>('/posts', { page: 1, limit: 5, status: 'all' }),
    api.get<any>('/comments', { page: 1, limit: 1, status: 'pending' }),
    api.get<any>('/moment-comments', { page: 1, limit: 1, status: 'pending' }),
    api.get<any>('/stats/system'),
  ])
  if (radarResult.status === 'fulfilled') Object.assign(radar, radarResult.value)
  if (postsResult.status === 'fulfilled') recentPosts.value = postsResult.value?.items || []
  if (articleComments.status === 'fulfilled') pending.article = articleComments.value?.total || 0
  if (momentComments.status === 'fulfilled') pending.moment = momentComments.value?.total || 0
  if (systemResult.status === 'fulfilled') Object.assign(system, systemResult.value)
  loading.value = false
})

useHead({ title: '仪表盘' })
</script>

<style scoped>
.dashboard { width:min(1220px,100%); margin:0 auto; color:var(--c-text); }.dashboard-head { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; margin-bottom:22px; }.dashboard-head>div:first-child>span { color:var(--c-primary); font-size:.54rem; font-weight:750; letter-spacing:.17em; }.dashboard-head h1 { margin:7px 0 0; font-size:1.65rem; letter-spacing:0; }.dashboard-head p { margin:6px 0 0; color:var(--c-text-3); font-size:.7rem; }.head-actions { display:flex; gap:8px; }.head-actions :deep(.ant-btn) { display:inline-flex; align-items:center; gap:6px; border-radius:9px; }
.dashboard-spin { display:block; min-height:420px; }.stat-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:14px; }.stat-card { position:relative; display:grid; min-height:116px; grid-template-columns:42px minmax(0,1fr); gap:12px; padding:17px; overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 72%,transparent); border-radius:12px; background:var(--ld-bg-card); box-shadow:0 5px 18px color-mix(in srgb,var(--ld-shadow) 20%,transparent); }.stat-icon { display:grid; width:42px; height:42px; border-radius:11px; font-size:1.15rem; place-items:center; }.stat-icon.violet { background:color-mix(in srgb,var(--c-primary) 13%,transparent); color:var(--c-primary); }.stat-icon.green { background:rgb(59 155 111 / 12%); color:#369768; }.stat-icon.amber { background:rgb(217 154 61 / 13%); color:#c78324; }.stat-icon.blue { background:rgb(65 132 201 / 12%); color:#417fbe; }.stat-card small { color:var(--c-text-3); font-size:.57rem; }.stat-card strong { display:block; margin-top:3px; font-size:1.28rem; font-variant-numeric:tabular-nums; line-height:1.2; }.stat-card p { margin:5px 0 0; color:var(--c-text-3); font-size:.54rem; }.stat-track { position:absolute; right:17px; bottom:11px; left:17px; height:3px; overflow:hidden; border-radius:99px; background:var(--c-bg-2); }.stat-track span { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,var(--c-primary),var(--ui-accent-warm)); transition:width .6s var(--ui-ease-out); }
.dashboard-grid { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(280px,.8fr); gap:14px; }.panel { min-width:0; padding:18px; border:1px solid color-mix(in srgb,var(--border) 72%,transparent); border-radius:12px; background:var(--ld-bg-card); box-shadow:0 5px 18px color-mix(in srgb,var(--ld-shadow) 20%,transparent); }.panel-head { display:flex; min-height:34px; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:12px; }.panel-head>div { display:flex; flex-direction:column; gap:3px; }.panel-head>div>span { display:flex; align-items:center; gap:6px; color:var(--c-text); font-size:.76rem; font-weight:700; }.panel-head>div>span :deep(svg) { color:var(--c-primary); }.panel-head small { color:var(--c-text-3); font-size:.52rem; }.panel-head :deep(.ant-btn-link) { height:auto; padding:2px; font-size:.58rem; }
.recent-list { display:grid; }.recent-list>button { display:grid; width:100%; min-height:58px; grid-template-columns:31px minmax(0,1fr) auto 14px; align-items:center; gap:10px; padding:8px 4px; border:0; border-top:1px solid color-mix(in srgb,var(--border) 62%,transparent); background:transparent; color:inherit; cursor:pointer; font:inherit; text-align:left; transition:background .16s; }.recent-list>button:hover { background:var(--c-primary-soft); }.post-status { display:grid; width:28px; height:28px; border-radius:8px; background:var(--c-bg-2); color:var(--c-text-3); place-items:center; }.post-status.published { background:rgb(59 155 111 / 12%); color:#369768; }.recent-list strong { display:block; overflow:hidden; font-size:.68rem; text-overflow:ellipsis; white-space:nowrap; }.recent-list p { display:flex; gap:10px; margin:4px 0 0; color:var(--c-text-3); font-size:.51rem; }.post-views { display:flex; align-items:center; gap:4px; color:var(--c-text-3); font-size:.53rem; }.row-arrow { color:var(--c-text-3); font-size:.6rem; }.panel-empty { display:grid; min-height:180px; align-content:center; justify-items:center; gap:7px; color:var(--c-text-3); font-size:.62rem; }.panel-empty :deep(svg) { color:var(--c-primary); font-size:1.8rem; }
.pending-badge { display:grid; min-width:28px; height:24px; padding:0 7px; border-radius:7px; background:rgb(217 154 61 / 14%); color:#c78324; font-size:.68rem; font-weight:750; place-items:center; }.pending-badge.clear { background:rgb(59 155 111 / 12%); color:#369768; }.moderation-score { display:flex; min-height:88px; align-items:center; justify-content:space-between; gap:15px; padding:15px; border-radius:10px; background:linear-gradient(135deg,var(--c-primary-soft),color-mix(in srgb,var(--ld-bg-card) 88%,transparent)); }.moderation-score strong { font-size:.76rem; }.moderation-score p { margin:5px 0 0; color:var(--c-text-3); font-size:.54rem; line-height:1.6; }.moderation-score>span { display:grid; width:42px; height:42px; flex:0 0 42px; border-radius:50%; background:var(--ld-bg-card); color:var(--c-primary); font-size:1.3rem; place-items:center; }.moderation-rows { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:12px 0; }.moderation-rows>div { display:flex; align-items:center; justify-content:space-between; padding:9px; border:1px solid var(--border); border-radius:9px; }.moderation-rows span { display:flex; align-items:center; gap:5px; color:var(--c-text-2); font-size:.56rem; }.moderation-rows strong { font-size:.72rem; }
.overview-chart { display:grid; grid-template-columns:124px minmax(0,1fr); align-items:center; gap:22px; padding:8px 4px; }.donut { position:relative; width:118px; height:118px; border-radius:50%; }.donut::after { position:absolute; inset:15px; border-radius:50%; background:var(--ld-bg-card); content:''; }.donut>span { position:absolute; z-index:1; inset:0; display:grid; align-content:center; justify-items:center; }.donut strong { font-size:1.25rem; }.donut small { color:var(--c-text-3); font-size:.5rem; }.overview-chart dl { display:grid; gap:11px; margin:0; }.overview-chart dl>div { display:flex; align-items:center; justify-content:space-between; gap:12px; }.overview-chart dt { display:flex; align-items:center; gap:7px; color:var(--c-text-2); font-size:.6rem; }.overview-chart dt i { width:7px; height:7px; border-radius:50%; background:var(--c-primary); }.overview-chart dt i.tag { background:#4caf83; }.overview-chart dt i.like { background:#d99a3d; }.overview-chart dd { margin:0; font-size:.74rem; font-weight:700; }
.quick-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }.quick-grid button { display:grid; min-height:62px; grid-template-columns:31px minmax(0,1fr) 14px; align-items:center; gap:8px; padding:9px; border:1px solid var(--border); border-radius:9px; background:var(--c-bg-1); color:inherit; cursor:pointer; font:inherit; text-align:left; transition:.2s; }.quick-grid button:hover { border-color:color-mix(in srgb,var(--c-primary) 42%,var(--border)); background:var(--c-primary-soft); transform:translateY(-2px); }.quick-grid button>span { display:grid; width:30px; height:30px; border-radius:8px; background:var(--ld-bg-card); color:var(--c-primary); place-items:center; }.quick-grid strong,.quick-grid small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.quick-grid strong { font-size:.61rem; }.quick-grid small { margin-top:3px; color:var(--c-text-3); font-size:.49rem; }.quick-grid button>svg { color:var(--c-text-3); font-size:.58rem; }
.system-strip { display:flex; flex-wrap:wrap; align-items:center; gap:18px; margin-top:14px; padding:12px 15px; border:1px solid color-mix(in srgb,var(--border) 72%,transparent); border-radius:10px; background:color-mix(in srgb,var(--ld-bg-card) 86%,transparent); color:var(--c-text-3); font-size:.53rem; }.system-strip span { display:flex; align-items:center; gap:5px; }.system-strip span:first-child { margin-right:auto; color:var(--c-text-2); }.system-strip i { width:7px; height:7px; border-radius:50%; background:#43a977; box-shadow:0 0 0 4px rgb(67 169 119 / 12%); }
@media (max-width:980px) { .stat-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }.dashboard-grid { grid-template-columns:1fr; } }
@media (max-width:620px) { .dashboard-head { align-items:flex-start; flex-direction:column; }.head-actions { width:100%; }.head-actions :deep(.ant-btn) { flex:1; }.stat-grid { grid-template-columns:1fr; }.quick-grid { grid-template-columns:1fr; }.overview-chart { grid-template-columns:104px minmax(0,1fr); }.donut { width:100px; height:100px; }.system-strip { gap:10px 14px; }.system-strip span:first-child { width:100%; margin-right:0; } }
@media (prefers-reduced-motion:reduce) { .stat-track span,.quick-grid button { transition:none; } }
</style>

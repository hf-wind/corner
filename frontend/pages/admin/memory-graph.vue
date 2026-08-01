<template>
  <div class="constellation-admin">
    <header class="page-header">
      <div class="title-block">
        <span class="title-icon"><Icon name="ph:planet-bold" /></span>
        <div><small>TIME CONSTELLATION</small><h1>时光星图</h1><p>发布内容并记录时间、地点，系统会自动完成其余工作。</p></div>
      </div>
      <NuxtLink to="/time/constellation" target="_blank" class="preview-link"><Icon name="ph:arrow-square-out-bold" />查看前台星图</NuxtLink>
    </header>

    <section class="automation-card">
      <span class="automation-orb"><i /><Icon name="ph:sparkle-bold" /></span>
      <div><small>AUTOMATION ONLINE</small><strong>零配置建图正在运行</strong><p>文章、瞬间、相册、照片和书影发布后会自动汇聚为记忆；连续跨地点内容会自动形成旅行轨迹。</p></div>
      <span class="sync-time"><i />{{ lastBuiltText }}</span>
    </section>

    <a-alert v-if="error" type="error" show-icon :message="error" closable @close="error = ''" />
    <a-spin :spinning="loading">
      <section class="metrics" aria-label="星图统计">
        <article v-for="item in metricItems" :key="item.label">
          <span><Icon :name="item.icon" /></span>
          <div><strong>{{ item.value }}</strong><small>{{ item.label }}</small></div>
          <em>{{ item.note }}</em>
        </article>
      </section>

      <section class="health-section">
        <div class="section-head"><div><small>CONTENT READINESS</small><h2>内容完整度</h2></div><span>{{ healthScore }}%</span></div>
        <p class="section-intro">这些不是星图配置，只是内容本身可以补充的信息；不处理也不会影响发布。</p>
        <div class="health-grid">
          <article v-for="issue in issueItems" :key="issue.key" :class="{ clear: issue.count === 0 }">
            <span><Icon :name="issue.icon" /></span>
            <div><strong>{{ issue.title }}</strong><p>{{ issue.count ? `${issue.count} 条内容可以补充` : '已完整，无需处理' }}</p></div>
            <button v-if="issue.count" type="button" @click="openIssue(issue)">查看内容</button>
            <Icon v-else name="ph:check-circle-fill" class="clear-icon" />
          </article>
        </div>
      </section>

      <details class="recovery-panel">
        <summary><span><Icon name="ph:lifebuoy-bold" /><b>异常恢复</b><small>仅在新内容长时间没有进入星图时使用</small></span><Icon name="ph:caret-down-bold" /></summary>
        <div><p>正常情况下无需任何操作。重新生成只会刷新派生数据，不会修改文章、瞬间、相册或旅行。</p><a-button :loading="rebuilding" @click="rebuild"><Icon name="ph:arrows-clockwise-bold" />重新生成星图</a-button></div>
      </details>
    </a-spin>

    <a-modal v-model:open="issueOpen" :title="activeIssue?.title" :footer="null">
      <div class="issue-list">
        <NuxtLink v-for="item in activeIssue?.items || []" :key="item.id" :to="item.href" target="_blank"><span><Icon :name="nodeIcon(item.type)" /></span><div><small>{{ typeText(item.type) }}</small><strong>{{ item.title }}</strong></div><Icon name="ph:arrow-up-right-bold" /></NuxtLink>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const loading = ref(true)
const rebuilding = ref(false)
const issueOpen = ref(false)
const error = ref('')
const activeIssue = ref<any>(null)
const health = reactive<any>({
  totals: { nodes: 0, memories: 0, journeys: 0, relations: 0 },
  automation: { status: 'running', lastBuiltAt: null },
  issues: {
    isolated: { count: 0, items: [] },
    missingTime: { count: 0, items: [] },
    missingLocation: { count: 0, items: [] },
  },
})

const metricItems = computed(() => [
  { label: '真实内容', value: health.totals.nodes || 0, note: '自动收录', icon: 'ph:files-bold' },
  { label: '点亮星球', value: health.totals.memories || 0, note: '由真实内容生成', icon: 'ph:planet-bold' },
  { label: '旅行轨迹', value: health.totals.journeys || 0, note: '连续移动自动识别', icon: 'ph:path-bold' },
  { label: '记忆连接', value: health.totals.relations || 0, note: '规则自动维护', icon: 'ph:share-network-bold' },
])
const issueItems = computed(() => [
  { key: 'missingTime', title: '缺少时间', icon: 'ph:clock-countdown-bold', ...health.issues.missingTime },
  { key: 'missingLocation', title: '缺少地点', icon: 'ph:map-pin-line-bold', ...health.issues.missingLocation },
  { key: 'isolated', title: '尚未关联', icon: 'ph:circles-three-plus-bold', ...health.issues.isolated },
])
const issueCount = computed(() => issueItems.value.reduce((sum, item) => sum + Number(item.count || 0), 0))
const healthScore = computed(() => Math.max(0, Math.round((1 - Math.min(health.totals.nodes || 1, issueCount.value) / (health.totals.nodes || 1)) * 100)))
const lastBuiltText = computed(() => health.automation.lastBuiltAt
  ? `最近更新 ${new Date(health.automation.lastBuiltAt).toLocaleString('zh-CN', { hour12: false })}`
  : '等待首次内容发布')

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const healthResult = await api.get('/memory-relations/health')
    Object.assign(health, healthResult)
  } catch (exception: any) {
    error.value = exception?.message || '读取星图状态失败'
  } finally {
    loading.value = false
  }
}

async function rebuild() {
  rebuilding.value = true
  try {
    const result = await api.post<any>('/memory-relations/rebuild')
    await load()
    toast.success(`已生成 ${result.memories || 0} 段记忆、${result.automaticJourneys || 0} 条自动旅行`)
  } catch (exception: any) {
    toast.error(exception?.message || '重新生成失败')
  } finally {
    rebuilding.value = false
  }
}

function openIssue(issue: any) {
  activeIssue.value = issue
  issueOpen.value = true
}

function typeText(type: string) {
  return ({ post: '文章', moment: '瞬间', album: '相册', photo: '照片', library: '书影', memory: '聚合记忆', journey: '旅行轨迹' } as Record<string, string>)[type] || type
}

function nodeIcon(type: string) {
  return ({ post: 'ph:article-bold', moment: 'ph:sparkle-bold', album: 'ph:images-square-bold', photo: 'ph:image-bold', library: 'ph:books-bold', memory: 'ph:planet-bold', journey: 'ph:path-bold' } as Record<string, string>)[type] || 'ph:star-four-bold'
}

useHead({ title: '时光星图' })
</script>

<style scoped>
.constellation-admin { display:flex; width:min(1160px,100%); flex-direction:column; gap:20px; margin:0 auto; padding-bottom:36px; }
.page-header { display:flex; align-items:center; justify-content:space-between; gap:18px; }
.title-block { display:flex; align-items:center; gap:12px; }.title-icon { display:grid; width:46px; height:46px; border:1px solid color-mix(in srgb,var(--c-primary) 28%,var(--border)); border-radius:12px; background:var(--c-primary-soft); color:var(--c-primary); font-size:1.25rem; place-items:center; }
.title-block small,.section-head small,.automation-card div>small { color:var(--c-primary); font-size:.54rem; letter-spacing:.15em; }.title-block h1 { margin:2px 0 0; color:var(--c-text); font-size:1.38rem; }.title-block p { margin:4px 0 0; color:var(--c-text-3); font-size:.7rem; }
.preview-link { display:flex; height:34px; align-items:center; gap:6px; padding:0 12px; border:1px solid var(--border); border-radius:8px; color:var(--c-text-2); font-size:.69rem; text-decoration:none; transition:.2s; }.preview-link:hover { border-color:color-mix(in srgb,var(--c-primary) 36%,var(--border)); color:var(--c-primary); }
.automation-card { position:relative; display:grid; grid-template-columns:54px minmax(0,1fr) auto; align-items:center; gap:14px; overflow:hidden; padding:18px; border:1px solid color-mix(in srgb,var(--c-primary) 25%,var(--border)); border-radius:12px; background:linear-gradient(135deg,color-mix(in srgb,var(--c-primary) 8%,var(--ld-bg-card)),var(--ld-bg-card)); }.automation-card::after { position:absolute; top:-80px; right:12%; width:180px; height:180px; border:1px dashed color-mix(in srgb,var(--c-primary) 16%,transparent); border-radius:50%; content:''; animation:orbit 22s linear infinite; }
.automation-orb { position:relative; z-index:1; display:grid; width:52px; height:52px; border-radius:50%; background:radial-gradient(circle at 35% 28%,#9edaff,var(--c-primary) 42%,#174b78); box-shadow:inset -9px -8px 18px rgb(2 18 38/.3),0 0 24px color-mix(in srgb,var(--c-primary) 28%,transparent); color:#fff; place-items:center; }.automation-orb i { position:absolute; width:66px; height:20px; border:1px solid color-mix(in srgb,var(--c-primary) 52%,transparent); border-radius:50%; transform:rotate(-14deg); }
.automation-card div { position:relative; z-index:1; display:flex; flex-direction:column; }.automation-card strong { margin-top:3px; color:var(--c-text); font-size:.86rem; }.automation-card p { max-width:720px; margin:5px 0 0; color:var(--c-text-3); font-size:.63rem; line-height:1.65; }.sync-time { position:relative; z-index:1; display:flex; align-items:center; gap:6px; color:var(--c-text-3); font-size:.57rem; }.sync-time i { width:6px; height:6px; border-radius:50%; background:#46c78b; box-shadow:0 0 0 4px rgb(70 199 139/.1); }
.metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }.metrics article { display:grid; min-height:88px; grid-template-columns:40px 1fr; align-items:center; gap:10px; padding:14px; border:1px solid var(--border); border-radius:10px; background:var(--ld-bg-card); }.metrics article>span { display:grid; width:40px; height:40px; border-radius:9px; background:var(--c-primary-soft); color:var(--c-primary); font-size:1.05rem; place-items:center; }.metrics article>div { display:flex; flex-direction:column; }.metrics strong { color:var(--c-text); font-size:1.18rem; font-variant-numeric:tabular-nums; }.metrics small { color:var(--c-text-3); font-size:.6rem; }.metrics em { grid-column:2; color:var(--c-text-3); font-size:.54rem; font-style:normal; }
.health-section { display:flex; flex-direction:column; gap:11px; }.section-head { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; }.section-head h2 { margin:3px 0 0; color:var(--c-text); font-size:1rem; }.section-head>span { color:var(--c-text-3); font-size:.67rem; }.section-intro { margin:-5px 0 0; color:var(--c-text-3); font-size:.59rem; }
.health-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }.health-grid article { display:grid; grid-template-columns:36px minmax(0,1fr) auto; align-items:center; gap:10px; padding:13px; border:1px solid color-mix(in srgb,#d48655 24%,var(--border)); border-radius:9px; background:var(--ld-bg-card); }.health-grid article>span { display:grid; width:36px; height:36px; border-radius:8px; background:color-mix(in srgb,#d48655 10%,var(--c-bg-2)); color:#c77748; place-items:center; }.health-grid article>div { display:flex; min-width:0; flex-direction:column; }.health-grid strong { color:var(--c-text); font-size:.7rem; }.health-grid p { margin:3px 0 0; color:var(--c-text-3); font-size:.56rem; }.health-grid button { border:0; background:none; color:var(--c-primary); cursor:pointer; font:inherit; font-size:.59rem; }.health-grid article.clear { border-color:var(--border); }.health-grid article.clear>span { background:color-mix(in srgb,#45a87b 9%,var(--c-bg-2)); color:#45a87b; }.clear-icon { color:#45a87b; }
.recovery-panel { border-block:1px solid var(--border); }.recovery-panel summary { display:flex; align-items:center; justify-content:space-between; padding:14px 2px; color:var(--c-text); cursor:pointer; list-style:none; }.recovery-panel summary>span { display:grid; grid-template-columns:20px 1fr; align-items:center; gap:2px 7px; }.recovery-panel summary>span>svg { grid-row:1/3; color:var(--c-text-3); }.recovery-panel summary b { font-size:.7rem; }.recovery-panel summary small { color:var(--c-text-3); font-size:.55rem; }.recovery-panel[open] summary>svg { transform:rotate(180deg); }.recovery-panel>div { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:0 2px 14px; }.recovery-panel p { margin:0; color:var(--c-text-3); font-size:.59rem; }
.issue-list { display:grid; gap:7px; }.issue-list>a { display:grid; grid-template-columns:34px 1fr 18px; align-items:center; gap:9px; padding:9px; border:1px solid var(--border); border-radius:8px; color:var(--c-text); text-decoration:none; }.issue-list>a>span { display:grid; width:34px; height:34px; border-radius:7px; background:var(--c-primary-soft); color:var(--c-primary); place-items:center; }.issue-list div { display:flex; min-width:0; flex-direction:column; }.issue-list small { color:var(--c-text-3); font-size:.54rem; }.issue-list strong { overflow:hidden; font-size:.66rem; text-overflow:ellipsis; white-space:nowrap; }
@keyframes orbit { to { transform:rotate(360deg); } }
@media(max-width:900px) { .metrics { grid-template-columns:repeat(2,1fr); }.health-grid { grid-template-columns:1fr; } }
@media(max-width:620px) { .page-header { align-items:flex-start; flex-direction:column; }.automation-card { grid-template-columns:48px 1fr; }.sync-time { grid-column:1/-1; }.metrics { grid-template-columns:1fr 1fr; }.recovery-panel>div { align-items:flex-start; flex-direction:column; } }
@media(prefers-reduced-motion:reduce) { .automation-card::after { animation:none; } }
</style>

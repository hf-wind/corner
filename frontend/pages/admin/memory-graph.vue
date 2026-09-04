<template>
  <div class="constellation-admin admin-page-shell">
    <header class="page-header admin-page-head">
      <div><span>TIME CONSTELLATION</span><h1>时光星图</h1><p>发布内容并记录时间、地点，系统会自动完成其余工作。</p></div>
      <AppLink to="/time/constellation" target="_blank" class="preview-link"><Icon name="ph:arrow-square-out-bold" />查看前台星图</AppLink>
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
            <button v-if="issue.count" type="button" @click="openIssue(issue)"><Icon name="ph:eye-bold" />查看内容</button>
            <Icon v-else name="ph:check-circle-fill" class="clear-icon" />
          </article>
        </div>
      </section>

      <section class="constellation-settings">
        <div class="section-head"><div><small>SCENE SETTINGS</small><h2>星图显示配置</h2></div><a-button type="primary" size="small" :loading="settingsSaving" @click="saveSceneSettings"><Icon name="ph:floppy-disk-bold" />保存配置</a-button></div>
        <p class="section-intro">控制星体密度、时间环间隙、移动速度，以及所有可聚焦非内容星体的名称、简介和科普彩蛋。</p>
        <div class="scene-settings-grid">
          <label><span>太阳系行星数量</span><a-input-number v-model:value="sceneSettings.solarSystemPlanetCount" :min="1" :max="7" :step="1" /></label>
          <label><span>太阳系轨道缩放</span><a-slider v-model:value="sceneSettings.solarOrbitScale" :min="0.6" :max="1.6" :step="0.1" /><output>{{ sceneSettings.solarOrbitScale.toFixed(1) }}x</output></label>
          <label><span>非内容星球数量</span><a-input-number v-model:value="sceneSettings.nonContentStarCount" :min="100" :max="5000" :step="100" /></label>
          <label><span>时间环间隙</span><a-input-number v-model:value="sceneSettings.ringGap" :min="12" :max="100" :step="2" addon-after="单位" /></label>
          <label><span>移动速度</span><a-slider v-model:value="sceneSettings.movementSpeed" :min="0.2" :max="3" :step="0.1" /><output>{{ sceneSettings.movementSpeed.toFixed(1) }}x</output></label>
        </div>
        <div class="planet-settings-grid">
          <article v-for="planet in sceneSettings.solarPlanets" :key="planet.id">
            <header><Icon name="ph:planet-bold" /><strong>{{ planet.id }}</strong></header>
            <label><span>名称</span><a-input v-model:value="planet.name" /></label>
            <label><span>简介（两行）</span><a-textarea v-model:value="planet.description" :rows="2" :maxlength="180" /></label>
            <label><span>特点</span><a-input v-model:value="planet.feature" /></label>
            <details class="knowledge-editor wide"><summary><span>科普 / 彩蛋</span><b>{{ planet.knowledge?.length || 0 }}/1000</b><Icon name="ph:caret-down-bold" /></summary><a-textarea :value="(planet.knowledge || []).join('\n')" :auto-size="{ minRows: 5, maxRows: 18 }" @change="updatePlanetKnowledge(planet, $event)" /></details>
          </article>
        </div>
        <div class="special-body-settings">
          <article v-for="body in sceneSettings.specialBodies" :key="body.id">
            <header><Icon :name="specialBodyIcon(body.id)" /><strong>{{ specialBodyType(body.id) }}</strong></header>
            <label><span>标题</span><a-input v-model:value="body.title" /></label>
            <label><span>简介（两行）</span><a-textarea v-model:value="body.description" :rows="2" :maxlength="180" /></label>
            <label><span>状态</span><a-input v-model:value="body.status" /></label>
            <details class="knowledge-editor"><summary><span>科普 / 彩蛋</span><b>{{ body.knowledge?.length || 0 }}/1000</b><Icon name="ph:caret-down-bold" /></summary><a-textarea :value="(body.knowledge || []).join('\n')" :auto-size="{ minRows: 5, maxRows: 18 }" @change="updatePlanetKnowledge(body, $event)" /></details>
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
        <AppLink v-for="item in activeIssue?.items || []" :key="item.id" :to="item.href" target="_blank"><span><Icon :name="nodeIcon(item.type)" /></span><div><small>{{ typeText(item.type) }}</small><strong>{{ item.title }}</strong></div><Icon name="ph:arrow-up-right-bold" /></AppLink>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { SOLAR_KNOWLEDGE, SPECIAL_KNOWLEDGE } from '@/utils/constellationKnowledge'


const api = useApi()
const toast = useToast()
const loading = ref(true)
const rebuilding = ref(false)
const issueOpen = ref(false)
const error = ref('')
const activeIssue = ref<any>(null)
const settingsSaving = ref(false)
const defaultSolarPlanets = [
  { id: 'mercury', name: '水星', catalog: 'MERCURY · 类地行星', status: '昼夜温差极端', distance: '0.39 AU', period: '87.97 日', temperature: '−173 至 427 °C', feature: '撞击坑与铁质核心' },
  { id: 'venus', name: '金星', catalog: 'VENUS · 类地行星', status: '厚重云层覆盖', distance: '0.72 AU', period: '224.70 日', temperature: '约 464 °C', feature: '硫酸云带与温室效应' },
  { id: 'mars', name: '火星', catalog: 'MARS · 类地行星', status: '尘暴季节活跃', distance: '1.52 AU', period: '686.98 日', temperature: '平均 −63 °C', feature: '铁锈地表与极冠' },
  { id: 'jupiter', name: '木星', catalog: 'JUPITER · 气态巨行星', status: '大气带高速流动', distance: '5.20 AU', period: '11.86 年', temperature: '云顶约 −110 °C', feature: '大红斑与条带云系' },
  { id: 'saturn', name: '土星', catalog: 'SATURN · 气态巨行星', status: '环系层次清晰', distance: '9.58 AU', period: '29.45 年', temperature: '云顶约 −140 °C', feature: '冰尘星环与卡西尼缝' },
  { id: 'uranus', name: '天王星', catalog: 'URANUS · 冰巨行星', status: '横躺姿态运行', distance: '19.2 AU', period: '84.02 年', temperature: '约 −195 °C', feature: '甲烷冰层与极端倾角' },
  { id: 'neptune', name: '海王星', catalog: 'NEPTUNE · 冰巨行星', status: '超音速风暴活跃', distance: '30.1 AU', period: '164.79 年', temperature: '约 −200 °C', feature: '深蓝色大气与暗斑' },
].map((planet) => ({ ...planet, description: String((SOLAR_KNOWLEDGE[planet.id] || [])[0] || `${planet.name}以${planet.feature}构成独特的表面风貌，观测数据会随遥测指令实时更新。`), knowledge: [...(SOLAR_KNOWLEDGE[planet.id] || [`${planet.name}的核心观测特征是${planet.feature}。`])] }))
const defaultSpecialBodies = [
  { id: 'sun', title: '太阳', description: '太阳以稳定的核聚变为整个行星系统提供光与热，磁场活动塑造着日球层边界。', status: '日球层遥测在线', knowledge: [...SPECIAL_KNOWLEDGE.sun] },
  { id: 'black-hole', title: '玄渊 X-1', description: '这是一个以吸积盘与引力透镜特征构建的超大质量黑洞模型，所有亮度均来自周围高温物质。', status: '吸积盘稳定', knowledge: [...SPECIAL_KNOWLEDGE['black-hole']] },
  { id: 'station', title: '风隅轨道站', description: '长期在轨的记忆实验平台，承担材料暴露、生命支持与深空通信验证任务。', status: '乘组值守中', knowledge: [...SPECIAL_KNOWLEDGE.station] },
  { id: 'satellite', title: '听风一号', description: '光学通信与遥感试验卫星，在晨昏轨道上为离散记忆寻找同频信标。', status: '太阳同步轨道运行', knowledge: [...SPECIAL_KNOWLEDGE.satellite] },
  { id: 'satellite-aurora', title: '逐光二号', description: '面向极光与高层大气的宽视场观测平台，记录磁暴期间的带电粒子沉降。', status: '极区扫描进行中', knowledge: [...SPECIAL_KNOWLEDGE['satellite-aurora']] },
  { id: 'satellite-relay', title: '潮声三号', description: '搭载定向高增益天线的深空中继节点，为远端记忆坐标提供转发与时间同步。', status: '跨轨链路稳定', knowledge: [...SPECIAL_KNOWLEDGE['satellite-relay']] },
  { id: 'spacecraft', title: '风隅号', description: '由陶瓷复合装甲、三联离子推进阵列和全景舰桥构成的深空巡航舰。', status: '三联离子驱动在线', knowledge: [...SPECIAL_KNOWLEDGE.spacecraft] },
  { id: 'scoutcraft', title: '棱镜号', description: '为星际航道测绘而生的高速探测艇，将星光与脉冲星信号叠合为航向解。', status: '脉冲星导航解算中', knowledge: [...SPECIAL_KNOWLEDGE.scoutcraft] },
]
function mergedKnowledge(value: unknown, fallback: string[]) {
  const custom = Array.isArray(value) ? value.map(item => String(item).trim()).filter(Boolean) : []
  return [...custom, ...fallback.filter(item => !custom.includes(item))].slice(0, 1000)
}
function normalizeSolarPlanets(value: unknown) {
  const configured = Array.isArray(value) ? value : []
  const byId = new Map(configured.map((item: any) => [String(item?.id || ''), item]))
  return defaultSolarPlanets.map((fallback: any) => {
    const item = byId.get(fallback.id) || {}
    return {
      ...fallback,
      ...item,
      id: fallback.id,
      name: String(item.name || fallback.name),
      catalog: String(item.catalog || fallback.catalog),
      status: String(item.status || fallback.status),
      feature: String(item.feature || fallback.feature),
      description: String(item.description || fallback.description),
      distance: String(item.distance || fallback.distance),
      period: String(item.period || fallback.period),
      temperature: String(item.temperature || fallback.temperature),
      knowledge: mergedKnowledge(item.knowledge, fallback.knowledge),
    }
  })
}
function normalizeSpecialBodies(value: unknown) {
  const configured = Array.isArray(value) ? value : []
  const byId = new Map(configured.map((item: any) => [String(item?.id || ''), item]))
  return defaultSpecialBodies.map((fallback: any) => {
    const item = byId.get(fallback.id) || {}
    return {
      ...fallback,
      ...item,
      id: fallback.id,
      title: String(item.title || fallback.title),
      status: String(item.status || fallback.status),
      description: String(item.description || fallback.description),
      knowledge: mergedKnowledge(item.knowledge, fallback.knowledge),
    }
  })
}
const sceneSettings = reactive<any>({ nonContentStarCount: 2400, ringGap: 34, movementSpeed: 1, solarSystemPlanetCount: 7, solarOrbitScale: 1, solarPlanets: defaultSolarPlanets, specialBodies: defaultSpecialBodies })
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
    const [healthResult, sceneResult] = await Promise.all([
      api.get('/memory-relations/health'),
      api.get<any>('/settings/constellation_config'),
    ])
    Object.assign(health, healthResult)
    if (sceneResult && typeof sceneResult === 'object') {
      Object.assign(sceneSettings, sceneResult)
      sceneSettings.solarSystemPlanetCount = Number(sceneSettings.solarSystemPlanetCount) || 7
      sceneSettings.solarOrbitScale = Number(sceneSettings.solarOrbitScale) || 1
      sceneSettings.nonContentStarCount = Number(sceneSettings.nonContentStarCount) || 2400
      sceneSettings.ringGap = Number(sceneSettings.ringGap) || 34
      sceneSettings.movementSpeed = Number(sceneSettings.movementSpeed) || 1
      sceneSettings.solarPlanets = normalizeSolarPlanets(sceneResult.solarPlanets)
      sceneSettings.specialBodies = normalizeSpecialBodies(sceneResult.specialBodies)
    }
  } catch (exception: any) {
    error.value = exception?.message || '读取星图状态失败'
  } finally {
    loading.value = false
  }
}

async function saveSceneSettings() {
  settingsSaving.value = true
  try {
    const value = {
      ...sceneSettings,
      solarPlanets: normalizeSolarPlanets(sceneSettings.solarPlanets),
      specialBodies: normalizeSpecialBodies(sceneSettings.specialBodies),
    }
    sceneSettings.solarPlanets = value.solarPlanets
    sceneSettings.specialBodies = value.specialBodies
    await api.put('/settings', { key: 'constellation_config', value })
    toast.success('星图配置已保存')
  } catch (exception: any) {
    toast.error(exception?.message || '星图配置保存失败')
  } finally {
    settingsSaving.value = false
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

function updatePlanetKnowledge(planet: any, event: Event) {
  const value = (event.target as HTMLTextAreaElement)?.value || ''
  planet.knowledge = value.split(/\r?\n/).map(item => item.trim()).filter(Boolean).slice(0, 1000)
}

function specialBodyType(id: string) {
  return ({ sun: '太阳', 'black-hole': '黑洞', station: '空间站', satellite: '深空信标卫星', 'satellite-aurora': '极光观测卫星', 'satellite-relay': '深空中继卫星', spacecraft: '深空巡航舰', scoutcraft: '航道测绘艇' } as Record<string, string>)[id] || id
}

function specialBodyIcon(id: string) {
  return ({ sun: 'ph:sun-bold', 'black-hole': 'ph:circle-half-tilt-bold', station: 'ph:broadcast-bold', satellite: 'ph:broadcast-duotone', 'satellite-aurora': 'ph:aperture-bold', 'satellite-relay': 'ph:broadcast-bold', spacecraft: 'ph:rocket-launch-bold', scoutcraft: 'ph:shooting-star-bold' } as Record<string, string>)[id] || 'ph:star-four-bold'
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
.constellation-admin { display:flex; width:min(1160px,100%); min-height:100%; flex-direction:column; gap:20px; margin:0 auto; padding-bottom:36px; }
.constellation-admin > :deep(.ant-spin) { display:block; }
.constellation-admin :deep(.ant-spin-container) { display:flex; flex-direction:column; gap:20px; }
.page-header { display:flex; align-items:center; justify-content:space-between; gap:18px; }
.title-block { display:flex; align-items:center; gap:12px; }.title-icon { display:grid; width:46px; height:46px; border:1px solid color-mix(in srgb,var(--c-primary) 28%,var(--border)); border-radius:12px; background:var(--c-primary-soft); color:var(--c-primary); font-size:1.25rem; place-items:center; }
.title-block small,.section-head small,.automation-card div>small { color:var(--c-primary); font-size:.54rem; letter-spacing:.15em; }.title-block h1 { margin:2px 0 0; color:var(--c-text); font-size:1.38rem; }.title-block p { margin:4px 0 0; color:var(--c-text-3); font-size:.7rem; }
.preview-link { display:flex; height:34px; align-items:center; gap:6px; padding:0 12px; border:1px solid var(--border); border-radius:8px; color:var(--c-text-2); font-size:.69rem; text-decoration:none; transition:.2s; }.preview-link:hover { border-color:color-mix(in srgb,var(--c-primary) 36%,var(--border)); color:var(--c-primary); }
.automation-card { position:relative; display:grid; grid-template-columns:54px minmax(0,1fr) auto; align-items:center; gap:14px; overflow:hidden; padding:18px; border:1px solid color-mix(in srgb,var(--c-primary) 25%,var(--border)); border-radius:12px; background:linear-gradient(135deg,color-mix(in srgb,var(--c-primary) 8%,var(--ld-bg-card)),var(--ld-bg-card)); }.automation-card::after { position:absolute; top:-80px; right:12%; width:180px; height:180px; border:1px dashed color-mix(in srgb,var(--c-primary) 16%,transparent); border-radius:50%; content:''; animation:orbit 22s linear infinite; }
.automation-orb { position:relative; z-index:1; display:grid; width:52px; height:52px; border-radius:50%; background:radial-gradient(circle at 35% 28%,#9edaff,var(--c-primary) 42%,#174b78); box-shadow:inset -9px -8px 18px rgb(2 18 38/.3),0 0 24px color-mix(in srgb,var(--c-primary) 28%,transparent); color:#fff; place-items:center; }.automation-orb i { position:absolute; width:66px; height:20px; border:1px solid color-mix(in srgb,var(--c-primary) 52%,transparent); border-radius:50%; transform:rotate(-14deg); }
.automation-card div { position:relative; z-index:1; display:flex; flex-direction:column; }.automation-card strong { margin-top:3px; color:var(--c-text); font-size:.86rem; }.automation-card p { max-width:720px; margin:5px 0 0; color:var(--c-text-3); font-size:.63rem; line-height:1.65; }.sync-time { position:relative; z-index:1; display:flex; align-items:center; gap:6px; color:var(--c-text-3); font-size:.57rem; }.sync-time i { width:6px; height:6px; border-radius:50%; background:#46c78b; box-shadow:0 0 0 4px rgb(70 199 139/.1); }
.metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }.metrics article { display:grid; min-height:88px; grid-template-columns:40px 1fr; align-items:center; gap:10px; padding:14px; border:1px solid var(--border); border-radius:10px; background:var(--ld-bg-card); }.metrics article>span { display:grid; width:40px; height:40px; border-radius:9px; background:var(--c-primary-soft); color:var(--c-primary); font-size:1.05rem; place-items:center; }.metrics article>div { display:flex; flex-direction:column; }.metrics strong { color:var(--c-text); font-size:1.18rem; font-variant-numeric:tabular-nums; }.metrics small { color:var(--c-text-3); font-size:.6rem; }.metrics em { grid-column:2; color:var(--c-text-3); font-size:.54rem; font-style:normal; }
.health-section { display:flex; flex-direction:column; gap:11px; }.section-head { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; }.section-head h2 { margin:3px 0 0; color:var(--c-text); font-size:1rem; }.section-head>span { color:var(--c-text-3); font-size:.67rem; }.section-intro { margin:-5px 0 0; color:var(--c-text-3); font-size:.59rem; }
.health-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }.health-grid article { display:grid; grid-template-columns:36px minmax(0,1fr) auto; align-items:center; gap:10px; padding:13px; border:1px solid color-mix(in srgb,#d48655 24%,var(--border)); border-radius:9px; background:var(--ld-bg-card); }.health-grid article>span { display:grid; width:36px; height:36px; border-radius:8px; background:color-mix(in srgb,#d48655 10%,var(--c-bg-2)); color:#c77748; place-items:center; }.health-grid article>div { display:flex; min-width:0; flex-direction:column; }.health-grid strong { color:var(--c-text); font-size:.7rem; }.health-grid p { margin:3px 0 0; color:var(--c-text-3); font-size:.56rem; }.health-grid button { display:inline-flex; align-items:center; gap:6px; border:0; background:none; color:var(--c-primary); cursor:pointer; font:inherit; font-size:.59rem; }.health-grid article.clear { border-color:var(--border); }.health-grid article.clear>span { background:color-mix(in srgb,#45a87b 9%,var(--c-bg-2)); color:#45a87b; }.clear-icon { color:#45a87b; }
.constellation-settings{display:flex;flex-direction:column;gap:11px;padding-top:4px;border-top:1px solid var(--border)}.scene-settings-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:14px;border:1px solid var(--border);border-radius:9px;background:var(--ld-bg-card)}.scene-settings-grid label{display:flex;min-width:0;flex-direction:column;gap:7px;color:var(--c-text-2);font-size:.64rem}.scene-settings-grid .ant-slider{margin:8px 0 2px}.scene-settings-grid output{color:var(--c-primary);font-size:.62rem}
.planet-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.planet-settings-grid article{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:12px;border:1px solid var(--border);border-radius:9px;background:var(--ld-bg-card)}.planet-settings-grid article header,.planet-settings-grid label.wide{grid-column:1/-1}.planet-settings-grid article header{display:flex;align-items:center;gap:7px;color:var(--c-primary);font-size:.66rem}.planet-settings-grid article header strong{text-transform:uppercase;letter-spacing:.08em}.planet-settings-grid label{display:flex;min-width:0;flex-direction:column;gap:5px;color:var(--c-text-2);font-size:.58rem}.planet-settings-grid label>span,.special-body-settings label>span{display:flex;align-items:center;justify-content:space-between;gap:8px}.planet-settings-grid label b,.special-body-settings label b{color:var(--c-primary);font-size:.55rem;font-weight:500}.planet-settings-grid :deep(.ant-input),.planet-settings-grid :deep(textarea){font-size:.65rem}
.special-body-settings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.special-body-settings article{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:12px;border:1px solid color-mix(in srgb,var(--c-primary) 24%,var(--border));border-radius:9px;background:var(--ld-bg-card)}.special-body-settings article header{display:flex;grid-column:1/-1;align-items:center;gap:7px;color:var(--c-primary);font-size:.66rem}.special-body-settings article header strong{text-transform:uppercase;letter-spacing:.08em}.special-body-settings label{display:flex;min-width:0;flex-direction:column;gap:5px;color:var(--c-text-2);font-size:.58rem}.special-body-settings label:last-child{grid-column:1/-1}.special-body-settings :deep(.ant-input),.special-body-settings :deep(textarea){font-size:.65rem}
.knowledge-editor{grid-column:1/-1;border-top:1px dashed var(--border);padding-top:7px}.knowledge-editor summary{display:flex;align-items:center;gap:8px;color:var(--c-text-2);cursor:pointer;list-style:none;font-size:.58rem}.knowledge-editor summary::-webkit-details-marker{display:none}.knowledge-editor summary b{margin-left:auto;color:var(--c-primary);font-size:.55rem;font-weight:500}.knowledge-editor summary :deep(svg){color:var(--c-text-3);transition:transform .2s}.knowledge-editor[open] summary :deep(svg){transform:rotate(180deg)}.knowledge-editor :deep(textarea){width:100%;margin-top:8px;font-size:.65rem}
.recovery-panel { border-block:1px solid var(--border); }.recovery-panel summary { display:flex; align-items:center; justify-content:space-between; padding:14px 2px; color:var(--c-text); cursor:pointer; list-style:none; }.recovery-panel summary>span { display:grid; grid-template-columns:20px 1fr; align-items:center; gap:2px 7px; }.recovery-panel summary>span>svg { grid-row:1/3; color:var(--c-text-3); }.recovery-panel summary b { font-size:.7rem; }.recovery-panel summary small { color:var(--c-text-3); font-size:.55rem; }.recovery-panel[open] summary>svg { transform:rotate(180deg); }.recovery-panel>div { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:0 2px 14px; }.recovery-panel p { margin:0; color:var(--c-text-3); font-size:.59rem; }
.issue-list { display:grid; gap:7px; }.issue-list>a { display:grid; grid-template-columns:34px 1fr 18px; align-items:center; gap:9px; padding:9px; border:1px solid var(--border); border-radius:8px; color:var(--c-text); text-decoration:none; }.issue-list>a>span { display:grid; width:34px; height:34px; border-radius:7px; background:var(--c-primary-soft); color:var(--c-primary); place-items:center; }.issue-list div { display:flex; min-width:0; flex-direction:column; }.issue-list small { color:var(--c-text-3); font-size:.54rem; }.issue-list strong { overflow:hidden; font-size:.66rem; text-overflow:ellipsis; white-space:nowrap; }
@keyframes orbit { to { transform:rotate(360deg); } }
@media(max-width:900px) { .metrics { grid-template-columns:repeat(2,1fr); }.health-grid { grid-template-columns:1fr; }.scene-settings-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.planet-settings-grid{grid-template-columns:1fr} }
@media(max-width:900px) { .special-body-settings{grid-template-columns:1fr} }
@media(max-width:700px){.scene-settings-grid,.planet-settings-grid{grid-template-columns:1fr}.planet-settings-grid article{grid-template-columns:1fr}.planet-settings-grid article header,.planet-settings-grid label.wide{grid-column:auto}}
@media(max-width:620px) { .page-header { align-items:flex-start; flex-direction:column; }.automation-card { grid-template-columns:48px 1fr; }.sync-time { grid-column:1/-1; }.metrics { grid-template-columns:1fr 1fr; }.recovery-panel>div { align-items:flex-start; flex-direction:column; } }
@media(prefers-reduced-motion:reduce) { .automation-card::after { animation:none; } }
.automation-card { min-height:132px; padding:20px; }
@media(max-width:620px) { .automation-card { min-height:156px; grid-template-columns:48px minmax(0,1fr); align-items:start; } .automation-card p { max-width:none; } }
</style>

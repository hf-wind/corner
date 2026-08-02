<template>
  <main class="constellation-page" :class="{ ready: sceneReady }">
    <section class="constellation-stage" aria-label="时光星图">
      <TimeConstellationScene
        v-if="!fallbackMode && graphReady"
        ref="sceneRef"
        :nodes="displayNodes"
        :relations="displayRelations"
        :graph-version="displayGraphVersion"
        :selected-id="selected?.id"
        :resolve-image="mediaUrl"
        :intro-delay-ms="180"
        @ready="sceneReady = true"
        @select="handleSceneSelect"
        @discover="handleDiscovery"
        @clear="clearSelected"
        @fallback="fallbackMode = true"
      />
      <MemoryGraph2D
        v-else-if="graphReady && fallbackMode"
        :nodes="displayNodes"
        :relations="displayRelations"
        :selected-id="selected?.id"
        @select="handleSceneSelect"
      />
      <div v-else class="constellation-loading" aria-live="polite">
        <span class="loading-orbit"><i /><i /><i /></span>
        <small>正在展开你的时间轨道</small>
      </div>
    </section>

    <header class="constellation-nav">
      <button type="button" class="brand" title="返回时光门面" @click="navigate('/')">
        <img src="/logo_192.png" alt="" width="42" height="42">
        <span><strong>时光星图</strong><small>TIME CONSTELLATION</small></span>
      </button>
      <div class="signal" :class="{ offline: !!error }">
        <i />
        <span>{{ signalText }}</span>
        <button v-if="error" type="button" title="重新连接真实记忆" aria-label="重新连接真实记忆" @click="loadGraph"><Icon name="ph:arrow-clockwise-bold" /></button>
        <button type="button" title="重置视角" aria-label="重置视角" @click="resetScene"><Icon name="ph:crosshair-simple-bold" /></button>
      </div>
    </header>

    <nav class="cosmic-dock" aria-label="深空信标">
      <button
        v-for="item in discoveries"
        :key="item.id"
        type="button"
        :class="{ active: activeDiscovery?.id === item.id }"
        :title="item.title"
        :aria-label="item.title"
        @click="openDiscovery(item.id)"
      >
        <Icon :name="item.icon" />
        <span>{{ item.shortLabel }}</span>
      </button>
    </nav>

    <section class="constellation-intro" aria-labelledby="constellation-title">
      <div class="intro-kicker"><span>MY TIME UNIVERSE</span><i /><em>{{ timeRange }}</em></div>
      <h1 id="constellation-title">时光星图</h1>
      <p>记忆沿年份铺成轨道，地点、照片与故事在时间里彼此照亮。</p>
    </section>

    <footer class="constellation-foot">
      <span><i />{{ latestLabel }}<b><em />发光天体为真实记忆 · 深空信标藏有回声</b></span>
      <div aria-label="星图交互状态">
        <Icon name="ph:cursor-click-bold" />
        <Icon name="ph:arrows-out-cardinal-bold" />
        <Icon name="ph:magnifying-glass-plus-bold" />
      </div>
    </footer>

    <Transition name="popup">
      <aside v-if="selected" class="memory-popup">
        <div class="popup-rail" aria-hidden="true"><span /><i /></div>
        <button class="popup-close" type="button" title="关闭" aria-label="关闭" @click="clearSelected"><Icon name="ph:x-bold" /></button>
        <div class="popup-glow" aria-hidden="true" />
        <div class="popup-identity"><span><Icon :name="nodeIcon(selected.type)" /></span><small>{{ typeText(selected.type) }} · {{ formatDate(selected.occurredAt) }}</small></div>
        <div v-if="selected.image" class="popup-image"><img :src="mediaUrl(selected.image)" alt=""></div>
        <h2>{{ selected.title }}</h2>
        <p>{{ selected.excerpt || '这颗星保存着一段尚未展开的记忆。' }}</p>
        <NuxtLink v-if="selected.href" :to="selected.href"><span>读取这段时光</span><Icon name="ph:arrow-up-right-bold" /></NuxtLink>
        <section v-if="neighbors.length">
          <h3><span>相连轨迹</span><small>{{ neighbors.length }} 条</small></h3>
          <button v-for="relation in neighbors.slice(0, 3)" :key="relation.id" type="button" @click="selectNeighbor(relation)">
            <span>{{ relationText(relation.type) }}</span>
            <b>{{ otherNode(relation).title }}</b>
            <small>{{ evidenceText(relation.evidence) }}</small>
          </button>
        </section>
      </aside>
    </Transition>

    <Transition name="popup">
      <aside
        v-if="activeDiscovery"
        class="discovery-popup"
        :style="{ '--discovery-accent': activeDiscovery.accent }"
      >
        <button class="popup-close" type="button" title="关闭" aria-label="关闭" @click="clearDiscovery"><Icon name="ph:x-bold" /></button>
        <div class="discovery-orbit" aria-hidden="true"><i /><i /><i /></div>
        <div class="discovery-identity"><Icon :name="activeDiscovery.icon" /><span>{{ activeDiscovery.kicker }}</span></div>
        <h2>{{ activeDiscovery.title }}</h2>
        <p>{{ activeDiscovery.description }}</p>
        <div class="discovery-signal" aria-live="polite">
          <small>{{ activeDiscovery.signalLabel }}</small>
          <strong>{{ discoveryResult || activeDiscovery.signal }}</strong>
        </div>
        <button class="discovery-action" type="button" @click="runDiscoveryEffect">
          <Icon :name="activeDiscovery.actionIcon" />
          <span>{{ activeDiscovery.action }}</span>
        </button>
      </aside>
    </Transition>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'welcome' })

type GraphNode = {
  id: string
  type: string
  title: string
  excerpt?: string | null
  href?: string
  image?: string | null
  occurredAt?: string | null
  coordinateSeed?: number
  metadata?: Record<string, unknown>
}

type GraphRelation = {
  id: string
  sourceId: string
  targetId: string
  type: string
  weight?: number
  source?: GraphNode
  target?: GraphNode
  evidence?: Record<string, unknown>
}

type DiscoveryId = 'sun' | 'black-hole' | 'station' | 'satellite' | 'spacecraft'

type Discovery = {
  id: DiscoveryId
  title: string
  shortLabel: string
  kicker: string
  description: string
  signalLabel: string
  signal: string
  icon: string
  actionIcon: string
  action: string
  accent: string
  responses: string[]
}

const api = useApi()
const route = useRoute()
const router = useRouter()
const { mediaUrl } = useMediaUrl()
const { navigate } = useCosmicNavigation()
const { selectMemory, clearMemory } = useMemorySelection()
const graph = reactive<{ nodes: GraphNode[]; relations: GraphRelation[]; graphVersion: string }>({ nodes: [], relations: [], graphVersion: '' })
const sceneRef = ref<{
  resetView: () => void
  focusDiscovery: (id: DiscoveryId) => void
  triggerDiscoveryEffect: (id: DiscoveryId) => void
} | null>(null)
const selected = ref<GraphNode | null>(null)
const activeDiscoveryId = ref<DiscoveryId | ''>('')
const discoveryResult = ref('')
const discoverySequence = ref(0)
const neighbors = ref<GraphRelation[]>([])
const error = ref('')
const sceneReady = ref(false)
const fallbackMode = ref(false)
const graphReady = ref(false)
let requestSequence = 0

const typeOptions = [
  { value: 'memory', label: '时光记忆', icon: 'ph:planet-bold' },
  { value: 'post', label: '文章', icon: 'ph:article-bold' },
  { value: 'moment', label: '瞬间', icon: 'ph:sparkle-bold' },
  { value: 'album', label: '相册', icon: 'ph:images-square-bold' },
  { value: 'photo', label: '照片', icon: 'ph:image-bold' },
  { value: 'place', label: '地点', icon: 'ph:map-pin-bold' },
  { value: 'library', label: '书影', icon: 'ph:books-bold' },
  { value: 'journey', label: '旅行', icon: 'ph:path-bold' },
]

const discoveries: Discovery[] = [
  {
    id: 'sun', title: '日冕观测站', shortLabel: '太阳', kicker: 'SOLAR ARCHIVE · 01',
    description: '这里保存所有被晨光照亮的时刻。每一束离开日冕的光，都要走八分二十秒才能抵达我们。',
    signalLabel: '当前日冕回声', signal: '光球层稳定 · 一束旧日晨光正在抵达', icon: 'ph:sun-bold', actionIcon: 'ph:sparkle-bold', action: '采集一束日冕光', accent: '#ffbd68',
    responses: ['光子样本 08:20 已封存：来自八分钟前的太阳。', '日冕里浮出一句话：今天也值得被照亮。', '捕获到一次微型耀斑，它把此刻标成了金色。'],
  },
  {
    id: 'black-hole', title: '事件视界', shortLabel: '黑洞', kicker: 'GRAVITY WELL · 02',
    description: '光与时间在这里弯曲。投入事件视界的东西不会消失，只会变成宇宙无法复述的秘密。',
    signalLabel: '引力读数', signal: '时间膨胀 1.37× · 边界稳定', icon: 'ph:circle-half-tilt-bold', actionIcon: 'ph:paper-plane-tilt-bold', action: '投递一封无人信', accent: '#a99aff',
    responses: ['信件已越过事件视界。它不会回来，也不会再打扰你。', '引力潮汐收走了这段噪声，只留下安静。', '无人信失去时间戳，成为宇宙里一个温柔的秘密。'],
  },
  {
    id: 'station', title: '记忆空间站', shortLabel: '空间站', kicker: 'ORBITAL LOG · 03',
    description: '一座绕记忆轨道运行的中继站。舷窗朝向被点亮的星球，值班员把偶然的幸福写进航行日志。',
    signalLabel: '今日值班频道', signal: '舱压正常 · 远端记忆链路已接通', icon: 'ph:broadcast-bold', actionIcon: 'ph:radio-bold', action: '接收一则航行日志', accent: '#72d9ff',
    responses: ['航行日志 021：窗外有一颗记忆刚刚亮起。', '航行日志 034：我们绕过旧日，仍在向前。', '航行日志 089：今日宇宙安静，适合想念。'],
  },
  {
    id: 'satellite', title: '深空信标卫星', shortLabel: '卫星', kicker: 'BEACON ARRAY · 04',
    description: '它在星图边缘缓慢巡航，替那些尚未相连的记忆寻找频率相同的邻居。',
    signalLabel: '校准频段', signal: '1420.405 MHz · 弱信号持续靠近', icon: 'ph:planet-bold', actionIcon: 'ph:crosshair-simple-bold', action: '校准深空频率', accent: '#70e7cf',
    responses: ['频率已锁定：一段久远的笑声正在返航。', '坐标校准完成：孤独信号找到了同频回声。', '信标完成握手：下一颗记忆星等待被点亮。'],
  },
  {
    id: 'spacecraft', title: '远航信使', shortLabel: '飞船', kicker: 'COURIER FLIGHT · 05',
    description: '它不运送货物，只携带尚未说出口的话。每次跃迁，都会在星图上留下一条短暂的蓝色航迹。',
    signalLabel: '跃迁引擎', signal: '曲率核心待命 · 航路净空', icon: 'ph:rocket-launch-bold', actionIcon: 'ph:lightning-bold', action: '启动一次跃迁', accent: '#7ca8ff',
    responses: ['跃迁完成：那句没说出口的话，正在前往它该去的地方。', '航路折叠成功，信使已穿过三段旧时光。', '曲率核心熄火，身后留下一条蓝色回声。'],
  },
]

const displayNodes = computed(() => graph.nodes)
const activeDiscovery = computed(() => discoveries.find(item => item.id === activeDiscoveryId.value) || null)
const displayRelations = computed(() => graph.relations)
const displayGraphVersion = computed(() => graph.graphVersion || `empty-${graph.nodes.length}`)
const nodeYears = computed(() => graph.nodes
  .map(node => node.occurredAt ? new Date(node.occurredAt).getFullYear() : NaN)
  .filter(Number.isFinite))
const timeRange = computed(() => nodeYears.value.length ? `${Math.min(...nodeYears.value)} — ${Math.max(...nodeYears.value)}` : '等待第一段记忆')
const latestNode = computed(() => [...graph.nodes]
  .filter(node => node.occurredAt)
  .sort((a, b) => new Date(b.occurredAt!).getTime() - new Date(a.occurredAt!).getTime())[0])
const latestLabel = computed(() => latestNode.value ? `最近点亮 · ${formatDate(latestNode.value.occurredAt)}` : '每一次发布，都会点亮一颗新星')
const signalText = computed(() => graph.nodes.length
  ? `${graph.nodes.length} 枚真实记忆已点亮`
  : error.value ? '宇宙底图运行中 · 真实记忆暂未连接' : '宇宙底图运行中 · 等待首次点亮')

onMounted(loadGraph)

async function loadGraph() {
  const sequence = ++requestSequence
  error.value = ''
  try {
    const result = await api.get<any>('/memories/graph', { view: 'constellation', limit: 320 })
    if (sequence !== requestSequence) return
    graph.nodes = Array.isArray(result?.nodes) ? result.nodes : []
    graph.relations = Array.isArray(result?.relations) ? result.relations : []
    graph.graphVersion = String(result?.graphVersion || '')
    graphReady.value = true
    fallbackMode.value = false
    const focus = String(route.query.focus || '')
    const focusedNode = graph.nodes.find(item => item.id === focus)
    if (focusedNode) await selectNode(focusedNode, false)
  } catch (exception: any) {
    if (sequence === requestSequence) {
      error.value = exception?.message || '真实记忆暂时无法连接'
      graphReady.value = true
    }
  }
}

async function selectNode(node: GraphNode, syncUrl = true) {
  activeDiscoveryId.value = ''
  discoveryResult.value = ''
  selected.value = node
  selectMemory({ id: node.id, type: node.type, href: node.href })
  if (syncUrl) await router.replace({ query: { focus: node.id } })
  try {
    const result = await api.get<any>(`/memories/graph/neighbors/${encodeURIComponent(node.id)}`)
    if (selected.value?.id === node.id) neighbors.value = result.relations || []
  } catch {
    if (selected.value?.id === node.id) neighbors.value = []
  }
}

function handleSceneSelect(node: GraphNode) {
  void selectNode(node)
}

function handleDiscovery(id: DiscoveryId) {
  selected.value = null
  neighbors.value = []
  clearMemory()
  activeDiscoveryId.value = id
  discoveryResult.value = ''
  void router.replace({ query: {} })
}

function openDiscovery(id: DiscoveryId) {
  handleDiscovery(id)
  sceneRef.value?.focusDiscovery(id)
}

function clearDiscovery() {
  activeDiscoveryId.value = ''
  discoveryResult.value = ''
  sceneRef.value?.resetView()
}

function runDiscoveryEffect() {
  const discovery = activeDiscovery.value
  if (!discovery) return
  discoveryResult.value = discovery.responses[discoverySequence.value % discovery.responses.length] || discovery.signal
  discoverySequence.value += 1
  sceneRef.value?.triggerDiscoveryEffect(discovery.id)
}

function resetScene() {
  if (selected.value) {
    selected.value = null
    neighbors.value = []
    clearMemory()
    void router.replace({ query: {} })
  }
  activeDiscoveryId.value = ''
  discoveryResult.value = ''
  sceneRef.value?.resetView()
}

function clearSelected() {
  selected.value = null
  neighbors.value = []
  clearMemory()
  void router.replace({ query: {} })
  if (activeDiscoveryId.value) {
    activeDiscoveryId.value = ''
    discoveryResult.value = ''
    sceneRef.value?.resetView()
  }
}

function selectNeighbor(relation: GraphRelation) {
  const node = otherNode(relation)
  const fullNode = graph.nodes.find(item => item.id === node.id) || node
  void selectNode(fullNode)
}

function otherNode(relation: GraphRelation): GraphNode {
  return (relation.sourceId === selected.value?.id ? relation.target : relation.source) || { id: '', type: 'post', title: '未命名记忆' }
}

function nodeIcon(type: string) {
  return typeOptions.find(item => item.value === type)?.icon || 'ph:star-four-bold'
}

function typeText(type: string) {
  return typeOptions.find(item => item.value === type)?.label || type
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' }) : '未标时间'
}

function relationText(type: string) {
  return ({ same_place: '同一地点', same_album: '同一相册', same_tag: '共同标签', time_adjacent: '时间相邻', reference: '内容引用', same_journey: '同一旅行', journey_sequence: '旅行轨迹', contains: '包含内容', story_sequence: '故事顺序', same_theme: '同一主题', custom: '自定义' } as Record<string, string>)[type] || type
}

function evidenceText(value?: Record<string, unknown>) {
  if (!value) return ''
  return String(value.reason || value.albumTitle || value.stop || (value.days !== undefined ? `相隔 ${value.days} 天` : ''))
}

useHead({ title: '时光星图' })
</script>

<style scoped>
.constellation-page { position:fixed; z-index:40; inset:0; overflow:hidden; background:#030817; color:#ecf7ff; }
.constellation-stage { position:absolute; inset:0; overflow:hidden; }
.constellation-stage :deep(.constellation-scene) { position:absolute; inset:0; }
.constellation-stage :deep(.graph-preview) { height:100%; min-height:100%; border:0; background:#030817; }
.constellation-stage :deep(svg) { width:100%; height:100%; min-height:100%; }
.constellation-loading { position:absolute; z-index:5; inset:0; display:grid; align-content:center; justify-items:center; gap:18px; background:#030817; color:#80b9d8; pointer-events:none; }
.constellation-loading small { font-size:.62rem; letter-spacing:.14em; }
.loading-orbit { position:relative; display:block; width:62px; height:62px; border:1px solid rgb(104 200 255 / .28); border-radius:50%; animation:loading-spin 5s linear infinite; }
.loading-orbit::before { position:absolute; inset:12px; border:1px solid rgb(121 169 255 / .34); border-radius:50%; content:''; }
.loading-orbit i { position:absolute; top:-4px; left:50%; width:7px; height:7px; border-radius:50%; background:#6ed8ff; box-shadow:0 0 16px #51c8ff; transform:translateX(-50%); }
.loading-orbit i:nth-child(2) { top:50%; left:auto; right:-4px; background:#9d8cff; box-shadow:0 0 16px #8c7cff; }
.loading-orbit i:nth-child(3) { top:auto; right:auto; bottom:-4px; left:22%; background:#74e0c6; box-shadow:0 0 16px #57cfb1; }
.constellation-nav { position:absolute; z-index:10; top:20px; right:22px; left:22px; display:flex; align-items:center; justify-content:space-between; pointer-events:none; }
.brand,.signal { pointer-events:auto; }
.brand { display:inline-flex; align-items:center; gap:11px; padding:0; border:0; background:none; color:#ecf7ff; cursor:pointer; font:inherit; text-align:left; }
.brand img { width:42px; height:42px; border:1px solid rgb(116 207 255 / .18); border-radius:12px; box-shadow:0 0 26px rgb(73 157 232 / .24); }
.brand span { display:flex; flex-direction:column; gap:1px; }
.brand strong { font-size:.82rem; letter-spacing:0; }
.brand small { color:#75c8ef; font-size:.48rem; letter-spacing:.13em; }
.signal { display:flex; align-items:center; gap:8px; color:#8bb1c9; font-size:.57rem; }
.signal>i { width:6px; height:6px; border-radius:50%; background:#68d7ef; box-shadow:0 0 12px #4caee9; }
.signal.offline>i { background:#8298ad; box-shadow:0 0 10px #55758f; }
.signal button { display:grid; width:30px; height:30px; border:1px solid rgb(117 181 236 / .2); border-radius:50%; background:rgb(4 15 31 / .5); color:#8fc8f5; place-items:center; transition:background .25s ease,transform .25s ease; }
.signal button:hover { background:rgb(35 91 141 / .4); transform:translateY(-2px); }
.cosmic-dock { position:absolute; z-index:12; top:22px; left:50%; display:flex; height:38px; align-items:stretch; gap:2px; padding:2px; border:1px solid rgb(110 189 235 / .16); border-radius:8px; background:rgb(3 14 30 / .62); box-shadow:0 12px 34px rgb(0 0 0 / .24); backdrop-filter:blur(16px); transform:translateX(-50%); }
.cosmic-dock button { display:flex; min-width:66px; align-items:center; justify-content:center; gap:6px; padding:0 9px; border:1px solid transparent; border-radius:6px; background:transparent; color:#7898af; cursor:pointer; font:inherit; transition:background .22s ease,border-color .22s ease,color .22s ease,transform .22s ease; }
.cosmic-dock button :deep(svg) { flex:none; font-size:.78rem; }
.cosmic-dock button span { font-size:.54rem; white-space:nowrap; }
.cosmic-dock button:hover { border-color:rgb(111 207 245 / .2); background:rgb(48 119 165 / .16); color:#c8edff; transform:translateY(-1px); }
.cosmic-dock button.active { border-color:rgb(118 216 255 / .38); background:rgb(53 139 190 / .22); color:#dff6ff; box-shadow:inset 0 0 18px rgb(78 181 231 / .08); }
.cosmic-dock button:focus-visible { outline:2px solid #4a9fe6; outline-offset:3px; }
.constellation-intro { position:absolute; z-index:8; bottom:74px; left:clamp(22px,6vw,92px); width:min(540px,calc(100vw - 44px)); pointer-events:none; opacity:0; transform:translateY(18px); transition:opacity 1s ease .9s,transform 1.3s cubic-bezier(.16,1,.3,1) .9s; }
.ready .constellation-intro { opacity:1; transform:none; }
.intro-kicker { display:flex; align-items:center; gap:9px; color:#73c7ee; font-size:.54rem; letter-spacing:.11em; }
.intro-kicker i { width:42px; height:1px; background:#397fae; }
.intro-kicker em { color:#8ea9bd; font-style:normal; letter-spacing:.04em; }
.constellation-intro h1 { margin:12px 0 8px; color:#f2f8ff; font-size:clamp(2.6rem,6vw,5.4rem); line-height:.95; letter-spacing:0; text-shadow:0 0 42px rgb(71 151 221 / .2); }
.constellation-intro p { margin:0; color:#8da9bf; font-size:.74rem; line-height:1.7; }
.constellation-foot { position:absolute; z-index:8; right:22px; bottom:20px; left:22px; display:flex; align-items:center; justify-content:space-between; color:#7692a8; font-size:.55rem; pointer-events:none; }
.constellation-foot>span { display:flex; align-items:center; gap:7px; }
.constellation-foot>span i { width:22px; height:1px; background:#397eb8; }
.constellation-foot>span b { display:inline-flex; align-items:center; gap:6px; margin-left:8px; color:#64849e; font-size:.49rem; font-weight:400; letter-spacing:.04em; }
.constellation-foot>span b em { width:5px; height:5px; border-radius:50%; background:#6acbff; box-shadow:0 0 10px #4aaef0; }
.constellation-foot div { display:flex; align-items:center; gap:10px; color:#5f8fb6; font-size:.78rem; }
.memory-popup { position:absolute; z-index:20; top:50%; right:clamp(20px,4.5vw,72px); width:min(342px,calc(100vw - 40px)); max-height:min(620px,calc(100dvh - 138px)); overflow-x:hidden; overflow-y:auto; padding:25px 25px 23px 30px; border:1px solid rgb(125 204 246 / .18); border-radius:24px 24px 24px 10px; background:linear-gradient(145deg,rgb(7 25 48 / .76),rgb(2 10 25 / .88)); box-shadow:0 24px 70px rgb(0 0 0 / .42),inset 0 1px rgb(191 226 255 / .08); backdrop-filter:blur(24px) saturate(1.2); transform:translateY(-50%); }
.popup-rail { position:absolute; top:27px; bottom:24px; left:12px; display:flex; width:2px; flex-direction:column; align-items:center; justify-content:space-between; }
.popup-rail::before { position:absolute; top:0; bottom:0; width:1px; background:linear-gradient(transparent,rgb(104 203 246 / .46),transparent); content:''; }
.popup-rail span,.popup-rail i { position:relative; width:6px; height:6px; border:1px solid #79d7f7; border-radius:50%; background:#0b2842; box-shadow:0 0 12px #63c8ef; }
.popup-rail i { border-color:#9e8cff; background:#28204a; box-shadow:0 0 12px #8b7dff; }
.popup-glow { position:absolute; z-index:-1; top:-100px; right:-74px; width:240px; height:190px; background:radial-gradient(circle,rgb(61 156 235 / .22),transparent 68%); pointer-events:none; }
.popup-close { position:absolute; z-index:2; top:14px; right:14px; display:grid; width:28px; height:28px; border:1px solid rgb(125 191 242 / .18); border-radius:50%; background:rgb(5 17 33 / .36); color:#dcebfa; cursor:pointer; place-items:center; transition:border-color .2s ease,background .2s ease,transform .25s ease; }
.popup-close:hover { border-color:rgb(129 207 255 / .5); background:rgb(38 104 158 / .28); transform:rotate(8deg); }
.popup-identity { display:flex; min-height:32px; align-items:center; gap:9px; padding-right:32px; color:#8ad9fc; }
.popup-identity>span { display:grid; width:32px; height:32px; flex:none; border:1px solid rgb(105 208 240 / .34); border-radius:50%; background:rgb(55 139 211 / .14); box-shadow:inset 0 0 16px rgb(71 162 235 / .1),0 0 24px rgb(61 143 210 / .1); place-items:center; }
.popup-identity small { color:#84a9c4; font-size:.57rem; letter-spacing:.04em; }
.popup-image { width:100%; margin-top:17px; aspect-ratio:1.85; overflow:hidden; border:1px solid rgb(128 189 235 / .12); border-radius:14px 14px 14px 4px; background:#071323; }
.popup-image img { width:100%; height:100%; object-fit:cover; }
.memory-popup h2 { margin:18px 0 8px; padding-right:8px; color:#f3f8fd; font-size:1.2rem; line-height:1.35; letter-spacing:0; text-wrap:balance; }
.memory-popup>p { margin:0; color:#90aabf; font-size:.7rem; line-height:1.8; }
.memory-popup>a { display:flex; height:38px; align-items:center; justify-content:space-between; margin-top:16px; padding:0 12px; border:1px solid rgb(94 193 238 / .3); border-radius:999px; background:rgb(56 137 204 / .08); color:#9edcff; font-size:.64rem; text-decoration:none; transition:background .2s ease,border-color .2s ease,transform .2s ease; }
.memory-popup>a:hover { border-color:rgb(111 210 255 / .62); background:rgb(56 137 204 / .16); transform:translateX(2px); }
.memory-popup section { margin-top:19px; padding-top:14px; border-top:1px solid rgb(100 164 219 / .13); }
.memory-popup h3 { display:flex; align-items:center; justify-content:space-between; margin:0 0 3px; color:#dcebf7; font-size:.65rem; }
.memory-popup h3 small { color:#577994; font-size:.5rem; font-weight:400; }
.memory-popup section button { display:grid; width:100%; grid-template-columns:minmax(0,1fr) auto; gap:2px 10px; padding:9px 0; border:0; border-bottom:1px solid rgb(92 151 201 / .1); background:none; color:#d7e6f1; cursor:pointer; text-align:left; }
.memory-popup section button>span { grid-column:1; color:#669fc4; font-size:.5rem; }
.memory-popup section button>b { grid-column:1; overflow:hidden; font-size:.63rem; text-overflow:ellipsis; white-space:nowrap; }
.memory-popup section button>small { grid-column:2; grid-row:1/3; align-self:center; color:#6f94b0; font-size:.48rem; }
.discovery-popup { --discovery-accent:#72d9ff; position:absolute; z-index:20; top:50%; right:clamp(20px,4.5vw,72px); width:min(354px,calc(100vw - 40px)); padding:26px; overflow:hidden; border:1px solid color-mix(in srgb,var(--discovery-accent) 28%,transparent); border-radius:8px; background:linear-gradient(150deg,rgb(7 24 45 / .88),rgb(2 9 22 / .94)); box-shadow:0 26px 80px rgb(0 0 0 / .46),inset 0 1px rgb(213 240 255 / .07); backdrop-filter:blur(24px) saturate(1.16); transform:translateY(-50%); }
.discovery-popup::before { position:absolute; top:-90px; right:-70px; width:240px; height:210px; border-radius:50%; background:radial-gradient(circle,color-mix(in srgb,var(--discovery-accent) 24%,transparent),transparent 68%); content:''; pointer-events:none; }
.discovery-orbit { position:relative; width:72px; height:72px; margin:2px 0 23px; border:1px solid color-mix(in srgb,var(--discovery-accent) 44%,transparent); border-radius:50%; animation:discovery-spin 12s linear infinite; }
.discovery-orbit::before { position:absolute; inset:17px; border:1px solid color-mix(in srgb,var(--discovery-accent) 32%,transparent); border-radius:50%; content:''; }
.discovery-orbit i { position:absolute; width:7px; height:7px; border-radius:50%; background:var(--discovery-accent); box-shadow:0 0 15px var(--discovery-accent); }
.discovery-orbit i:nth-child(1) { top:-4px; left:31px; }.discovery-orbit i:nth-child(2) { right:4px; bottom:7px; width:4px; height:4px; }.discovery-orbit i:nth-child(3) { top:28px; left:15px; width:3px; height:3px; }
.discovery-identity { display:flex; align-items:center; gap:8px; color:var(--discovery-accent); font-size:.55rem; letter-spacing:.08em; }
.discovery-identity :deep(svg) { font-size:.92rem; }
.discovery-popup h2 { margin:10px 34px 9px 0; color:#f0f7fc; font-size:1.45rem; line-height:1.2; letter-spacing:0; }
.discovery-popup>p { margin:0; color:#8da7ba; font-size:.69rem; line-height:1.85; }
.discovery-signal { display:flex; min-height:58px; flex-direction:column; justify-content:center; gap:5px; margin-top:19px; padding:10px 12px; border-left:2px solid var(--discovery-accent); background:color-mix(in srgb,var(--discovery-accent) 7%,transparent); }
.discovery-signal small { color:color-mix(in srgb,var(--discovery-accent) 76%,#8aa2b4); font-size:.49rem; letter-spacing:.06em; }
.discovery-signal strong { color:#c8dbe7; font-size:.62rem; font-weight:560; line-height:1.55; }
.discovery-action { display:flex; width:100%; height:40px; align-items:center; justify-content:center; gap:8px; margin-top:17px; border:1px solid color-mix(in srgb,var(--discovery-accent) 38%,transparent); border-radius:6px; background:color-mix(in srgb,var(--discovery-accent) 10%,transparent); color:#e5f5fc; cursor:pointer; font:inherit; font-size:.62rem; transition:background .22s ease,border-color .22s ease,transform .22s ease; }
.discovery-action:hover { border-color:color-mix(in srgb,var(--discovery-accent) 66%,transparent); background:color-mix(in srgb,var(--discovery-accent) 17%,transparent); transform:translateY(-1px); }
.discovery-action:focus-visible { outline:2px solid var(--discovery-accent); outline-offset:3px; }
.popup-enter-active,.popup-leave-active { transition:transform .52s cubic-bezier(.16,1,.3,1),opacity .3s ease; }
.popup-enter-from,.popup-leave-to { opacity:0; transform:translate(26px,-48%); }
.signal button:focus-visible,.popup-close:focus-visible { outline:2px solid #4a9fe6; outline-offset:3px; }
@keyframes loading-spin { to { transform:rotate(360deg); } }
@keyframes discovery-spin { to { transform:rotate(360deg); } }
@media (max-width:700px) {
  .constellation-nav { top:14px; right:14px; left:14px; }
  .brand img { width:38px; height:38px; }
  .brand span { display:none; }
  .signal span { display:none; }
  .cosmic-dock { top:68px; width:auto; max-width:calc(100vw - 28px); height:38px; }
  .cosmic-dock button { width:42px; min-width:42px; padding:0; }
  .cosmic-dock button span { display:none; }
  .constellation-intro { bottom:68px; left:20px; width:calc(100vw - 40px); }
  .constellation-intro h1 { font-size:2.8rem; }
  .constellation-intro p { max-width:310px; font-size:.66rem; }
  .constellation-foot { right:14px; bottom:14px; left:14px; }
  .constellation-foot>span b { display:none; }
  .memory-popup { top:auto; right:14px; bottom:58px; left:14px; width:auto; max-height:min(52dvh,440px); padding:18px 18px 18px 24px; border-radius:20px 20px 20px 8px; transform:none; }
  .discovery-popup { top:auto; right:14px; bottom:58px; left:14px; width:auto; max-height:min(58dvh,470px); padding:21px; transform:none; }
  .discovery-orbit { width:54px; height:54px; margin-bottom:17px; }
  .discovery-orbit::before { inset:13px; }.discovery-orbit i:nth-child(1) { left:23px; }.discovery-orbit i:nth-child(2) { right:3px; bottom:5px; }.discovery-orbit i:nth-child(3) { top:21px; left:11px; }
  .popup-rail { top:21px; bottom:19px; left:9px; }
  .popup-enter-from,.popup-leave-to { opacity:0; transform:translateY(24px); }
}
@media (prefers-reduced-motion:reduce) {
  .constellation-intro,.popup-enter-active,.popup-leave-active,.loading-orbit,.discovery-orbit { transition:none; animation:none; }
  .constellation-intro { opacity:1; transform:none; }
}
</style>

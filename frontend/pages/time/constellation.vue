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
        :intro-delay-ms="760"
        @ready="sceneReady = true"
        @select="handleSceneSelect"
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

    <section class="constellation-intro" aria-labelledby="constellation-title">
      <div class="intro-kicker"><span>MY TIME UNIVERSE</span><i /><em>{{ timeRange }}</em></div>
      <h1 id="constellation-title">时光星图</h1>
      <p>记忆沿年份铺成轨道，地点、照片与故事在时间里彼此照亮。</p>
    </section>

    <footer class="constellation-foot">
      <span><i />{{ latestLabel }}<b><em />发光天体为真实记忆</b></span>
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

const api = useApi()
const route = useRoute()
const router = useRouter()
const { mediaUrl } = useMediaUrl()
const { navigate } = useCosmicNavigation()
const { selectMemory, clearMemory } = useMemorySelection()
const graph = reactive<{ nodes: GraphNode[]; relations: GraphRelation[]; graphVersion: string }>({ nodes: [], relations: [], graphVersion: '' })
const sceneRef = ref<{ resetView: () => void } | null>(null)
const selected = ref<GraphNode | null>(null)
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

const displayNodes = computed(() => graph.nodes)
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

function resetScene() {
  if (selected.value) {
    selected.value = null
    neighbors.value = []
    clearMemory()
    void router.replace({ query: {} })
  }
  sceneRef.value?.resetView()
}

function clearSelected() {
  selected.value = null
  neighbors.value = []
  clearMemory()
  void router.replace({ query: {} })
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
.popup-enter-active,.popup-leave-active { transition:transform .52s cubic-bezier(.16,1,.3,1),opacity .3s ease; }
.popup-enter-from,.popup-leave-to { opacity:0; transform:translate(26px,-48%); }
.signal button:focus-visible,.popup-close:focus-visible { outline:2px solid #4a9fe6; outline-offset:3px; }
@keyframes loading-spin { to { transform:rotate(360deg); } }
@media (max-width:700px) {
  .constellation-nav { top:14px; right:14px; left:14px; }
  .brand img { width:38px; height:38px; }
  .brand span { display:none; }
  .signal span { display:none; }
  .constellation-intro { bottom:68px; left:20px; width:calc(100vw - 40px); }
  .constellation-intro h1 { font-size:2.8rem; }
  .constellation-intro p { max-width:310px; font-size:.66rem; }
  .constellation-foot { right:14px; bottom:14px; left:14px; }
  .constellation-foot>span b { display:none; }
  .memory-popup { top:auto; right:14px; bottom:58px; left:14px; width:auto; max-height:min(52dvh,440px); padding:18px 18px 18px 24px; border-radius:20px 20px 20px 8px; transform:none; }
  .popup-rail { top:21px; bottom:19px; left:9px; }
  .popup-enter-from,.popup-leave-to { opacity:0; transform:translateY(24px); }
}
@media (prefers-reduced-motion:reduce) {
  .constellation-intro,.popup-enter-active,.popup-leave-active,.loading-orbit { transition:none; animation:none; }
  .constellation-intro { opacity:1; transform:none; }
}
</style>

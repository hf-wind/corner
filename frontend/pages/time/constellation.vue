<template>
  <main class="constellation-page" :class="{ ready: sceneReady }">
    <section class="constellation-stage" aria-label="时光星图">
      <TimeConstellationScene
        v-if="!fallbackMode"
        ref="sceneRef"
        :nodes="displayNodes"
        :relations="displayRelations"
        :graph-version="displayGraphVersion"
        :selected-id="selected?.id"
        :resolve-image="mediaUrl"
        @ready="sceneReady = true"
        @select="handleSceneSelect"
        @clear="clearSelected"
        @fallback="fallbackMode = true"
      />
      <MemoryGraph2D
        v-else
        :nodes="displayNodes"
        :relations="displayRelations"
        :selected-id="selected?.id"
        @select="handleSceneSelect"
      />
    </section>

    <header class="constellation-nav">
      <NuxtLink to="/" class="brand" title="返回时光门面">
        <img src="/logo_192.png" alt="" width="42" height="42">
        <span><strong>时光星图</strong><small>TIME CONSTELLATION</small></span>
      </NuxtLink>
      <div class="signal" :class="{ offline: !!error }">
        <i />
        <span>{{ graph.nodes.length ? `${graph.nodes.length} 枚记忆在线` : error ? '预览宇宙运行中' : '正在连接时间' }}</span>
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
      <span><i />{{ latestLabel }}</span>
      <div aria-label="星图交互状态">
        <Icon name="ph:cursor-click-bold" />
        <Icon name="ph:arrows-out-cardinal-bold" />
        <Icon name="ph:magnifying-glass-plus-bold" />
      </div>
    </footer>

    <Transition name="popup">
      <aside v-if="selected" class="memory-popup">
        <button class="popup-close" type="button" title="关闭" aria-label="关闭" @click="clearSelected"><Icon name="ph:x-bold" /></button>
        <div class="popup-glow" aria-hidden="true" />
        <div class="popup-identity"><span><Icon :name="nodeIcon(selected.type)" /></span><small>{{ typeText(selected.type) }} · {{ formatDate(selected.occurredAt) }}</small></div>
        <div v-if="selected.image" class="popup-image"><img :src="mediaUrl(selected.image)" alt=""></div>
        <h2>{{ selected.title }}</h2>
        <p>{{ selected.excerpt || '这颗星保存着一段尚未展开的记忆。' }}</p>
        <NuxtLink v-if="selected.href" :to="selected.href"><span>进入这段记忆</span><Icon name="ph:arrow-up-right-bold" /></NuxtLink>
        <section v-if="neighbors.length">
          <h3><span>与它相连</span><small>{{ neighbors.length }} 条轨迹</small></h3>
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
const { selectMemory, clearMemory } = useMemorySelection()
const graph = reactive<{ nodes: GraphNode[]; relations: GraphRelation[]; graphVersion: string }>({ nodes: [], relations: [], graphVersion: '' })
const sceneRef = ref<{ resetView: () => void } | null>(null)
const selected = ref<GraphNode | null>(null)
const neighbors = ref<GraphRelation[]>([])
const error = ref('')
const sceneReady = ref(false)
const fallbackMode = ref(false)
const currentYear = new Date().getFullYear()
let requestSequence = 0

const typeOptions = [
  { value: 'post', label: '文章', icon: 'ph:article-bold' },
  { value: 'moment', label: '瞬间', icon: 'ph:sparkle-bold' },
  { value: 'album', label: '相册', icon: 'ph:images-square-bold' },
  { value: 'photo', label: '照片', icon: 'ph:image-bold' },
  { value: 'place', label: '地点', icon: 'ph:map-pin-bold' },
  { value: 'library', label: '书影', icon: 'ph:books-bold' },
  { value: 'journey', label: '旅行', icon: 'ph:path-bold' },
]

const previewNodes: GraphNode[] = Array.from({ length: 44 }, (_, index) => ({
  id: `preview:${index}`,
  type: typeOptions[index % typeOptions.length].value,
  title: ['海边的风把夏天吹回来了', '一页读到深夜的书', '城市边缘的黄昏', '相机里的一束光', '去过的地方仍在发光', '旅途中的意外晴天', '写给未来的短笺'][index % 7],
  excerpt: '这是演示星图的预览节点。接入真实内容后，它会自动显示对应的文章、瞬间、照片或书影记录。',
  occurredAt: new Date(currentYear - Math.floor(index / 13), index % 12, (index * 7) % 28 + 1).toISOString(),
  coordinateSeed: index * 7919,
}))

const displayNodes = computed(() => graph.nodes.length ? graph.nodes : previewNodes)
const displayRelations = computed(() => graph.nodes.length ? graph.relations : [])
const displayGraphVersion = computed(() => graph.nodes.length ? graph.graphVersion : `preview-${currentYear}`)
const nodeYears = computed(() => graph.nodes
  .map(node => node.occurredAt ? new Date(node.occurredAt).getFullYear() : NaN)
  .filter(Number.isFinite))
const timeRange = computed(() => nodeYears.value.length ? `${Math.min(...nodeYears.value)} — ${Math.max(...nodeYears.value)}` : `${currentYear - 3} — ${currentYear}`)
const latestNode = computed(() => [...graph.nodes]
  .filter(node => node.occurredAt)
  .sort((a, b) => new Date(b.occurredAt!).getTime() - new Date(a.occurredAt!).getTime())[0])
const latestLabel = computed(() => latestNode.value ? `最近点亮 · ${formatDate(latestNode.value.occurredAt)}` : '每一次发布，都会点亮一颗新星')

onMounted(loadGraph)

async function loadGraph() {
  const sequence = ++requestSequence
  error.value = ''
  try {
    const result = await api.get<any>('/memories/graph', { limit: 320 })
    if (sequence !== requestSequence) return
    graph.nodes = Array.isArray(result?.nodes) ? result.nodes : []
    graph.relations = Array.isArray(result?.relations) ? result.relations : []
    graph.graphVersion = String(result?.graphVersion || '')
    fallbackMode.value = false
    const focus = String(route.query.focus || '')
    const focusedNode = graph.nodes.find(item => item.id === focus)
    if (focusedNode) await selectNode(focusedNode, false)
  } catch (exception: any) {
    if (sequence === requestSequence) {
      error.value = exception?.message || '真实记忆暂时无法连接'
      const focus = String(route.query.focus || '')
      const previewNode = previewNodes.find(item => item.id === focus)
      if (previewNode) await selectNode(previewNode, false)
    }
  }
}

async function selectNode(node: GraphNode, syncUrl = true) {
  selected.value = node
  selectMemory({ id: node.id, type: node.type, href: node.href })
  if (syncUrl && !node.id.startsWith('preview:')) await router.replace({ query: { focus: node.id } })
  if (node.id.startsWith('preview:')) {
    neighbors.value = []
    return
  }
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
  if (selected.value) clearSelected()
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
  return ({ same_place: '同一地点', same_album: '同一相册', same_tag: '共同标签', time_adjacent: '时间相邻', reference: '内容引用', same_journey: '同一旅行', story_sequence: '故事顺序', same_theme: '同一主题', custom: '自定义' } as Record<string, string>)[type] || type
}

function evidenceText(value?: Record<string, unknown>) {
  if (!value) return ''
  return String(value.reason || value.albumTitle || value.stop || (value.days !== undefined ? `相隔 ${value.days} 天` : ''))
}

useHead({ title: '时光星图' })
</script>

<style scoped>
.constellation-page { position:fixed; z-index:40; inset:0; overflow:hidden; background:#030b18; color:#edf6ff; }
.constellation-stage { position:absolute; inset:0; overflow:hidden; }
.constellation-stage :deep(.constellation-scene) { position:absolute; inset:0; }
.constellation-stage :deep(.graph-preview) { height:100%; min-height:100%; border:0; background:#030b18; }
.constellation-stage :deep(svg) { width:100%; height:100%; min-height:100%; }
.constellation-nav { position:absolute; z-index:10; top:20px; right:22px; left:22px; display:flex; align-items:center; justify-content:space-between; pointer-events:none; }
.brand,.signal { pointer-events:auto; }
.brand { display:inline-flex; align-items:center; gap:11px; color:#edf6ff; text-decoration:none; }
.brand img { width:42px; height:42px; border-radius:8px; box-shadow:0 0 26px rgb(73 157 232 / .22); }
.brand span { display:flex; flex-direction:column; gap:1px; }
.brand strong { font-size:.82rem; letter-spacing:0; }
.brand small { color:#78b8ed; font-size:.48rem; letter-spacing:.13em; }
.signal { display:flex; align-items:center; gap:8px; color:#8fabc1; font-size:.57rem; }
.signal>i { width:6px; height:6px; border-radius:50%; background:#62c8e8; box-shadow:0 0 12px #4caee9; }
.signal.offline>i { background:#8399aa; box-shadow:0 0 10px #55758f; }
.signal button { display:grid; width:30px; height:30px; border:1px solid rgb(117 181 236 / .18); border-radius:50%; background:rgb(4 15 31 / .5); color:#8fc8f5; place-items:center; }
.constellation-intro { position:absolute; z-index:8; bottom:74px; left:clamp(22px,6vw,92px); width:min(540px,calc(100vw - 44px)); pointer-events:none; opacity:0; transform:translateY(18px); transition:opacity 1s ease .9s,transform 1.3s cubic-bezier(.16,1,.3,1) .9s; }
.ready .constellation-intro { opacity:1; transform:none; }
.intro-kicker { display:flex; align-items:center; gap:9px; color:#72b7ed; font-size:.54rem; letter-spacing:.11em; }
.intro-kicker i { width:42px; height:1px; background:#3c78ad; }
.intro-kicker em { color:#8ea9bd; font-style:normal; letter-spacing:.04em; }
.constellation-intro h1 { margin:12px 0 8px; color:#f2f8ff; font-size:clamp(2.6rem,6vw,5.4rem); line-height:.95; letter-spacing:0; text-shadow:0 0 42px rgb(71 151 221 / .2); }
.constellation-intro p { margin:0; color:#8da9bf; font-size:.74rem; line-height:1.7; }
.constellation-foot { position:absolute; z-index:8; right:22px; bottom:20px; left:22px; display:flex; align-items:center; justify-content:space-between; color:#7692a8; font-size:.55rem; pointer-events:none; }
.constellation-foot>span { display:flex; align-items:center; gap:7px; }
.constellation-foot>span i { width:22px; height:1px; background:#397eb8; }
.constellation-foot div { display:flex; align-items:center; gap:10px; color:#5f8fb6; font-size:.78rem; }
.memory-popup { position:absolute; z-index:20; top:50%; right:clamp(20px,4.5vw,72px); width:min(374px,calc(100vw - 40px)); max-height:min(680px,calc(100dvh - 150px)); overflow-x:hidden; overflow-y:auto; padding:22px; border:1px solid rgb(113 187 246 / .2); border-radius:8px; background:linear-gradient(145deg,rgb(7 22 43 / .9),rgb(2 10 22 / .94)); box-shadow:0 28px 90px rgb(0 0 0 / .52),inset 0 1px rgb(191 226 255 / .07); backdrop-filter:blur(26px) saturate(1.18); transform:translateY(-50%); }
.popup-glow { position:absolute; z-index:-1; top:-90px; right:-70px; width:220px; height:180px; background:radial-gradient(circle,rgb(61 156 235 / .2),transparent 68%); pointer-events:none; }
.popup-close { position:absolute; z-index:2; top:15px; right:15px; display:grid; width:32px; height:32px; border:1px solid rgb(125 191 242 / .18); border-radius:50%; background:rgb(5 17 33 / .54); color:#dcebfa; cursor:pointer; place-items:center; transition:border-color .2s ease,background .2s ease,transform .25s ease; }
.popup-close:hover { border-color:rgb(129 207 255 / .46); background:rgb(38 104 158 / .24); transform:rotate(8deg); }
.popup-identity { display:flex; min-height:34px; align-items:center; gap:10px; padding-right:38px; color:#82c9fb; }
.popup-identity>span { display:grid; width:34px; height:34px; flex:none; border:1px solid rgb(105 180 240 / .3); border-radius:50%; background:rgb(55 139 211 / .14); box-shadow:inset 0 0 16px rgb(71 162 235 / .1),0 0 24px rgb(61 143 210 / .1); place-items:center; }
.popup-identity small { color:#84a9c4; font-size:.57rem; letter-spacing:.04em; }
.popup-image { width:100%; margin-top:17px; aspect-ratio:16/9; overflow:hidden; border:1px solid rgb(128 189 235 / .12); border-radius:7px; background:#071323; }
.popup-image img { width:100%; height:100%; object-fit:cover; }
.memory-popup h2 { margin:18px 0 8px; padding-right:8px; color:#f3f8fd; font-size:1.28rem; line-height:1.35; letter-spacing:0; text-wrap:balance; }
.memory-popup>p { margin:0; color:#90aabf; font-size:.7rem; line-height:1.8; }
.memory-popup>a { display:flex; height:42px; align-items:center; justify-content:space-between; margin-top:17px; padding:0 13px; border:1px solid rgb(94 173 238 / .34); border-radius:6px; background:rgb(56 137 204 / .08); color:#9ed5ff; font-size:.67rem; text-decoration:none; transition:background .2s ease,border-color .2s ease; }
.memory-popup>a:hover { border-color:rgb(111 194 255 / .58); background:rgb(56 137 204 / .16); }
.memory-popup section { margin-top:21px; padding-top:15px; border-top:1px solid rgb(100 164 219 / .13); }
.memory-popup h3 { display:flex; align-items:center; justify-content:space-between; margin:0 0 5px; color:#dcebf7; font-size:.67rem; }
.memory-popup h3 small { color:#577994; font-size:.5rem; font-weight:400; }
.memory-popup section button { display:grid; width:100%; grid-template-columns:minmax(0,1fr) auto; gap:3px 10px; padding:10px 0; border:0; border-bottom:1px solid rgb(92 151 201 / .1); background:none; color:#d7e6f1; cursor:pointer; text-align:left; }
.memory-popup section button>span { grid-column:1; color:#6694b6; font-size:.5rem; }
.memory-popup section button>b { grid-column:1; overflow:hidden; font-size:.65rem; text-overflow:ellipsis; white-space:nowrap; }
.memory-popup section button>small { grid-column:2; grid-row:1/3; align-self:center; color:#587891; font-size:.49rem; }
.popup-enter-active,.popup-leave-active { transition:transform .52s cubic-bezier(.16,1,.3,1),opacity .3s ease; }
.popup-enter-from,.popup-leave-to { opacity:0; transform:translate(26px,-48%); }
.signal button:focus-visible,.popup-close:focus-visible { outline:2px solid #4a9fe6; outline-offset:3px; }
@media (max-width:700px) {
  .constellation-nav { top:14px; right:14px; left:14px; }
  .brand img { width:38px; height:38px; }
  .brand span { display:none; }
  .signal span { display:none; }
  .constellation-intro { bottom:68px; left:20px; width:calc(100vw - 40px); }
  .constellation-intro h1 { font-size:2.8rem; }
  .constellation-intro p { max-width:310px; font-size:.66rem; }
  .constellation-foot { right:14px; bottom:14px; left:14px; }
  .memory-popup { top:auto; right:14px; bottom:58px; left:14px; width:auto; max-height:min(48dvh,430px); padding:18px; transform:none; }
  .popup-enter-from,.popup-leave-to { opacity:0; transform:translateY(24px); }
}
@media (prefers-reduced-motion:reduce) {
  .constellation-intro,.popup-enter-active,.popup-leave-active { transition:none; }
  .constellation-intro { opacity:1; transform:none; }
}
</style>

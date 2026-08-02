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

    <section class="constellation-intro" aria-labelledby="constellation-title">
      <div class="intro-kicker"><span>MY TIME UNIVERSE</span><i /><em>{{ timeRange }}</em></div>
      <h1 id="constellation-title">时光星图</h1>
      <p>记忆沿年份铺成轨道，地点、照片与故事在时间里彼此照亮。</p>
    </section>

    <footer class="constellation-foot">
      <span><i />{{ latestLabel }}<b><em />点击太阳、黑洞、空间站、卫星与风隅号读取遥测</b></span>
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
        :class="`discovery-${activeDiscovery.id}`"
        :style="{ '--discovery-accent': activeDiscovery.accent }"
        role="dialog"
        :aria-label="`${activeDiscovery.title}遥测档案`"
      >
        <button class="popup-close" type="button" title="关闭" aria-label="关闭" @click="clearDiscovery"><Icon name="ph:x-bold" /></button>
        <header class="discovery-identity">
          <span><Icon :name="activeDiscovery.icon" /></span>
          <div><small>{{ activeDiscovery.kicker }}</small><b>{{ activeDiscovery.status }}</b></div>
          <em><i />科学模拟</em>
        </header>
        <div class="discovery-title"><h2>{{ activeDiscovery.title }}</h2><span>{{ activeDiscovery.catalog }}</span></div>
        <p>{{ activeDiscovery.description }}</p>
        <div class="telemetry-grid">
          <div v-for="metric in activeTelemetry.metrics" :key="metric.label">
            <small>{{ metric.label }}</small><strong>{{ metric.value }}</strong>
          </div>
        </div>
        <div class="discovery-signal" aria-live="polite">
          <div><small>{{ activeDiscovery.signalLabel }}</small><time>{{ activeTelemetry.sampleTime }}</time></div>
          <strong>{{ discoveryResult || activeTelemetry.report }}</strong>
          <span>{{ activeTelemetry.basis }}</span>
        </div>
        <div class="discovery-commands" :aria-label="`${activeDiscovery.title}指令`">
          <button
            v-for="command in activeDiscovery.commands"
            :key="command.id"
            type="button"
            :class="{ active: activeCommandId === command.id }"
            @click="runDiscoveryCommand(command.id)"
          ><Icon :name="command.icon" /><span>{{ command.label }}</span></button>
        </div>
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
type DiscoveryCommandId = 'sample' | 'scan' | 'tour' | 'log' | 'signal' | 'orbit' | 'bridge' | 'warp'

type Discovery = {
  id: DiscoveryId
  title: string
  catalog: string
  kicker: string
  status: string
  description: string
  signalLabel: string
  icon: string
  accent: string
  commands: { id: DiscoveryCommandId; label: string; icon: string }[]
}

type DiscoveryTelemetry = {
  report: string
  sampleTime: string
  basis: string
  metrics: { label: string; value: string }[]
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
  startDiscoveryTour: (id: DiscoveryId) => void
} | null>(null)
const selected = ref<GraphNode | null>(null)
const activeDiscoveryId = ref<DiscoveryId | ''>('')
const discoveryResult = ref('')
const discoverySequence = ref(0)
const activeCommandId = ref<DiscoveryCommandId | ''>('')
const telemetryNow = ref(new Date())
const neighbors = ref<GraphRelation[]>([])
const error = ref('')
const sceneReady = ref(false)
const fallbackMode = ref(false)
const graphReady = ref(false)
let requestSequence = 0
let telemetryTimer: ReturnType<typeof setInterval> | null = null

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
    id: 'sun', title: '太阳', catalog: 'G2V · 黄矮星', kicker: 'SOL HELIOPHYSICS · 01', status: '日球层遥测在线',
    description: '核心以质子－质子链持续把氢聚变为氦；能量穿过辐射区与对流区，最终以光和太阳风抵达星图。',
    signalLabel: '太阳活动简报', icon: 'ph:sun-bold', accent: '#ffb95e',
    commands: [{ id: 'sample', label: '刷新聚变遥测', icon: 'ph:wave-sine-bold' }],
  },
  {
    id: 'black-hole', title: '玄渊 X-1', catalog: '超大质量黑洞模型', kicker: 'EVENT HORIZON · 02', status: '吸积盘稳定',
    description: '中央阴影不是实体表面，而是光无法逃逸的事件视界投影；明亮新月来自高速等离子体的相对论性多普勒增亮。',
    signalLabel: '引力透镜重建', icon: 'ph:circle-half-tilt-bold', accent: '#ff8a4c',
    commands: [{ id: 'scan', label: '扫描光子环', icon: 'ph:scan-bold' }],
  },
  {
    id: 'station', title: '风隅轨道站', catalog: 'FYOS-01 · 近地轨道站', kicker: 'ORBITAL OPERATIONS · 03', status: '乘组值守中',
    description: '一座长期在轨的记忆实验平台，承担材料暴露、生命支持与深空通信验证任务，每 92 分钟完成一圈轨道。',
    signalLabel: '任务控制中心', icon: 'ph:broadcast-bold', accent: '#72d9ff',
    commands: [{ id: 'tour', label: '环站视角巡航', icon: 'ph:orbit-bold' }, { id: 'log', label: '读取任务日志', icon: 'ph:notebook-bold' }],
  },
  {
    id: 'satellite', title: '听风一号', catalog: 'TF-1 · 光学通信卫星', kicker: 'BEACON NETWORK · 04', status: '太阳同步轨道运行',
    description: '一颗兼具星间激光通信与光学遥感能力的试验卫星，在晨昏轨道上持续为离散记忆寻找同频信标。',
    signalLabel: '星间链路状态', icon: 'ph:satellite-bold', accent: '#70e7cf',
    commands: [{ id: 'signal', label: '发送窄带信号', icon: 'ph:broadcast-bold' }, { id: 'orbit', label: '重新锁定轨道', icon: 'ph:crosshair-simple-bold' }],
  },
  {
    id: 'spacecraft', title: '风隅号', catalog: 'FY-01 · 深空巡航舰', kicker: 'WIND CORNER FLIGHT · 05', status: '三联离子驱动在线',
    description: '以陶瓷复合装甲、三联离子推进阵列和全景舰桥构成的深空巡航舰，任务是把尚未说出口的话送往更远的恒星。',
    signalLabel: '舰桥航行简报', icon: 'ph:rocket-launch-bold', accent: '#7ca8ff',
    commands: [{ id: 'bridge', label: '舰桥追航', icon: 'ph:steering-wheel-bold' }, { id: 'warp', label: '曲率跃迁', icon: 'ph:lightning-bold' }],
  },
]

const solarReports = [
  '核心区质子－质子链 I 分支保持主导，四个质子最终转化为一个氦-4 核，并以中微子与伽马光子带走能量。',
  '辐射区光子仍在随机游走；核心产生的能量通常需要数万至数十万年才能抵达对流区边界。',
  '对流区上涌等离子体形成新的米粒组织，单个米粒尺度接近一千公里，寿命约数分钟。',
  '光球层有效温度维持在约 5772 K，当前可见光谱仍符合 G2V 型主序星特征。',
  '色球层磁拱出现轻微剪切，模型未发现足以触发强耀斑的快速磁重联。',
  '日冕温度模型超过一百万开尔文，远高于光球；加热机制仍与磁波和纳米耀斑有关。',
  '一束光球光子已离开太阳，约 8 分 20 秒后抵达地球轨道附近。',
  '太阳风跨过临界点进入超声速外流，预计数日后与地球磁层发生耦合。',
  '当前扇区磁场以闭合磁力线为主，带电粒子被约束在日冕环内往返运动。',
  '日震学模型捕获到 p 模振荡，五分钟尺度的声波正在反演太阳内部密度结构。',
  '光球暗化区温度低于周围数千开尔文，因此在明亮背景上表现为太阳黑子。',
  '差异自转仍然明显：太阳赤道约 25 天转一周，高纬区域接近 35 天。',
  '核心每秒约将六亿吨氢转化为氦，其中约四百万吨质量以能量形式释放。',
  '中微子几乎不与物质作用，产生后只需数秒便穿出太阳，为核心聚变提供即时证据。',
  '辐照度模型在地球轨道处接近 1361 W/m²，短时波动主要由磁活动调制。',
  '日冕洞区域的开放磁力线正在向行星际空间输送高速太阳风。',
  '磁通管穿越光球后形成成对活动区，极性方向符合当前太阳活动周的统计规律。',
  '一条暗色日珥沿磁场悬浮于色球层上方，冷而致密的等离子体尚未发生喷发。',
  '当前紫外辐射模型平稳，电离层受扰风险维持在低水平。',
  '太阳常数并非绝对不变，完整活动周内总辐照度变化约为千分之一。',
  '光球谱线出现轻微多普勒位移，对应米粒组织上升与下沉的对流速度。',
  '核心温度约一千五百万开尔文，量子隧穿让质子在低于经典阈值时仍能发生聚变。',
  '太阳年龄约 46 亿年，核心氢储量足以让主序阶段再持续约 50 亿年。',
  '日球层顶之外是星际介质；太阳风塑造的巨大磁泡保护着整个行星系统。',
]

const blackHoleReports = [
  '靠近我们的吸积盘一侧因相对论性多普勒增亮形成明亮新月，远离侧则被红移并显著变暗。',
  '光子环来自绕黑洞多次偏折的极少量光线，它比事件视界更外侧，也比吸积盘更细锐。',
  '中央阴影直径大于事件视界本身，因为强引力把本应掠过的光线再次弯向黑洞。',
  '吸积盘内缘接近最内稳定圆轨道；再向内，物质无法维持圆轨道并快速坠入事件视界。',
  '事件视界不是固体表面，而是一条因果边界；一旦越过，任何信号都无法返回外部宇宙。',
  '模型质量设为 65 亿倍太阳质量，对应史瓦西半径约 128 个天文单位。',
  '盘面等离子体被摩擦与磁湍流加热，辐射颜色由外侧暗红逐渐过渡到内侧白热。',
  '引力透镜同时显示吸积盘正面与被弯曲到上方的背面影像，视觉上形成双层光带。',
  '磁旋转不稳定性从吸积盘抽取角动量，使物质可以缓慢向内迁移。',
  '极轴喷流由强磁场准直，并非从事件视界内部射出，而是源于其外侧的旋转等离子体。',
  '越接近事件视界，远方观察者看到的时钟越慢；自由落体者自身却不会在边界处感到停顿。',
  '黑洞本身不发光，画面中的所有亮度都来自周围物质、喷流以及被引力弯曲的背景光。',
  '克尔黑洞的自旋会拖拽邻近时空，能层中的粒子无法相对遥远恒星保持静止。',
  '当前偏振模型显示磁场沿吸积流呈螺旋结构，为喷流形成提供了能量通道。',
  '潮汐力取决于黑洞质量；对超大质量黑洞而言，跨越事件视界时局部潮汐梯度可能并不剧烈。',
  '霍金辐射对恒星级以上黑洞极其微弱，其温度远低于宇宙微波背景。',
  '吸积流亮度保持在爱丁顿极限以下，辐射压力暂未能阻止物质继续落入。',
  '这是一套基于广义相对论视觉特征的艺术模拟，并非对某个真实天体的实时观测。',
]

const displayNodes = computed(() => graph.nodes)
const activeDiscovery = computed(() => discoveries.find(item => item.id === activeDiscoveryId.value) || null)
const activeTelemetry = computed<DiscoveryTelemetry>(() => buildDiscoveryTelemetry(activeDiscoveryId.value, telemetryNow.value, discoverySequence.value))
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

const stationLogs = [
  '任务日志 184：乘组完成材料暴露载荷回收，样品已转入恒温舱。',
  '任务日志 197：机械臂完成自主巡检，桁架节点热控状态正常。',
  '任务日志 203：舷窗掠过晨昏线，太阳能翼完成新一轮对日定向。',
  '任务日志 216：生命支持闭环效率维持 93.8%，下一次维护窗口已排定。',
  '任务日志 229：深空链路捕获一颗新记忆星，时间戳已写入轨道档案。',
]

function daysSince(value: string, now = telemetryNow.value) {
  return Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000))
}

function sample<T>(items: T[], seed: number) {
  return items[Math.abs(seed) % items.length]!
}

function buildDiscoveryTelemetry(id: DiscoveryId | '', now: Date, sequence: number): DiscoveryTelemetry {
  const sampleTime = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const minuteSeed = Math.floor(now.getTime() / 60_000) + sequence * 17
  const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
  const hourAngle = (hours - 12) * 15
  const solarLongitude = ((now.getTime() / 86_400_000) % 27.2753) / 27.2753 * 360
  const empty = { report: '', sampleTime, basis: '', metrics: [] }
  if (id === 'sun') {
    return {
      report: `${sample(solarReports, minuteSeed)} 当前本地时角 ${hourAngle >= 0 ? '+' : ''}${hourAngle.toFixed(1)}°，可见日面模型已旋转至 ${solarLongitude.toFixed(1)}°。`,
      sampleTime,
      basis: '基于标准太阳模型、27.2753 日会合自转周期与客户端本地时间生成',
      metrics: [
        { label: '本地太阳时角', value: `${hourAngle >= 0 ? '+' : ''}${hourAngle.toFixed(1)}°` },
        { label: '模型日面经度', value: `${solarLongitude.toFixed(1)}°` },
        { label: '光行时间', value: '08m 20s' },
        { label: '辐照度模型', value: `${(1361 + Math.sin(hours / 24 * Math.PI * 2) * 1.1).toFixed(1)} W/m²` },
      ],
    }
  }
  if (id === 'black-hole') {
    return {
      report: sample(blackHoleReports, minuteSeed), sampleTime,
      basis: '参考克尔黑洞、广义相对论光线弯曲与 M87* 量级参数构建的视觉模型',
      metrics: [
        { label: '模型质量', value: '65 亿 M☉' },
        { label: '史瓦西半径', value: '约 128 AU' },
        { label: '阴影角直径', value: '约 40 μas' },
        { label: '吸积盘倾角', value: '17.2°' },
      ],
    }
  }
  if (id === 'station') {
    const days = daysSince('2022-04-16T09:42:00+08:00', now)
    const evaDays = daysSince('2026-07-23T14:10:00+08:00', now)
    return {
      report: `风隅轨道站已连续运行 ${days} 天。本轨道圈生命支持、姿态控制与热控系统均在标称范围，上次出舱任务完成于 ${evaDays} 天前。`,
      sampleTime,
      basis: '任务档案为叙事模拟；轨道周期按 400 km 级近地圆轨道估算',
      metrics: [
        { label: '连续在轨', value: `${days} 天` },
        { label: '累计绕行', value: `${new Intl.NumberFormat('zh-CN').format(Math.floor(days * 15.65))} 圈` },
        { label: '完成任务', value: `${126 + Math.floor(days / 9)} 项` },
        { label: '上次出舱', value: `${evaDays} 天前` },
      ],
    }
  }
  if (id === 'satellite') {
    const days = daysSince('2024-10-24T06:32:00+08:00', now)
    return {
      report: `听风一号正通过降交点晨昏轨道，星敏感器已锁定。第 ${Math.floor(days * 14.72)} 圈遥测帧完整，下一通信窗口约 ${7 + Math.abs(minuteSeed % 14)} 分钟后开启。`,
      sampleTime,
      basis: '按 612 km 太阳同步圆轨道与每日约 14.72 圈的工程模型生成',
      metrics: [
        { label: '卫星类型', value: '光学通信' },
        { label: '在轨时间', value: `${days} 天` },
        { label: '轨道高度', value: '612 km' },
        { label: '链路时延', value: `${(4.1 + Math.sin(hours) * .6).toFixed(1)} ms` },
      ],
    }
  }
  if (id === 'spacecraft') {
    const days = daysSince('2026-03-21T20:26:00+08:00', now)
    return {
      report: `风隅号正在执行 FY-01 第 ${days} 航日巡航。三联离子驱动阵列同步率 ${(99.94 + Math.sin(hours) * .03).toFixed(2)}%，舰桥已将下一颗记忆星设为航向基准。`,
      sampleTime,
      basis: '深空舰为科幻工程设定，推进与曲率数据用于交互叙事，不代表现实可用技术',
      metrics: [
        { label: '任务航日', value: `D+${days}` },
        { label: '巡航速度', value: `${(38.6 + Math.sin(hours * .7) * 1.8).toFixed(1)} km/s` },
        { label: '驱动阵列', value: '3 / 3 在线' },
        { label: '航向误差', value: `${Math.abs(Math.sin(hours * 1.3) * .06).toFixed(3)}°` },
      ],
    }
  }
  return empty
}

onMounted(() => {
  void loadGraph()
  telemetryTimer = setInterval(() => { telemetryNow.value = new Date() }, 30_000)
})
onBeforeUnmount(() => { if (telemetryTimer) clearInterval(telemetryTimer) })

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
  activeCommandId.value = ''
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
  activeCommandId.value = ''
  discoverySequence.value += 1
  void router.replace({ query: {} })
}

function clearDiscovery() {
  activeDiscoveryId.value = ''
  discoveryResult.value = ''
  activeCommandId.value = ''
  sceneRef.value?.resetView()
}

function runDiscoveryCommand(commandId: DiscoveryCommandId) {
  const discovery = activeDiscovery.value
  if (!discovery) return
  activeCommandId.value = commandId
  discoverySequence.value += 1
  telemetryNow.value = new Date()
  if (commandId === 'tour') {
    discoveryResult.value = '环站巡航已接管视角：正沿桁架、实验舱与太阳翼外缘飞行。'
    sceneRef.value?.startDiscoveryTour('station')
  } else if (commandId === 'bridge') {
    discoveryResult.value = '舰桥追航已启动：视角锁定风隅号尾部，航向由飞船实时姿态驱动。'
    sceneRef.value?.startDiscoveryTour('spacecraft')
  } else if (commandId === 'log') {
    discoveryResult.value = sample(stationLogs, discoverySequence.value)
    sceneRef.value?.triggerDiscoveryEffect('station')
  } else if (commandId === 'signal') {
    discoveryResult.value = `窄带信标 FY-${String(discoverySequence.value).padStart(4, '0')} 已发射，载频 1420.405 MHz，等待同频回执。`
    sceneRef.value?.triggerDiscoveryEffect('satellite')
  } else if (commandId === 'orbit') {
    discoveryResult.value = '轨道解算完成：听风一号已重新锁定晨昏面，姿态误差回落至 0.02°。'
    sceneRef.value?.focusDiscovery('satellite')
    sceneRef.value?.triggerDiscoveryEffect('satellite')
  } else if (commandId === 'warp') {
    discoveryResult.value = '曲率航路已展开：风隅号正在穿越星图，舰桥将持续追踪跃迁航迹。'
    sceneRef.value?.triggerDiscoveryEffect('spacecraft')
  } else {
    discoveryResult.value = ''
    sceneRef.value?.triggerDiscoveryEffect(discovery.id)
  }
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
  activeCommandId.value = ''
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
    activeCommandId.value = ''
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
.discovery-popup { --discovery-accent:#72d9ff; position:absolute; z-index:20; top:50%; right:clamp(20px,4.5vw,72px); width:min(412px,calc(100vw - 40px)); max-height:calc(100dvh - 118px); padding:24px; overflow-x:hidden; overflow-y:auto; border:1px solid color-mix(in srgb,var(--discovery-accent) 30%,transparent); border-radius:8px; background:linear-gradient(155deg,rgb(7 21 38 / .94),rgb(2 8 19 / .97)); box-shadow:0 28px 90px rgb(0 0 0 / .52),inset 0 1px rgb(225 244 255 / .06); backdrop-filter:blur(24px) saturate(1.12); transform:translateY(-50%); }
.discovery-popup::before { position:absolute; top:0; right:0; left:0; height:2px; background:linear-gradient(90deg,transparent,var(--discovery-accent),transparent); content:''; opacity:.7; pointer-events:none; }
.discovery-black-hole { background:linear-gradient(150deg,rgb(24 13 15 / .96),rgb(3 6 12 / .98) 72%); box-shadow:0 30px 100px rgb(0 0 0 / .7),inset 0 0 70px rgb(128 37 12 / .08); }
.discovery-identity { display:grid; grid-template-columns:38px minmax(0,1fr) auto; align-items:center; gap:10px; padding-right:30px; }
.discovery-identity>span { display:grid; width:38px; height:38px; border:1px solid color-mix(in srgb,var(--discovery-accent) 38%,transparent); border-radius:50%; background:color-mix(in srgb,var(--discovery-accent) 10%,transparent); color:var(--discovery-accent); font-size:1.05rem; place-items:center; }
.discovery-identity>div { display:flex; min-width:0; flex-direction:column; gap:3px; }
.discovery-identity small { overflow:hidden; color:color-mix(in srgb,var(--discovery-accent) 78%,#7d94a6); font-size:.48rem; letter-spacing:.08em; text-overflow:ellipsis; white-space:nowrap; }
.discovery-identity b { color:#c7d7e2; font-size:.58rem; font-weight:560; }
.discovery-identity em { display:flex; align-items:center; gap:5px; color:#688196; font-size:.47rem; font-style:normal; white-space:nowrap; }
.discovery-identity em i { width:5px; height:5px; border-radius:50%; background:#5ee2bb; box-shadow:0 0 9px #43cba6; }
.discovery-title { display:flex; align-items:flex-end; justify-content:space-between; gap:14px; margin-top:19px; }
.discovery-title h2 { min-width:0; margin:0; color:#f1f7fb; font-size:1.48rem; line-height:1.15; letter-spacing:0; }
.discovery-title>span { flex:none; color:#667f94; font-size:.5rem; }
.discovery-popup>p { margin:10px 0 0; color:#8fa5b5; font-size:.68rem; line-height:1.8; }
.telemetry-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); margin-top:19px; border-top:1px solid rgb(133 172 199 / .13); border-bottom:1px solid rgb(133 172 199 / .13); }
.telemetry-grid>div { display:flex; min-width:0; flex-direction:column; gap:4px; padding:10px 9px 10px 0; }
.telemetry-grid>div:nth-child(even) { padding-left:12px; border-left:1px solid rgb(133 172 199 / .11); }
.telemetry-grid small { color:#607b90; font-size:.46rem; }
.telemetry-grid strong { overflow:hidden; color:#d4e2eb; font-size:.62rem; font-weight:620; text-overflow:ellipsis; white-space:nowrap; }
.discovery-signal { display:flex; flex-direction:column; gap:7px; margin-top:18px; padding-left:12px; border-left:2px solid var(--discovery-accent); }
.discovery-signal>div { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.discovery-signal small { color:color-mix(in srgb,var(--discovery-accent) 78%,#8399a9); font-size:.49rem; letter-spacing:.06em; }
.discovery-signal time { color:#526b7e; font-size:.47rem; font-variant-numeric:tabular-nums; }
.discovery-signal strong { color:#c9d9e4; font-size:.62rem; font-weight:560; line-height:1.65; }
.discovery-signal>span { color:#526a7c; font-size:.46rem; line-height:1.55; }
.discovery-commands { display:flex; gap:5px; margin-top:18px; }
.discovery-commands button { display:flex; min-width:0; height:39px; flex:1; align-items:center; justify-content:center; gap:7px; padding:0 9px; border:1px solid color-mix(in srgb,var(--discovery-accent) 30%,transparent); border-radius:6px; background:color-mix(in srgb,var(--discovery-accent) 8%,transparent); color:#bcd2df; cursor:pointer; font:inherit; font-size:.58rem; transition:background .22s ease,border-color .22s ease,color .22s ease,transform .22s ease; }
.discovery-commands button:hover,.discovery-commands button.active { border-color:color-mix(in srgb,var(--discovery-accent) 62%,transparent); background:color-mix(in srgb,var(--discovery-accent) 16%,transparent); color:#effaff; transform:translateY(-1px); }
.discovery-commands button:focus-visible { outline:2px solid var(--discovery-accent); outline-offset:3px; }
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
  .discovery-popup { top:auto; right:14px; bottom:58px; left:14px; width:auto; max-height:min(67dvh,560px); padding:19px; transform:none; }
  .discovery-title { align-items:flex-start; flex-direction:column; gap:4px; }
  .discovery-identity em { display:none; }
  .popup-rail { top:21px; bottom:19px; left:9px; }
  .popup-enter-from,.popup-leave-to { opacity:0; transform:translateY(24px); }
}
@media (prefers-reduced-motion:reduce) {
  .constellation-intro,.popup-enter-active,.popup-leave-active,.loading-orbit { transition:none; animation:none; }
  .constellation-intro { opacity:1; transform:none; }
}
</style>

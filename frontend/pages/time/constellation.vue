<template>
  <main
    class="constellation-page"
    :class="{ ready: sceneReady, immersive: immersiveMode }"
  >
    <section class="constellation-stage" aria-label="时光星图">
      <TimeConstellationScene
        v-if="!fallbackMode && graphReady && homePreload.ready && sceneSettingsReady"
        ref="sceneRef"
        :nodes="displayNodes"
        :relations="displayRelations"
        :graph-version="displayGraphVersion"
        :route-node-ids="routeNodeIds"
        :selected-id="selected?.id"
        :resolve-image="mediaUrl"
        :scene-settings="sceneSettings"
        :start-intro="constellationIntroStarted"
        :intro-delay-ms="180"
        @ready="handleConstellationSceneReady"
        @intro-progress="handleConstellationIntroProgress"
        @intro-ready="handleConstellationIntroReady"
        @select="handleSceneSelect"
        @discover="handleDiscovery"
        @clear="clearSelected"
        @focus-cleared="handleFocusCleared"
        @immersive-change="immersiveMode = $event"
        @fallback="handleConstellationFallback"
      />
      <MemoryGraph2D
        v-else-if="graphReady && fallbackMode && homePreload.ready && sceneSettingsReady"
        :nodes="displayNodes"
        :relations="displayRelations"
        :selected-id="selected?.id"
        @select="handleSceneSelect"
      />
      <Transition name="constellation-entry">
        <div
          v-if="constellationLoaderVisible"
          class="constellation-entry-loading"
          role="status"
          aria-live="polite"
          :aria-label="`${constellationLoadingStage}，${constellationRoundedProgress}%`"
        >
          <div class="loading-window">
            <header>
              <span class="loading-brand">
                <img src="/logo.png" alt="" width="32" height="32" />
                <span
                  ><strong>TIME CONSTELLATION</strong><small>ORBITAL MEMORY ATLAS</small></span
                >
              </span>
              <b
                >{{ String(constellationRoundedProgress).padStart(2, "0") }}<small>%</small></b
              >
            </header>
            <div class="loading-track" aria-hidden="true">
              <span class="loading-track__ticks"><i v-for="tick in 13" :key="tick" /></span>
              <i :style="{ transform: `scaleX(${constellationDisplayProgress / 100})` }" />
              <b :style="{ left: `${constellationDisplayProgress}%` }" />
            </div>
            <footer>
              <span><i />{{ constellationLoadingStage }}</span>
              <small><em />{{ constellationLoadingDetail }} · {{ constellationTaskSummary }}</small>
            </footer>
          </div>
        </div>
      </Transition>
    </section>

    <header class="constellation-nav">
      <button
        type="button"
        class="brand"
        title="返回时光门面"
        @click="navigate('/')"
      >
        <img src="/logo.png" alt="" width="42" height="42" />
        <span><strong>时光星图</strong><small>TIME CONSTELLATION</small></span>
      </button>
      <div class="nav-actions">
        <button
          v-if="error"
          type="button"
          title="重新连接真实记忆"
          aria-label="重新连接真实记忆"
          @click="loadGraph"
        >
          <Icon name="ph:arrow-clockwise-bold" />
        </button>
        <button
          type="button"
          title="重置视角"
          aria-label="重置视角"
          @click="resetScene"
        >
          <Icon name="ph:crosshair-simple-bold" />
        </button>
      </div>
    </header>

    <section class="constellation-intro" aria-labelledby="constellation-title">
      <div class="intro-kicker">
        <span>MY TIME UNIVERSE</span><i /><em>{{ timeRange }}</em>
      </div>
      <h1 id="constellation-title">时光星图</h1>
      <p>记忆沿年份铺成轨道，地点、照片与故事在时间里彼此照亮。</p>
    </section>

    <footer class="constellation-foot">
      <span
        ><i />{{ latestLabel
        }}<b
          ><em />点击主星球、太阳、黑洞、空间站、卫星与风隅号读取档案</b
        ></span
      >
    </footer>

    <Transition name="popup">
      <aside v-if="selected" class="memory-popup">
        <div class="popup-rail" aria-hidden="true"><span /><i /></div>
        <button
          class="popup-close"
          type="button"
          title="关闭"
          aria-label="关闭"
          @click="clearSelected"
        >
          <Icon name="ph:x-bold" />
        </button>
        <div class="popup-glow" aria-hidden="true" />
        <div class="popup-identity">
          <span><Icon :name="nodeIcon(selected.type)" /></span
          ><small
            >{{ typeText(selected.type) }} ·
            {{ formatDate(selected.occurredAt) }}</small
          >
        </div>
        <div v-if="selected.image" class="popup-image">
          <img :src="mediaUrl(selected.image)" alt="" />
        </div>
        <h2>{{ selected.title }}</h2>
        <p>{{ selected.excerpt || "这颗星保存着一段尚未展开的记忆。" }}</p>
        <AppLink v-if="selected.href" :to="selected.href"
          ><span>读取这段时光</span><Icon name="ph:arrow-up-right-bold"
        /></AppLink>
        <section class="relations-panel" :class="{ loading: neighborsLoading }">
          <h3>
            <span>相连轨迹</span
            ><small>{{
              neighborsLoading ? "校准中" : `${neighbors.length} 条`
            }}</small>
          </h3>
          <p v-if="neighborsLoading" class="relations-empty" aria-live="polite">正在校准相连轨迹…</p>
          <template v-else-if="neighbors.length">
            <button
              v-for="relation in neighbors.slice(0, 3)"
              :key="relation.id"
              type="button"
              @click="selectNeighbor(relation)"
            >
              <span>{{ relationText(relation.type) }}</span>
              <b>{{ otherNode(relation).title }}</b>
              <small>{{ evidenceText(relation.evidence) }}</small>
            </button>
          </template>
          <p v-else class="relations-empty">这颗星暂时独自发光</p>
        </section>
      </aside>
    </Transition>

    <Transition name="popup">
      <aside
        v-if="activeDiscovery"
        class="discovery-popup"
        :class="[
          `discovery-${activeDiscovery.id}`,
          { 'is-closing': discoveryClosing, 'is-immersive': immersiveMode },
        ]"
        role="dialog"
        :aria-label="`${activeDiscovery.title}遥测档案`"
      >
        <button
          class="popup-close"
          type="button"
          title="关闭"
          aria-label="关闭"
          @click="clearDiscovery"
        >
          <Icon name="ph:x-bold" />
        </button>
        <Transition name="discovery-content" mode="out-in">
          <div :key="activeDiscovery.id" class="discovery-content">
            <header class="discovery-identity">
              <span><Icon :name="activeDiscovery.icon" /></span>
              <div>
                <small>{{ activeDiscovery.kicker }}</small
                ><b>{{ activeDiscovery.status }}</b>
              </div>
              <em
                ><i />{{
                  activeDiscovery.id === "planet" ? "私人星球档案" : "科学模拟"
                }}</em
              >
            </header>
            <div
              v-if="activeDiscovery.id === 'spacecraft' || activeDiscovery.id === 'scoutcraft'"
              class="immersive-actions"
              :aria-label="`${activeDiscovery.title}漫游指令`"
            >
              <button
                type="button"
                :class="{ active: activeCommandId === 'warp' }"
                @click="runDiscoveryCommand('warp')"
              >
                <Icon name="ph:lightning-bold" /><span>{{ activeDiscovery.id === 'scoutcraft' ? '星际漫游' : '曲率跃迁' }}</span
                ><small>{{ activeDiscovery.id === 'scoutcraft' ? 'CRUISE' : 'WARP' }}</small>
              </button>
            </div>
            <div class="discovery-details">
              <div class="discovery-title">
                <h2>{{ activeDiscovery.title }}</h2>
                <span>{{ activeDiscovery.catalog }}</span>
              </div>
              <p>{{ activeDiscovery.description }}</p>
              <div class="telemetry-grid">
                <div
                  v-for="metric in activeTelemetry.metrics"
                  :key="metric.label"
                >
                  <small>{{ metric.label }}</small
                  ><strong>{{ metric.value }}</strong>
                </div>
              </div>
              <div class="discovery-signal" aria-live="polite">
                <div>
                  <small>{{ activeDiscovery.signalLabel }}</small
                  ><time>{{ activeTelemetry.sampleTime }}</time>
                </div>
                <strong>{{ discoveryResult || activeTelemetry.report }}</strong>
                <span>{{ activeTelemetry.basis }}</span>
              </div>
              <div class="knowledge-slot" :class="{ 'has-content': activeKnowledge || knowledgeLoading }">
                <Transition name="knowledge-reveal" mode="out-in">
                  <section v-if="activeKnowledge" :key="activeKnowledge.revision" class="telemetry-knowledge" aria-live="polite">
                    <header>
                      <span><Icon name="ph:book-open-text-bold" /> 星体科普</span>
                      <small> {{ activeDiscovery.title }} · 已同步</small>
                    </header>
                    <p>{{ activeKnowledge.knowledge }}</p>
                  </section>
                </Transition>
              </div>
              <button v-if="activeDiscovery.knowledge?.length" class="knowledge-refresh" type="button" :disabled="knowledgeLoading" @click="fetchKnowledge">
                <Icon :name="knowledgeLoading ? 'ph:circle-notch-bold' : 'ph:book-open-text-bold'" :class="{ spinning: knowledgeLoading }" />
                <span>{{ knowledgeLoading ? '正在换个说法…' : (activeKnowledge ? '换个说法' : '读取科普') }}</span>
              </button>
              <div
                class="discovery-commands"
                :aria-label="`${activeDiscovery.title}指令`"
              >
                <button
                  v-for="command in activeDiscovery.commands"
                  :key="command.id"
                  type="button"
                  :class="{ active: activeCommandId === command.id }"
                  @click="runDiscoveryCommand(command.id)"
                >
                  <Icon :name="command.icon" /><span>{{ command.label }}</span>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </aside>
    </Transition>
  </main>
</template>

<script setup lang="ts">
import { SOLAR_KNOWLEDGE, SPECIAL_KNOWLEDGE } from '@/utils/constellationKnowledge'


type GraphNode = {
  id: string;
  type: string;
  title: string;
  excerpt?: string | null;
  href?: string;
  image?: string | null;
  occurredAt?: string | null;
  coordinateSeed?: number;
  metadata?: Record<string, unknown>;
};

type GraphRelation = {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  weight?: number;
  source?: GraphNode;
  target?: GraphNode;
  evidence?: Record<string, unknown>;
};

type DiscoveryId =
  | "planet"
  | "sun"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "black-hole"
  | "station"
  | "satellite"
  | "satellite-aurora"
  | "satellite-relay"
  | "spacecraft"
  | "scoutcraft";
type DiscoveryCommandId =
  | "pulse"
  | "latest"
  | "sample"
  | "scan"
  | "tour"
  | "log"
  | "signal"
  | "orbit"
  | "bridge"
  | "warp"
  | "frost"
  | "soil"
  | "cloud"
  | "dust"
  | "storm"
  | "rings"
  | "tilt"
  | "darkspot";

type Discovery = {
  id: DiscoveryId;
  title: string;
  catalog: string;
  kicker: string;
  status: string;
  description: string;
  signalLabel: string;
  icon: string;
  commands: { id: DiscoveryCommandId; label: string; icon: string }[];
  knowledge?: string[];
};

type DiscoveryTelemetry = {
  report: string;
  sampleTime: string;
  basis: string;
  metrics: { label: string; value: string }[];
};

type SolarPlanetSpec = {
  id: Exclude<DiscoveryId, "planet" | "sun" | "black-hole" | "station" | "satellite" | "satellite-aurora" | "satellite-relay" | "spacecraft" | "scoutcraft">;
  name: string;
  catalog: string;
  status: string;
  description: string;
  distance: string;
  period: string;
  temperature: string;
  feature: string;
  knowledge?: string[];
  commands: { id: DiscoveryCommandId; label: string; icon: string }[];
};

const DEFAULT_SOLAR_PLANETS: SolarPlanetSpec[] = [
  { id: "mercury", name: "水星", catalog: "MERCURY · 类地行星", status: "昼夜温差极端", description: "距离太阳最近的行星，布满撞击坑，没有真正的大气层，缓慢的自转让一昼夜接近两个水星年。", distance: "0.39 AU", period: "87.97 日", temperature: "−173 至 427 °C", feature: "撞击坑与铁质核心", knowledge: SOLAR_KNOWLEDGE.mercury, commands: [{ id: "frost", label: "冻结外框", icon: "ph:snowflake-bold" }, { id: "soil", label: "采集土质", icon: "ph:flask-bold" }] },
  { id: "venus", name: "金星", catalog: "VENUS · 类地行星", status: "厚重云层覆盖", description: "被二氧化碳大气和硫酸云层包裹的高温世界，逆向自转，表面气压约为地球的九十倍。", distance: "0.72 AU", period: "224.70 日", temperature: "约 464 °C", feature: "硫酸云带与温室效应", commands: [{ id: "cloud", label: "解析云层", icon: "ph:cloud-fog-bold" }, { id: "sample", label: "读取光谱", icon: "ph:wave-sine-bold" }] },
  { id: "mars", name: "火星", catalog: "MARS · 类地行星", status: "尘暴季节活跃", description: "红色来自含铁矿物氧化物，稀薄大气中可见极冠、古老河谷与全球性沙尘暴的痕迹。", distance: "1.52 AU", period: "686.98 日", temperature: "平均 −63 °C", feature: "铁锈地表与极冠", commands: [{ id: "soil", label: "采集土质", icon: "ph:flask-bold" }, { id: "dust", label: "追踪尘暴", icon: "ph:wind-bold" }] },
  { id: "jupiter", name: "木星", catalog: "JUPITER · 气态巨行星", status: "大气带高速流动", description: "太阳系最大的行星，氢氦大气形成明暗条带，大红斑是持续数百年的巨大反气旋风暴。", distance: "5.20 AU", period: "11.86 年", temperature: "云顶约 −110 °C", feature: "大红斑与条带云系", commands: [{ id: "storm", label: "追踪大红斑", icon: "ph:wind-bold" }, { id: "sample", label: "采集云层谱", icon: "ph:wave-sine-bold" }] },
  { id: "saturn", name: "土星", catalog: "SATURN · 气态巨行星", status: "环系层次清晰", description: "由冰粒、尘埃和碎石组成的复杂环系围绕着土星，卡西尼缝等结构在引力共振作用下保持清晰。", distance: "9.58 AU", period: "29.45 年", temperature: "云顶约 −140 °C", feature: "冰尘星环与卡西尼缝", commands: [{ id: "rings", label: "解析星环", icon: "ph:circle-dashed-bold" }, { id: "sample", label: "读取冰尘谱", icon: "ph:wave-sine-bold" }] },
  { id: "uranus", name: "天王星", catalog: "URANUS · 冰巨行星", status: "横躺姿态运行", description: "自转轴几乎平行于轨道面，甲烷让它呈现青绿色，季节变化会持续数十年。", distance: "19.2 AU", period: "84.02 年", temperature: "约 −195 °C", feature: "甲烷冰层与极端倾角", commands: [{ id: "tilt", label: "校准横躺姿态", icon: "ph:compass-bold" }, { id: "sample", label: "读取甲烷谱", icon: "ph:wave-sine-bold" }] },
  { id: "neptune", name: "海王星", catalog: "NEPTUNE · 冰巨行星", status: "超音速风暴活跃", description: "距离太阳最远的主行星，深蓝色大气中存在太阳系最快的行星风和不断消散、重现的暗斑。", distance: "30.1 AU", period: "164.79 年", temperature: "约 −200 °C", feature: "深蓝色大气与暗斑", commands: [{ id: "storm", label: "测量超音速风", icon: "ph:wind-bold" }, { id: "darkspot", label: "锁定暗斑", icon: "ph:crosshair-bold" }] },
];

const api = useApi();
const route = useRoute();
const router = useRouter();
const { mediaUrl } = useMediaUrl();
const { visitorId } = useVisitor();
const { navigate } = useCosmicNavigation();
const { selectMemory, clearMemory } = useMemorySelection();
const { state: homePreload, preloadHomeContent } = useHomePreload();
const graph = reactive<{
  nodes: GraphNode[];
  relations: GraphRelation[];
  graphVersion: string;
}>({ nodes: [], relations: [], graphVersion: "" });
const sceneSettings = reactive<any>({ nonContentStarCount: 2400, ringGap: 34, movementSpeed: 1, solarPlanets: DEFAULT_SOLAR_PLANETS });
const sceneRef = ref<{
  resetView: () => void;
  focusDiscovery: (id: DiscoveryId) => void;
  resumeDiscoveryFocus: (id: DiscoveryId) => void;
  triggerDiscoveryEffect: (id: DiscoveryId) => void;
  startDiscoveryTour: (id: DiscoveryId) => void;
} | null>(null);
const selected = ref<GraphNode | null>(null);
const returnDiscoveryId = ref<DiscoveryId | "">("");
const activeDiscoveryId = ref<DiscoveryId | "">("");
const discoveryResult = ref("");
const discoverySequence = ref(0);
const activeCommandId = ref<DiscoveryCommandId | "">("");
const activeKnowledge = ref<{ knowledge: string; index: number; total: number; reused: boolean; revision: number } | null>(null);
const knowledgeLoading = ref(false);
let knowledgeRequestSequence = 0;
const telemetryNow = ref(new Date());
const neighbors = ref<GraphRelation[]>([]);
const neighborsLoading = ref(false);
const error = ref("");
const sceneReady = ref(false);
const sceneIntroReady = ref(false);
const fallbackMode = ref(false);
const graphReady = ref(false);
const sceneSettingsReady = ref(false);
const discoveryClosing = ref(false);
const immersiveMode = ref(false);
const constellationLoaderVisible = ref(true);
const constellationIntroStarted = ref(false);
const constellationDisplayProgress = ref(0);
const constellationTargetProgress = ref(0);
const constellationLoadingStage = ref("准备星图界面");
const constellationLoadingDetail = ref("初始化视觉与交互资源");
const constellationCompletedTasks = ref<string[]>([]);
const constellationTotalTasks = 4;
const constellationIntroProgress = ref(0);
const constellationRoundedProgress = computed(() =>
  Math.round(constellationDisplayProgress.value),
);
const constellationTaskSummary = computed(() =>
  `${constellationCompletedTasks.value.length}/${constellationTotalTasks} 项资源`,
);
let requestSequence = 0;
let neighborRequestSequence = 0;
let telemetryTimer: ReturnType<typeof setInterval> | null = null;
let constellationProgressFrame = 0;
let constellationProgressUpdatedAt = 0;
let constellationSceneTimeout = 0;
let constellationCompletionStarted = false;
let constellationDisposed = false;

const typeOptions = [
  { value: "memory", label: "时光记忆", icon: "ph:planet-bold" },
  { value: "post", label: "文章", icon: "ph:article-bold" },
  { value: "moment", label: "瞬间", icon: "ph:sparkle-bold" },
  { value: "album", label: "相册", icon: "ph:images-square-bold" },
  { value: "photo", label: "照片", icon: "ph:image-bold" },
  { value: "place", label: "地点", icon: "ph:map-pin-bold" },
  { value: "library", label: "书影", icon: "ph:books-bold" },
  { value: "journey", label: "旅行", icon: "ph:path-bold" },
];

const solarPlanetSpecs = reactive<SolarPlanetSpec[]>([
  { id: "mercury", name: "水星", catalog: "MERCURY · 类地行星", status: "昼夜温差极端", description: "距离太阳最近的行星，布满撞击坑，没有真正的大气层，缓慢的自转让一昼夜接近两个水星年。", distance: "0.39 AU", period: "87.97 日", temperature: "−173 至 427 °C", feature: "撞击坑与铁质核心", commands: [{ id: "frost", label: "冻结外框", icon: "ph:snowflake-bold" }, { id: "soil", label: "采集土质", icon: "ph:flask-bold" }] },
  { id: "venus", name: "金星", catalog: "VENUS · 类地行星", status: "厚重云层覆盖", description: "被二氧化碳大气和硫酸云层包裹的高温世界，逆向自转，表面气压约为地球的九十倍。", distance: "0.72 AU", period: "224.70 日", temperature: "约 464 °C", feature: "硫酸云带与温室效应", commands: [{ id: "cloud", label: "解析云层", icon: "ph:cloud-fog-bold" }, { id: "sample", label: "读取光谱", icon: "ph:wave-sine-bold" }] },
  { id: "mars", name: "火星", catalog: "MARS · 类地行星", status: "尘暴季节活跃", description: "红色来自含铁矿物氧化物，稀薄大气中可见极冠、古老河谷与全球性沙尘暴的痕迹。", distance: "1.52 AU", period: "686.98 日", temperature: "平均 −63 °C", feature: "铁锈地表与极冠", commands: [{ id: "soil", label: "采集土质", icon: "ph:flask-bold" }, { id: "dust", label: "追踪尘暴", icon: "ph:wind-bold" }] },
  { id: "jupiter", name: "木星", catalog: "JUPITER · 气态巨行星", status: "大气带高速流动", description: "太阳系最大的行星，氢氦大气形成明暗条带，大红斑是持续数百年的巨大反气旋风暴。", distance: "5.20 AU", period: "11.86 年", temperature: "云顶约 −110 °C", feature: "大红斑与条带云系", commands: [{ id: "storm", label: "追踪大红斑", icon: "ph:wind-bold" }, { id: "sample", label: "采集云层谱", icon: "ph:wave-sine-bold" }] },
  { id: "saturn", name: "土星", catalog: "SATURN · 气态巨行星", status: "环系层次清晰", description: "由冰粒、尘埃和碎石组成的复杂环系围绕着土星，卡西尼缝等结构在引力共振作用下保持清晰。", distance: "9.58 AU", period: "29.45 年", temperature: "云顶约 −140 °C", feature: "冰尘星环与卡西尼缝", commands: [{ id: "rings", label: "解析星环", icon: "ph:circle-dashed-bold" }, { id: "sample", label: "读取冰尘谱", icon: "ph:wave-sine-bold" }] },
  { id: "uranus", name: "天王星", catalog: "URANUS · 冰巨行星", status: "横躺姿态运行", description: "自转轴几乎平行于轨道面，甲烷让它呈现青绿色，季节变化会持续数十年。", distance: "19.2 AU", period: "84.02 年", temperature: "约 −195 °C", feature: "甲烷冰层与极端倾角", commands: [{ id: "tilt", label: "校准横躺姿态", icon: "ph:compass-bold" }, { id: "sample", label: "读取甲烷谱", icon: "ph:wave-sine-bold" }] },
  { id: "neptune", name: "海王星", catalog: "NEPTUNE · 冰巨行星", status: "超音速风暴活跃", description: "距离太阳最远的主行星，深蓝色大气中存在太阳系最快的行星风和不断消散、重现的暗斑。", distance: "30.1 AU", period: "164.79 年", temperature: "约 −200 °C", feature: "深蓝色大气与暗斑", commands: [{ id: "storm", label: "测量超音速风", icon: "ph:wind-bold" }, { id: "darkspot", label: "锁定暗斑", icon: "ph:crosshair-bold" }] },
]);

function mergedKnowledge(value: unknown, fallback: string[]) {
  const custom = Array.isArray(value) ? value.map(item => String(item).trim()).filter(Boolean) : [];
  return [...custom, ...fallback.filter(item => !custom.includes(item))].slice(0, 1000);
}

for (const spec of solarPlanetSpecs) {
  spec.knowledge = [...(SOLAR_KNOWLEDGE[spec.id] || [])];
}

const discoveries: Discovery[] = [
  {
    id: "planet",
    title: "风隅星",
    catalog: "CORNER-INK · 记忆母星",
    kicker: "PRIVATE HOMEWORLD · 00",
    status: "记忆生态持续生长",
    description:
      "它不是一颗等待测绘的普通行星，而是风隅随笔的精神坐标：文章化作大陆，瞬间汇成云层，照片与旅途沿着晨昏线缓慢发光。",
    signalLabel: "母星记忆回声",
    icon: "ph:planet-bold",
    commands: [
      { id: "pulse", label: "唤醒星核", icon: "ph:sparkle-bold" },
      { id: "latest", label: "定位最近记忆", icon: "ph:crosshair-bold" },
    ],
  },
  {
    id: "sun",
    title: "太阳",
    catalog: "G2V · 黄矮星",
    kicker: "SOL HELIOPHYSICS · 01",
    status: "日球层遥测在线",
    description:
      "核心以质子－质子链持续把氢聚变为氦；能量穿过辐射区与对流区，最终以光和太阳风抵达星图。",
    signalLabel: "太阳活动简报",
    icon: "ph:sun-bold",
    commands: [
      { id: "sample", label: "刷新聚变遥测", icon: "ph:wave-sine-bold" },
    ],
  },
  {
    id: "black-hole",
    title: "玄渊 X-1",
    catalog: "超大质量黑洞模型",
    kicker: "EVENT HORIZON · 02",
    status: "吸积盘稳定",
    description:
      "中央阴影不是实体表面，而是光无法逃逸的事件视界投影；明亮新月来自高速等离子体的相对论性多普勒增亮。",
    signalLabel: "引力透镜重建",
    icon: "ph:circle-half-tilt-bold",
    commands: [{ id: "scan", label: "扫描光子环", icon: "ph:scan-bold" }],
  },
  {
    id: "station",
    title: "风隅轨道站",
    catalog: "FYOS-01 · 近地轨道站",
    kicker: "ORBITAL OPERATIONS · 03",
    status: "乘组值守中",
    description:
      "一座长期在轨的记忆实验平台，承担材料暴露、生命支持与深空通信验证任务，每 92 分钟完成一圈轨道。",
    signalLabel: "任务控制中心",
    icon: "ph:broadcast-bold",
    commands: [
      { id: "tour", label: "环站视角巡航", icon: "ph:orbit-bold" },
      { id: "log", label: "读取任务日志", icon: "ph:notebook-bold" },
    ],
  },
  {
    id: "satellite",
    title: "听风一号",
    catalog: "TF-1 · 光学通信卫星",
    kicker: "BEACON NETWORK · 04",
    status: "太阳同步轨道运行",
    description:
      "一颗兼具星间激光通信与光学遥感能力的试验卫星，在晨昏轨道上持续为离散记忆寻找同频信标。",
    signalLabel: "星间链路状态",
    icon: "ph:broadcast-duotone",
    commands: [
      { id: "signal", label: "发送窄带信号", icon: "ph:broadcast-bold" },
      { id: "orbit", label: "重新锁定轨道", icon: "ph:crosshair-simple-bold" },
    ],
  },
  {
    id: "satellite-aurora",
    title: "逐光二号",
    catalog: "AURORA-02 · 极光成像卫星",
    kicker: "POLAR OBSERVATORY · 05",
    status: "极区扫描进行中",
    description:
      "面向极光与高层大气的专用观测平台，使用宽视场成像器记录磁暴期间的带电粒子沉降。",
    signalLabel: "极区成像链路",
    icon: "ph:aperture-bold",
    commands: [
      { id: "scan", label: "扫描极光弧", icon: "ph:scan-bold" },
      { id: "signal", label: "校准成像链", icon: "ph:wave-sine-bold" },
    ],
  },
  {
    id: "satellite-relay",
    title: "潮声三号",
    catalog: "TRIDENT-03 · 深空中继卫星",
    kicker: "DEEP SPACE RELAY · 06",
    status: "跨轨链路稳定",
    description:
      "搭载定向高增益天线的深空中继节点，为远端记忆坐标提供低延迟转发与时间同步。",
    signalLabel: "深空中继状态",
    icon: "ph:broadcast-bold",
    commands: [
      { id: "signal", label: "发射中继脉冲", icon: "ph:broadcast-bold" },
      { id: "scan", label: "扫描远端节点", icon: "ph:scan-bold" },
    ],
  },
  {
    id: "spacecraft",
    title: "风隅号",
    catalog: "FY-01 · 深空巡航舰",
    kicker: "WIND CORNER FLIGHT · 07",
    status: "三联离子驱动在线",
    description:
      "以陶瓷复合装甲、三联离子推进阵列和全景舰桥构成的深空巡航舰。聚焦会持续跟随航迹，追航将在舰尾上方保持第三人称伴飞。",
    signalLabel: "舰桥航行简报",
    icon: "ph:rocket-launch-bold",
    commands: [
      { id: "bridge", label: "第三人称追航", icon: "ph:steering-wheel-bold" },
      { id: "warp", label: "曲率跃迁", icon: "ph:lightning-bold" },
    ],
  },
  {
    id: "scoutcraft",
    title: "棱镜号",
    catalog: "PRISM-07 · 航道测绘艇",
    kicker: "PRISMATIC EXPLORER · 08",
    status: "脉冲星导航解算中",
    description:
      "一艘为星际航道测绘而生的高速探测艇。棱镜座舱将星光、引力波和脉冲星信号叠合为航向解，进入漫游模式即可从驾驶舱穿过星图。",
    signalLabel: "棱镜导航简报",
    icon: "ph:shooting-star-bold",
    commands: [
      { id: "bridge", label: "进入驾驶舱", icon: "ph:steering-wheel-bold" },
      { id: "warp", label: "启动星际漫游", icon: "ph:rocket-launch-bold" },
    ],
  },
  ...solarPlanetSpecs.map((spec, index) => ({
    id: spec.id,
    title: spec.name,
    catalog: spec.catalog,
    kicker: `SOLAR SYSTEM · ${String(index + 8).padStart(2, "0")}`,
    status: spec.status,
    description: spec.description,
    signalLabel: "行星表面遥测",
    icon: "ph:planet-bold",
    commands: spec.commands,
  })),
];

for (const discovery of discoveries) {
  if (SPECIAL_KNOWLEDGE[discovery.id]) {
    discovery.knowledge = [...(SPECIAL_KNOWLEDGE[discovery.id] || [])];
  }
  if (discovery.id === 'sun' || discovery.id === 'black-hole') {
    discovery.commands = [
      { id: 'sample', label: `解析${discovery.title}特征`, icon: 'ph:flask-bold' },
      { id: 'orbit', label: '聚焦查看星体特征', icon: 'ph:crosshair-bold' },
    ];
  }
}

const solarReports = [
  "核心区质子－质子链 I 分支保持主导，四个质子最终转化为一个氦-4 核，并以中微子与伽马光子带走能量。",
  "辐射区光子仍在随机游走；核心产生的能量通常需要数万至数十万年才能抵达对流区边界。",
  "对流区上涌等离子体形成新的米粒组织，单个米粒尺度接近一千公里，寿命约数分钟。",
  "光球层有效温度维持在约 5772 K，当前可见光谱仍符合 G2V 型主序星特征。",
  "色球层磁拱出现轻微剪切，模型未发现足以触发强耀斑的快速磁重联。",
  "日冕温度模型超过一百万开尔文，远高于光球；加热机制仍与磁波和纳米耀斑有关。",
  "一束光球光子已离开太阳，约 8 分 20 秒后抵达地球轨道附近。",
  "太阳风跨过临界点进入超声速外流，预计数日后与地球磁层发生耦合。",
  "当前扇区磁场以闭合磁力线为主，带电粒子被约束在日冕环内往返运动。",
  "日震学模型捕获到 p 模振荡，五分钟尺度的声波正在反演太阳内部密度结构。",
  "光球暗化区温度低于周围数千开尔文，因此在明亮背景上表现为太阳黑子。",
  "差异自转仍然明显：太阳赤道约 25 天转一周，高纬区域接近 35 天。",
  "核心每秒约将六亿吨氢转化为氦，其中约四百万吨质量以能量形式释放。",
  "中微子几乎不与物质作用，产生后只需数秒便穿出太阳，为核心聚变提供即时证据。",
  "辐照度模型在地球轨道处接近 1361 W/m²，短时波动主要由磁活动调制。",
  "日冕洞区域的开放磁力线正在向行星际空间输送高速太阳风。",
  "磁通管穿越光球后形成成对活动区，极性方向符合当前太阳活动周的统计规律。",
  "一条暗色日珥沿磁场悬浮于色球层上方，冷而致密的等离子体尚未发生喷发。",
  "当前紫外辐射模型平稳，电离层受扰风险维持在低水平。",
  "太阳常数并非绝对不变，完整活动周内总辐照度变化约为千分之一。",
  "光球谱线出现轻微多普勒位移，对应米粒组织上升与下沉的对流速度。",
  "核心温度约一千五百万开尔文，量子隧穿让质子在低于经典阈值时仍能发生聚变。",
  "太阳年龄约 46 亿年，核心氢储量足以让主序阶段再持续约 50 亿年。",
  "日球层顶之外是星际介质；太阳风塑造的巨大磁泡保护着整个行星系统。",
];

const blackHoleReports = [
  "靠近我们的吸积盘一侧因相对论性多普勒增亮形成明亮新月，远离侧则被红移并显著变暗。",
  "光子环来自绕黑洞多次偏折的极少量光线，它比事件视界更外侧，也比吸积盘更细锐。",
  "中央阴影直径大于事件视界本身，因为强引力把本应掠过的光线再次弯向黑洞。",
  "吸积盘内缘接近最内稳定圆轨道；再向内，物质无法维持圆轨道并快速坠入事件视界。",
  "事件视界不是固体表面，而是一条因果边界；一旦越过，任何信号都无法返回外部宇宙。",
  "模型质量设为 65 亿倍太阳质量，对应史瓦西半径约 128 个天文单位。",
  "盘面等离子体被摩擦与磁湍流加热，辐射颜色由外侧暗红逐渐过渡到内侧白热。",
  "引力透镜同时显示吸积盘正面与被弯曲到上方的背面影像，视觉上形成双层光带。",
  "磁旋转不稳定性从吸积盘抽取角动量，使物质可以缓慢向内迁移。",
  "极轴喷流由强磁场准直，并非从事件视界内部射出，而是源于其外侧的旋转等离子体。",
  "越接近事件视界，远方观察者看到的时钟越慢；自由落体者自身却不会在边界处感到停顿。",
  "黑洞本身不发光，画面中的所有亮度都来自周围物质、喷流以及被引力弯曲的背景光。",
  "克尔黑洞的自旋会拖拽邻近时空，能层中的粒子无法相对遥远恒星保持静止。",
  "当前偏振模型显示磁场沿吸积流呈螺旋结构，为喷流形成提供了能量通道。",
  "潮汐力取决于黑洞质量；对超大质量黑洞而言，跨越事件视界时局部潮汐梯度可能并不剧烈。",
  "霍金辐射对恒星级以上黑洞极其微弱，其温度远低于宇宙微波背景。",
  "吸积流亮度保持在爱丁顿极限以下，辐射压力暂未能阻止物质继续落入。",
  "这是一套基于广义相对论视觉特征的艺术模拟，并非对某个真实天体的实时观测。",
];

const displayNodes = computed(() => graph.nodes);
const activeDiscovery = computed(
  () => discoveries.find((item) => item.id === activeDiscoveryId.value) || null,
);
const activeTelemetry = computed<DiscoveryTelemetry>(() =>
  buildDiscoveryTelemetry(
    activeDiscoveryId.value,
    telemetryNow.value,
    discoverySequence.value,
  ),
);
const displayRelations = computed(() => graph.relations);
const routeNodeIds = computed(() => {
  const ids = new Set<string>();
  for (const relation of graph.relations) {
    if (
      relation.type === "journey_sequence" ||
      relation.type === "story_sequence"
    ) {
      ids.add(relation.sourceId);
      ids.add(relation.targetId);
    }
  }
  return [...ids];
});
const displayGraphVersion = computed(
  () => graph.graphVersion || `empty-${graph.nodes.length}`,
);
const nodeYears = computed(() =>
  graph.nodes
    .map((node) =>
      node.occurredAt ? new Date(node.occurredAt).getFullYear() : NaN,
    )
    .filter(Number.isFinite),
);
const timeRange = computed(() =>
  nodeYears.value.length
    ? `${Math.min(...nodeYears.value)} — ${Math.max(...nodeYears.value)}`
    : "等待第一段记忆",
);
const latestNode = computed(
  () =>
    [...graph.nodes]
      .filter((node) => node.occurredAt)
      .sort(
        (a, b) =>
          new Date(b.occurredAt!).getTime() - new Date(a.occurredAt!).getTime(),
      )[0],
);
const latestLabel = computed(() =>
  latestNode.value
    ? `最近点亮 · ${formatDate(latestNode.value.occurredAt)}`
    : "每一次发布，都会点亮一颗新星",
);
const stationLogs = [
  "任务日志 184：乘组完成材料暴露载荷回收，样品已转入恒温舱。",
  "任务日志 197：机械臂完成自主巡检，桁架节点热控状态正常。",
  "任务日志 203：舷窗掠过晨昏线，太阳能翼完成新一轮对日定向。",
  "任务日志 216：生命支持闭环效率维持 93.8%，下一次维护窗口已排定。",
  "任务日志 229：深空链路捕获一颗新记忆星，时间戳已写入轨道档案。",
];

function daysSince(value: string, now = telemetryNow.value) {
  return Math.max(
    0,
    Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000),
  );
}

function sample<T>(items: T[], seed: number) {
  return items[Math.abs(seed) % items.length]!;
}

function buildDiscoveryTelemetry(
  id: DiscoveryId | "",
  now: Date,
  sequence: number,
): DiscoveryTelemetry {
  const sampleTime = now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const minuteSeed = Math.floor(now.getTime() / 60_000) + sequence * 17;
  const hours =
    now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const hourAngle = (hours - 12) * 15;
  const solarLongitude =
    (((now.getTime() / 86_400_000) % 27.2753) / 27.2753) * 360;
  const empty = { report: "", sampleTime, basis: "", metrics: [] };
  const solarSpec = solarPlanetSpecs.find((item) => item.id === id);
  if (solarSpec) {
    const orbitPhase = ((now.getTime() / 86_400_000) % 1) * 360;
    return {
      report: `${solarSpec.name}表面遥测已锁定。${solarSpec.description}当前模型经度 ${orbitPhase.toFixed(1)}°，特征识别为“${solarSpec.feature}”。`,
      sampleTime,
      basis: "参考 NASA 行星物理参数与程序化表面纹理生成，数值用于星图交互展示",
      metrics: [
        { label: "日心距离", value: solarSpec.distance },
        { label: "公转周期", value: solarSpec.period },
        { label: "典型温度", value: solarSpec.temperature },
        { label: "表面特征", value: solarSpec.feature },
      ],
    };
  }
  if (id === "planet") {
    const latest = latestNode.value;
    const journeyCount = routeNodeIds.value.length;
    return {
      report: graph.nodes.length
        ? `风隅星表面已有 ${graph.nodes.length} 枚真实记忆持续发光。${latest ? `最近一次地表回声来自「${latest.title}」，` : ""}${journeyCount ? `${journeyCount} 个记忆坐标正被旅行航线连接。` : "第一条旅行航线仍在等待足够的地点与时间坐标。"}`
        : "这颗母星已经完成点火，正在等待第一篇文章、第一张照片或第一段旅途成为它的大陆。",
      sampleTime,
      basis:
        "直接读取风隅随笔的公开记忆图谱；这里的每一项变化，都来自真实发布的内容",
      metrics: [
        { label: "已点亮记忆", value: `${graph.nodes.length} 枚` },
        { label: "记忆年代", value: timeRange.value },
        { label: "旅行坐标", value: `${journeyCount} 个` },
        { label: "最近回声", value: latest?.title || "等待首次点亮" },
      ],
    };
  }
  if (id === "sun") {
    return {
      report: `${sample(solarReports, minuteSeed)} 当前本地时角 ${hourAngle >= 0 ? "+" : ""}${hourAngle.toFixed(1)}°，可见日面模型已旋转至 ${solarLongitude.toFixed(1)}°。`,
      sampleTime,
      basis: "基于标准太阳模型、27.2753 日会合自转周期与客户端本地时间生成",
      metrics: [
        {
          label: "本地太阳时角",
          value: `${hourAngle >= 0 ? "+" : ""}${hourAngle.toFixed(1)}°`,
        },
        { label: "模型日面经度", value: `${solarLongitude.toFixed(1)}°` },
        { label: "光行时间", value: "08m 20s" },
        {
          label: "辐照度模型",
          value: `${(1361 + Math.sin((hours / 24) * Math.PI * 2) * 1.1).toFixed(1)} W/m²`,
        },
      ],
    };
  }
  if (id === "black-hole") {
    return {
      report: sample(blackHoleReports, minuteSeed),
      sampleTime,
      basis: "参考克尔黑洞、广义相对论光线弯曲与 M87* 量级参数构建的视觉模型",
      metrics: [
        { label: "模型质量", value: "65 亿 M☉" },
        { label: "史瓦西半径", value: "约 128 AU" },
        { label: "阴影角直径", value: "约 40 μas" },
        { label: "吸积盘倾角", value: "17.2°" },
      ],
    };
  }
  if (id === "station") {
    const days = daysSince("2022-04-16T09:42:00+08:00", now);
    const evaDays = daysSince("2026-07-23T14:10:00+08:00", now);
    return {
      report: `风隅轨道站已连续运行 ${days} 天。本轨道圈生命支持、姿态控制与热控系统均在标称范围，上次出舱任务完成于 ${evaDays} 天前。`,
      sampleTime,
      basis: "任务档案为叙事模拟；轨道周期按 400 km 级近地圆轨道估算",
      metrics: [
        { label: "连续在轨", value: `${days} 天` },
        {
          label: "累计绕行",
          value: `${new Intl.NumberFormat("zh-CN").format(Math.floor(days * 15.65))} 圈`,
        },
        { label: "完成任务", value: `${126 + Math.floor(days / 9)} 项` },
        { label: "上次出舱", value: `${evaDays} 天前` },
      ],
    };
  }
  if (id === "satellite" || id === "satellite-aurora" || id === "satellite-relay") {
    const launch = id === "satellite-aurora"
      ? "2025-06-18T04:20:00+08:00"
      : id === "satellite-relay"
        ? "2026-01-08T22:14:00+08:00"
        : "2024-10-24T06:32:00+08:00";
    const days = daysSince(launch, now);
    const satelliteName = id === "satellite-aurora" ? "极光二号" : id === "satellite-relay" ? "三叉戟三号" : "听风一号";
    const satelliteType = id === "satellite-aurora" ? "极光成像" : id === "satellite-relay" ? "深空中继" : "光学通信";
    const altitude = id === "satellite-aurora" ? "824 km" : id === "satellite-relay" ? "1,240 km" : "612 km";
    return {
      report: `${satelliteName}正运行于${satelliteType}任务轨道，星敏感器已锁定。第 ${Math.floor(days * (id === "satellite-relay" ? 11.32 : 14.72))} 圈遥测帧完整，下一通信窗口约 ${7 + Math.abs(minuteSeed % 14)} 分钟后开启。`,
      sampleTime,
      basis: "按各卫星任务轨道、姿态控制与链路模型生成，数值用于星图交互展示",
      metrics: [
        { label: "卫星类型", value: satelliteType },
        { label: "在轨时间", value: `${days} 天` },
        { label: "轨道高度", value: altitude },
        {
          label: "链路时延",
          value: `${(4.1 + Math.sin(hours) * 0.6).toFixed(1)} ms`,
        },
      ],
    };
  }
  if (id === "spacecraft") {
    const days = daysSince("2026-03-21T20:26:00+08:00", now);
    return {
      report: `风隅号正在执行 FY-01 第 ${days} 航日巡航。三联离子驱动阵列同步率 ${(99.94 + Math.sin(hours) * 0.03).toFixed(2)}%，舰桥已将下一颗记忆星设为航向基准。`,
      sampleTime,
      basis:
        "深空舰为科幻工程设定，推进与曲率数据用于交互叙事，不代表现实可用技术",
      metrics: [
        { label: "任务航日", value: `D+${days}` },
        {
          label: "巡航速度",
          value: `${(38.6 + Math.sin(hours * 0.7) * 1.8).toFixed(1)} km/s`,
        },
        { label: "驱动阵列", value: "3 / 3 在线" },
        {
          label: "航向误差",
          value: `${Math.abs(Math.sin(hours * 1.3) * 0.06).toFixed(3)}°`,
        },
      ],
    };
  }
  if (id === "scoutcraft") {
    const days = daysSince("2026-07-09T11:08:00+08:00", now);
    return {
      report: `棱镜号正在执行 PRISM-07 第 ${days} 航日航道测绘。三组脉冲星校时解已收敛，驾驶舱航向投影持续修正下一段星际走廊。`,
      sampleTime,
      basis:
        "棱镜号为科幻叙事载具；导航、脉冲星与航道数据用于星图交互展示，不代表真实飞行数据",
      metrics: [
        { label: "任务航日", value: `D+${days}` },
        {
          label: "导航信标",
          value: `${3 + Math.abs(minuteSeed % 4)} 颗锁定`,
        },
        {
          label: "航道置信度",
          value: `${(98.7 + Math.sin(hours * 0.9) * 0.5).toFixed(1)}%`,
        },
        {
          label: "座舱视差",
          value: `${(0.014 + Math.abs(Math.sin(hours)) * 0.008).toFixed(3)}°`,
        },
      ],
    };
  }
  return empty;
}

function animateConstellationProgress(now: number) {
  const elapsed = constellationProgressUpdatedAt
    ? Math.min(64, now - constellationProgressUpdatedAt)
    : 16;
  constellationProgressUpdatedAt = now;
  const distance =
    constellationTargetProgress.value - constellationDisplayProgress.value;
  const easing = 1 - Math.exp(-elapsed / 320);

  if (distance > 0.04) {
    constellationDisplayProgress.value = Math.min(
      constellationTargetProgress.value,
      constellationDisplayProgress.value + Math.max(distance * easing, elapsed * 0.006),
    );
    constellationProgressFrame = requestAnimationFrame(
      animateConstellationProgress,
    );
    return;
  }

  constellationDisplayProgress.value = constellationTargetProgress.value;
  constellationProgressFrame = 0;
}

function advanceConstellationProgress(
  target: number,
  stage: string,
  detail: string,
) {
  constellationTargetProgress.value = Math.max(
    constellationTargetProgress.value,
    Math.min(100, target),
  );
  constellationLoadingStage.value = stage;
  constellationLoadingDetail.value = detail;
  if (!constellationProgressFrame) {
    constellationProgressUpdatedAt = 0;
    constellationProgressFrame = requestAnimationFrame(
      animateConstellationProgress,
    );
  }
}

function markConstellationTask(id: string, stage: string, detail: string) {
  if (constellationCompletionStarted) return;
  if (!constellationCompletedTasks.value.includes(id)) {
    constellationCompletedTasks.value = [...constellationCompletedTasks.value, id];
  }
  constellationLoadingStage.value = stage;
  constellationLoadingDetail.value = detail;
  const progress = Math.min(
    100,
    (constellationCompletedTasks.value.length / constellationTotalTasks) * 100,
  );
  advanceConstellationProgress(progress, stage, detail);
  if (
    constellationCompletedTasks.value.length >= constellationTotalTasks &&
    !constellationCompletionStarted
  ) {
    void completeConstellationLoading("星图资源已就绪", "正在准备入场动画");
  }
}

function handleConstellationIntroProgress(progress: number) {
  constellationIntroProgress.value = Math.max(
    constellationIntroProgress.value,
    Math.min(1, progress),
  );
  if (constellationCompletionStarted) return;
}

function constellationNextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function waitForConstellationProgress(target: number) {
  if (constellationDisplayProgress.value >= target)
    return Promise.resolve();
  return new Promise<void>((resolve) => {
    const stop = watch(constellationDisplayProgress, (progress) => {
      if (progress < target) return;
      stop();
      resolve();
    });
  });
}

async function completeConstellationLoading(stage: string, detail: string) {
  if (constellationCompletionStarted) return;
  constellationCompletionStarted = true;
  await constellationNextPaint();
  if (constellationDisposed) return;
  advanceConstellationProgress(100, stage, detail);
  await waitForConstellationProgress(99.9);
  if (constellationDisposed) return;
  await new Promise((resolve) => window.setTimeout(resolve, 460));
  if (constellationDisposed) return;
  constellationIntroStarted.value = true;
  constellationLoaderVisible.value = false;
}

function handleConstellationSceneReady() {
  sceneReady.value = true;
  markConstellationTask("scene", "星图首帧已绘制", "校准观测层与记忆节点");
}

function handleConstellationIntroReady() {
  sceneIntroReady.value = true;
}

function handleConstellationFallback() {
  window.clearTimeout(constellationSceneTimeout);
  fallbackMode.value = true;
  sceneReady.value = true;
  sceneIntroReady.value = true;
  markConstellationTask("scene", "兼容画面已绘制", "切换至稳定观测层");
  handleConstellationIntroProgress(1);
  void completeConstellationLoading("兼容星图已经就绪", "已切换到兼容观测画面");
}

watch(
  () => homePreload.value.ready,
  (ready) => {
    if (ready)
      markConstellationTask("home", "时间轨道已接入", "站点内容已完成预载");
  },
  { immediate: true },
);

onMounted(() => {
  constellationDisposed = false;
  advanceConstellationProgress(0, "准备星图界面", "等待真实观测资源响应");
  constellationSceneTimeout = window.setTimeout(() => {
    if (!constellationLoaderVisible.value || sceneReady.value) return;
    if (!graphReady.value || !homePreload.value.ready || !sceneSettingsReady.value)
      return;
    if (!sceneReady.value) fallbackMode.value = true;
    sceneReady.value = true;
    sceneIntroReady.value = true;
    markConstellationTask("scene", "兼容画面已绘制", "切换至稳定观测层");
    handleConstellationIntroProgress(1);
    void completeConstellationLoading("星图已经就绪", "正在使用兼容观测画面");
  }, 10_000);
  void loadGraph();
  void loadSceneSettings();
  void preloadHomeContent();
  telemetryTimer = setInterval(() => {
    telemetryNow.value = new Date();
  }, 30_000);
});
onBeforeUnmount(() => {
  constellationDisposed = true;
  cancelAnimationFrame(constellationProgressFrame);
  window.clearTimeout(constellationSceneTimeout);
  if (telemetryTimer) clearInterval(telemetryTimer);
});

async function loadGraph() {
  const sequence = ++requestSequence;
  error.value = "";
  try {
    const result = await api.get<any>("/memories/graph", {
      view: "constellation",
      limit: 320,
    });
    if (sequence !== requestSequence) return;
    graph.nodes = Array.isArray(result?.nodes) ? result.nodes : [];
    graph.relations = Array.isArray(result?.relations) ? result.relations : [];
    graph.graphVersion = String(result?.graphVersion || "");
    graphReady.value = true;
    markConstellationTask("graph", "时光坐标已载入", "已收到记忆节点与关联轨道");
    fallbackMode.value = false;
    const focus = String(route.query.focus || "");
    const focusedNode = graph.nodes.find((item) => item.id === focus);
    if (focusedNode) await selectNode(focusedNode, false);
  } catch (exception: any) {
    if (sequence === requestSequence) {
      error.value = exception?.message || "真实记忆暂时无法连接";
      graphReady.value = true;
      markConstellationTask("graph", "时光坐标已响应", "将以当前可用数据继续观测");
    }
  }
}

async function selectNode(node: GraphNode, syncUrl = true) {
  knowledgeRequestSequence += 1;
  const sequence = ++neighborRequestSequence;
  activeDiscoveryId.value = "";
  discoveryResult.value = "";
  activeCommandId.value = "";
  selected.value = node;
  neighbors.value = [];
  neighborsLoading.value = true;
  selectMemory({ id: node.id, type: node.type, href: node.href });
  if (syncUrl) void router.replace({ query: { focus: node.id } });
  try {
    const result = await api.get<any>(
      `/memories/graph/neighbors/${encodeURIComponent(node.id)}`,
    );
    if (sequence === neighborRequestSequence && selected.value?.id === node.id)
      neighbors.value = result.relations || [];
  } catch {
    if (sequence === neighborRequestSequence && selected.value?.id === node.id)
      neighbors.value = [];
  } finally {
    if (sequence === neighborRequestSequence) neighborsLoading.value = false;
  }
}

function handleSceneSelect(node: GraphNode) {
  returnDiscoveryId.value = "";
  void selectNode(node);
}

function handleDiscovery(id: DiscoveryId) {
  knowledgeRequestSequence += 1;
  neighborRequestSequence += 1;
  returnDiscoveryId.value = "";
  selected.value = null;
  neighbors.value = [];
  neighborsLoading.value = false;
  clearMemory();
  activeDiscoveryId.value = id;
  discoveryClosing.value = false;
  immersiveMode.value = false;
  discoveryResult.value = "";
  activeCommandId.value = "";
  activeKnowledge.value = null;
  discoverySequence.value += 1;
  void router.replace({ query: {} });
}

function clearDiscovery() {
  if (!activeDiscoveryId.value || discoveryClosing.value) return;
  knowledgeRequestSequence += 1;
  discoveryClosing.value = true;
  activeCommandId.value = "";
  activeKnowledge.value = null;
  if (sceneRef.value) sceneRef.value.resetView();
  else handleFocusCleared();
}

function handleFocusCleared() {
  knowledgeRequestSequence += 1;
  returnDiscoveryId.value = "";
  activeDiscoveryId.value = "";
  discoveryResult.value = "";
  activeCommandId.value = "";
  activeKnowledge.value = null;
  discoveryClosing.value = false;
  immersiveMode.value = false;
}

async function fetchKnowledge() {
  const discovery = activeDiscovery.value;
  if (!discovery?.id || knowledgeLoading.value) return;
  const sequence = ++knowledgeRequestSequence;
  knowledgeLoading.value = true;
  try {
    visitorId();
    const result = await api.post<any>("/visitor/constellation/knowledge", {
      planetId: discovery.id,
    });
    if (sequence === knowledgeRequestSequence && activeDiscoveryId.value === discovery.id && result?.ok && result.knowledge) {
      activeKnowledge.value = {
        knowledge: String(result.knowledge),
        index: Math.max(0, Number(result.index) || 0),
        total: Math.max(1, Number(result.total) || 1),
        reused: Boolean(result.reused),
        revision: sequence,
      };
    }
  } catch {
    // 科普接口不可用时保留当前遥测面板。
  } finally {
    if (sequence === knowledgeRequestSequence) knowledgeLoading.value = false;
  }
}

async function runDiscoveryCommand(commandId: DiscoveryCommandId) {
  const discovery = activeDiscovery.value;
  if (!discovery) return;
  activeCommandId.value = commandId;
  discoverySequence.value += 1;
  telemetryNow.value = new Date();
  if (commandId === "pulse") {
    discoveryResult.value = `星核脉冲已穿过 ${graph.nodes.length} 枚记忆坐标，云层正在回应最近一次书写。`;
    sceneRef.value?.triggerDiscoveryEffect("planet");
  } else if (commandId === "frost") {
    discoveryResult.value = "表面温度骤降模拟已启动：外框结霜层正在形成，极夜区冰影信号已被标记。";
    sceneRef.value?.triggerDiscoveryEffect("mercury");
  } else if (commandId === "soil") {
    discoveryResult.value = `${discovery.title}土质采样完成：铁硅比例与遥感光谱吻合，样本已封存进近地实验舱。`;
    sceneRef.value?.triggerDiscoveryEffect(discovery.id);
  } else if (commandId === "cloud") {
    discoveryResult.value = "云层剖面已展开：硫酸气溶胶高度与二氧化碳热循环保持稳定，逆向自转风场已锁定。";
    sceneRef.value?.triggerDiscoveryEffect("venus");
  } else if (commandId === "dust") {
    discoveryResult.value = "全球尘暴追踪已接入：赤道喷流正在向南半球扩散，极冠边缘反射率下降 3.8%。";
    sceneRef.value?.triggerDiscoveryEffect("mars");
  } else if (commandId === "storm") {
    discoveryResult.value = discovery.id === "jupiter"
      ? "大红斑追踪完成：风暴边界仍以逆时针旋转，边缘剪切层出现新的浅色涡旋。"
      : "超音速风场采样完成：暗斑边缘的剪切波正在向高纬度传播。";
    sceneRef.value?.triggerDiscoveryEffect(discovery.id);
  } else if (commandId === "rings") {
    discoveryResult.value = "星环谱线已拆分：卡西尼缝、A 环和 B 环的冰尘粒径分布已写入观测日志。";
    sceneRef.value?.triggerDiscoveryEffect("saturn");
  } else if (commandId === "tilt") {
    discoveryResult.value = "姿态解算完成：自转轴倾角 97.8°，季节阴影已投影到北半球环带。";
    sceneRef.value?.triggerDiscoveryEffect("uranus");
  } else if (commandId === "darkspot") {
    discoveryResult.value = "暗斑锁定：高层甲烷云正在绕过风暴核心，预计 18 小时后重新显影。";
    sceneRef.value?.triggerDiscoveryEffect("neptune");
  } else if (commandId === "sample") {
    discoveryResult.value = solarPlanetSpecs.some((item) => item.id === discovery.id)
      ? `${discovery.title}光谱采样完成：表面反射峰与${solarPlanetSpecs.find((item) => item.id === discovery.id)?.feature || "行星特征"}吻合。`
      : `光谱采样完成：第 ${String(discoverySequence.value).padStart(3, "0")} 组数据已写入日冕档案，氢线与铁离子峰值保持稳定。`;
    sceneRef.value?.triggerDiscoveryEffect(solarPlanetSpecs.some((item) => item.id === discovery.id) ? discovery.id : "sun");
  } else if (commandId === "scan") {
    const solar = solarPlanetSpecs.find((item) => item.id === discovery.id);
    discoveryResult.value = solar
      ? `${solar.name}表面扫描完成：${solar.feature}信号清晰，未发现异常遮挡。`
      : "光子环扫描完成：近侧亮弧存在 17.2° 偏振偏移，远侧回波在 0.84 秒后抵达。";
    const scanTarget = solar?.id || (activeDiscoveryId.value === "satellite-aurora" || activeDiscoveryId.value === "satellite-relay" ? activeDiscoveryId.value : "black-hole");
    sceneRef.value?.triggerDiscoveryEffect(scanTarget);
  } else if (commandId === "latest") {
    const latest = latestNode.value;
    if (latest) {
      returnDiscoveryId.value = discovery.id;
      void selectNode(latest);
    } else
      discoveryResult.value =
        "母星还没有可定位的公开记忆，发布第一段内容后它会在这里点亮。";
  } else if (commandId === "tour") {
    discoveryResult.value =
      "环站巡航已接管视角：正沿桁架、实验舱与太阳翼外缘飞行。";
    sceneRef.value?.startDiscoveryTour("station");
  } else if (commandId === "bridge") {
    const cockpit = discovery.id === "scoutcraft";
    discoveryResult.value = cockpit
      ? "驾驶舱漫游已接管视角：棱镜导航窗正将星光与脉冲星信号叠合为前方航道。"
      : "第三人称追航已启动：镜头保持在舰尾上方，平滑跟随风隅号姿态与完整航线。";
    sceneRef.value?.startDiscoveryTour(cockpit ? "scoutcraft" : "spacecraft");
  } else if (commandId === "log") {
    discoveryResult.value = sample(stationLogs, discoverySequence.value);
    sceneRef.value?.triggerDiscoveryEffect("station");
  } else if (commandId === "signal") {
    discoveryResult.value = `窄带信标 FY-${String(discoverySequence.value).padStart(4, "0")} 已发射，载频 1420.405 MHz，等待同频回执。`;
    const satelliteId = activeDiscoveryId.value === "satellite-aurora" || activeDiscoveryId.value === "satellite-relay"
      ? activeDiscoveryId.value
      : "satellite";
    sceneRef.value?.triggerDiscoveryEffect(satelliteId);
  } else if (commandId === "orbit") {
    const solar = solarPlanetSpecs.find((item) => item.id === discovery.id);
    discoveryResult.value = solar
      ? `${solar.name}聚焦视角已锁定，正在展示${solar.feature}的程序化材质与表面纹理。`
      : "轨道解算完成：听风一号已重新锁定晨昏面，姿态误差回落至 0.02°。";
    sceneRef.value?.focusDiscovery(solar?.id || "satellite");
    sceneRef.value?.triggerDiscoveryEffect(solar?.id || "satellite");
  } else if (commandId === "warp") {
    const cockpit = discovery.id === "scoutcraft";
    discoveryResult.value = cockpit
      ? "星际漫游已启动：棱镜号正在沿导航走廊穿越星图，驾驶舱将持续指向前方脉冲星。"
      : "曲率航路已展开：风隅号正在穿越星图，尾随镜头将持续追踪跃迁航迹。";
    const craftId = cockpit ? "scoutcraft" : "spacecraft";
    if (!immersiveMode.value) sceneRef.value?.startDiscoveryTour(craftId);
    sceneRef.value?.triggerDiscoveryEffect(craftId);
  } else {
    discoveryResult.value = "";
    sceneRef.value?.triggerDiscoveryEffect(discovery.id);
  }
}

function resetScene() {
  returnDiscoveryId.value = "";
  if (activeDiscoveryId.value) {
    clearDiscovery();
    return;
  }
  if (selected.value) {
    selected.value = null;
    neighbors.value = [];
    clearMemory();
    void router.replace({ query: {} });
  }
  activeDiscoveryId.value = "";
  discoveryClosing.value = false;
  immersiveMode.value = false;
  discoveryResult.value = "";
  activeCommandId.value = "";
  sceneRef.value?.resetView();
}

async function clearSelected() {
  knowledgeRequestSequence += 1;
  neighborRequestSequence += 1;
  const returnTo = returnDiscoveryId.value;
  selected.value = null;
  neighbors.value = [];
  neighborsLoading.value = false;
  clearMemory();
  void router.replace({ query: {} });
  if (returnTo) {
    activeDiscoveryId.value = returnTo;
    discoveryClosing.value = false;
    discoveryResult.value = "";
    activeCommandId.value = "";
    await nextTick();
    sceneRef.value?.resumeDiscoveryFocus(returnTo);
    returnDiscoveryId.value = "";
  } else if (activeDiscoveryId.value) {
    clearDiscovery();
  }
}

function selectNeighbor(relation: GraphRelation) {
  const node = otherNode(relation);
  const fullNode = graph.nodes.find((item) => item.id === node.id) || node;
  void selectNode(fullNode);
}

function otherNode(relation: GraphRelation): GraphNode {
  return (
    (relation.sourceId === selected.value?.id
      ? relation.target
      : relation.source) || { id: "", type: "post", title: "未命名记忆" }
  );
}

function nodeIcon(type: string) {
  return (
    typeOptions.find((item) => item.value === type)?.icon || "ph:star-four-bold"
  );
}

function typeText(type: string) {
  return typeOptions.find((item) => item.value === type)?.label || type;
}

function formatDate(value?: string | null) {
  return value
    ? new Date(value).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "short",
      })
    : "未标时间";
}

function relationText(type: string) {
  return (
    (
      {
        same_place: "同一地点",
        same_album: "同一相册",
        same_tag: "共同标签",
        time_adjacent: "时间相邻",
        reference: "内容引用",
        same_journey: "同一旅行",
        journey_sequence: "旅行轨迹",
        contains: "包含内容",
        story_sequence: "故事顺序",
        same_theme: "同一主题",
        custom: "自定义",
      } as Record<string, string>
    )[type] || type
  );
}

function evidenceText(value?: Record<string, unknown>) {
  if (!value) return "";
  return String(
    value.reason ||
      value.albumTitle ||
      value.stop ||
      (value.days !== undefined ? `相隔 ${value.days} 天` : ""),
  );
}

async function loadSceneSettings() {
  try {
    const result = await api.get<any>("/settings/constellation_config");
    if (result && typeof result === "object") {
      Object.assign(sceneSettings, result);
      const configured = Array.isArray(result.solarPlanets) ? result.solarPlanets : [];
      for (const fallback of DEFAULT_SOLAR_PLANETS) {
        const item = configured.find((candidate: any) => candidate?.id === fallback.id);
        const target = solarPlanetSpecs.find(candidate => candidate.id === fallback.id);
        if (target) {
          const configuredItem = item || {};
          Object.assign(target, fallback, configuredItem, {
            name: String(configuredItem.name || fallback.name),
            catalog: String(configuredItem.catalog || fallback.catalog),
            status: String(configuredItem.status || fallback.status),
            description: String(configuredItem.description || fallback.description),
            distance: String(configuredItem.distance || fallback.distance),
            period: String(configuredItem.period || fallback.period),
            temperature: String(configuredItem.temperature || fallback.temperature),
            feature: String(configuredItem.feature || fallback.feature),
          });
          target.knowledge = mergedKnowledge(target.knowledge, SOLAR_KNOWLEDGE[target.id] || [`${target.name}的核心观测特征是${target.feature}。`, target.description]);
        }
      }
      sceneSettings.solarPlanets = solarPlanetSpecs.map(item => ({ ...item }));
      for (const discovery of discoveries) {
        const spec = solarPlanetSpecs.find(item => item.id === discovery.id);
        if (spec) Object.assign(discovery, {
          title: spec.name,
          status: spec.status,
          description: spec.description,
          catalog: spec.catalog,
          knowledge: spec.knowledge,
          commands: spec.commands,
        });
      }
      const configuredSpecialBodies = Array.isArray(result.specialBodies) ? result.specialBodies : [];
      for (const discovery of discoveries) {
        const configured = configuredSpecialBodies.find((item: any) => String(item?.id || '') === discovery.id);
        const fallback = SPECIAL_KNOWLEDGE[discovery.id] || discovery.knowledge || [];
        if (!configured && !fallback.length) continue;
        if (configured) {
          Object.assign(discovery, {
            title: configured.title || discovery.title,
            status: configured.status || discovery.status,
            description: configured.description || discovery.description,
            knowledge: mergedKnowledge(configured.knowledge, fallback),
          });
        } else {
          discovery.knowledge = [...fallback];
        }
      }
    }
  } catch {
    // Public settings are optional; retain defaults when unavailable.
  } finally {
    sceneSettingsReady.value = true;
    markConstellationTask("settings", "星体参数已校准", "观测配置已准备完成");
  }
}

useHead({ title: "时光星图" });
</script>

<style scoped>
.constellation-page {
  --space-accent: hsl(var(--hue-theme) 100% 68%);
  --space-text: #f4f7fb;
  --space-text-2: #bec7d1;
  --space-text-3: #8996a4;
  --space-muted: rgb(221 235 255 / 64%);
  --space-line: rgb(174 205 255 / 16%);
  --space-border: rgb(255 255 255 / 14%);
  --space-surface: rgb(7 14 27 / 88%);
  position: fixed;
  z-index: 40;
  inset: 0;
  overflow: hidden;
  background: #030712;
  color: var(--space-text);
}
.constellation-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.constellation-stage :deep(.constellation-scene) {
  position: absolute;
  inset: 0;
}
.constellation-stage :deep(.graph-preview) {
  height: 100%;
  min-height: 100%;
  border: 0;
  background: #030712;
}
.constellation-stage :deep(svg) {
  width: 100%;
  height: 100%;
  min-height: 100%;
}
.constellation-entry-loading {
  position: absolute;
  z-index: 20;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  background: #030712;
  color: var(--space-muted);
  overflow: hidden;
}
.constellation-entry-loading::before,
.constellation-entry-loading::after {
  position: absolute;
  width: min(72vw, 520px);
  height: min(72vw, 520px);
  border: 1px solid color-mix(in srgb, var(--c-primary) 14%, transparent);
  border-radius: 50%;
  content: "";
  pointer-events: none;
}
.constellation-entry-loading::before {
  transform: rotate(-18deg) scaleY(.34);
  box-shadow: 0 0 0 36px color-mix(in srgb, var(--c-primary) 5%, transparent), 0 0 0 72px color-mix(in srgb, var(--c-primary) 3%, transparent);
}
.constellation-entry-loading::after {
  width: min(38vw, 260px);
  height: min(38vw, 260px);
  border-color: color-mix(in srgb, var(--c-primary) 16%, transparent);
  transform: rotate(28deg) scaleY(.34);
}
.loading-window {
  position: relative;
  z-index: 1;
  width: min(430px, calc(100vw - 36px));
  padding: 23px 23px 19px;
  border: 1px solid color-mix(in srgb, var(--space-accent) 26%, transparent);
  border-radius: 14px;
  background: linear-gradient(145deg, rgb(7 18 42 / 95%), rgb(2 7 20 / 96%));
  box-shadow:
    0 28px 90px rgb(0 0 0 / 52%),
    0 0 0 1px rgb(255 255 255 / 4%) inset,
    0 0 70px color-mix(in srgb, var(--space-accent) 12%, transparent);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.loading-window header,
.loading-brand,
.loading-window footer,
.loading-window footer > span {
  display: flex;
  align-items: center;
}
.loading-window header {
  justify-content: space-between;
}
.loading-brand {
  gap: 12px;
}
.loading-brand img {
  width: 36px;
  height: 36px;
  padding: 6px;
  border: 1px solid color-mix(in srgb, var(--space-accent) 46%, transparent);
  border-radius: 50%;
  background: radial-gradient(circle, rgb(104 203 255 / 20%), transparent 68%);
  object-fit: contain;
}
.loading-brand > span {
  display: grid;
  gap: 2px;
}
.loading-brand strong {
  color: var(--space-text);
  font: 700 0.65rem var(--font-brand);
  letter-spacing: 0.14em;
}
.loading-brand small,
.loading-window footer small {
  color: rgb(221 235 255 / 42%);
  font: 0.39rem var(--font-mono);
}
.loading-window header > b {
  min-width: 46px;
  color: var(--space-text);
  font: 500 1.05rem var(--font-mono);
  text-align: right;
}
.loading-window header > b small {
  margin-left: 2px;
  color: var(--space-accent);
  font-size: 0.46rem;
}
.loading-track {
  position: relative;
  height: 8px;
  margin: 25px 0 17px;
  border: 1px solid rgb(174 205 255 / 14%);
  border-radius: 99px;
  background: repeating-linear-gradient(90deg, rgb(174 205 255 / 10%) 0 1px, transparent 1px 22px), rgb(174 205 255 / 6%);
  box-shadow: 0 1px 0 rgb(255 255 255 / 5%) inset;
  isolation: isolate;
}
.loading-track__ticks { position: absolute; z-index: 0; inset: -5px 0; display: flex; justify-content: space-between; pointer-events: none; }
.loading-track__ticks i { width: 1px; height: 3px; background: rgb(174 205 255 / 30%); }
.loading-track > i {
  position: absolute;
  z-index: 1;
  inset: 1px;
  border-radius: inherit;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c-primary) 74%, #244b8f), color-mix(in srgb, var(--c-primary) 28%, #fff) 48%, var(--c-primary));
  box-shadow: 0 0 18px color-mix(in srgb, var(--c-primary) 58%, transparent);
  transform: scaleX(0);
  transform-origin: left center;
  will-change: transform;
}
.loading-track > b {
  position: absolute;
  z-index: 2;
  top: 50%;
  width: 12px;
  height: 12px;
  border: 2px solid color-mix(in srgb, var(--c-primary) 30%, #fff);
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 0 4px var(--c-primary-soft), 0 0 18px color-mix(in srgb, var(--c-primary) 70%, transparent);
  transform: translate(-50%, -50%);
  will-change: left;
}
.loading-window footer {
  justify-content: space-between;
  gap: 16px;
}
.loading-window footer > span {
  min-width: 0;
  gap: 7px;
  color: var(--space-muted);
  font-size: 0.57rem;
  white-space: nowrap;
}
.loading-window footer > span i {
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--space-accent);
  box-shadow: 0 0 0 3px var(--c-primary-soft);
  animation: constellation-loading-pulse 1.5s ease-in-out infinite;
}
.loading-window footer > small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.loading-window footer > small em { display: inline-block; width: 4px; height: 4px; margin-right: 6px; border-radius: 50%; background: var(--space-accent); opacity: .7; }
.constellation-entry-leave-active {
  transition:
    opacity 0.86s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.86s cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0.86s;
}
.constellation-entry-leave-to {
  opacity: 0;
  filter: blur(10px);
  visibility: hidden;
}
@keyframes constellation-loading-pulse {
  50% {
    opacity: 0.48;
    transform: scale(0.72);
  }
}
.constellation-nav {
  position: absolute;
  z-index: 10;
  top: 20px;
  right: 22px;
  left: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}
.constellation-nav,
.constellation-intro,
.constellation-foot {
  transition:
    opacity 0.45s ease,
    transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
}
.constellation-page.immersive .constellation-nav,
.constellation-page.immersive .constellation-intro,
.constellation-page.immersive .constellation-foot {
  opacity: 0;
  pointer-events: none;
}
.constellation-page.immersive .constellation-nav {
  transform: translateY(-18px);
}
.constellation-page.immersive .constellation-intro,
.constellation-page.immersive .constellation-foot {
  transform: translateY(18px);
}
.brand,
.nav-actions {
  pointer-events: auto;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--space-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.brand img {
  width: 42px;
  height: 42px;
  border: 1px solid rgb(116 207 255 / 0.18);
  border-radius: 8px;
  box-shadow: 0 0 26px rgb(73 157 232 / 0.24);
}
.brand span {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.brand strong {
  font-size: 0.82rem;
  letter-spacing: 0;
}
.brand small {
  color: var(--space-accent);
  font-size: 0.48rem;
  letter-spacing: 0.13em;
}
.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--space-text-3);
  font-size: 0.57rem;
}
.nav-actions button {
  display: grid;
  width: 30px;
  height: 30px;
  border: 1px solid var(--space-border);
  border-radius: 7px;
  background: rgb(4 10 22 / 56%);
  color: var(--space-text-2);
  place-items: center;
  transition:
    background 0.25s ease,
    transform 0.25s ease;
}
.nav-actions button:hover {
  background: rgb(35 91 141 / 0.4);
  transform: translateY(-2px);
}
.constellation-intro {
  position: absolute;
  z-index: 8;
  bottom: 74px;
  left: clamp(22px, 6vw, 92px);
  width: min(540px, calc(100vw - 44px));
  pointer-events: none;
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity 1s ease 0.9s,
    transform 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.9s;
}
.ready .constellation-intro {
  opacity: 1;
  transform: none;
}
.intro-kicker {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--space-accent);
  font-size: 0.54rem;
  letter-spacing: 0.11em;
}
.intro-kicker i {
  width: 42px;
  height: 1px;
  background: var(--space-accent);
}
.intro-kicker em {
  color: var(--space-text-3);
  font-style: normal;
  letter-spacing: 0.04em;
}
.constellation-intro h1 {
  margin: 12px 0 8px;
  color: var(--space-text);
  font-size: clamp(2.6rem, 6vw, 5.4rem);
  line-height: 0.95;
  letter-spacing: 0;
  text-shadow: 0 0 42px rgb(71 151 221 / 0.2);
}
.constellation-intro p {
  margin: 0;
  color: var(--space-text-3);
  font-size: 0.74rem;
  line-height: 1.7;
}
.constellation-foot {
  position: absolute;
  z-index: 8;
  right: 22px;
  bottom: 20px;
  left: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--space-text-3);
  font-size: 0.55rem;
  pointer-events: none;
}
.constellation-foot > span {
  display: flex;
  align-items: center;
  gap: 7px;
}
.constellation-foot > span i {
  width: 22px;
  height: 1px;
  background: var(--space-accent);
}
.constellation-foot > span b {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  color: var(--space-text-3);
  font-size: 0.49rem;
  font-weight: 400;
  letter-spacing: 0.04em;
}
.constellation-foot > span b em {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--space-accent);
  box-shadow: 0 0 10px var(--space-accent);
}
.constellation-foot div {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #5f8fb6;
  font-size: 0.78rem;
}
.memory-popup {
  --c-primary: var(--space-accent);
  --c-primary-soft: color-mix(in srgb, var(--space-accent) 14%, transparent);
  --c-text: var(--space-text);
  --c-text-2: var(--space-text-2);
  --c-text-3: var(--space-text-3);
  --c-bg-1: rgb(255 255 255 / 6%);
  --border: var(--space-border);
  --ld-bg-card: var(--space-surface);
  position: fixed;
  z-index: 20;
  top: 50%;
  right: clamp(20px, 4.5vw, 72px);
  width: min(342px, calc(100vw - 40px));
  height: min(580px, calc(100dvh - 112px));
  max-height: calc(100dvh - 112px);
  box-sizing: border-box;
  contain: layout paint;
  overflow-anchor: none;
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 25px 25px 23px 30px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 28%, var(--border));
  border-radius: 8px;
  background: var(--space-surface);
  box-shadow:
    0 24px 70px rgb(0 0 0 / 0.42),
    inset 0 1px rgb(191 226 255 / 0.08);
  backdrop-filter: blur(20px) saturate(1.08);
  transform: translateY(-50%);
}
.popup-rail {
  position: absolute;
  top: 27px;
  bottom: 24px;
  left: 12px;
  display: flex;
  width: 2px;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}
.popup-rail::before {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(
    transparent,
    color-mix(in srgb, var(--c-primary) 46%, transparent),
    transparent
  );
  content: "";
}
.popup-rail span,
.popup-rail i {
  position: relative;
  width: 6px;
  height: 6px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 72%, var(--border));
  border-radius: 50%;
  background: var(--c-primary-soft);
  box-shadow: 0 0 12px color-mix(in srgb, var(--c-primary) 64%, transparent);
}
.popup-rail i {
  border-color: color-mix(in srgb, var(--c-primary) 48%, var(--border));
  background: var(--c-bg-1);
  box-shadow: 0 0 12px color-mix(in srgb, var(--c-primary) 44%, transparent);
}
.popup-glow {
  display: none;
}
.popup-close {
  position: absolute;
  z-index: 2;
  top: 14px;
  right: 14px;
  display: grid;
  width: 28px;
  height: 28px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 24%, var(--border));
  border-radius: 6px;
  background: var(--c-bg-1);
  color: var(--c-text-2);
  cursor: pointer;
  place-items: center;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.25s ease;
}
.popup-close:hover {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
  transform: rotate(8deg);
}
.popup-identity {
  display: flex;
  min-height: 32px;
  align-items: center;
  gap: 9px;
  padding-right: 32px;
  color: var(--c-primary);
}
.popup-identity > span {
  display: grid;
  width: 32px;
  height: 32px;
  flex: none;
  border: 1px solid color-mix(in srgb, var(--c-primary) 34%, var(--border));
  border-radius: 7px;
  background: var(--c-primary-soft);
  box-shadow:
    inset 0 0 16px color-mix(in srgb, var(--c-primary) 10%, transparent),
    0 0 24px color-mix(in srgb, var(--c-primary) 10%, transparent);
  place-items: center;
}
.popup-identity small {
  color: var(--c-text-3);
  font-size: 0.57rem;
  letter-spacing: 0.04em;
}
.popup-image {
  width: 100%;
  margin-top: 17px;
  aspect-ratio: 1.85;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--c-primary) 18%, var(--border));
  border-radius: 6px;
  background: var(--c-bg-1);
}
.popup-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.memory-popup h2 {
  margin: 18px 0 8px;
  padding-right: 8px;
  color: var(--c-text);
  font-size: 1.2rem;
  line-height: 1.35;
  letter-spacing: 0;
  text-wrap: balance;
}
.memory-popup > p {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.7rem;
  line-height: 1.8;
}
.memory-popup > a {
  display: flex;
  height: 38px;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 30%, var(--border));
  border-radius: 6px;
  background: color-mix(in srgb, var(--c-primary) 8%, transparent);
  color: var(--c-primary);
  font-size: 0.64rem;
  text-decoration: none;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}
.memory-popup > a:hover {
  border-color: color-mix(in srgb, var(--c-primary) 62%, var(--border));
  background: color-mix(in srgb, var(--c-primary) 16%, transparent);
  transform: translateX(2px);
}
.memory-popup section {
  min-height: 170px;
  margin-top: 19px;
  padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
}
.relations-empty {
  display: grid;
  min-height: 132px;
  margin: 0;
  color: var(--c-text-3);
  font-size: 0.56rem;
  place-items: center;
}
.memory-popup h3 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 3px;
  color: var(--c-text);
  font-size: 0.65rem;
}
.memory-popup h3 small {
  color: var(--c-text-3);
  font-size: 0.5rem;
  font-weight: 400;
}
.memory-popup section button {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 10px;
  padding: 9px 0;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
  background: none;
  color: var(--c-text);
  cursor: pointer;
  text-align: left;
}
.memory-popup section button > span {
  grid-column: 1;
  color: var(--c-primary);
  font-size: 0.5rem;
}
.memory-popup section button > b {
  grid-column: 1;
  overflow: hidden;
  font-size: 0.63rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.memory-popup section button > small {
  grid-column: 2;
  grid-row: 1/3;
  align-self: center;
  color: var(--c-text-3);
  font-size: 0.48rem;
}
.discovery-popup {
  --discovery-accent: var(--c-primary);
  --c-primary: var(--space-accent);
  --c-primary-soft: color-mix(in srgb, var(--space-accent) 14%, transparent);
  --c-text: var(--space-text);
  --c-text-2: var(--space-text-2);
  --c-text-3: var(--space-text-3);
  --c-bg-1: rgb(255 255 255 / 6%);
  --border: var(--space-border);
  --ld-bg-card: var(--space-surface);
  position: fixed;
  z-index: 20;
  top: 50%;
  right: clamp(20px, 4.5vw, 72px);
  width: min(412px, calc(100vw - 40px));
  height: auto;
  max-height: calc(100dvh - 118px);
  box-sizing: border-box;
  padding: 24px;
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: smooth;
  border: 1px solid color-mix(in srgb, var(--c-primary) 30%, var(--border));
  border-radius: 8px;
  background: var(--space-surface);
  box-shadow:
    0 28px 90px rgb(0 0 0 / 0.52),
    inset 0 1px color-mix(in srgb, var(--c-primary) 10%, transparent);
  backdrop-filter: blur(24px) saturate(1.12);
  transform: translateY(-50%);
  transition:
    width 0.65s cubic-bezier(0.16, 1, 0.3, 1),
    padding 0.65s cubic-bezier(0.16, 1, 0.3, 1),
    top 0.65s cubic-bezier(0.16, 1, 0.3, 1),
    right 0.65s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.65s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.3s ease;
}
.discovery-popup.is-closing {
  opacity: 0;
  pointer-events: none;
  transform: translate(42px, -50%) scale(0.94);
  transition:
    opacity 0.42s ease,
    transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}
.discovery-popup.is-immersive {
  top: 20px;
  right: 22px;
  width: min(300px, calc(100vw - 44px));
  height: 58px;
  max-height: none;
  padding: 12px 14px;
  overflow: hidden;
  transform: none;
}
.discovery-popup.is-immersive .discovery-identity {
  grid-template-columns: 32px minmax(0, 1fr);
  padding-right: 34px;
}
.discovery-popup.is-immersive .discovery-identity > span {
  width: 32px;
  height: 32px;
}
.discovery-popup.is-immersive .discovery-identity > em {
  display: none;
}
.discovery-content {
  min-height: 100%;
}
.discovery-content-enter-active,
.discovery-content-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.36s cubic-bezier(0.16, 1, 0.3, 1);
}
.discovery-content-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.discovery-content-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
.discovery-details {
  opacity: 1;
  transform: none;
  transition:
    opacity 0.22s ease 0.14s,
    transform 0.48s cubic-bezier(0.16, 1, 0.3, 1),
    visibility 0s linear;
}
.discovery-popup.is-immersive .discovery-details {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-9px);
  transition:
    opacity 0.16s ease,
    transform 0.32s ease,
    visibility 0s linear 0.32s;
}
.immersive-actions {
  display: flex;
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
  overflow: hidden;
  border-top: 1px solid transparent;
  opacity: 0;
  transform: translateY(-7px);
  transition:
    max-height 0.48s cubic-bezier(0.16, 1, 0.3, 1),
    margin-top 0.48s cubic-bezier(0.16, 1, 0.3, 1),
    padding-top 0.48s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.3s ease,
    opacity 0.24s ease,
    transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}
.discovery-popup.is-immersive.discovery-spacecraft,
.discovery-popup.is-immersive.discovery-scoutcraft {
  width: min(330px, calc(100vw - 44px));
  height: 114px;
}
.discovery-popup.is-immersive .immersive-actions {
  max-height: 51px;
  margin-top: 9px;
  padding-top: 9px;
  border-top-color: color-mix(
    in srgb,
    var(--discovery-accent) 18%,
    transparent
  );
  opacity: 1;
  transform: none;
}
.immersive-actions button {
  display: flex;
  width: 100%;
  height: 32px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid color-mix(in srgb, var(--discovery-accent) 34%, transparent);
  border-radius: 5px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--discovery-accent) 8%, transparent),
    color-mix(in srgb, var(--discovery-accent) 16%, transparent),
    color-mix(in srgb, var(--discovery-accent) 8%, transparent)
  );
  color: var(--c-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.55rem;
  letter-spacing: 0.04em;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.immersive-actions button:hover,
.immersive-actions button.active {
  border-color: color-mix(in srgb, var(--discovery-accent) 72%, transparent);
  box-shadow:
    0 0 22px color-mix(in srgb, var(--discovery-accent) 22%, transparent),
    inset 0 0 14px color-mix(in srgb, var(--discovery-accent) 10%, transparent);
  transform: translateY(-1px);
}
.immersive-actions small {
  color: color-mix(in srgb, var(--c-primary) 62%, var(--c-text-3));
  font-size: 0.42rem;
  letter-spacing: 0.12em;
}
.discovery-popup::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--discovery-accent),
    transparent
  );
  content: "";
  opacity: 0.7;
  pointer-events: none;
}
.discovery-black-hole {
  background: color-mix(in srgb, var(--ld-bg-card) 96%, var(--c-primary-soft));
  box-shadow:
    0 30px 100px rgb(0 0 0 / 0.7),
    inset 0 0 70px color-mix(in srgb, var(--c-primary) 8%, transparent);
}

.discovery-mercury {
  --discovery-accent: #b9e8ff;
  box-shadow: 0 26px 90px rgb(0 0 0 / 0.62), inset 0 0 34px rgb(183 232 255 / 0.1);
}
.discovery-mercury::after {
  position: absolute;
  inset: 7px;
  border: 1px solid rgb(194 236 255 / 0.16);
  border-radius: inherit;
  content: "";
  pointer-events: none;
}
.discovery-venus {
  --discovery-accent: #f0c27c;
}
.discovery-mars {
  --discovery-accent: #e88968;
}
.discovery-jupiter {
  --discovery-accent: #e8bd8e;
}
.discovery-saturn {
  --discovery-accent: #e4cf9d;
  box-shadow: 0 28px 92px rgb(0 0 0 / 0.62), inset 0 0 42px rgb(228 207 157 / 0.1);
}
.discovery-uranus {
  --discovery-accent: #9ee6e6;
}
.discovery-neptune {
  --discovery-accent: #82a9ff;
}
.discovery-identity {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding-right: 30px;
}
.discovery-identity > span {
  display: grid;
  width: 38px;
  height: 38px;
  border: 1px solid color-mix(in srgb, var(--discovery-accent) 38%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--discovery-accent) 10%, transparent);
  color: var(--discovery-accent);
  font-size: 1.05rem;
  place-items: center;
}
.discovery-identity > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}
.discovery-identity small {
  overflow: hidden;
  color: color-mix(in srgb, var(--c-primary) 78%, var(--c-text-3));
  font-size: 0.48rem;
  letter-spacing: 0.08em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.discovery-identity b {
  color: var(--c-text);
  font-size: 0.58rem;
  font-weight: 560;
}
.discovery-identity em {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--c-text-3);
  font-size: 0.47rem;
  font-style: normal;
  white-space: nowrap;
}
.discovery-identity em i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 9px color-mix(in srgb, var(--c-primary) 72%, transparent);
}
.discovery-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-top: 19px;
}
.discovery-title h2 {
  min-width: 0;
  margin: 0;
  color: var(--c-text);
  font-size: 1.48rem;
  line-height: 1.15;
  letter-spacing: 0;
}
.discovery-title > span {
  flex: none;
  color: var(--c-text-3);
  font-size: 0.5rem;
}
.discovery-details > p {
  margin: 10px 0 0;
  color: var(--c-text-2);
  font-size: 0.68rem;
  line-height: 1.8;
}
.discovery-knowledge {
  display: grid;
  max-height: 150px;
  gap: 5px;
  margin: 12px 0 0;
  padding: 0 0 0 18px;
  overflow-y: auto;
  color: var(--c-text-3);
  font-size: 0.59rem;
  line-height: 1.55;
}
.knowledge-slot { overflow: hidden; }
.telemetry-knowledge {
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  gap: 9px;
  margin-top: 16px;
  padding-top: 11px;
  border-top: 1px solid color-mix(in srgb, var(--discovery-accent) 24%, transparent);
}
.telemetry-knowledge header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.telemetry-knowledge header span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--c-text);
  font-size: 0.58rem;
  font-weight: 650;
}
.telemetry-knowledge header span :deep(svg) { color: var(--discovery-accent); }
.telemetry-knowledge header small {
  color: var(--c-text-3);
  font-size: 0.47rem;
}
.telemetry-knowledge p {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.66rem;
  line-height: 1.75;
}
.knowledge-reveal-enter-active,
.knowledge-reveal-leave-active { transition: opacity .38s ease, transform .42s cubic-bezier(.16, 1, .3, 1), filter .38s ease; }
.knowledge-reveal-enter-from,
.knowledge-reveal-leave-to { opacity: 0; filter: blur(3px); transform: translateY(8px); }
.knowledge-refresh {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  padding: 0 11px;
  border: 1px solid color-mix(in srgb, var(--discovery-accent) 36%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--discovery-accent) 9%, transparent);
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: .57rem;
  transition: background .22s ease, border-color .22s ease, color .22s ease, transform .22s ease;
}
.knowledge-refresh:hover:not(:disabled) { border-color: var(--discovery-accent); background: color-mix(in srgb, var(--discovery-accent) 16%, transparent); color: var(--c-text); transform: translateY(-1px); }
.knowledge-refresh:disabled { cursor: wait; opacity: .72; }
.knowledge-refresh .spinning { animation: loading-spin .8s linear infinite; }
.telemetry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 19px;
  border-top: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
}
.telemetry-grid > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  padding: 10px 9px 10px 0;
}
.telemetry-grid > div:nth-child(even) {
  padding-left: 12px;
  border-left: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
}
.telemetry-grid small {
  color: var(--c-text-3);
  font-size: 0.46rem;
}
.telemetry-grid strong {
  overflow: hidden;
  color: var(--c-text);
  font-size: 0.62rem;
  font-weight: 620;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.discovery-signal {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 18px;
  padding-left: 12px;
  border-left: 2px solid var(--discovery-accent);
}
.discovery-signal > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.discovery-signal small {
  color: color-mix(in srgb, var(--c-primary) 78%, var(--c-text-3));
  font-size: 0.49rem;
  letter-spacing: 0.06em;
}
.discovery-signal time {
  color: var(--c-text-3);
  font-size: 0.47rem;
  font-variant-numeric: tabular-nums;
}
.discovery-signal strong {
  color: var(--c-text);
  font-size: 0.62rem;
  font-weight: 560;
  line-height: 1.65;
}
.discovery-signal > span {
  color: var(--c-text-3);
  font-size: 0.46rem;
  line-height: 1.55;
}
.discovery-commands {
  display: flex;
  gap: 5px;
  margin-top: 18px;
}
.discovery-commands button {
  display: flex;
  min-width: 0;
  height: 39px;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 9px;
  border: 1px solid color-mix(in srgb, var(--discovery-accent) 30%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--discovery-accent) 8%, transparent);
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.58rem;
  transition:
    background 0.22s ease,
    border-color 0.22s ease,
    color 0.22s ease,
    transform 0.22s ease;
}
.discovery-commands button:hover,
.discovery-commands button.active {
  border-color: color-mix(in srgb, var(--discovery-accent) 62%, transparent);
  background: color-mix(in srgb, var(--discovery-accent) 16%, transparent);
  color: var(--c-text);
  transform: translateY(-1px);
}
.discovery-commands button:focus-visible {
  outline: 2px solid var(--discovery-accent);
  outline-offset: 3px;
}
.popup-enter-active,
.popup-leave-active {
  transition:
    transform 0.52s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.3s ease;
}
.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translate(26px, -48%);
}
.nav-actions button:focus-visible,
.popup-close:focus-visible {
  outline: 2px solid var(--c-primary);
  outline-offset: 3px;
}
@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes relation-pulse {
  to {
    opacity: 0.34;
  }
}
@media (max-width: 700px) {
  .constellation-nav {
    top: 14px;
    right: 14px;
    left: 14px;
  }
  .brand img {
    width: 38px;
    height: 38px;
  }
  .brand span {
    display: none;
  }
  .constellation-intro {
    bottom: 68px;
    left: 20px;
    width: calc(100vw - 40px);
  }
  .constellation-intro h1 {
    font-size: 2.8rem;
  }
  .constellation-intro p {
    max-width: 310px;
    font-size: 0.66rem;
  }
  .constellation-foot {
    right: 14px;
    bottom: 14px;
    left: 14px;
  }
  .constellation-foot > span b {
    display: none;
  }
  .memory-popup {
    top: auto;
    right: 14px;
    bottom: 58px;
    left: 14px;
    width: auto;
    height: min(58dvh, 480px);
    max-height: min(58dvh, 480px);
    padding: 18px 18px 18px 24px;
    border-radius: 8px;
    transform: none;
  }
  .discovery-popup {
    top: auto;
    right: 14px;
    bottom: 58px;
    left: 14px;
    width: auto;
    height: auto;
    max-height: min(67dvh, 560px);
    padding: 19px;
    transform: none;
  }
  .discovery-popup.is-closing {
    transform: translateY(24px) scale(0.96);
  }
  .discovery-popup.is-immersive {
    top: 14px;
    right: 14px;
    bottom: auto;
    left: 64px;
    width: auto;
    height: 54px;
    padding: 10px 12px;
  }
  .discovery-popup.is-immersive.discovery-spacecraft,
  .discovery-popup.is-immersive.discovery-scoutcraft {
    height: 110px;
  }
  .discovery-title {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
  .discovery-identity em {
    display: none;
  }
  .popup-rail {
    top: 21px;
    bottom: 19px;
    left: 9px;
  }
  .popup-enter-from,
  .popup-leave-to {
    opacity: 0;
    transform: translateY(24px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .constellation-intro,
  .popup-enter-active,
  .popup-leave-active,
  .discovery-popup,
  .discovery-content-enter-active,
  .discovery-content-leave-active,
  .discovery-details,
  .immersive-actions,
  .constellation-entry-leave-active {
    opacity: 1;
    transform: none;
  }
  .loading-window footer > span i {
    animation: none;
  }
}
</style>

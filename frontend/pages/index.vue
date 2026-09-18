<template>
  <main class="welcome-page" :class="{ ready: entryReady }">
    <div class="scene-layer" aria-hidden="true">
      <TimeConstellationScene
        v-if="graph.nodes.length"
        :nodes="graph.nodes"
        :relations="graph.relations"
        :graph-version="graph.graphVersion"
        :resolve-image="mediaUrl"
        ambient
        @ready="handleSceneReady"
        @fallback="handleSceneFallback"
      />
      <div
        class="scene-fallback"
        :class="{ visible: sceneFailed || !sceneReady }"
      >
        <i v-for="index in 52" :key="index" :style="fallbackStar(index)" />
      </div>
      <div class="scene-veil" />
    </div>

    <Transition name="entry-fade">
      <div
        v-if="loaderVisible"
        class="entry-loading"
        role="status"
        aria-live="polite"
        :aria-label="`${loadingStage}，${roundedProgress}%`"
      >
        <div class="loading-light">
          <span class="loading-orb" aria-hidden="true">
            <img src="/logo.png" alt="" width="30" height="30" />
            <i />
          </span>
          <div class="loading-line" aria-hidden="true">
            <i :style="{ transform: `scaleX(${displayProgress / 100})` }" />
          </div>
          <div class="loading-meta">
            <strong
              >{{ String(roundedProgress).padStart(2, "0")
              }}<small>%</small></strong
            >
            <span>{{ loadingStage }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <header class="welcome-nav">
      <a href="/" class="brand" aria-label="风隅随笔欢迎页">
        <img src="/logo.png" alt="" width="40" height="40" />
        <span
          ><strong>{{ siteTitle }}</strong
          ><small>WIND · CORNER</small></span
        >
      </a>
      <div class="nav-status">
        <i :class="{ online: sceneReady }" />
        <span>{{ sceneReady ? "MEMORY ONLINE" : "QUIET MODE" }}</span>
      </div>
    </header>

    <section class="welcome-hero" aria-labelledby="welcome-title">
      <div class="hero-copy">
        <span class="hero-kicker"
          >PERSONAL MEMORY ARCHIVE · {{ currentYear }}</span
        >
        <h1 id="welcome-title">{{ siteTitle }}</h1>
        <p class="hero-statement">把日子写进星海。</p>
        <p class="hero-description">{{ siteDescription }}</p>

        <div class="welcome-actions">
          <button
            type="button"
            class="primary-action"
            :disabled="navigating || !entryReady"
            @click="navigate('/home')"
          >
            <span><Icon name="ph:article-bold" /></span>
            <div><small>READ THE STORIES</small><strong>进入首页</strong></div>
            <Icon name="ph:arrow-up-right-bold" />
          </button>
          <button
            type="button"
            class="secondary-action"
            :disabled="navigating || !entryReady"
            @click="navigate('/time/constellation')"
          >
            <span><Icon name="ph:planet-bold" /></span>
            <div>
              <small>EXPLORE THE UNIVERSE</small><strong>漫游星图</strong>
            </div>
            <Icon name="ph:arrow-up-right-bold" />
          </button>
        </div>
      </div>

      <aside class="hero-index" aria-hidden="true">
        <span>01</span>
        <i />
        <div>
          <small>LISTEN TO THE WIND</small>
          <strong>听风于隅<br />漫写人间</strong>
        </div>
      </aside>
    </section>

    <footer class="welcome-footer">
      <span>© {{ currentYear }} {{ siteTitle }}</span>
      <div><i />愿每一次抵达，都刚好遇见一阵风。</div>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";

type GraphNode = {
  id: string;
  type: string;
  title: string;
  occurredAt?: string | null;
  coordinateSeed?: number;
  metadata?: Record<string, unknown>;
  image?: string | null;
};

const api = useApi();
const TimeConstellationScene = defineAsyncComponent(
  () => import("@/components/TimeConstellationScene.vue"),
);
const { mediaUrl } = useMediaUrl();
const { siteTitle, siteDescription, loadSiteSettings } = useSiteSettings();
const { preloadHomeContent } = useHomePreload();
const { navigating, navigate } = useCosmicNavigation();
const currentYear = new Date().getFullYear();
const sceneReady = ref(false);
const sceneFailed = ref(false);
const sceneSettled = ref(false);
const entryReady = ref(false);
const loaderVisible = ref(true);
const displayProgress = ref(0);
const targetProgress = ref(0);
const loadingStage = ref("准备页面环境");
const loadingDetail = ref("初始化视觉与交互资源");
const completedLoadingTasks = ref<string[]>([]);
const loadingTaskTotal = 4;
const roundedProgress = computed(() => Math.round(displayProgress.value));
let progressFrame = 0;
let progressUpdatedAt = 0;
let sceneTimeout = 0;
const graph = reactive<{
  nodes: GraphNode[];
  relations: any[];
  graphVersion: string;
}>({ nodes: [], relations: [], graphVersion: "" });

function fallbackStar(index: number) {
  const seed = index * 71;
  return {
    left: `${(seed * 17) % 100}%`,
    top: `${(seed * 29) % 100}%`,
    width: `${index % 7 === 0 ? 3 : index % 3 === 0 ? 2 : 1}px`,
    height: `${index % 7 === 0 ? 3 : index % 3 === 0 ? 2 : 1}px`,
    opacity: String(0.22 + ((index * 13) % 52) / 100),
    animationDelay: `${(index % 9) * -0.38}s`,
  };
}

function animateProgress(now: number) {
  const elapsed = progressUpdatedAt
    ? Math.min(64, now - progressUpdatedAt)
    : 16;
  progressUpdatedAt = now;
  const distance = targetProgress.value - displayProgress.value;
  const easing = 1 - Math.exp(-elapsed / 320);

  if (distance > 0.04) {
    displayProgress.value = Math.min(
      targetProgress.value,
      displayProgress.value + Math.max(distance * easing, elapsed * 0.006),
    );
    progressFrame = requestAnimationFrame(animateProgress);
    return;
  }

  displayProgress.value = targetProgress.value;
  progressFrame = 0;
}

function advanceProgress(target: number, stage: string, detail: string) {
  targetProgress.value = Math.max(targetProgress.value, target);
  loadingStage.value = stage;
  loadingDetail.value = detail;
  if (!progressFrame) {
    progressUpdatedAt = 0;
    progressFrame = requestAnimationFrame(animateProgress);
  }
}

function markLoadingTask(id: string, stage: string, detail: string) {
  if (!completedLoadingTasks.value.includes(id)) {
    completedLoadingTasks.value = [...completedLoadingTasks.value, id];
  }
  const progress = Math.min(
    100,
    (completedLoadingTasks.value.length / loadingTaskTotal) * 100,
  );
  advanceProgress(progress, stage, detail);
}

function nextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function waitForProgress(target: number) {
  return new Promise<void>((resolve) => {
    const stop = watch(displayProgress, (progress) => {
      if (progress < target) return;
      stop();
      resolve();
    });
  });
}

function waitForScene() {
  if (sceneSettled.value) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const stop = watch(sceneSettled, (settled) => {
      if (!settled) return;
      stop();
      resolve();
    });
  });
}

function handleSceneReady() {
  window.clearTimeout(sceneTimeout);
  sceneReady.value = true;
  sceneSettled.value = true;
  markLoadingTask("scene", "首帧已经就绪", "校准页面层级与入场状态");
}

function handleSceneFallback() {
  window.clearTimeout(sceneTimeout);
  sceneFailed.value = true;
  sceneSettled.value = true;
  markLoadingTask("scene", "已切换兼容画面", "保持内容可见并完成入场准备");
}

onMounted(async () => {
  const clientState = useClientState();
  const isFirstVisit = !clientState.get("site", "welcomed", false);

  if (!isFirstVisit) {
    // 老访客：跳过加载页，资源后台静默预载
    loaderVisible.value = false;
    entryReady.value = true;
    const settingsRequest = loadSiteSettings();
    void Promise.allSettled([
      preloadHomeContent(),
      import("@/pages/home.vue"),
      import("@/components/FeaturedSwiper.vue"),
      import("@/components/HomeSidebar.vue"),
      api.get<any>(
        "/memories/graph",
        { limit: 260 },
        { signal: AbortSignal.timeout(6500) },
      ),
    ]);
    void settingsRequest;
    return;
  }

  advanceProgress(0, "准备页面环境", "等待真实资源响应");
  await nextPaint();

  const settingsRequest = loadSiteSettings();
  const homeRequest = Promise.allSettled([
    preloadHomeContent(),
    import("@/pages/home.vue"),
    import("@/components/FeaturedSwiper.vue"),
    import("@/components/HomeSidebar.vue"),
  ]);
  const graphRequest = Promise.allSettled([
    api.get<any>(
      "/memories/graph",
      { limit: 260 },
      { signal: AbortSignal.timeout(6500) },
    ),
  ]).then(([result]) => result);

  await Promise.resolve(settingsRequest);
  markLoadingTask("settings", "站点信息已同步", "欢迎页配置已完成读取");
  const graphResult = await graphRequest;

  if (graphResult.status === "fulfilled") {
    graph.nodes = Array.isArray(graphResult.value?.nodes)
      ? graphResult.value.nodes
      : [];
    graph.relations = Array.isArray(graphResult.value?.relations)
      ? graphResult.value.relations
      : [];
    graph.graphVersion = String(graphResult.value?.graphVersion || "");
  } else {
    sceneFailed.value = true;
  }
  markLoadingTask("graph", "时光坐标已载入", "记忆轨道数据已完成同步");
  await homeRequest;
  markLoadingTask("home", "首页内容已就绪", "文章与侧栏资源已完成预载");
  await nextTick();

  if (!graph.nodes.length || sceneFailed.value) {
    await nextPaint();
    sceneSettled.value = true;
  } else if (!sceneSettled.value) {
    sceneTimeout = window.setTimeout(handleSceneFallback, 6000);
    await waitForScene();
  }

  if (!completedLoadingTasks.value.includes("scene"))
    markLoadingTask("scene", "首帧已经就绪", "校准页面层级与入场状态");
  await nextPaint();
  advanceProgress(100, "欢迎回来", "一切准备就绪");
  await waitForProgress(99.9);
  await new Promise((resolve) => window.setTimeout(resolve, 460));
  entryReady.value = true;
  await new Promise((resolve) => window.setTimeout(resolve, 180));
  loaderVisible.value = false;
  clientState.set("site", "welcomed", true);
});

onUnmounted(() => {
  cancelAnimationFrame(progressFrame);
  window.clearTimeout(sceneTimeout);
});

useHead(() => ({
  title: siteTitle.value,
  meta: [
    {
      name: "description",
      content: "风隅随笔，收藏文字、记忆与时间坐标。",
    },
  ],
}));
</script>

<style scoped>
.welcome-page {
  --space-text: #edf5ff;
  --space-muted: rgb(221 235 255 / 64%);
  --space-line: rgb(174 205 255 / 16%);
  --space-accent: var(--c-primary);
  position: relative;
  width: 100%;
  height: 100dvh;
  min-height: 600px;
  overflow: hidden;
  background: #030712;
  color: var(--space-text);
  isolation: isolate;
}

.scene-layer,
.scene-fallback,
.scene-veil {
  position: absolute;
  inset: 0;
}

.scene-layer {
  z-index: -2;
  overflow: hidden;
}

.scene-layer :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
}

.scene-fallback {
  background: #030712;
  opacity: 0;
  transition: opacity 0.8s ease;
}

.scene-fallback.visible {
  opacity: 1;
}

.scene-fallback i {
  position: absolute;
  border-radius: 50%;
  background: #dcecff;
  box-shadow: 0 0 12px rgb(149 199 255 / 48%);
  animation: star-breathe 3.8s ease-in-out infinite alternate;
}

.scene-veil {
  z-index: 2;
  background: rgb(2 7 18 / 46%);
  box-shadow:
    42vw 0 120px rgb(2 7 18 / 26%) inset,
    0 -180px 180px rgb(2 7 18 / 58%) inset;
}

.welcome-nav {
  position: absolute;
  z-index: 5;
  top: 0;
  right: clamp(28px, 5vw, 76px);
  left: clamp(28px, 5vw, 76px);
  display: flex;
  height: 76px;
  align-items: center;
  justify-content: space-between;
  opacity: 0;
  transform: translateY(-12px);
  transition:
    opacity 0.72s ease 0.12s,
    transform 0.82s cubic-bezier(0.16, 1, 0.3, 1) 0.12s;
}

.ready .welcome-nav {
  opacity: 1;
  transform: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  color: var(--space-text);
  text-decoration: none;
}

.brand img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.brand > span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand strong {
  font-family: var(--font-brand);
  font-size: 0.76rem;
}

.brand small,
.nav-status {
  color: var(--space-muted);
  font: 0.46rem var(--font-mono);
}

.nav-status {
  display: flex;
  align-items: center;
  gap: 7px;
}

.nav-status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(255 255 255 / 28%);
}

.nav-status i.online {
  background: var(--space-accent);
  box-shadow: 0 0 0 4px var(--c-primary-soft);
}

.welcome-hero {
  display: grid;
  width: min(1040px, calc(100% - 96px));
  height: 100%;
  grid-template-columns: minmax(0, 1fr) 210px;
  align-items: center;
  gap: 48px;
  margin: 0 auto;
  padding: 84px 0 58px;
}

.hero-copy {
  width: min(650px, 100%);
  opacity: 0;
  filter: blur(7px);
  transform: translateY(24px);
  transition:
    opacity 0.76s ease 0.22s,
    filter 0.68s ease 0.22s,
    transform 0.96s cubic-bezier(0.16, 1, 0.3, 1) 0.22s;
}

.ready .hero-copy {
  opacity: 1;
  filter: none;
  transform: none;
}

.hero-kicker {
  color: var(--space-accent);
  font: 700 0.58rem var(--font-mono);
}

.hero-copy h1 {
  margin: 18px 0 7px;
  color: var(--space-text);
  font-family: var(--font-brand);
  font-size: 3.6rem;
  font-weight: 650;
  line-height: 1;
}

.hero-statement {
  margin: 0;
  color: var(--space-text);
  font-family: var(--font-heading);
  font-size: 1.18rem;
  line-height: 1.6;
}

.hero-description {
  max-width: 480px;
  margin: 16px 0 0;
  color: var(--space-muted);
  font-size: 0.72rem;
  line-height: 1.9;
}

.welcome-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 28px;
}

.welcome-actions button {
  display: grid;
  width: 194px;
  height: 56px;
  grid-template-columns: 32px minmax(0, 1fr) 15px;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-radius: 7px;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    transform 0.34s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.24s ease,
    background-color 0.24s ease,
    box-shadow 0.28s ease;
}

.welcome-actions button:disabled {
  cursor: wait;
  opacity: 0.64;
}

.welcome-actions button > span {
  display: grid;
  width: 30px;
  height: 30px;
  border: 1px solid currentColor;
  border-radius: 50%;
  place-items: center;
}

.welcome-actions button > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.welcome-actions small {
  font: 0.4rem var(--font-mono);
  opacity: 0.62;
}

.welcome-actions strong {
  font-size: 0.67rem;
}

.primary-action {
  border: 1px solid var(--space-accent);
  background: var(--space-accent);
  color: #07111f;
  box-shadow: 0 12px 32px
    color-mix(in srgb, var(--space-accent) 20%, transparent);
}

.secondary-action {
  border: 1px solid rgb(255 255 255 / 20%);
  background: rgb(3 8 20 / 62%);
  color: var(--space-text);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.welcome-actions button:hover:not(:disabled) {
  transform: translateY(-4px);
}

.primary-action:hover:not(:disabled) {
  box-shadow: 0 18px 40px
    color-mix(in srgb, var(--space-accent) 28%, transparent);
}

.secondary-action:hover:not(:disabled) {
  border-color: var(--space-accent);
  background: rgb(4 14 30 / 78%);
}

.hero-index {
  display: grid;
  grid-template-columns: 26px 1px minmax(0, 1fr);
  align-items: start;
  gap: 16px;
  opacity: 0;
  transform: translateX(18px);
  transition:
    opacity 0.7s ease 0.38s,
    transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.38s;
}

.ready .hero-index {
  opacity: 1;
  transform: none;
}

.hero-index > span {
  color: var(--space-accent);
  font: 0.55rem var(--font-mono);
}

.hero-index > i {
  width: 1px;
  height: 116px;
  background: var(--space-line);
}

.hero-index > div {
  display: grid;
  gap: 12px;
}

.hero-index small {
  color: var(--space-muted);
  font: 0.44rem var(--font-mono);
}

.hero-index strong {
  color: var(--space-text);
  font-family: var(--font-heading);
  font-size: 0.92rem;
  font-weight: 520;
  line-height: 1.8;
}

.welcome-footer {
  position: absolute;
  right: clamp(28px, 5vw, 76px);
  bottom: 24px;
  left: clamp(28px, 5vw, 76px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgb(221 235 255 / 42%);
  font: 0.47rem var(--font-mono);
  opacity: 0;
  transition: opacity 0.7s ease 0.56s;
}

.ready .welcome-footer {
  opacity: 1;
}

.welcome-footer > div {
  display: flex;
  align-items: center;
  gap: 9px;
}

.welcome-footer i {
  width: 38px;
  height: 1px;
  background: var(--space-line);
}

.entry-loading {
  position: fixed;
  z-index: 20;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  background: var(--app-transition-bg, #030712);
  color: var(--c-text-2);
  overflow: hidden;
}

.entry-loading::before {
  position: absolute;
  width: min(78vw, 560px);
  height: min(78vw, 560px);
  border: 1px solid color-mix(in srgb, var(--c-primary) 12%, transparent);
  border-radius: 50%;
  box-shadow: 0 0 0 42px color-mix(in srgb, var(--c-primary) 4%, transparent), 0 0 0 84px color-mix(in srgb, var(--c-primary) 2%, transparent);
  content: "";
  transform: rotate(-12deg) scaleY(.3);
  pointer-events: none;
}

/* 轻量加载器：呼吸 logo + 细进度线 + 阶段文字，随主题变色 */
.loading-light {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 22px;
}

.loading-orb {
  position: relative;
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
}

.loading-orb img {
  width: 38px;
  height: 38px;
  object-fit: contain;
  animation: loader-breathe 2.4s ease-in-out infinite;
}

.loading-orb i {
  position: absolute;
  inset: 0;
  border: 1px solid color-mix(in srgb, var(--c-primary) 42%, transparent);
  border-radius: 50%;
  animation: loader-ring 2.4s ease-out infinite;
}

.loading-line {
  width: min(180px, 52vw);
  height: 2px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--c-text) 10%, transparent);
  overflow: hidden;
}

.loading-line > i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c-primary) 60%, transparent), var(--c-primary));
  box-shadow: 0 0 12px color-mix(in srgb, var(--c-primary) 55%, transparent);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.loading-meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
  color: var(--c-text-2);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
}

.loading-meta strong {
  color: var(--c-text);
  font-size: 0.82rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.loading-meta strong small {
  margin-left: 1px;
  color: var(--c-primary);
  font-size: 0.5rem;
}

@keyframes loader-breathe {
  50% {
    opacity: 0.72;
    transform: scale(0.94);
  }
}

@keyframes loader-ring {
  from {
    opacity: 0.65;
    transform: scale(0.86);
  }
  to {
    opacity: 0;
    transform: scale(1.28);
  }
}

.entry-fade-leave-active {
  transition:
    opacity 0.86s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.86s cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0.86s;
}

.entry-fade-leave-to {
  opacity: 0;
  filter: blur(10px);
  visibility: hidden;
}

@keyframes star-breathe {
  to {
    opacity: 0.18;
    transform: scale(0.72);
  }
}

@keyframes loading-pulse {
  50% {
    opacity: 0.48;
    transform: scale(0.72);
  }
}

@media (max-width: 820px) {
  .welcome-nav {
    right: 22px;
    left: 22px;
    height: 74px;
  }

  .welcome-hero {
    width: calc(100% - 44px);
    grid-template-columns: 1fr;
    gap: 0;
    padding-top: 88px;
  }

  .hero-copy {
    width: 100%;
  }

  .hero-copy h1 {
    font-size: 3.1rem;
  }

  .hero-index {
    display: none;
  }

  .welcome-footer {
    right: 22px;
    bottom: 18px;
    left: 22px;
  }
}

@media (max-width: 560px) {
  .welcome-page {
    min-height: 640px;
  }

  .brand small,
  .nav-status span {
    display: none;
  }

  .hero-copy h1 {
    margin-top: 18px;
    font-size: 2.55rem;
  }

  .hero-statement {
    font-size: 1.18rem;
  }

  .hero-description {
    max-width: 330px;
    font-size: 0.67rem;
  }

  .welcome-actions {
    display: grid;
    grid-template-columns: 1fr;
    margin-top: 30px;
  }

  .welcome-actions button {
    width: min(100%, 260px);
    height: 54px;
  }

  .welcome-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .welcome-footer i {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .welcome-nav,
  .hero-copy,
  .hero-index,
  .welcome-footer,
  .scene-fallback,
  .entry-fade-leave-active,
  .welcome-actions button {
    transition: none;
  }

  .scene-fallback i,
  .loading-orb,
  .loading-orb i {
    animation: none;
  }
}
</style>

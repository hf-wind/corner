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
        <div class="loading-window">
          <header>
            <span class="loading-brand">
              <img src="/logo.png" alt="" width="32" height="32" />
              <span
                ><strong>WIND CORNER</strong><small>WELCOME SYSTEM</small></span
              >
            </span>
            <b
              >{{ String(roundedProgress).padStart(2, "0") }}<small>%</small></b
            >
          </header>
          <div class="loading-track" aria-hidden="true">
            <i :style="{ transform: `scaleX(${displayProgress / 100})` }" />
            <span :style="{ left: `${displayProgress}%` }" />
          </div>
          <footer>
            <span><i />{{ loadingStage }}</span>
            <small>{{ loadingDetail }}</small>
          </footer>
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

definePageMeta({ layout: "welcome" });

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
  () => import("~/components/TimeConstellationScene.vue"),
);
const { mediaUrl } = useMediaUrl();
const { siteTitle, siteDescription, loadSiteSettings } = useSiteSettings();
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
}

function handleSceneFallback() {
  window.clearTimeout(sceneTimeout);
  sceneFailed.value = true;
  sceneSettled.value = true;
}

onMounted(async () => {
  advanceProgress(10, "准备页面环境", "初始化视觉与交互资源");
  await nextPaint();
  advanceProgress(22, "同步站点信息", "读取标题与欢迎页配置");

  const settingsRequest = loadSiteSettings();
  const graphRequest = Promise.allSettled([
    api.get<any>(
      "/memories/graph",
      { limit: 260 },
      { signal: AbortSignal.timeout(6500) },
    ),
  ]).then(([result]) => result);

  await Promise.resolve(settingsRequest);
  advanceProgress(38, "站点信息已同步", "准备时光星图数据");
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
  advanceProgress(72, "时光坐标已载入", "构建星图与首帧画面");
  await nextTick();

  if (!graph.nodes.length || sceneFailed.value) {
    await nextPaint();
    sceneSettled.value = true;
  } else if (!sceneSettled.value) {
    sceneTimeout = window.setTimeout(handleSceneFallback, 6000);
    await waitForScene();
  }

  advanceProgress(94, "首帧已经就绪", "校准页面层级与入场状态");
  await nextPaint();
  advanceProgress(100, "欢迎回来", "一切准备就绪");
  await waitForProgress(99.9);
  await new Promise((resolve) => window.setTimeout(resolve, 460));
  entryReady.value = true;
  await new Promise((resolve) => window.setTimeout(resolve, 180));
  loaderVisible.value = false;
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
  background: #030712;
  color: var(--space-muted);
}

.loading-window {
  width: min(330px, calc(100vw - 44px));
  padding: 18px 19px 16px;
  border: 1px solid color-mix(in srgb, var(--space-accent) 26%, transparent);
  border-radius: 8px;
  background: rgb(4 10 24 / 86%);
  box-shadow:
    0 20px 70px rgb(0 0 0 / 28%),
    0 0 0 1px rgb(255 255 255 / 2%) inset;
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
  gap: 10px;
}

.loading-brand img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.loading-brand > span {
  display: grid;
  gap: 2px;
}

.loading-brand strong {
  color: var(--space-text);
  font: 650 0.54rem var(--font-brand);
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
  height: 2px;
  margin: 18px 0 13px;
  background: rgb(174 205 255 / 12%);
}

.loading-track > i {
  position: absolute;
  inset: 0;
  background: var(--space-accent);
  box-shadow: 0 0 14px var(--c-primary-soft);
  transform: scaleX(0);
  transform-origin: left center;
  will-change: transform;
}

.loading-track > span {
  position: absolute;
  top: 50%;
  width: 6px;
  height: 6px;
  border: 1px solid var(--space-accent);
  border-radius: 50%;
  background: #071022;
  box-shadow: 0 0 0 3px var(--c-primary-soft);
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
  font-size: 0.52rem;
  white-space: nowrap;
}

.loading-window footer > span i {
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--space-accent);
  box-shadow: 0 0 0 3px var(--c-primary-soft);
  animation: loading-pulse 1.5s ease-in-out infinite;
}

.loading-window footer > small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  .loading-window footer > span i {
    animation: none;
  }
}
</style>

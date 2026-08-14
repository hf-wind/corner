<template>
  <main class="portal" :class="{ ready: sceneReady && graphLoaded }">
    <TimeConstellationScene
      v-if="graphLoaded"
      :nodes="graph.nodes"
      :relations="graph.relations"
      :graph-version="graph.graphVersion"
      :resolve-image="mediaUrl"
      ambient
      @ready="sceneReady = true"
      @fallback="sceneFailed = true"
    />

    <Transition name="portal-loader">
      <div v-if="!graphLoaded || !sceneReady" class="portal-loading" aria-live="polite">
        <span class="portal-loading-mark"><i /><i /></span>
        <small>{{ graphLoaded ? "正在校准星图轨道" : "正在读取时间坐标" }}</small>
      </div>
    </Transition>

    <div class="portal-shade" aria-hidden="true" />
    <div class="portal-frame" aria-hidden="true" />

    <header class="portal-nav">
      <div class="brand-mark">
        <img src="/logo_192.png" alt="" width="44" height="44" />
        <div><strong>{{ siteTitle }}</strong><span>PERSONAL MEMORY ARCHIVE</span></div>
      </div>
      <span class="scene-status"><i :class="{ online: sceneReady && graphLoaded }" />{{ sceneStatus }}</span>
    </header>

    <section class="portal-copy" aria-labelledby="portal-title">
      <span class="portal-kicker">TIME CONSTELLATION · {{ currentYear }}</span>
      <h1 id="portal-title">{{ siteTitle }}</h1>
      <p>把值得记住的日子安放进星图，也把途经生活的风，写成可以重逢的文字。</p>
      <div class="portal-actions">
        <button class="explore-action" type="button" :disabled="navigating" @click="navigate('/time/constellation')">
          <Icon name="ph:planet-bold" /><span>浏览时光星图</span><Icon name="ph:arrow-up-right-bold" />
        </button>
        <button class="home-action" type="button" :disabled="navigating" @click="navigate('/home')">
          <Icon name="ph:article-bold" /><span>进入随笔</span>
        </button>
      </div>
    </section>

    <aside class="portal-stats" aria-label="站点数据">
      <div><small>TRAVELERS</small><strong>{{ compactNumber(visitorCount) }}</strong><span>累计到访</span></div>
      <div><small>MEMORIES</small><strong>{{ compactNumber(graph.nodes.length) }}</strong><span>已点亮记忆</span></div>
    </aside>

    <div v-if="sceneFailed" class="scene-fallback" aria-hidden="true">
      <i v-for="index in 22" :key="index" :style="fallbackStar(index)" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";

definePageMeta({ layout: "welcome" });
type GraphNode = { id: string; type: string; title: string; occurredAt?: string | null; coordinateSeed?: number; metadata?: Record<string, unknown>; image?: string | null };

const api = useApi();
const TimeConstellationScene = defineAsyncComponent(() => import("~/components/TimeConstellationScene.vue"));
const { mediaUrl } = useMediaUrl();
const { siteTitle, loadSiteSettings } = useSiteSettings();
const { navigating, navigate } = useCosmicNavigation();
const graph = reactive<{ nodes: GraphNode[]; relations: any[]; graphVersion: string }>({ nodes: [], relations: [], graphVersion: "" });
const visitorCount = ref(0);
const sceneReady = ref(false);
const sceneFailed = ref(false);
const graphLoaded = ref(false);
const currentYear = new Date().getFullYear();
const sceneStatus = computed(() => !sceneReady.value || !graphLoaded.value ? "正在连接时间" : graph.nodes.length ? `${graph.nodes.length} 枚记忆在线` : "星图等待第一次点亮");

function compactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

onMounted(async () => {
  await Promise.allSettled([
    loadSiteSettings(),
    api.get<any>("/memories/graph", { view: "constellation", limit: 320 }).then((result) => Object.assign(graph, result)),
    api.get<any>("/visitor/wall").then((result) => { visitorCount.value = Number(result?.totalVisitors || result?.totalVisits || 0); }),
  ]);
  graphLoaded.value = true;
});

function fallbackStar(index: number) {
  const seed = (index * 47) % 100;
  return { left: `${(seed * 13) % 100}%`, top: `${(seed * 29) % 100}%`, animationDelay: `${index * .13}s` };
}
useHead({ title: computed(() => siteTitle.value) });
</script>

<style scoped>
.portal {
  --space-accent: hsl(var(--hue-theme) 100% 68%);
  --space-text: #f4f7fb;
  --space-muted: #a1adba;
  position: fixed;
  z-index: 50;
  inset: 0;
  min-width: 0;
  min-height: 100dvh;
  overflow: hidden;
  isolation: isolate;
  background: #030712;
  color: var(--space-text);
}
.portal :deep(.constellation-scene) { z-index: -4; view-transition-name: cosmic-scene; }
.portal-shade {
  position: absolute;
  z-index: -3;
  inset: 0;
  background: linear-gradient(90deg, rgb(3 7 18 / 82%) 0%, rgb(3 7 18 / 50%) 44%, rgb(3 7 18 / 12%) 72%);
  pointer-events: none;
}
.portal-frame { position: absolute; z-index: 8; inset: 14px; border: 1px solid rgb(255 255 255 / 10%); pointer-events: none; }
.portal-frame::before, .portal-frame::after { position: absolute; width: 34px; height: 34px; border-color: var(--space-accent); content: ""; opacity: .62; }
.portal-frame::before { top: -1px; left: -1px; border-top: 1px solid; border-left: 1px solid; }
.portal-frame::after { right: -1px; bottom: -1px; border-right: 1px solid; border-bottom: 1px solid; }
.portal-loading { position: absolute; z-index: 12; inset: 0; display: grid; align-content: center; justify-items: center; gap: 18px; background: #030712; color: var(--space-muted); transition: opacity .5s ease; }
.portal-loading small { font-size: .6rem; }
.portal-loading-mark { position: relative; display: block; width: 54px; height: 54px; border: 1px solid color-mix(in srgb, var(--space-accent) 48%, transparent); border-radius: 50%; animation: portal-spin 4s linear infinite; }
.portal-loading-mark::before { position: absolute; inset: 11px; border: 1px solid rgb(255 255 255 / 20%); border-radius: 50%; content: ""; }
.portal-loading-mark i { position: absolute; top: -3px; left: 50%; width: 6px; height: 6px; border-radius: 50%; background: var(--space-accent); box-shadow: 0 0 14px var(--space-accent); }
.portal-loading-mark i:last-child { top: auto; right: -3px; bottom: 12px; left: auto; width: 4px; height: 4px; }
.portal-loader-leave-active { transition: opacity .65s ease; }
.portal-loader-leave-to { opacity: 0; }
.portal-nav { position: absolute; z-index: 4; top: 0; right: 0; left: 0; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 30px 36px; }
.brand-mark { display: flex; min-width: 0; align-items: center; gap: 12px; }
.brand-mark img { width: 44px; height: 44px; border: 1px solid color-mix(in srgb, var(--space-accent) 30%, transparent); border-radius: 8px; box-shadow: 0 12px 32px rgb(0 0 0 / 30%); }
.brand-mark div { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.brand-mark strong { overflow: hidden; font-size: .86rem; text-overflow: ellipsis; white-space: nowrap; }
.brand-mark span { color: var(--space-muted); font-family: var(--font-mono); font-size: .46rem; }
.scene-status { display: flex; align-items: center; gap: 7px; color: var(--space-muted); font-size: .55rem; }
.scene-status i { width: 6px; height: 6px; border-radius: 50%; background: #687381; }
.scene-status i.online { background: var(--space-accent); box-shadow: 0 0 12px var(--space-accent); }
.portal-copy { position: absolute; z-index: 3; top: 50%; left: clamp(36px, 7vw, 112px); width: min(530px, calc(100vw - 72px)); transform: translateY(-45%); }
.portal-kicker { color: var(--space-accent); font-family: var(--font-mono); font-size: .56rem; font-weight: 700; }
.portal-copy h1 { margin: 18px 0 0; color: var(--space-text); font-size: clamp(3.2rem, 6.2vw, 6rem); line-height: 1.02; text-shadow: 0 18px 54px rgb(0 0 0 / 46%); }
.portal-copy > p { max-width: 390px; margin: 22px 0 0; color: var(--space-muted); font-size: .8rem; line-height: 1.9; }
.portal-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 28px; }
.portal-actions button { display: flex; height: 44px; align-items: center; gap: 8px; padding: 0 15px; border-radius: 7px; cursor: pointer; font: inherit; font-size: .66rem; font-weight: 700; transition: transform .25s ease, border-color .25s ease, background-color .25s ease; }
.explore-action { border: 1px solid var(--space-accent); background: var(--space-accent); color: #07111d; box-shadow: 0 12px 30px color-mix(in srgb, var(--space-accent) 20%, transparent); }
.explore-action > svg:last-child { margin-left: 6px; }
.home-action { border: 1px solid rgb(255 255 255 / 20%); background: rgb(4 10 22 / 54%); color: var(--space-text); backdrop-filter: blur(12px); }
.portal-actions button:hover { transform: translateY(-2px); }
.home-action:hover { border-color: color-mix(in srgb, var(--space-accent) 60%, transparent); }
.portal-stats { position: absolute; z-index: 3; right: clamp(36px, 6vw, 90px); bottom: 58px; display: grid; grid-template-columns: repeat(2, 108px); border-top: 1px solid rgb(255 255 255 / 14%); border-bottom: 1px solid rgb(255 255 255 / 14%); }
.portal-stats > div { display: flex; min-width: 0; flex-direction: column; padding: 13px 12px; border-left: 1px solid rgb(255 255 255 / 14%); }
.portal-stats > div:last-child { border-right: 1px solid rgb(255 255 255 / 14%); }
.portal-stats small { color: var(--space-muted); font-family: var(--font-mono); font-size: .43rem; }
.portal-stats strong { margin-top: 5px; color: var(--space-text); font-family: var(--font-mono); font-size: 1.4rem; line-height: 1; }
.portal-stats span { margin-top: 5px; color: var(--space-muted); font-size: .5rem; }
.scene-fallback { position: absolute; z-index: -2; inset: 0; }
.scene-fallback i { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: var(--space-text); box-shadow: 0 0 8px var(--space-accent); animation: star-pulse 2.4s ease-in-out infinite; }
@keyframes portal-spin { to { transform: rotate(360deg); } }
@keyframes star-pulse { 50% { opacity: .25; transform: scale(.6); } }
@media (max-width: 760px) {
  .portal-nav { padding: 23px 22px; }
  .scene-status { display: none; }
  .portal-frame { inset: 8px; }
  .portal-copy { top: auto; right: 20px; bottom: 205px; left: 20px; width: auto; transform: none; }
  .portal-copy h1 { margin-top: 13px; font-size: clamp(2.8rem, 14vw, 4.2rem); }
  .portal-copy > p { max-width: 320px; margin-top: 15px; font-size: .72rem; }
  .portal-actions { margin-top: 20px; }
  .portal-actions button { flex: 1; justify-content: center; }
  .portal-stats { right: 20px; bottom: 46px; left: 20px; grid-template-columns: repeat(2, 1fr); }
}
@media (max-height: 720px) and (min-width: 761px) {
  .portal-copy { top: 47%; }
  .portal-copy h1 { font-size: 4.2rem; }
  .portal-stats { bottom: 38px; }
}
@media (prefers-reduced-motion: reduce) {
  .portal-actions button, .portal-loading-mark, .scene-fallback i { transition: none; animation: none; }
}
</style>

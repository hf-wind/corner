<template>
  <main
    ref="portalRef"
    class="portal"
    :class="{ 'scene-online': sceneReady && graphLoaded, 'entry-ready': entryReady }"
  >
    <div ref="sceneLayerRef" class="portal-scene" aria-hidden="true">
      <TimeConstellationScene
        v-if="graphLoaded"
        :nodes="graph.nodes"
        :relations="graph.relations"
        :graph-version="graph.graphVersion"
        :resolve-image="mediaUrl"
        :narrative-progress="sceneProgress"
        ambient
        @ready="sceneReady = true"
        @fallback="sceneFailed = true"
      />
      <div
        class="scene-fallback"
        :class="{ visible: sceneFailed || !sceneReady }"
      >
        <i v-for="index in 48" :key="index" :style="fallbackStar(index)" />
      </div>
      <div class="scene-vignette" />
      <div class="scene-grid" aria-hidden="true" />
      <div class="scene-scanline" aria-hidden="true" />
      <div v-if="!entryReady" class="entry-loading" aria-live="polite">
        <span class="entry-loader"><i /><i /><i /></span>
        <strong>{{ sceneStatus }}</strong>
        <small>正在整理这座记忆花园</small>
      </div>
    </div>

    <header class="portal-nav">
      <button
        class="brand-mark"
        type="button"
        aria-label="回到欢迎页顶部"
        @click="scrollToPanel(0)"
      >
        <img src="/logo.png" alt="" width="38" height="38" />
        <span
          ><strong>{{ siteTitle }}</strong
          ><small>PERSONAL MEMORY ARCHIVE</small></span
        >
      </button>
      <div class="nav-end">
        <span class="chapter-indicator"
          ><b>0{{ activePanel + 1 }}</b
          ><i />04</span
        >
        <span class="scene-status"
          ><i :class="{ online: sceneReady && graphLoaded }" />{{
            sceneStatus
          }}</span
        >
      </div>
    </header>

    <nav class="portal-rail" aria-label="欢迎页章节">
      <span class="rail-progress" aria-hidden="true"
        ><i :style="{ transform: `scaleY(${scrollProgress})` }"
      /></span>
      <button
        v-for="(chapter, index) in chapters"
        :key="chapter.label"
        type="button"
        :class="{ active: activePanel === index }"
        :aria-label="chapter.label"
        @click="scrollToPanel(index)"
      >
        <i /><span>0{{ index + 1 }}</span
        ><small>{{ chapter.label }}</small>
      </button>
    </nav>

    <div class="portal-scroll">
      <div class="portal-stage">
        <section
          class="portal-panel hero-panel"
          :class="{ 'is-active': activePanel === 0 }"
          data-panel="hero"
          aria-labelledby="portal-title"
        >
          <div class="panel-index" aria-hidden="true">00</div>
          <div class="hero-copy">
            <span class="portal-kicker" data-reveal
              >风从时间里来 · {{ currentYear }}</span
            >
            <h1 id="portal-title" data-reveal>{{ siteTitle }}</h1>
            <p class="hero-statement" data-reveal>把日子写进星海。</p>
            <p class="hero-description" data-reveal>
              这里收藏途经生活的风，也收藏那些值得再次抵达的人、地点与时刻。
            </p>
          </div>
          <button
            class="scroll-cue"
            type="button"
            aria-label="继续向下探索"
            data-reveal
            @click="scrollToPanel(1)"
          >
            <span>SCROLL TO BEGIN</span
            ><i><Icon name="ph:arrow-down-bold" /></i>
          </button>
          <div class="hero-coordinate" data-parallax="0.12" aria-hidden="true">
            <span>31.2304° N</span><i /><span>121.4737° E</span>
          </div>
        </section>

        <section
          class="portal-panel story-panel"
          :class="{ 'is-active': activePanel === 1 }"
          data-panel="story"
          aria-labelledby="story-title"
        >
          <div class="panel-index" aria-hidden="true">01</div>
          <div class="section-copy">
            <span class="section-kicker" data-reveal>THE TRACE OF DAYS</span>
            <h2 id="story-title" data-reveal>
              时间不会停留，<br />但记忆可以。
            </h2>
            <p data-reveal>
              一篇随笔、一张照片、一次远行。看似散落的片段，在这里沿时间重新相遇。
            </p>
          </div>
          <div class="time-axis" data-parallax="0.045" aria-hidden="true">
            <span><small>PAST</small><b>写下</b></span>
            <i><em /></i>
            <span><small>NOW</small><b>连接</b></span>
            <i><em /></i>
            <span><small>FUTURE</small><b>重逢</b></span>
          </div>
        </section>

        <section
          class="portal-panel archive-panel"
          :class="{ 'is-active': activePanel === 2 }"
          data-panel="archive"
          aria-labelledby="archive-title"
        >
          <div class="panel-index" aria-hidden="true">02</div>
          <div class="archive-orbit" data-parallax="0.035" aria-hidden="true">
            <i v-for="index in 3" :key="index"><span /></i>
          </div>
          <div class="section-copy archive-copy">
            <span class="section-kicker" data-reveal
              >MEMORY HAS COORDINATES</span
            >
            <h2 id="archive-title" data-reveal>
              每一次记录，<br />都成为一枚坐标。
            </h2>
            <p data-reveal>它们彼此牵引，长成只属于这里的时间宇宙。</p>
            <dl class="archive-metrics" data-reveal>
              <div>
                <dt>{{ compactNumber(graph.nodes.length) }}</dt>
                <dd>记忆坐标</dd>
              </div>
              <div>
                <dt>{{ compactNumber(graph.relations.length) }}</dt>
                <dd>时间连线</dd>
              </div>
              <div>
                <dt>{{ compactNumber(visitorCount) }}</dt>
                <dd>途经旅人</dd>
              </div>
            </dl>
          </div>
        </section>

        <section
          class="portal-panel choice-panel"
          :class="{ 'is-active': activePanel === 3 }"
          data-panel="choice"
          aria-labelledby="choice-title"
        >
          <div class="panel-index" aria-hidden="true">03</div>
          <div class="choice-copy">
            <span class="section-kicker" data-reveal
              >CHOOSE YOUR NEXT ORBIT</span
            >
            <h2 id="choice-title" data-reveal>下一站，由你选择。</h2>
            <p data-reveal>
              阅读最新写下的故事，或进入星图，在时间的轨道间自由漫游。
            </p>
            <div class="portal-actions" data-reveal>
              <button
                class="primary-action"
                type="button"
                :disabled="navigating || !entryReady"
                @click="navigate('/home')"
              >
                <span class="action-icon"><Icon name="ph:article-bold" /></span>
                <span><small>READ THE STORIES</small><b>进入首页</b></span>
                <Icon name="ph:arrow-up-right-bold" />
              </button>
              <button
                class="secondary-action"
                type="button"
                :disabled="navigating || !entryReady"
                @click="navigate('/time/constellation')"
              >
                <span class="action-icon"><Icon name="ph:planet-bold" /></span>
                <span><small>EXPLORE THE UNIVERSE</small><b>漫游星图</b></span>
                <Icon name="ph:arrow-up-right-bold" />
              </button>
            </div>
          </div>
          <footer class="portal-footer">
            <span>© {{ currentYear }} {{ siteTitle }}</span
            ><span>愿每一次抵达，都刚好遇见一阵风。</span>
          </footer>
        </section>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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
const { siteTitle, loadSiteSettings } = useSiteSettings();
const { navigating, navigate } = useCosmicNavigation();
const portalRef = ref<HTMLElement | null>(null);
const sceneLayerRef = ref<HTMLElement | null>(null);
const graph = reactive<{
  nodes: GraphNode[];
  relations: any[];
  graphVersion: string;
}>({ nodes: [], relations: [], graphVersion: "" });
const visitorCount = ref(0);
const sceneReady = ref(false);
const sceneFailed = ref(false);
const graphLoaded = ref(false);
const settingsLoaded = ref(false);
const scrollProgress = ref(0);
const sceneProgress = ref(0);
const activePanel = ref(0);
const currentYear = new Date().getFullYear();
const chapters = [
  { label: "序章" },
  { label: "时间" },
  { label: "坐标" },
  { label: "抵达" },
];
let animationContext: gsap.Context | null = null;

const sceneStatus = computed(() =>
  !graphLoaded.value
    ? "读取时间坐标"
    : sceneReady.value
      ? `${graph.nodes.length} 枚记忆在线`
      : "星图正在苏醒",
);
const entryReady = computed(() => graphLoaded.value && settingsLoaded.value && (sceneReady.value || sceneFailed.value));

function compactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function scrollToPanel(index: number) {
  const scroller = portalRef.value;
  if (!scroller) return;
  const panel = scroller.querySelectorAll<HTMLElement>("[data-panel]")[index];
  if (!panel) return;
  scroller.scrollTo({
    top: Math.max(0, panel.offsetTop - 28),
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

function initializeMotion() {
  const scroller = portalRef.value;
  if (
    !scroller ||
    !sceneLayerRef.value ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  gsap.registerPlugin(ScrollTrigger);
  animationContext = gsap.context(() => {
    const panels = gsap.utils.toArray<HTMLElement>(".portal-panel");
    gsap.fromTo(
      ".hero-copy [data-reveal], .scroll-cue[data-reveal]",
      { y: 22, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.25,
        stagger: 0.09,
        delay: 0.18,
        ease: "power4.out",
      },
    );

    panels.forEach((panel, index) => {
      ScrollTrigger.create({
        scroller,
        trigger: panel,
        start: "top 54%",
        end: "bottom 54%",
        onToggle: (self) => {
          if (self.isActive) activePanel.value = index;
        },
      });
      if (index === 0) return;
      const reveals = gsap.utils.toArray<HTMLElement>("[data-reveal]", panel);
      gsap.fromTo(
        reveals,
        { y: 34, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.055,
          ease: "power3.out",
          force3D: true,
          scrollTrigger: {
            scroller,
            trigger: panel,
            start: "top 88%",
            end: "top 38%",
            scrub: 0.7,
          },
        },
      );

      const visual = panel.querySelector<HTMLElement>(
        ".time-axis, .archive-orbit",
      );
      if (visual) {
        gsap.fromTo(
          visual,
          { y: 24, opacity: 0.2 },
          {
            y: -12,
            opacity: 1,
            ease: "none",
            force3D: true,
            scrollTrigger: {
              scroller,
              trigger: panel,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.9,
            },
          },
        );
      }
    });

    gsap.fromTo(
      ".time-axis > i",
      { scaleX: 0, transformOrigin: "left center" },
      {
        scaleX: 1,
        stagger: 0.08,
        ease: "none",
        scrollTrigger: {
          scroller,
          trigger: ".story-panel",
          start: "top 68%",
          end: "top 30%",
          scrub: 0.75,
        },
      },
    );

    gsap.to(".hero-copy", {
      y: -48,
      opacity: 0.28,
      ease: "none",
      force3D: true,
      scrollTrigger: {
        scroller,
        trigger: ".hero-panel",
        start: "top top",
        end: "bottom 20%",
        scrub: 0.8,
      },
    });

    gsap.to(sceneLayerRef.value, {
      scale: 1.12,
      yPercent: 4,
      ease: "none",
      force3D: true,
      scrollTrigger: { scroller, trigger: ".portal-scroll", start: "top top", end: "bottom bottom", scrub: 1.2 },
    });
    gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((element) => {
      const strength = Number(element.dataset.parallax || 0.04);
      gsap.to(element, {
        y: () => -Math.max(10, scroller.clientHeight * strength),
        ease: "none",
        force3D: true,
        scrollTrigger: { scroller, trigger: element.closest(".portal-panel") || element, start: "top bottom", end: "bottom top", scrub: 1 },
      });
    });

    ScrollTrigger.create({
      scroller,
      trigger: ".portal-scroll",
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        scrollProgress.value = self.progress;
        sceneProgress.value = self.progress;
      },
    });
  }, portalRef.value);
  ScrollTrigger.refresh();
}

onMounted(async () => {
  const motionReady = nextTick().then(initializeMotion);
  await Promise.allSettled([
    loadSiteSettings().finally(() => { settingsLoaded.value = true }),
    api
      .get<any>("/memories/graph", { view: "constellation", limit: 320 })
      .then((result) => {
        graph.nodes = Array.isArray(result?.nodes) ? result.nodes : [];
        graph.relations = Array.isArray(result?.relations)
          ? result.relations
          : [];
        graph.graphVersion = String(result?.graphVersion || "");
      }),
    api.get<any>("/visitor/wall").then((result) => {
      visitorCount.value = Number(
        result?.totalVisitors || result?.totalVisits || 0,
      );
    }),
    motionReady,
  ]);
  graphLoaded.value = true;
});

onBeforeUnmount(() => {
  animationContext?.revert();
  animationContext = null;
});

function fallbackStar(index: number) {
  const x = (index * 37 + index * index * 11) % 100;
  const y = (index * 61 + index * index * 7) % 100;
  return {
    left: `${x}%`,
    top: `${y}%`,
    animationDelay: `${(index % 11) * -0.31}s`,
    "--star-size": `${1 + (index % 3)}px`,
  };
}

useHead({ title: computed(() => siteTitle.value) });
</script>

<style scoped>
.portal {
  --space-accent: hsl(var(--hue-theme) 100% 68%);
  --space-accent-soft: hsl(var(--hue-theme) 100% 68% / 14%);
  --space-text: #f4f7fb;
  --space-muted: #9ca9b8;
  position: fixed;
  z-index: 50;
  inset: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #030712;
  color: var(--space-text);
  isolation: isolate;
  scrollbar-width: none;
}
.portal::-webkit-scrollbar {
  display: none;
}
.portal-scene {
  position: fixed;
  z-index: -3;
  inset: 0;
  overflow: hidden;
}
.portal-scene :deep(.constellation-scene) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.scene-vignette {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 190px 40px rgb(2 7 18 / 72%);
  pointer-events: none;
}
.scene-fallback {
  position: absolute;
  inset: 0;
  background: #030712;
  opacity: 0;
  transition: opacity 0.8s ease;
}
.scene-fallback.visible {
  opacity: 1;
}
.entry-loading { position:fixed; z-index:30; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:32px; color:var(--space-text); text-align:center; pointer-events:auto; background:linear-gradient(180deg,rgb(3 7 18 / 97%),rgb(5 12 25 / 94%)); backdrop-filter:blur(22px); transition:opacity .7s ease, visibility .7s ease; }
.entry-loading::after { position:absolute; right:clamp(22px,5vw,72px); bottom:clamp(22px,5vw,58px); left:clamp(22px,5vw,72px); height:1px; background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--space-accent) 42%,transparent),transparent); content:""; opacity:.48; }
.entry-loading > * { position:relative; z-index:1; }
.entry-ready .entry-loading { opacity:0; visibility:hidden; pointer-events:none; }
.entry-loading strong { display:flex; align-items:center; gap:8px; color:var(--space-text); font-family:var(--font-mono); font-size:.62rem; font-weight:650; letter-spacing:.08em; }
.entry-loading strong::before { width:5px; height:5px; border:1px solid var(--space-accent); background:var(--space-accent); box-shadow:0 0 12px color-mix(in srgb,var(--space-accent) 76%,transparent); content:""; }
.entry-loading small { color:color-mix(in srgb,var(--space-muted) 84%,transparent); font-size:.54rem; letter-spacing:.04em; }
.entry-loader { display:flex; width:min(180px,58vw); height:2px; justify-content:stretch; gap:4px; margin-bottom:6px; overflow:hidden; background:rgb(255 255 255 / 10%); }
.entry-loader i { display:block; flex:1; height:100%; background:var(--space-accent); box-shadow:0 0 14px color-mix(in srgb,var(--space-accent) 68%,transparent); animation:entry-pulse 1.35s ease-in-out infinite; transform-origin:left center; }
.entry-loader i:nth-child(2) { animation-delay:.15s; }.entry-loader i:nth-child(3) { animation-delay:.3s; }
@keyframes entry-pulse { 0%,100% { opacity:.24; transform:scaleX(.38) } 50% { opacity:1; transform:scaleX(1) } }
.scene-fallback i {
  position: absolute;
  width: var(--star-size);
  height: var(--star-size);
  border-radius: 50%;
  background: #e6f4ff;
  box-shadow: 0 0 10px var(--space-accent);
  animation: star-breathe 3.2s ease-in-out infinite alternate;
}
.scene-grid { position:absolute; inset:-20%; opacity:.18; background-image:linear-gradient(color-mix(in srgb,var(--space-accent) 14%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--space-accent) 14%,transparent) 1px,transparent 1px); background-size:72px 72px; transform:perspective(600px) rotateX(62deg) translateY(28%); transform-origin:center bottom; mask-image:linear-gradient(transparent 0%,#000 50%,transparent 100%); animation:grid-drift 18s linear infinite; pointer-events:none; }
.scene-scanline { position:absolute; inset:0; background:linear-gradient(180deg,transparent 0%,color-mix(in srgb,var(--space-accent) 14%,transparent) 49%,transparent 51%,transparent 100%); background-size:100% 220px; mix-blend-mode:screen; opacity:.24; animation:scan-drift 8s linear infinite; pointer-events:none; }
@keyframes grid-drift { to { background-position:0 72px,0 72px; } }
@keyframes scan-drift { to { background-position:0 220px; } }
.portal-nav {
  position: fixed;
  z-index: 20;
  top: 0;
  right: clamp(22px, 3vw, 48px);
  left: clamp(22px, 3vw, 48px);
  display: flex;
  height: 76px;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  pointer-events: none;
}
.brand-mark {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
  text-align: left;
  pointer-events: auto;
}
.brand-mark img {
  width: 38px;
  height: 38px;
  border: 1px solid color-mix(in srgb, var(--space-accent) 30%, transparent);
  border-radius: 8px;
  box-shadow: 0 8px 26px rgb(0 0 0 / 34%);
}
.brand-mark > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}
.brand-mark strong {
  overflow: hidden;
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.brand-mark small,
.scene-status,
.chapter-indicator {
  font-family: var(--font-mono);
  font-size: 0.48rem;
  letter-spacing: 0;
}
.brand-mark small {
  color: var(--space-muted);
}
.nav-end {
  display: flex;
  align-items: center;
  gap: 22px;
  pointer-events: auto;
}
.chapter-indicator {
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgb(255 255 255 / 34%);
  font-family: var(--font-mono);
  font-size: 0.47rem;
}
.chapter-indicator b {
  color: var(--space-accent);
  font-size: 0.58rem;
}
.chapter-indicator i {
  width: 28px;
  height: 1px;
  background: rgb(255 255 255 / 18%);
}
.scene-status {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--space-muted);
}
.scene-status i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #777;
  transition:
    background 0.4s ease,
    box-shadow 0.4s ease;
}
.scene-status i.online {
  background: var(--space-accent);
  box-shadow: 0 0 12px var(--space-accent);
}
.portal-rail {
  position: fixed;
  z-index: 22;
  top: 50%;
  right: clamp(17px, 2.2vw, 34px);
  display: flex;
  width: 92px;
  flex-direction: column;
  gap: 18px;
  transform: translateY(-50%);
}
.portal-rail::before,
.rail-progress {
  position: absolute;
  top: 7px;
  bottom: 7px;
  left: 4px;
  width: 1px;
  background: rgb(255 255 255 / 12%);
  content: "";
}
.rail-progress {
  z-index: 1;
  background: transparent;
}
.rail-progress i {
  display: block;
  width: 1px;
  height: 100%;
  background: var(--space-accent);
  box-shadow: 0 0 10px var(--space-accent);
  transform: scaleY(0);
  transform-origin: top;
}
.portal-rail button {
  position: relative;
  z-index: 2;
  display: grid;
  width: 100%;
  grid-template-columns: 9px 20px minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  padding: 0;
  border: 0;
  background: none;
  color: rgb(255 255 255 / 28%);
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.portal-rail button > i {
  width: 9px;
  height: 9px;
  border: 1px solid currentColor;
  border-radius: 50%;
  background: #030712;
  transition:
    background 0.35s ease,
    border-color 0.35s ease,
    box-shadow 0.35s ease,
    transform 0.35s ease;
}
.portal-rail button span,
.portal-rail button small {
  font-family: var(--font-mono);
  font-size: 0.43rem;
  letter-spacing: 0;
  transition:
    color 0.35s ease,
    opacity 0.35s ease;
}
.portal-rail button small {
  opacity: 0;
  white-space: nowrap;
  transform: translateX(4px);
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}
.portal-rail button:hover small,
.portal-rail button.active small {
  opacity: 1;
  transform: none;
}
.portal-rail button.active {
  color: var(--space-accent);
}
.portal-rail button.active > i {
  border-color: var(--space-accent);
  background: var(--space-accent);
  box-shadow: 0 0 14px var(--space-accent);
  transform: scale(1.18);
}
.portal-scroll {
  position: relative;
  z-index: 2;
}
.portal-stage {
  background: rgb(3 7 18 / 24%);
}
.portal-panel {
  position: relative;
  z-index: 1;
  display: grid;
  width: 100%;
  min-height: 88dvh;
  align-items: center;
  padding: 110px clamp(28px, 8vw, 128px) 66px;
  overflow: hidden;
  perspective: 1200px;
}
.portal-panel::after {
  position: absolute;
  z-index: -1;
  right: clamp(22px, 3vw, 48px);
  bottom: 26px;
  left: clamp(22px, 3vw, 48px);
  height: 1px;
  background: rgb(255 255 255 / 8%);
  content: "";
  pointer-events: none;
}
.panel-index {
  position: absolute;
  top: 118px;
  right: clamp(28px, 6vw, 96px);
  color: rgb(255 255 255 / 16%);
  font-family: var(--font-mono);
  font-size: 0.62rem;
}
.panel-index::before {
  display: inline-block;
  width: 48px;
  height: 1px;
  margin-right: 10px;
  background: currentColor;
  content: "";
  vertical-align: middle;
}
.hero-copy {
  width: min(720px, 86vw);
  will-change: transform, opacity;
}
.hero-panel {
  min-height: 100dvh;
}
.portal-kicker,
.section-kicker {
  display: block;
  color: var(--space-accent);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0;
}
.hero-copy h1 {
  max-width: 100%;
  margin: 20px 0 0;
  color: var(--space-text);
  font-size: clamp(3.5rem, 7vw, 6.7rem);
  line-height: 0.96;
  letter-spacing: 0;
  text-shadow: 0 20px 70px rgb(0 0 0 / 72%);
  overflow-wrap: anywhere;
}
.hero-statement {
  margin: 24px 0 0;
  color: var(--space-accent);
  font-size: clamp(1.2rem, 2.4vw, 2rem);
}
.hero-description {
  max-width: 440px;
  margin: 20px 0 0;
  color: var(--space-muted);
  font-size: 0.78rem;
  line-height: 1.95;
}
.scroll-cue {
  position: absolute;
  bottom: 48px;
  left: clamp(28px, 8vw, 128px);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--space-muted);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.48rem;
}
.scroll-cue i {
  display: grid;
  width: 34px;
  height: 34px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 50%;
  color: var(--space-accent);
  place-items: center;
  animation: cue-bob 1.8s ease-in-out infinite;
}
.hero-coordinate {
  position: absolute;
  right: clamp(28px, 6vw, 92px);
  bottom: 50px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgb(255 255 255 / 34%);
  font-family: var(--font-mono);
  font-size: 0.45rem;
}
.hero-coordinate i {
  width: 36px;
  height: 1px;
  background: currentColor;
}
.section-copy {
  width: min(610px, 80vw);
}
.section-copy h2,
.choice-copy h2 {
  margin: 22px 0 0;
  color: var(--space-text);
  font-size: clamp(2.5rem, 4.7vw, 4.5rem);
  line-height: 1.1;
  letter-spacing: 0;
  text-wrap: balance;
}
.section-copy > p,
.choice-copy > p {
  max-width: 430px;
  margin: 25px 0 0;
  color: var(--space-muted);
  font-size: 0.78rem;
  line-height: 1.95;
}
.story-panel {
  align-items: center;
}
.time-axis {
  position: absolute;
  right: clamp(28px, 7vw, 112px);
  bottom: 76px;
  left: 48%;
  display: flex;
  align-items: center;
  color: var(--space-muted);
}
.time-axis > span {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.time-axis small {
  color: var(--space-accent);
  font-family: var(--font-mono);
  font-size: 0.44rem;
}
.time-axis b {
  color: var(--space-text);
  font-size: 0.58rem;
  font-weight: 500;
}
.time-axis > i {
  position: relative;
  height: 1px;
  flex: 1;
  margin: 0 14px;
  background: rgb(255 255 255 / 20%);
}
.time-axis > i em {
  position: absolute;
  top: -2px;
  left: 40%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--space-accent);
  box-shadow: 0 0 12px var(--space-accent);
}
.archive-panel {
  justify-items: end;
}
.archive-copy {
  position: relative;
  z-index: 2;
}
.archive-orbit {
  position: absolute;
  top: 50%;
  left: clamp(32px, 11vw, 170px);
  width: min(27vw, 330px);
  aspect-ratio: 1;
  transform: translateY(-50%);
}
.archive-orbit > i {
  position: absolute;
  inset: calc(var(--orbit, 0) * 12%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 50%;
  animation: orbit-spin 18s linear infinite;
}
.archive-orbit > i:nth-child(1) {
  --orbit: 0;
}
.archive-orbit > i:nth-child(2) {
  --orbit: 1;
  animation-duration: 13s;
  animation-direction: reverse;
}
.archive-orbit > i:nth-child(3) {
  --orbit: 2;
  animation-duration: 9s;
}
.archive-orbit span {
  position: absolute;
  top: 13%;
  left: 13%;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--space-accent);
  box-shadow: 0 0 24px var(--space-accent);
}
.archive-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 38px;
  border-top: 1px solid rgb(255 255 255 / 14%);
  border-bottom: 1px solid rgb(255 255 255 / 14%);
}
.archive-metrics div {
  padding: 14px 16px;
  border-right: 1px solid rgb(255 255 255 / 14%);
}
.archive-metrics div:last-child {
  border-right: 0;
}
.archive-metrics dt {
  color: var(--space-text);
  font-family: var(--font-mono);
  font-size: 1.3rem;
}
.archive-metrics dd {
  margin-top: 5px;
  color: var(--space-muted);
  font-size: 0.5rem;
}
.choice-panel {
  min-height: 96dvh;
  place-items: center;
  text-align: center;
}
.choice-copy {
  width: min(780px, 90vw);
}
.choice-copy > p {
  margin-right: auto;
  margin-left: auto;
}
.portal-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 38px;
  text-align: left;
}
.portal-actions button {
  display: grid;
  min-width: 0;
  height: 76px;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  padding: 0 17px;
  border-radius: 7px;
  cursor: pointer;
  font: inherit;
  transition:
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.35s ease,
    background-color 0.35s ease;
}
.portal-actions button:hover {
  transform: translateY(-4px);
}
.primary-action {
  border: 1px solid var(--space-accent);
  background: var(--space-accent);
  color: #07100e;
}
.secondary-action {
  border: 1px solid rgb(255 255 255 / 20%);
  background: rgb(3 7 18 / 66%);
  color: var(--space-text);
  backdrop-filter: blur(14px);
}
.secondary-action:hover {
  border-color: var(--space-accent);
  background: rgb(5 15 30 / 82%);
}
.action-icon {
  display: grid;
  width: 38px;
  height: 38px;
  border: 1px solid currentColor;
  border-radius: 50%;
  place-items: center;
}
.portal-actions button > span:nth-child(2) {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}
.portal-actions small {
  font-family: var(--font-mono);
  font-size: 0.42rem;
}
.portal-actions b {
  font-size: 0.72rem;
}
.portal-footer {
  position: absolute;
  right: clamp(28px, 5vw, 76px);
  bottom: 25px;
  left: clamp(28px, 5vw, 76px);
  display: flex;
  justify-content: space-between;
  color: rgb(255 255 255 / 42%);
  font-size: 0.48rem;
}
@keyframes cue-bob {
  50% {
    transform: translateY(5px);
  }
}
@keyframes star-breathe {
  to {
    opacity: 0.25;
    transform: scale(0.65);
  }
}
@keyframes orbit-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 760px) {
  .portal-nav {
    right: 18px;
    left: 18px;
    height: 68px;
  }
  .brand-mark img {
    width: 38px;
    height: 38px;
  }
  .brand-mark small,
  .scene-status {
    display: none;
  }
  .nav-end {
    gap: 8px;
  }
  .portal-rail {
    right: 10px;
    width: 10px;
    gap: 20px;
  }
  .portal-rail button {
    display: block;
    width: 10px;
    height: 10px;
  }
  .portal-rail button span,
  .portal-rail button small {
    display: none;
  }
  .portal-panel {
    min-height: 84svh;
    padding: 96px 22px 72px;
  }
  .hero-panel {
    min-height: 100svh;
  }
  .panel-index {
    top: 94px;
    right: 22px;
  }
  .hero-copy {
    width: 100%;
  }
  .hero-copy h1 {
    font-size: clamp(3.2rem, 18vw, 5.6rem);
  }
  .hero-statement {
    font-size: 1.35rem;
  }
  .hero-description {
    max-width: 310px;
    font-size: 0.7rem;
  }
  .scroll-cue {
    bottom: 34px;
    left: 22px;
  }
  .hero-coordinate {
    display: none;
  }
  .section-copy {
    width: 100%;
  }
  .section-copy h2,
  .choice-copy h2 {
    font-size: clamp(2.5rem, 12vw, 4rem);
  }
  .time-axis {
    right: 22px;
    bottom: 42px;
    left: 22px;
  }
  .archive-panel {
    align-items: end;
    justify-items: start;
    padding-bottom: 118px;
  }
  .archive-orbit {
    top: 24%;
    left: 50%;
    width: min(58vw, 280px);
    transform: translate(-50%, -50%);
    opacity: 0.65;
  }
  .archive-metrics {
    margin-top: 28px;
  }
  .archive-metrics div {
    padding: 12px 9px;
  }
  .archive-metrics dt {
    font-size: 1rem;
  }
  .choice-panel {
    min-height: 100svh;
    padding-right: 18px;
    padding-left: 18px;
  }
  .choice-copy {
    width: 100%;
  }
  .portal-actions {
    grid-template-columns: 1fr;
  }
  .portal-actions button {
    height: 70px;
  }
  .portal-footer {
    align-items: center;
    flex-direction: column;
    gap: 4px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .portal-panel {
    min-height: 100svh;
    opacity: 1 !important;
  }
  [data-reveal] {
    opacity: 1 !important;
    transform: none !important;
  }
  .portal-scene,
  .hero-copy,
  [data-parallax] {
    opacity: 1 !important;
    transform: none !important;
  }
  .scroll-cue i,
  .scene-fallback i,
  .archive-orbit > i {
    animation: none;
  }
  .portal-actions button {
    transition: none;
  }
}
</style>

<template>
  <main class="portal">
    <TimeConstellationScene
      :nodes="graph.nodes"
      :relations="graph.relations"
      :graph-version="graph.graphVersion"
      :resolve-image="mediaUrl"
      ambient
      @ready="sceneReady = true"
      @fallback="sceneFailed = true"
    />
    <div class="cosmic-wash" aria-hidden="true" />
    <div class="portal-frame" aria-hidden="true" />

    <header class="portal-nav">
      <div class="brand-mark">
        <img src="/logo_192.png" alt="" width="42" height="42">
        <div><strong>{{ siteTitle }}</strong><span>PERSONAL TIME UNIVERSE · {{ currentYear }}</span></div>
      </div>
      <div class="nav-actions">
        <span class="scene-status"><i :class="{ online: sceneReady && graphLoaded }" />{{ sceneStatus }}</span>
      </div>
    </header>

    <section class="portal-copy" aria-labelledby="portal-title">
      <div class="portal-kicker"><span>TIME / PLACE / MEMORY</span><i /><em>{{ timeRange }}</em></div>
      <h1 id="portal-title"><span>时光</span><span>星图</span></h1>
      <p>把写下的日子、抵达的地方与偶然心动，放回同一片宇宙。每一次真实记录，都会在时间轨道上留下自己的光。</p>
      <div class="portal-actions">
        <button class="explore-action" type="button" :disabled="navigating" @click="navigate('/time/constellation')">
          <Icon name="ph:sparkle-bold" />
          <span>进入我的宇宙</span>
          <Icon name="ph:arrow-up-right-bold" />
        </button>
        <button class="home-action" type="button" :disabled="navigating" @click="navigate('/home')"><span>阅读随笔</span><Icon name="ph:arrow-right-bold" /></button>
      </div>
      <div v-if="latest" class="latest-thread">
        <i /><span><small>最近点亮 · {{ formatDate(latest.occurredAt) }}</small><strong>{{ latest.title }}</strong></span>
      </div>
    </section>

    <aside class="visitor-signal" aria-label="累计来访人数">
      <small>FELLOW TRAVELERS</small>
      <strong>{{ formatNumber(overview.visitors) }}</strong>
      <span>位旅人曾经过这里</span>
    </aside>

    <footer class="portal-foot">
      <span><b />{{ graph.nodes.length }} 枚记忆正在发光</span><i /><span>所有坐标都来自真实生活</span>
    </footer>

    <div v-if="sceneFailed" class="scene-fallback" aria-hidden="true"><i v-for="index in 22" :key="index" :style="fallbackStar(index)" /></div>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'welcome' })

type GraphNode = { id:string; type:string; title:string; occurredAt?:string|null; coordinateSeed?:number; metadata?:Record<string,unknown>; image?:string|null }
const api = useApi()
const { mediaUrl } = useMediaUrl()
const { siteTitle, loadSiteSettings } = useSiteSettings()
const { navigating, navigate } = useCosmicNavigation()
const graph = reactive<{nodes:GraphNode[];relations:any[];graphVersion:string}>({ nodes:[], relations:[], graphVersion:'' })
const overview = reactive({ visitors:0 })
const sceneReady = ref(false)
const sceneFailed = ref(false)
const graphLoaded = ref(false)
const currentYear = new Date().getFullYear()
const latest = computed(() => [...graph.nodes].filter(node=>node.occurredAt).sort((a,b)=>new Date(b.occurredAt!).getTime()-new Date(a.occurredAt!).getTime())[0])
const nodeYears = computed(() => graph.nodes.map(node=>node.occurredAt?new Date(node.occurredAt).getFullYear():NaN).filter(Number.isFinite))
const timeRange = computed(() => nodeYears.value.length ? `${Math.min(...nodeYears.value)} — ${Math.max(...nodeYears.value)}` : '等待第一段记忆')
const sceneStatus = computed(() => !sceneReady.value || !graphLoaded.value
  ? '正在连接时间'
  : graph.nodes.length ? `${graph.nodes.length} 枚真实记忆已点亮` : '宇宙底图运行中 · 等待首次点亮')

onMounted(async () => {
  await Promise.allSettled([
    loadSiteSettings(),
    api.get<any>('/memories/graph',{view:'constellation',limit:320}).then(result=>Object.assign(graph,result)),
    api.get<any>('/stats/overview').then(result=>Object.assign(overview,result)),
  ])
  graphLoaded.value = true
})

function formatNumber(value:number){return new Intl.NumberFormat('zh-CN',{notation:value>=10000?'compact':'standard',maximumFractionDigits:1}).format(value||0)}
function formatDate(value?:string|null){return value?new Date(value).toLocaleDateString('zh-CN',{year:'numeric',month:'short'}):'未标时间'}
function fallbackStar(index:number){const seed=(index*47)%100;return{left:`${(seed*13)%100}%`,top:`${(seed*29)%100}%`,animationDelay:`${index*.13}s`}}
useHead({title:computed(()=>siteTitle.value)})
</script>

<style scoped>
.portal { position:fixed; z-index:50; inset:0; min-width:0; min-height:100dvh; overflow:hidden; isolation:isolate; background:#090d0f; color:#f4efe4; }
.portal :deep(.constellation-scene) { z-index:-4; view-transition-name:cosmic-scene; }
.cosmic-wash { position:absolute; z-index:-3; inset:0; background:rgba(7,10,11,.22); pointer-events:none; }
.portal-frame { position:absolute; z-index:8; inset:12px; border:1px solid rgba(227,190,119,.16); pointer-events:none; }
.portal-frame::before,.portal-frame::after { position:absolute; width:44px; height:44px; border-color:#d9a760; content:''; }
.portal-frame::before { top:-1px; left:-1px; border-top:1px solid; border-left:1px solid; }
.portal-frame::after { right:-1px; bottom:-1px; border-right:1px solid; border-bottom:1px solid; }
.portal-nav { position:absolute; z-index:4; top:0; right:0; left:0; display:flex; min-width:0; align-items:center; justify-content:space-between; gap:18px; padding:28px 34px; }
.brand-mark { display:flex; min-width:0; align-items:center; gap:11px; }
.brand-mark img { width:42px; height:42px; border:1px solid rgba(221,191,132,.28); border-radius:8px; box-shadow:0 0 28px rgba(224,171,89,.18); }
.brand-mark div { display:flex; min-width:0; flex-direction:column; }
.brand-mark strong { overflow:hidden; font-family:var(--font-serif,var(--font-body)); font-size:.88rem; text-overflow:ellipsis; white-space:nowrap; }
.brand-mark span { margin-top:3px; color:#a99373; font-size:.5rem; }
.nav-actions { display:flex; align-items:center; gap:17px; }
.scene-status { display:flex; align-items:center; gap:7px; color:#9ba99d; font-size:.58rem; }
.scene-status i { width:6px; height:6px; border-radius:50%; background:#a99162; box-shadow:0 0 0 4px rgba(210,167,87,.12); }
.scene-status i.online { background:#7bc5ad; box-shadow:0 0 0 4px rgba(123,197,173,.12),0 0 14px rgba(123,197,173,.5); }
.portal-copy { position:absolute; z-index:3; top:50%; left:clamp(34px,7vw,112px); width:min(560px,calc(100vw - 68px)); transform:translateY(-48%); }
.portal-kicker { display:flex; align-items:center; gap:10px; color:#d9a760; font-size:.58rem; font-weight:700; }
.portal-kicker i { width:44px; height:1px; background:#9b7142; }
.portal-kicker em { color:#a7b19f; font-style:normal; }
.portal-copy h1 { display:flex; flex-direction:column; margin:18px 0 0; font-family:var(--font-serif,var(--font-body)); font-size:clamp(4rem,9vw,8rem); font-weight:760; line-height:.86; text-shadow:0 14px 52px rgba(0,0,0,.42); }
.portal-copy h1 span:last-child { margin-left:clamp(28px,4vw,72px); color:#dfb46f; }
.portal-copy>p { max-width:470px; margin:24px 0 0; color:#b3b9aa; font-size:clamp(.82rem,1.4vw,1rem); line-height:1.9; }
.portal-actions { display:flex; align-items:center; gap:9px; margin-top:30px; }
.portal-actions button { font:inherit; }
.explore-action,.home-action { display:flex; height:46px; align-items:center; border-radius:5px; cursor:pointer; transition:border-color .28s ease,background .28s ease,color .28s ease,transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s ease; }
.explore-action { gap:9px; padding:0 12px 0 14px; border:1px solid rgba(221,181,105,.62); background:rgba(147,96,39,.28); color:#f8edda; box-shadow:0 10px 28px rgba(0,0,0,.18); }
.explore-action span { font-size:.68rem; font-weight:700; }
.explore-action> :deep(svg):first-child { color:#e0b66e; font-size:.88rem; }
.explore-action> :deep(svg):last-child { margin-left:5px; color:#f0d3a0; font-size:.82rem; }
.explore-action:hover { border-color:#f0c979; background:rgba(163,107,41,.42); transform:translateY(-2px); }
.home-action { gap:8px; padding:0 13px; border:1px solid rgba(184,190,167,.22); background:rgba(14,22,20,.38); color:#c1c8b9; }
.home-action:hover { border-color:rgba(184,210,182,.5); background:rgba(25,44,37,.5); color:#eff5e7; transform:translateY(-2px); }
.home-action span { font-size:.65rem; }
.home-action :deep(svg) { font-size:.76rem; }
.latest-thread { display:flex; align-items:center; gap:12px; margin-top:36px; color:#9fa996; }
.latest-thread>i { width:34px; height:1px; background:#b2814d; }
.latest-thread span { display:flex; flex-direction:column; gap:4px; min-width:0; }
.latest-thread small { color:#b28f61; font-size:.53rem; }
.latest-thread strong { overflow:hidden; max-width:320px; font-size:.68rem; text-overflow:ellipsis; white-space:nowrap; }
.visitor-signal { position:absolute; z-index:3; right:clamp(32px,6vw,94px); bottom:74px; display:flex; flex-direction:column; align-items:flex-end; padding-right:18px; border-right:1px solid rgba(213,168,91,.35); color:#d8dfd0; }
.visitor-signal small { color:#ae9060; font-size:.5rem; }
.visitor-signal strong { margin-top:5px; color:#f1c77b; font-size:2rem; font-variant-numeric:tabular-nums; line-height:1; }
.visitor-signal span { margin-top:5px; color:#8f9b8c; font-size:.58rem; }
.portal-foot { position:absolute; z-index:3; right:34px; bottom:27px; left:34px; display:flex; align-items:center; gap:12px; color:#879384; font-size:.49rem; }
.portal-foot i { width:58px; height:1px; background:rgba(208,183,133,.25); }
.portal-foot span { display:flex; align-items:center; gap:6px; }
.portal-foot b { width:5px; height:5px; border-radius:50%; background:#d7a85e; box-shadow:0 0 10px #d7a85e; }
.scene-fallback { position:absolute; z-index:-2; inset:0; }
.scene-fallback i { position:absolute; width:2px; height:2px; border-radius:50%; background:#e7ddc7; box-shadow:0 0 8px #d7a85e; animation:star-pulse 2.4s ease-in-out infinite; }
.nav-actions button:focus-visible { outline:2px solid #e1b86f; outline-offset:3px; }
@keyframes star-pulse { 50% { opacity:.22; transform:scale(.55); } }
@media(max-width:860px) { .scene-status { display:none; } .portal-copy { left:34px; } .visitor-signal { right:24px; } }
@media(max-width:640px) { .portal-nav { padding:22px 22px; } .brand-mark span { font-size:.44rem; } .portal-frame { inset:8px; } .portal-copy { top:auto; right:20px; bottom:176px; left:20px; width:auto; transform:none; } .portal-copy h1 { margin-top:13px; font-size:clamp(3.35rem,17vw,5rem); } .portal-copy>p { margin-top:18px; font-size:.76rem; line-height:1.75; } .portal-actions { margin-top:22px; } .explore-action,.home-action { height:44px; } .explore-action { flex:1; justify-content:center; } .home-action { justify-content:center; } .latest-thread { margin-top:22px; } .visitor-signal { right:20px; bottom:48px; padding-right:10px; } .visitor-signal strong { font-size:1.55rem; } .portal-foot { display:none; } }
@media(max-height:700px) and (min-width:641px) { .portal-copy { top:47%; } .portal-copy h1 { font-size:4.5rem; } .portal-actions { margin-top:22px; } .visitor-signal { bottom:54px; } }
@media(prefers-reduced-motion:reduce) { .explore-action,.scene-fallback i { transition:none; animation:none; } }
</style>

<template>
  <main class="portal">
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
        <span class="portal-loading-orbit"><i /><i /><i /></span>
        <small>{{ graphLoaded ? '正在校准星图轨道' : '正在读取时间坐标' }}</small>
      </div>
    </Transition>
    <div class="cosmic-wash" aria-hidden="true" />
    <div class="portal-frame" aria-hidden="true" />

    <header class="portal-nav">
      <div class="brand-mark">
        <img src="/logo_192.png" alt="" width="42" height="42">
        <div><strong>{{ siteTitle }}</strong><span>TIME CONSTELLATION · {{ currentYear }}</span></div>
      </div>
      <div class="nav-actions">
        <span class="scene-status"><i :class="{ online: sceneReady && graphLoaded }" />{{ sceneStatus }}</span>
      </div>
    </header>

    <section class="portal-copy" aria-labelledby="portal-title">
      <div class="portal-kicker"><span>TIME CONSTELLATION</span><i /></div>
      <h1 id="portal-title"><span>时光</span><span>星图</span></h1>
      <p>把值得记住的日子，安放进一片会发光的宇宙。</p>
      <div class="portal-actions">
        <button class="explore-action" type="button" :disabled="navigating" @click="navigate('/time/constellation')">
          <span class="button-orbit" aria-hidden="true"><i /><i /><i /></span>
          <span>进入时光星图</span>
          <Icon name="ph:arrow-up-right-bold" />
        </button>
        <button class="home-action" type="button" :disabled="navigating" @click="navigate('/home')"><span>进入随笔</span><Icon name="ph:arrow-right-bold" /></button>
      </div>
    </section>

    <aside class="visitor-signal" aria-label="累计来访人数">
      <small>FELLOW TRAVELERS</small>
      <strong>{{ formatNumber(overview.visitors) }}</strong>
      <span>位旅人曾经过这里</span>
    </aside>

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
function fallbackStar(index:number){const seed=(index*47)%100;return{left:`${(seed*13)%100}%`,top:`${(seed*29)%100}%`,animationDelay:`${index*.13}s`}}
useHead({title:computed(()=>siteTitle.value)})
</script>

<style scoped>
.portal { position:fixed; z-index:50; inset:0; min-width:0; min-height:100dvh; overflow:hidden; isolation:isolate; background:#020817; color:#edf7ff; }
.portal :deep(.constellation-scene) { z-index:-4; view-transition-name:cosmic-scene; }
.cosmic-wash { position:absolute; z-index:-3; inset:0; background:radial-gradient(circle at 16% 44%,rgb(32 91 141 / .2),transparent 34%),linear-gradient(90deg,rgb(2 8 23 / .76),rgb(2 8 23 / .12) 58%,rgb(3 15 31 / .22)); pointer-events:none; }
.portal-frame { position:absolute; z-index:8; inset:12px; border:1px solid rgb(104 191 235 / .15); pointer-events:none; }
.portal-loading { position:absolute; z-index:12; inset:0; display:grid; align-content:center; justify-items:center; gap:18px; background:#020817; color:#80b9d8; transition:opacity .5s ease; }
.portal-loading small { font-size:.62rem; letter-spacing:.12em; }
.portal-loading-orbit { position:relative; display:block; width:62px; height:62px; border:1px solid rgb(104 200 255 / .28); border-radius:50%; animation:portal-loading-spin 5s linear infinite; }
.portal-loading-orbit::before { position:absolute; inset:12px; border:1px solid rgb(121 169 255 / .34); border-radius:50%; content:''; }
.portal-loading-orbit i { position:absolute; top:-4px; left:50%; width:7px; height:7px; border-radius:50%; background:#6ed8ff; box-shadow:0 0 16px #51c8ff; transform:translateX(-50%); }
.portal-loading-orbit i:nth-child(2) { top:50%; right:-4px; left:auto; background:#9d8cff; }
.portal-loading-orbit i:nth-child(3) { top:auto; bottom:-4px; left:22%; background:#74e0c6; }
@keyframes portal-loading-spin { to { transform:rotate(360deg); } }
.portal-loader-leave-active { transition:opacity .65s ease; }
.portal-loader-leave-to { opacity:0; }
.portal-frame::before,.portal-frame::after { position:absolute; width:42px; height:42px; border-color:#5bc9f1; content:''; }
.portal-frame::before { top:-1px; left:-1px; border-top:1px solid; border-left:1px solid; }
.portal-frame::after { right:-1px; bottom:-1px; border-right:1px solid; border-bottom:1px solid; }
.portal-nav { position:absolute; z-index:4; top:0; right:0; left:0; display:flex; min-width:0; align-items:center; justify-content:space-between; gap:18px; padding:28px 34px; }
.brand-mark { display:flex; min-width:0; align-items:center; gap:11px; }
.brand-mark img { width:42px; height:42px; border:1px solid rgb(112 205 247 / .3); border-radius:12px; box-shadow:0 0 28px rgb(52 157 218 / .22); }
.brand-mark div { display:flex; min-width:0; flex-direction:column; }
.brand-mark strong { overflow:hidden; font-family:var(--font-serif,var(--font-body)); font-size:.88rem; text-overflow:ellipsis; white-space:nowrap; }
.brand-mark span { margin-top:3px; color:#74b8d7; font-size:.5rem; letter-spacing:.08em; }
.nav-actions { display:flex; align-items:center; gap:17px; }
.scene-status { display:flex; align-items:center; gap:7px; color:#94adbf; font-size:.58rem; }
.scene-status i { width:6px; height:6px; border-radius:50%; background:#647e94; box-shadow:0 0 0 4px rgb(91 164 207 / .1); }
.scene-status i.online { background:#65dfc4; box-shadow:0 0 0 4px rgb(84 214 190 / .12),0 0 14px rgb(73 206 195 / .52); }
.portal-copy { position:absolute; z-index:3; top:50%; left:clamp(34px,7vw,112px); width:min(440px,calc(100vw - 68px)); transform:translateY(-44%); }
.portal-kicker { display:flex; align-items:center; gap:10px; color:#72c9ef; font-size:.58rem; font-weight:700; letter-spacing:.14em; }
.portal-kicker i { width:38px; height:1px; background:#3d8db7; }
.portal-copy h1 { display:flex; flex-direction:column; margin:17px 0 0; font-family:var(--font-serif,var(--font-body)); font-size:clamp(3.6rem,7.5vw,6.5rem); font-weight:760; line-height:.88; text-shadow:0 14px 52px rgb(0 0 0 / .42); }
.portal-copy h1 span:last-child { margin-left:clamp(24px,3.2vw,54px); color:#8edcff; text-shadow:0 0 34px rgb(72 186 242 / .28); }
.portal-copy>p { max-width:330px; margin:22px 0 0; color:#a2bdcd; font-size:clamp(.78rem,1.2vw,.9rem); line-height:1.8; }
.portal-actions { display:flex; align-items:center; gap:10px; margin-top:26px; }
.portal-actions button { font:inherit; }
.explore-action,.home-action { display:flex; height:46px; align-items:center; border-radius:999px; cursor:pointer; transition:border-color .28s ease,background .28s ease,color .28s ease,transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s ease; }
.explore-action { position:relative; gap:9px; overflow:hidden; padding:0 14px 0 12px; border:1px solid rgb(102 211 255 / .58); background:linear-gradient(110deg,rgb(31 105 157 / .55),rgb(37 67 146 / .36)); color:#eaf8ff; box-shadow:0 12px 28px rgb(0 0 0 / .22),inset 0 1px rgb(194 239 255 / .2); }
.explore-action::after { position:absolute; top:-40%; left:-32%; width:24%; height:180%; background:linear-gradient(100deg,transparent,rgb(207 249 255 / .36),transparent); content:''; transform:rotate(22deg) translateX(-200%); transition:transform .7s ease; }
.explore-action:hover::after { transform:rotate(22deg) translateX(700%); }
.explore-action:hover { border-color:#9be9ff; background:linear-gradient(110deg,rgb(38 130 179 / .64),rgb(45 80 165 / .48)); transform:translateY(-3px); box-shadow:0 16px 34px rgb(21 125 188 / .22),0 0 24px rgb(74 193 241 / .15); }
.explore-action>span:not(.button-orbit) { position:relative; z-index:1; font-size:.68rem; font-weight:700; }
.explore-action> :deep(svg) { position:relative; z-index:1; margin-left:4px; color:#aeeaff; font-size:.82rem; }
.button-orbit { position:relative; display:block; width:20px; height:20px; border:1px solid rgb(124 224 255 / .55); border-radius:50%; animation:button-orbit-spin 4.2s linear infinite; }
.button-orbit::before { position:absolute; inset:4px; border:1px solid rgb(130 164 255 / .6); border-radius:50%; content:''; }
.button-orbit i { position:absolute; top:-2px; left:50%; width:4px; height:4px; border-radius:50%; background:#8be4ff; box-shadow:0 0 8px #7ddcff; transform:translateX(-50%); }
.button-orbit i:nth-child(2) { top:50%; right:-2px; left:auto; background:#ad98ff; box-shadow:0 0 8px #9e8dff; transform:translateY(-50%); }
.button-orbit i:nth-child(3) { top:auto; bottom:-2px; left:24%; background:#72e1c4; box-shadow:0 0 8px #67d9bc; }
.home-action { gap:8px; padding:0 13px; border:1px solid rgb(143 188 211 / .22); background:rgb(8 28 46 / .34); color:#a9c2d0; }
.home-action:hover { border-color:rgb(134 214 244 / .5); background:rgb(23 65 88 / .46); color:#eaf8ff; transform:translateY(-2px); }
.home-action span { font-size:.65rem; }
.home-action :deep(svg) { font-size:.76rem; }
.visitor-signal { position:absolute; z-index:3; right:clamp(32px,6vw,94px); bottom:74px; display:flex; flex-direction:column; align-items:flex-end; padding-right:18px; border-right:1px solid rgb(102 191 230 / .3); color:#d4e6ee; }
.visitor-signal small { color:#73a8c4; font-size:.5rem; letter-spacing:.12em; }
.visitor-signal strong { margin-top:5px; color:#9ee6ff; font-size:2rem; font-variant-numeric:tabular-nums; line-height:1; text-shadow:0 0 22px rgb(86 202 240 / .25); }
.visitor-signal span { margin-top:5px; color:#89a5b5; font-size:.58rem; }
.scene-fallback { position:absolute; z-index:-2; inset:0; }
.scene-fallback i { position:absolute; width:2px; height:2px; border-radius:50%; background:#d9f2ff; box-shadow:0 0 8px #6cc9ef; animation:star-pulse 2.4s ease-in-out infinite; }
.nav-actions button:focus-visible { outline:2px solid #72d6ff; outline-offset:3px; }
@keyframes star-pulse { 50% { opacity:.22; transform:scale(.55); } }
@keyframes button-orbit-spin { to { transform:rotate(360deg); } }
@media(max-width:860px) { .scene-status { display:none; } .portal-copy { left:34px; } .visitor-signal { right:24px; } }
@media(max-width:640px) { .portal-nav { padding:22px 22px; } .brand-mark span { font-size:.44rem; } .portal-frame { inset:8px; } .portal-copy { top:auto; right:20px; bottom:178px; left:20px; width:auto; transform:none; } .portal-copy h1 { margin-top:13px; font-size:clamp(3.2rem,16vw,4.8rem); } .portal-copy>p { max-width:260px; margin-top:17px; font-size:.75rem; line-height:1.75; } .portal-actions { margin-top:21px; } .explore-action,.home-action { height:44px; } .explore-action { flex:1; justify-content:center; } .home-action { justify-content:center; } .visitor-signal { right:20px; bottom:48px; padding-right:10px; } .visitor-signal strong { font-size:1.55rem; } }
@media(max-height:700px) and (min-width:641px) { .portal-copy { top:47%; } .portal-copy h1 { font-size:4.5rem; } .portal-actions { margin-top:22px; } .visitor-signal { bottom:54px; } }
@media(prefers-reduced-motion:reduce) { .explore-action,.button-orbit,.scene-fallback i { transition:none; animation:none; } }
</style>

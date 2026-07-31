<template>
  <main class="portal" :class="{ leaving }">
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
        <div><strong>{{ siteTitle }}</strong><span>TIME ARCHIVE · {{ currentYear }}</span></div>
      </div>
      <div class="nav-actions">
        <span class="scene-status"><i :class="{ online: sceneReady && graphLoaded }" />{{ sceneStatus }}</span>
      </div>
    </header>

    <section class="portal-copy" aria-labelledby="portal-title">
      <div class="portal-kicker"><span>TIME CONSTELLATION</span><i /><em>时光星图</em></div>
      <h1 id="portal-title">{{ siteTitle }}</h1>
      <p>{{ siteDescription }}</p>
      <div class="portal-actions">
        <button class="explore-action" type="button" @click="go('/time/constellation')">
          <Icon name="ph:sparkle-bold" />
          <span>探索星图</span>
          <Icon name="ph:arrow-up-right-bold" />
        </button>
        <button class="home-action" type="button" @click="go('/home')"><span>浏览网站</span><Icon name="ph:arrow-right-bold" /></button>
      </div>
    </section>

    <aside class="memory-pulse" aria-label="记忆概况">
      <div class="pulse-head"><span>MEMORY SIGNAL</span><i /></div>
      <div class="pulse-grid">
        <span v-for="item in statItems" :key="item.label"><strong>{{ item.value }}</strong><small>{{ item.label }}</small></span>
      </div>
      <div v-if="latest" class="latest-memory">
        <span><Icon :name="nodeIcon(latest.type)" /></span>
        <div><small>最新点亮 · {{ formatDate(latest.occurredAt) }}</small><strong>{{ latest.title }}</strong></div>
      </div>
    </aside>

    <footer class="portal-foot">
      <span>进入星图后可自由探索</span><i /><span><b />发光天体均来自真实内容</span>
    </footer>

    <div v-if="sceneFailed" class="scene-fallback" aria-hidden="true"><i v-for="index in 22" :key="index" :style="fallbackStar(index)" /></div>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'welcome' })

type GraphNode = { id:string; type:string; title:string; occurredAt?:string|null; coordinateSeed?:number; metadata?:Record<string,unknown>; image?:string|null }
const router = useRouter()
const api = useApi()
const { mediaUrl } = useMediaUrl()
const { siteTitle, siteDescription, loadSiteSettings } = useSiteSettings()
const graph = reactive<{nodes:GraphNode[];relations:any[];graphVersion:string}>({ nodes:[], relations:[], graphVersion:'' })
const overview = reactive({ posts:0, comments:0, views:0 })
const sceneReady = ref(false)
const sceneFailed = ref(false)
const graphLoaded = ref(false)
const leaving = ref(false)
const currentYear = new Date().getFullYear()
const latest = computed(() => [...graph.nodes].filter(node=>node.occurredAt).sort((a,b)=>new Date(b.occurredAt!).getTime()-new Date(a.occurredAt!).getTime())[0])
const sceneStatus = computed(() => !sceneReady.value || !graphLoaded.value
  ? '正在连接时间'
  : graph.nodes.length ? `${graph.nodes.length} 枚真实记忆已点亮` : '宇宙底图运行中 · 等待首次点亮')
const statItems = computed(() => [
  { label:'记忆节点', value:formatNumber(graph.nodes.length) },
  { label:'文章', value:formatNumber(overview.posts) },
  { label:'阅读', value:formatNumber(overview.views) },
])

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
function nodeIcon(type:string){return ({memory:'ph:planet-bold',journey:'ph:path-bold'} as Record<string,string>)[type]||'ph:star-four-bold'}
function go(path:string){if(leaving.value)return;leaving.value=true;window.setTimeout(()=>void router.push(path),window.matchMedia('(prefers-reduced-motion:reduce)').matches?0:420)}
function fallbackStar(index:number){const seed=(index*47)%100;return{left:`${(seed*13)%100}%`,top:`${(seed*29)%100}%`,animationDelay:`${index*.13}s`}}
useHead({title:computed(()=>siteTitle.value)})
</script>

<style scoped>
.portal{position:fixed;z-index:50;inset:0;min-width:0;min-height:100dvh;overflow:hidden;background:#030b18;color:#edf6ff;isolation:isolate}.portal :deep(.constellation-scene){z-index:-4}.cosmic-wash{position:absolute;z-index:-3;inset:0;background:rgba(2,8,18,.28);pointer-events:none}.portal-frame{position:absolute;z-index:8;inset:12px;border:1px solid rgba(122,188,243,.1);pointer-events:none}.portal-frame::before,.portal-frame::after{position:absolute;width:42px;height:42px;border-color:#579dd8;content:''}.portal-frame::before{top:-1px;left:-1px;border-top:1px solid;border-left:1px solid}.portal-frame::after{right:-1px;bottom:-1px;border-right:1px solid;border-bottom:1px solid}
.portal-nav{position:absolute;z-index:4;top:0;right:0;left:0;display:flex;min-width:0;align-items:center;justify-content:space-between;gap:18px;padding:28px 34px}.brand-mark{display:flex;min-width:0;align-items:center;gap:11px}.brand-mark img{width:42px;height:42px;border:1px solid rgba(161,210,250,.24);border-radius:8px;box-shadow:0 0 26px rgba(73,157,232,.22)}.brand-mark div{display:flex;min-width:0;flex-direction:column}.brand-mark strong{overflow:hidden;font-family:var(--font-serif,var(--font-body));font-size:.88rem;letter-spacing:.08em;text-overflow:ellipsis;white-space:nowrap}.brand-mark span{margin-top:3px;color:#7799b4;font-size:.5rem;letter-spacing:.15em}.nav-actions{display:flex;align-items:center;gap:17px}.scene-status{display:flex;align-items:center;gap:7px;color:#7f9db4;font-size:.58rem;letter-spacing:.06em}.scene-status i{width:6px;height:6px;border-radius:50%;background:#68869d;box-shadow:0 0 0 4px rgba(104,134,157,.1)}.scene-status i.online{background:#62c8e8;box-shadow:0 0 0 4px rgba(98,200,232,.1),0 0 12px rgba(76,174,233,.52)}.nav-actions button{display:grid;width:38px;height:38px;border:1px solid rgba(124,190,245,.15);border-radius:50%;background:rgba(4,15,31,.38);color:#dcecff;cursor:pointer;place-items:center;backdrop-filter:blur(10px)}
.portal-copy{position:absolute;z-index:3;top:50%;left:clamp(34px,7vw,112px);width:min(620px,calc(100vw - 68px));transform:translateY(-48%)}.portal-kicker{display:flex;align-items:center;gap:10px;color:#78b8ed;font-size:.58rem;font-weight:700;letter-spacing:.16em}.portal-kicker i{width:42px;height:1px;background:#4c8fc7}.portal-kicker em{color:#86a3ba;font-style:normal;letter-spacing:.1em}.portal-copy h1{margin:18px 0 0;font-family:var(--font-serif,var(--font-body));font-size:clamp(3.25rem,8vw,7.7rem);font-weight:760;letter-spacing:.08em;line-height:.94;text-shadow:0 12px 48px rgba(0,0,0,.3)}.portal-copy>p{max-width:510px;margin:21px 0 0;color:#91abc0;font-size:clamp(.82rem,1.4vw,1rem);line-height:1.9;letter-spacing:.04em;text-wrap:balance}.portal-actions{display:flex;align-items:center;gap:8px;margin-top:30px}.portal-actions button{font:inherit}.explore-action,.home-action{display:flex;height:44px;align-items:center;border-radius:6px;cursor:pointer;backdrop-filter:blur(14px);transition:border-color .28s ease,background .28s ease,color .28s ease,transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s ease}.explore-action{gap:9px;padding:0 10px 0 13px;border:1px solid rgba(134,201,255,.4);background:rgba(39,112,174,.22);box-shadow:inset 0 1px rgba(210,235,255,.08),0 10px 30px rgba(4,21,39,.2);color:#dff1ff}.explore-action span{font-size:.68rem;font-weight:700;letter-spacing:.04em}.explore-action> :deep(svg):first-child{color:#7bc5fb;font-size:.88rem}.explore-action> :deep(svg):last-child{margin-left:5px;color:#a9d9fb;font-size:.82rem}.explore-action:hover{border-color:rgba(151,216,255,.64);background:rgba(47,129,194,.3);box-shadow:inset 0 1px rgba(220,241,255,.1),0 14px 36px rgba(14,80,132,.16);transform:translateY(-2px)}.home-action{gap:8px;padding:0 12px;border:1px solid rgba(125,190,245,.13);background:rgba(4,15,31,.28);color:#9ebbd0}.home-action:hover{border-color:rgba(125,190,245,.3);background:rgba(10,31,56,.46);color:#dcecff;transform:translateY(-2px)}.home-action span{font-size:.65rem}.home-action :deep(svg){font-size:.76rem}
.memory-pulse{position:absolute;z-index:3;right:clamp(32px,5vw,78px);bottom:72px;width:270px;padding-left:18px;border-left:1px solid rgba(112,178,232,.18)}.pulse-head{display:flex;align-items:center;gap:10px;color:#7394ad;font-size:.51rem;letter-spacing:.16em}.pulse-head i{height:1px;flex:1;background:rgba(76,143,199,.48)}.pulse-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.pulse-grid span{display:flex;flex-direction:column}.pulse-grid strong{font-size:1rem;font-variant-numeric:tabular-nums}.pulse-grid small{margin-top:2px;color:#6f8da4;font-size:.51rem}.latest-memory{display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:9px;margin-top:16px;padding-top:13px;border-top:1px solid rgba(107,170,222,.12)}.latest-memory>span{display:grid;width:31px;height:31px;border-radius:50%;background:rgba(74,159,230,.13);color:#7cc1f8;place-items:center}.latest-memory div{display:flex;min-width:0;flex-direction:column}.latest-memory small{color:#708fa7;font-size:.5rem}.latest-memory strong{margin-top:3px;overflow:hidden;font-size:.65rem;text-overflow:ellipsis;white-space:nowrap}
.portal-foot{position:absolute;z-index:3;right:34px;bottom:27px;left:34px;display:flex;align-items:center;gap:12px;color:#62777c;font-size:.49rem;letter-spacing:.12em}.portal-foot i{width:58px;height:1px;background:rgba(255,255,255,.1)}.portal-foot span{display:flex;align-items:center;gap:6px}.portal-foot b{width:5px;height:5px;border-radius:50%;background:#66c7ff;box-shadow:0 0 10px #4aaef0}.scene-fallback{position:absolute;z-index:-2;inset:0}.scene-fallback i{position:absolute;width:2px;height:2px;border-radius:50%;background:#d9e8e5;box-shadow:0 0 8px #d9e8e5;animation:star-pulse 2.4s ease-in-out infinite}.portal.leaving{filter:blur(2px);transform:scale(1.018);transition:filter .32s ease,transform .46s cubic-bezier(.65,0,.35,1)}
.nav-actions button:focus-visible{outline:2px solid #4a9fe6;outline-offset:3px}
@keyframes star-pulse{50%{opacity:.22;transform:scale(.55)}}
@media(max-width:860px){.scene-status{display:none}.memory-pulse{right:24px;bottom:68px}.portal-copy{left:34px}.portal-copy h1{font-size:clamp(3.2rem,10vw,5.5rem)}}
@media(max-width:640px){.portal-nav{padding:22px 22px}.brand-mark span{font-size:.44rem}.portal-frame{inset:8px}.portal-copy{top:auto;right:20px;bottom:170px;left:20px;width:auto;transform:none}.portal-copy h1{margin-top:13px;font-size:clamp(2.75rem,15vw,4.5rem)}.portal-copy>p{margin-top:15px;font-size:.76rem;line-height:1.75}.portal-actions{margin-top:21px}.explore-action,.home-action{height:44px}.explore-action{flex:1;justify-content:center}.home-action{justify-content:center}.memory-pulse{right:20px;bottom:48px;left:20px;width:auto;padding:10px 0 0;border-top:1px solid rgba(107,170,222,.14);border-left:0}.pulse-head,.latest-memory{display:none}.pulse-grid{margin:0}.portal-foot{display:none}.cosmic-wash{background:rgba(2,8,18,.42)}}
@media(max-height:700px) and (min-width:641px){.portal-copy{top:47%}.portal-copy h1{font-size:3.8rem}.portal-actions{margin-top:22px}.memory-pulse{bottom:54px}}
@media(prefers-reduced-motion:reduce){.portal.leaving,.explore-action{transition:none}.scene-fallback i{animation:none}}
</style>

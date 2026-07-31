<template>
  <main class="portal" :class="{ leaving }">
    <TimeConstellationScene
      :nodes="sceneNodes"
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
        <span class="scene-status"><i :class="{ online: sceneReady }" />{{ sceneReady ? `${graph.nodes.length} 枚记忆已点亮` : '正在连接时间' }}</span>
      </div>
    </header>

    <section class="portal-copy" aria-labelledby="portal-title">
      <div class="portal-kicker"><span>TIME CONSTELLATION</span><i /><em>时光星图</em></div>
      <h1 id="portal-title">{{ siteTitle }}</h1>
      <p>{{ siteDescription }}</p>
      <div class="portal-actions">
        <button class="explore-action" type="button" @click="go('/time/constellation')">
          <span><small>进入门面</small><strong>探索时光星图</strong></span>
          <Icon name="ph:arrow-up-right-bold" />
        </button>
        <button class="home-action" type="button" @click="go('/home')"><Icon name="ph:house-line-bold" /><span>浏览网站</span></button>
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
      <span>拖动星空，滚轮靠近</span><i /><span>每一次发布，都会自动成为一颗星</span>
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
const leaving = ref(false)
const currentYear = new Date().getFullYear()
const demoTypes = ['post','moment','photo','album','place','library','journey']
const sceneNodes = computed<GraphNode[]>(() => graph.nodes.length ? graph.nodes : Array.from({ length: 34 }, (_, index) => ({
  id:`preview:${index}`, type:demoTypes[index % demoTypes.length], title:'待点亮的记忆',
  occurredAt:new Date(currentYear - Math.floor(index / 12), index % 12, (index * 7) % 28 + 1).toISOString(),
  coordinateSeed:index * 7919,
})))
const latest = computed(() => [...graph.nodes].filter(node=>node.occurredAt).sort((a,b)=>new Date(b.occurredAt!).getTime()-new Date(a.occurredAt!).getTime())[0])
const statItems = computed(() => [
  { label:'记忆节点', value:formatNumber(graph.nodes.length) },
  { label:'文章', value:formatNumber(overview.posts) },
  { label:'阅读', value:formatNumber(overview.views) },
])

onMounted(async () => {
  await Promise.allSettled([
    loadSiteSettings(),
    api.get<any>('/memories/graph',{limit:320}).then(result=>Object.assign(graph,result)),
    api.get<any>('/stats/overview').then(result=>Object.assign(overview,result)),
  ])
})

function formatNumber(value:number){return new Intl.NumberFormat('zh-CN',{notation:value>=10000?'compact':'standard',maximumFractionDigits:1}).format(value||0)}
function formatDate(value?:string|null){return value?new Date(value).toLocaleDateString('zh-CN',{year:'numeric',month:'short'}):'未标时间'}
function nodeIcon(type:string){return ({post:'ph:article-bold',moment:'ph:sparkle-bold',album:'ph:images-square-bold',photo:'ph:image-bold',place:'ph:map-pin-bold',library:'ph:books-bold',journey:'ph:path-bold'} as Record<string,string>)[type]||'ph:star-four-bold'}
function go(path:string){if(leaving.value)return;leaving.value=true;window.setTimeout(()=>void router.push(path),window.matchMedia('(prefers-reduced-motion:reduce)').matches?0:420)}
function fallbackStar(index:number){const seed=(index*47)%100;return{left:`${(seed*13)%100}%`,top:`${(seed*29)%100}%`,animationDelay:`${index*.13}s`}}
useHead({title:computed(()=>siteTitle.value)})
</script>

<style scoped>
.portal{position:fixed;z-index:50;inset:0;min-width:0;min-height:100dvh;overflow:hidden;background:#030b18;color:#edf6ff;isolation:isolate}.portal :deep(.constellation-scene){z-index:-4}.cosmic-wash{position:absolute;z-index:-3;inset:0;background:rgba(2,8,18,.28);pointer-events:none}.portal-frame{position:absolute;z-index:8;inset:12px;border:1px solid rgba(122,188,243,.1);pointer-events:none}.portal-frame::before,.portal-frame::after{position:absolute;width:42px;height:42px;border-color:#579dd8;content:''}.portal-frame::before{top:-1px;left:-1px;border-top:1px solid;border-left:1px solid}.portal-frame::after{right:-1px;bottom:-1px;border-right:1px solid;border-bottom:1px solid}
.portal-nav{position:absolute;z-index:4;top:0;right:0;left:0;display:flex;min-width:0;align-items:center;justify-content:space-between;gap:18px;padding:28px 34px}.brand-mark{display:flex;min-width:0;align-items:center;gap:11px}.brand-mark img{width:42px;height:42px;border:1px solid rgba(161,210,250,.24);border-radius:8px;box-shadow:0 0 26px rgba(73,157,232,.22)}.brand-mark div{display:flex;min-width:0;flex-direction:column}.brand-mark strong{overflow:hidden;font-family:var(--font-serif,var(--font-body));font-size:.88rem;letter-spacing:.08em;text-overflow:ellipsis;white-space:nowrap}.brand-mark span{margin-top:3px;color:#7799b4;font-size:.5rem;letter-spacing:.15em}.nav-actions{display:flex;align-items:center;gap:17px}.scene-status{display:flex;align-items:center;gap:7px;color:#7f9db4;font-size:.58rem;letter-spacing:.06em}.scene-status i{width:6px;height:6px;border-radius:50%;background:#68869d;box-shadow:0 0 0 4px rgba(104,134,157,.1)}.scene-status i.online{background:#62c8e8;box-shadow:0 0 0 4px rgba(98,200,232,.1),0 0 12px rgba(76,174,233,.52)}.nav-actions button{display:grid;width:38px;height:38px;border:1px solid rgba(124,190,245,.15);border-radius:50%;background:rgba(4,15,31,.38);color:#dcecff;cursor:pointer;place-items:center;backdrop-filter:blur(10px)}
.portal-copy{position:absolute;z-index:3;top:50%;left:clamp(34px,7vw,112px);width:min(620px,calc(100vw - 68px));transform:translateY(-48%)}.portal-kicker{display:flex;align-items:center;gap:10px;color:#78b8ed;font-size:.58rem;font-weight:700;letter-spacing:.16em}.portal-kicker i{width:42px;height:1px;background:#4c8fc7}.portal-kicker em{color:#86a3ba;font-style:normal;letter-spacing:.1em}.portal-copy h1{margin:18px 0 0;font-family:var(--font-serif,var(--font-body));font-size:clamp(3.25rem,8vw,7.7rem);font-weight:760;letter-spacing:.08em;line-height:.94;text-shadow:0 12px 48px rgba(0,0,0,.3)}.portal-copy>p{max-width:510px;margin:21px 0 0;color:#91abc0;font-size:clamp(.82rem,1.4vw,1rem);line-height:1.9;letter-spacing:.04em;text-wrap:balance}.portal-actions{display:flex;align-items:center;gap:10px;margin-top:34px}.portal-actions button{font:inherit}.explore-action{display:flex;min-width:218px;height:58px;align-items:center;justify-content:space-between;gap:22px;padding:7px 8px 7px 20px;border:1px solid rgba(142,203,251,.62);border-radius:7px;background:#4a9fe6;color:#f5faff;box-shadow:0 15px 46px rgba(45,130,203,.24);cursor:pointer;transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s ease}.explore-action:hover{box-shadow:0 19px 54px rgba(45,130,203,.34);transform:translateY(-2px)}.explore-action span{display:flex;flex-direction:column;text-align:left}.explore-action small{font-size:.5rem;letter-spacing:.14em;opacity:.72}.explore-action strong{margin-top:3px;font-size:.72rem;letter-spacing:.08em}.explore-action> :deep(svg){font-size:1.15rem}.home-action{display:flex;height:58px;align-items:center;gap:8px;padding:0 18px;border:1px solid rgba(125,190,245,.16);border-radius:7px;background:rgba(4,15,31,.42);color:#dcecff;cursor:pointer;backdrop-filter:blur(12px)}.home-action span{font-size:.7rem}
.memory-pulse{position:absolute;z-index:3;right:clamp(32px,5vw,78px);bottom:72px;width:270px;padding-left:18px;border-left:1px solid rgba(112,178,232,.18)}.pulse-head{display:flex;align-items:center;gap:10px;color:#7394ad;font-size:.51rem;letter-spacing:.16em}.pulse-head i{height:1px;flex:1;background:rgba(76,143,199,.48)}.pulse-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.pulse-grid span{display:flex;flex-direction:column}.pulse-grid strong{font-size:1rem;font-variant-numeric:tabular-nums}.pulse-grid small{margin-top:2px;color:#6f8da4;font-size:.51rem}.latest-memory{display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:9px;margin-top:16px;padding-top:13px;border-top:1px solid rgba(107,170,222,.12)}.latest-memory>span{display:grid;width:31px;height:31px;border-radius:50%;background:rgba(74,159,230,.13);color:#7cc1f8;place-items:center}.latest-memory div{display:flex;min-width:0;flex-direction:column}.latest-memory small{color:#708fa7;font-size:.5rem}.latest-memory strong{margin-top:3px;overflow:hidden;font-size:.65rem;text-overflow:ellipsis;white-space:nowrap}
.portal-foot{position:absolute;z-index:3;right:34px;bottom:27px;left:34px;display:flex;align-items:center;gap:12px;color:#62777c;font-size:.49rem;letter-spacing:.12em}.portal-foot i{width:58px;height:1px;background:rgba(255,255,255,.1)}.scene-fallback{position:absolute;z-index:-2;inset:0}.scene-fallback i{position:absolute;width:2px;height:2px;border-radius:50%;background:#d9e8e5;box-shadow:0 0 8px #d9e8e5;animation:star-pulse 2.4s ease-in-out infinite}.portal.leaving{filter:blur(2px);transform:scale(1.018);transition:filter .32s ease,transform .46s cubic-bezier(.65,0,.35,1)}
.nav-actions button:focus-visible{outline:2px solid #4a9fe6;outline-offset:3px}
@keyframes star-pulse{50%{opacity:.22;transform:scale(.55)}}
@media(max-width:860px){.scene-status{display:none}.memory-pulse{right:24px;bottom:68px}.portal-copy{left:34px}.portal-copy h1{font-size:clamp(3.2rem,10vw,5.5rem)}}
@media(max-width:640px){.portal-nav{padding:22px 22px}.brand-mark span{font-size:.44rem}.portal-frame{inset:8px}.portal-copy{top:auto;right:20px;bottom:170px;left:20px;width:auto;transform:none}.portal-copy h1{margin-top:13px;font-size:clamp(2.75rem,15vw,4.5rem)}.portal-copy>p{margin-top:15px;font-size:.76rem;line-height:1.75}.portal-actions{align-items:stretch;flex-direction:column;margin-top:23px}.explore-action,.home-action{width:100%;height:52px}.home-action{justify-content:center}.memory-pulse{right:20px;bottom:48px;left:20px;width:auto;padding:10px 0 0;border-top:1px solid rgba(107,170,222,.14);border-left:0}.pulse-head,.latest-memory{display:none}.pulse-grid{margin:0}.portal-foot{display:none}.cosmic-wash{background:rgba(2,8,18,.42)}}
@media(max-height:700px) and (min-width:641px){.portal-copy{top:47%}.portal-copy h1{font-size:3.8rem}.portal-actions{margin-top:22px}.memory-pulse{bottom:54px}}
@media(prefers-reduced-motion:reduce){.portal.leaving,.explore-action{transition:none}.scene-fallback i{animation:none}}
</style>

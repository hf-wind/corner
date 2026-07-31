<template>
  <main class="constellation-page">
    <header class="constellation-toolbar">
      <NuxtLink to="/home" title="返回首页"><Icon name="ph:arrow-left-bold" /></NuxtLink>
      <div class="title"><small>TIME CONSTELLATION</small><h1>时光星图</h1></div>
      <div class="search"><Icon name="ph:magnifying-glass-bold" /><input v-model="search" type="search" placeholder="搜索记忆" @keyup.enter="loadGraph"><button v-if="search" type="button" title="清空" @click="search='';loadGraph()"><Icon name="ph:x-bold" /></button></div>
      <div class="mode"><button type="button" :class="{active:mode==='graph'}" title="关系图" @click="mode='graph'"><Icon name="ph:graph-bold" /></button><button type="button" :class="{active:mode==='list'}" title="列表" @click="mode='list'"><Icon name="ph:list-bold" /></button></div>
    </header>
    <nav class="type-filters" aria-label="内容类型"><button v-for="item in typeOptions" :key="item.value" type="button" :class="{active:types.includes(item.value)}" @click="toggleType(item.value)"><Icon :name="item.icon" />{{ item.label }}<span>{{ counts[item.value]||0 }}</span></button></nav>

    <section class="constellation-stage">
      <div v-if="loading" class="state"><Icon name="ph:circle-notch-bold" class="spin" /><span>正在汇聚记忆</span></div>
      <div v-else-if="error" class="state error"><Icon name="ph:warning-circle-bold" /><span>{{ error }}</span><button type="button" @click="loadGraph">重试</button></div>
      <TimeConstellationScene
        v-else-if="mode==='graph' && !fallbackMode && graph.nodes.length"
        :nodes="graph.nodes"
        :relations="graph.relations"
        :graph-version="graph.graphVersion"
        :selected-id="selected?.id"
        :resolve-image="mediaUrl"
        @select="selectNode"
        @clear="clearSelected"
        @fallback="fallbackMode=true"
      />
      <MemoryGraph2D v-else-if="mode==='graph'" :nodes="graph.nodes" :relations="graph.relations" :selected-id="selected?.id" @select="selectNode" />
      <div v-else class="memory-grid">
        <button v-for="node in graph.nodes" :key="node.id" type="button" :class="[`type-${node.type}`,{active:node.id===selected?.id}]" @click="selectNode(node)"><span><Icon :name="nodeIcon(node.type)" /></span><div><small>{{ typeText(node.type) }} · {{ formatDate(node.occurredAt) }}</small><b>{{ node.title }}</b><p>{{ node.excerpt }}</p></div></button>
      </div>
    </section>

    <Transition name="drawer">
      <aside v-if="selected" class="memory-drawer">
        <button class="drawer-close" type="button" title="关闭" @click="clearSelected"><Icon name="ph:x-bold" /></button>
        <div class="drawer-image"><img v-if="selected.image" :src="mediaUrl(selected.image)" alt=""><Icon v-else :name="nodeIcon(selected.type)" /></div>
        <small>{{ typeText(selected.type) }}<template v-if="selected.occurredAt"> · {{ formatDate(selected.occurredAt) }}</template></small>
        <h2>{{ selected.title }}</h2><p>{{ selected.excerpt }}</p>
        <NuxtLink :to="selected.href"><Icon name="ph:arrow-square-out-bold" />进入内容</NuxtLink>
        <section v-if="neighbors.length"><h3>关系</h3><button v-for="relation in neighbors" :key="relation.id" type="button" @click="selectNeighbor(relation)"><span>{{ relationText(relation.type) }}</span><b>{{ otherNode(relation).title }}</b><small>{{ evidenceText(relation.evidence) }}</small></button></section>
      </aside>
    </Transition>
  </main>
</template>

<script setup lang="ts">
const api=useApi(),route=useRoute(),router=useRouter(),{mediaUrl}=useMediaUrl(),{selectMemory,clearMemory}=useMemorySelection();const loading=ref(true),error=ref(''),search=ref(String(route.query.q||'')),mode=ref<'graph'|'list'>('graph'),types=ref<string[]>([]),selected=ref<any>(null),neighbors=ref<any[]>([]),fallbackMode=ref(false);const graph=reactive<any>({nodes:[],relations:[],graphVersion:''})
const typeOptions=[{value:'post',label:'文章',icon:'ph:article-bold'},{value:'moment',label:'瞬间',icon:'ph:sparkle-bold'},{value:'album',label:'相册',icon:'ph:images-square-bold'},{value:'photo',label:'照片',icon:'ph:image-bold'},{value:'place',label:'地点',icon:'ph:map-pin-bold'},{value:'library',label:'书影',icon:'ph:books-bold'},{value:'journey',label:'旅行',icon:'ph:path-bold'}]
const counts=computed(()=>graph.nodes.reduce((all:any,node:any)=>{all[node.type]=(all[node.type]||0)+1;return all},{}))
onMounted(loadGraph)
async function loadGraph(){loading.value=true;error.value='';try{Object.assign(graph,await api.get('/memories/graph',{types:types.value.join(','),search:search.value,limit:300}));const focus=String(route.query.focus||'');const node=graph.nodes.find((item:any)=>item.id===focus);if(node)await selectNode(node,false)}catch(e:any){error.value=e?.message||'星图暂时无法加载'}finally{loading.value=false}}
async function selectNode(node:any,syncUrl=true){selected.value=node;selectMemory({id:node.id,type:node.type,href:node.href});if(syncUrl)await router.replace({query:{...(search.value?{q:search.value}:{}),focus:node.id}});try{const result=await api.get<any>(`/memories/graph/neighbors/${encodeURIComponent(node.id)}`);neighbors.value=result.relations||[]}catch{neighbors.value=[]}}
function clearSelected(){selected.value=null;neighbors.value=[];clearMemory();router.replace({query:search.value?{q:search.value}:{}})}function selectNeighbor(relation:any){const node=otherNode(relation);const full=graph.nodes.find((item:any)=>item.id===node.id)||node;void selectNode(full)}function otherNode(relation:any){return relation.sourceId===selected.value?.id?relation.target:relation.source}
function toggleType(type:string){types.value=types.value.includes(type)?types.value.filter(item=>item!==type):[...types.value,type];void loadGraph()}function nodeIcon(type:string){return typeOptions.find(i=>i.value===type)?.icon||'ph:star-four-bold'}function typeText(type:string){return typeOptions.find(i=>i.value===type)?.label||type}function formatDate(value:string){return value?new Date(value).toLocaleDateString('zh-CN',{year:'numeric',month:'short'}):'未标时间'}function relationText(type:string){return({same_place:'同一地点',same_album:'同一相册',same_tag:'共同标签',time_adjacent:'时间相邻',reference:'内容引用',same_journey:'同一旅行',story_sequence:'故事顺序',same_theme:'同一主题',custom:'自定义'}as any)[type]||type}function evidenceText(value:any){return value?.reason||value?.albumTitle||value?.stop||(value?.days!==undefined?`相隔 ${value.days} 天`:'')}
useHead({title:'时光星图'})
</script>

<style scoped>
.constellation-page{position:fixed;z-index:40;inset:0;display:grid;grid-template-rows:68px 45px minmax(0,1fr);overflow:hidden;background:#10161b;color:#e8eeeb}.constellation-toolbar{display:grid;grid-template-columns:42px 190px minmax(180px,420px) 82px;align-items:center;gap:12px;padding:10px 18px;border-bottom:1px solid rgb(255 255 255/.08)}.constellation-toolbar>a,.mode button{display:grid;width:38px;height:38px;border:1px solid rgb(255 255 255/.1);border-radius:6px;background:#182126;color:#d6dfdb;place-items:center}.title small{color:#d7a94f;font-size:.5rem;letter-spacing:.12em}.title h1{margin:2px 0 0;font-size:.95rem}.search{display:flex;height:38px;align-items:center;gap:8px;padding:0 11px;border:1px solid rgb(255 255 255/.1);border-radius:6px;background:#151e23;color:#7f918b}.search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#e8eeeb}.search button{border:0;background:none;color:#899a94}.mode{display:flex;gap:4px}.mode button.active{border-color:#d7a94f;color:#d7a94f}.type-filters{display:flex;align-items:center;gap:5px;padding:6px 18px;overflow-x:auto;border-bottom:1px solid rgb(255 255 255/.07)}.type-filters button{display:flex;height:30px;align-items:center;gap:5px;padding:0 9px;border:1px solid transparent;border-radius:5px;background:transparent;color:#869790;font-size:.62rem;white-space:nowrap}.type-filters button.active{border-color:rgb(215 169 79/.45);background:rgb(215 169 79/.1);color:#e0b662}.type-filters span{opacity:.65}.constellation-stage{position:relative;min-height:0;overflow:auto;padding:14px}.constellation-stage :deep(.constellation-scene){position:absolute;inset:0}.constellation-stage :deep(.graph-preview){height:100%;min-height:480px;border:0;background:#10161b}.constellation-stage :deep(svg){height:100%;min-height:480px}.state{display:grid;height:100%;align-content:center;justify-items:center;gap:10px;color:#899a94}.state svg{font-size:1.7rem}.state button{padding:6px 12px;border:1px solid #495852;border-radius:5px;background:none;color:#d6dfdb}.state.error{color:#db7c7c}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.memory-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:7px}.memory-grid>button{display:grid;min-height:90px;grid-template-columns:40px 1fr;gap:10px;padding:11px;border:1px solid rgb(255 255 255/.08);border-radius:6px;background:#151e23;color:#dbe4e0;text-align:left}.memory-grid>button.active{border-color:#d7a94f}.memory-grid>button>span{display:grid;width:38px;height:38px;border-radius:50%;background:#243039;color:#75a2d4;place-items:center}.memory-grid>button small{color:#788983;font-size:.55rem}.memory-grid>button b{display:block;margin-top:4px;font-size:.75rem}.memory-grid>button p{margin:4px 0 0;overflow:hidden;color:#889994;font-size:.58rem;text-overflow:ellipsis;white-space:nowrap}.memory-drawer{position:absolute;z-index:5;top:113px;right:0;bottom:0;width:min(360px,100vw);overflow-y:auto;padding:18px;border-left:1px solid rgb(255 255 255/.1);background:#151e23;box-shadow:-18px 0 42px rgb(0 0 0/.28)}.drawer-close{position:absolute;z-index:2;top:25px;right:25px;display:grid;width:30px;height:30px;border:0;border-radius:50%;background:rgb(0 0 0/.45);color:#fff;place-items:center}.drawer-image{display:grid;width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:6px;background:#202c32;color:#d7a94f;font-size:3rem;place-items:center}.drawer-image img{width:100%;height:100%;object-fit:cover}.memory-drawer>small{display:block;margin-top:15px;color:#d7a94f;font-size:.6rem}.memory-drawer h2{margin:7px 0;color:#f1f4f2;font-size:1.35rem}.memory-drawer>p{color:#91a19c;font-size:.75rem;line-height:1.7}.memory-drawer>a{display:inline-flex;align-items:center;gap:5px;color:#e0b662;font-size:.7rem;text-decoration:none}.memory-drawer section{margin-top:22px;padding-top:15px;border-top:1px solid rgb(255 255 255/.08)}.memory-drawer h3{font-size:.75rem}.memory-drawer section button{display:flex;width:100%;align-items:flex-start;flex-direction:column;gap:3px;padding:9px 0;border:0;border-bottom:1px solid rgb(255 255 255/.06);background:none;color:#dbe4e0;text-align:left}.memory-drawer section span,.memory-drawer section small{color:#7f918b;font-size:.55rem}.memory-drawer section b{font-size:.7rem}.drawer-enter-active,.drawer-leave-active{transition:transform .25s}.drawer-enter-from,.drawer-leave-to{transform:translateX(100%)}@media(max-width:700px){.constellation-page{grid-template-rows:70px 45px minmax(0,1fr)}.constellation-toolbar{grid-template-columns:38px 1fr 78px;padding-inline:10px}.title{display:none}.search{grid-column:2}.type-filters{padding-inline:10px}.memory-drawer{top:115px;width:100%}.constellation-stage{padding:7px}}@media(prefers-reduced-motion:reduce){.drawer-enter-active,.drawer-leave-active{transition:none}}
.constellation-page{grid-template-columns:minmax(0,1fr)}
.constellation-toolbar,.type-filters,.constellation-stage{min-width:0;box-sizing:border-box}
.constellation-toolbar{width:100%}
@media(max-width:700px){.constellation-toolbar{grid-template-columns:38px minmax(0,1fr) 78px}.search{min-width:0}}
</style>

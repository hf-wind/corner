<template>
  <main v-if="story" class="story-player" :class="{ playing }">
    <div class="story-stage">
      <Transition v-if="visualMode==='media'" name="story-frame" mode="out-in">
        <div :key="current?.id" class="story-frame media-frame">
          <img v-if="current?.photo?.path" :src="mediaUrl(current.photo.path)" :alt="current.title" />
          <div v-else class="story-placeholder"><Icon :name="nodeIcon(current?.node?.type)" /></div>
        </div>
      </Transition>
      <div v-else class="story-frame constellation-frame">
        <div v-if="graphLoading" class="story-placeholder"><Icon name="ph:circle-notch-bold" class="graph-loading" /></div>
        <TimeConstellationScene
          v-else-if="!graphFallback && storyGraph.nodes.length"
          :nodes="storyGraph.nodes"
          :relations="storyGraph.relations"
          :graph-version="storyGraph.graphVersion"
          :selected-id="current?.node?.id"
          :route-node-ids="routeNodeIds"
          :resolve-image="mediaUrl"
          @select="selectGraphNode"
          @fallback="graphFallback=true"
        />
        <MemoryGraph2D v-else :nodes="storyGraph.nodes" :relations="storyGraph.relations" :selected-id="current?.node?.id" @select="selectGraphNode" />
      </div>
      <div class="stage-shade" />
      <header><AppLink to="/stories" title="返回故事列表"><Icon name="ph:arrow-left-bold" /></AppLink><span>{{ story.title }}</span><div class="header-actions"><button type="button" :title="visualMode==='constellation'?'显示照片':'显示星图航线'" @click="toggleVisual"><Icon :name="visualMode==='constellation'?'ph:image-bold':'ph:graph-bold'" /></button><button type="button" title="复制分享链接" @click="share"><Icon name="ph:share-network-bold" /></button></div></header>
      <section class="story-copy">
        <span>{{ String(index + 1).padStart(2,'0') }} / {{ String(story.steps.length).padStart(2,'0') }}</span>
        <h1>{{ current?.title }}</h1>
        <p>{{ current?.narration || '这一站，把画面留给记忆本身。' }}</p>
        <AppLink v-if="current?.node?.href" :to="current.node.href" class="detail-link" @click="pause"><Icon name="ph:arrow-square-out-bold" />进入内容</AppLink>
      </section>
    </div>
    <footer class="story-controls">
      <div class="progress"><i :style="{ width: `${progress}%` }" /></div>
      <button type="button" title="上一步" :disabled="index===0" @click="previous"><Icon name="ph:skip-back-bold" /></button>
      <button type="button" class="play" :title="playing?'暂停':'播放'" @click="toggle"><Icon :name="playing?'ph:pause-fill':'ph:play-fill'" /></button>
      <button type="button" title="下一步" :disabled="index>=story.steps.length-1" @click="next"><Icon name="ph:skip-forward-bold" /></button>
      <div class="step-track"><button v-for="(step,i) in story.steps" :key="step.id" type="button" :class="{active:i===index,passed:i<index}" :title="step.title" @click="go(i)" /></div>
      <button type="button" title="在星图定位" :disabled="!current?.node" @click="openConstellation"><Icon name="ph:graph-bold" /></button>
    </footer>
    <audio ref="audioEl" />
  </main>
  <div v-else-if="!loading" class="story-empty"><Icon name="ph:path-bold" /><h1>故事没有找到</h1><AppLink to="/stories">返回故事列表</AppLink></div>
</template>

<script setup lang="ts">
const props = defineProps<{ story?: any; loading?: boolean }>()
const api=useApi();const router=useRouter(); const {mediaUrl}=useMediaUrl(); const {selectMemory}=useMemorySelection(); const index=ref(0); const playing=ref(false); const elapsed=ref(0); const audioEl=ref<HTMLAudioElement>();const visualMode=ref<'media'|'constellation'>('media');const graphLoading=ref(false),graphFallback=ref(false);const storyGraph=reactive<any>({nodes:[],relations:[],graphVersion:''}); let timer:number|undefined
const current=computed(()=>props.story?.steps?.[index.value]); const duration=computed(()=>Math.max(2,Number(current.value?.durationSec)||8)); const progress=computed(()=>((index.value+elapsed.value/duration.value)/Math.max(1,props.story?.steps?.length||1))*100);const routeNodeIds=computed<string[]>(()=>props.story?.steps?.map((step:any)=>step.node?.id).filter(Boolean)||[])
watch(()=>props.story?.id,(id)=>{if(!id)return;const stored=Number(localStorage.getItem(`corner-story:${id}`));index.value=Number.isInteger(stored)&&stored>=0&&stored<props.story.steps.length?stored:0;syncStep()},{immediate:true})
watch(index,()=>syncStep())
function syncStep(){elapsed.value=0;if(props.story?.id)localStorage.setItem(`corner-story:${props.story.id}`,String(index.value));const node=current.value?.node;if(node)selectMemory({id:node.id,type:node.type,href:node.href});syncAudio()}
function startTimer(){stopTimer();timer=window.setInterval(()=>{elapsed.value+=.1;if(elapsed.value>=duration.value)next()},100)}function stopTimer(){if(timer!==undefined){clearInterval(timer);timer=undefined}}
function toggle(){playing.value=!playing.value;if(playing.value){startTimer();void audioEl.value?.play().catch(()=>undefined)}else pause()}function pause(){playing.value=false;stopTimer();audioEl.value?.pause()}function next(){if(index.value<props.story.steps.length-1){index.value++;if(playing.value)startTimer()}else pause()}function previous(){if(index.value>0)index.value--}function go(i:number){index.value=i;if(playing.value)startTimer()}
function syncAudio(){const music=current.value?.music;if(!audioEl.value)return;if(!music?.url){audioEl.value.pause();audioEl.value.removeAttribute('src');return}audioEl.value.src=mediaUrl(music.url);audioEl.value.currentTime=Number(music.startSec)||0;if(playing.value)void audioEl.value.play().catch(()=>undefined)}
async function toggleVisual(){visualMode.value=visualMode.value==='media'?'constellation':'media';if(visualMode.value==='constellation'&&!storyGraph.nodes.length)await loadStoryGraph()}
async function loadStoryGraph(){graphLoading.value=true;graphFallback.value=false;try{Object.assign(storyGraph,await api.get('/memories/graph',{limit:500}))}catch{graphFallback.value=true}finally{graphLoading.value=false}}
function selectGraphNode(node:any){const stepIndex=props.story?.steps?.findIndex((step:any)=>step.node?.id===node.id)??-1;if(stepIndex>=0)go(stepIndex);else selectMemory({id:node.id,type:node.type,href:node.href})}
function openConstellation(){if(current.value?.node)router.push({path:'/time/constellation',query:{focus:current.value.node.id}})}
async function share(){const url=new URL(props.story?.sharePath||`/stories/${props.story?.slug}`,location.origin).toString();try{await navigator.clipboard.writeText(url)}catch{ /* browser clipboard unavailable */ }}
function nodeIcon(type?:string){return ({post:'ph:article-bold',moment:'ph:sparkle-bold',album:'ph:images-square-bold',photo:'ph:image-bold',place:'ph:map-pin-bold',library:'ph:books-bold',journey:'ph:path-bold'} as any)[type]||'ph:star-four-bold'}
onUnmounted(()=>{stopTimer();audioEl.value?.pause()});useHead(()=>({title:props.story?.title||'故事航线'}))
</script>

<style scoped>
.story-player{position:fixed;z-index:100;inset:0;display:grid;grid-template-rows:minmax(0,1fr) 82px;background:#0c1115;color:#fff}.story-stage{position:relative;overflow:hidden}.story-frame,.story-frame img,.story-placeholder{width:100%;height:100%}.story-frame{position:absolute;inset:0}.story-frame img{object-fit:cover;animation:story-drift 12s ease-in-out both}.story-placeholder{display:grid;background:radial-gradient(circle at center,#263a3c,#0c1115 65%);color:#d5a852;font-size:8rem;place-items:center}.constellation-frame :deep(.graph-preview){height:100%;min-height:0;border:0;background:#10161b}.constellation-frame :deep(.graph-preview svg){height:100%;min-height:0}.graph-loading{animation:graph-spin 1s linear infinite}.stage-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgb(0 0 0/.35),transparent 35%,rgb(0 0 0/.72));pointer-events:none}.story-stage header{position:absolute;z-index:2;top:0;right:0;left:0;display:grid;grid-template-columns:42px 1fr auto;align-items:center;padding:max(18px,env(safe-area-inset-top)) 24px}.story-stage header a,.story-stage header button{display:grid;width:38px;height:38px;border:0;border-radius:50%;background:rgb(12 17 21/.56);color:#fff;place-items:center}.story-stage header span{text-align:center;font-size:.75rem}.header-actions{display:flex;gap:7px}.story-copy{position:absolute;z-index:2;right:clamp(24px,7vw,110px);bottom:clamp(28px,8vh,90px);left:clamp(24px,7vw,110px);max-width:760px;pointer-events:none}.story-copy a{pointer-events:auto}.story-copy>span{color:#e4bb68;font:700 .72rem var(--font-accent)}.story-copy h1{margin:10px 0 12px;font-size:clamp(2rem,5vw,4.2rem);line-height:1.08}.story-copy p{max-width:650px;margin:0;color:rgb(255 255 255/.78);font-size:clamp(.9rem,1.6vw,1.12rem);line-height:1.8}.detail-link{display:inline-flex;align-items:center;gap:6px;margin-top:16px;color:#fff;font-size:.76rem;text-decoration:none}.story-controls{position:relative;display:flex;align-items:center;justify-content:center;gap:12px;padding:14px 24px;background:#11191d}.story-controls>button{display:grid;width:38px;height:38px;border:0;border-radius:50%;background:transparent;color:#d9e0dd;place-items:center}.story-controls>button.play{width:48px;height:48px;background:#e1b156;color:#111}.story-controls>button:disabled{opacity:.25}.progress{position:absolute;top:0;right:0;left:0;height:2px;background:#293438}.progress i{display:block;height:100%;background:#e1b156;transition:width .1s linear}.step-track{display:flex;width:min(340px,35vw);gap:5px}.step-track button{height:4px;flex:1;border:0;border-radius:2px;background:#344044}.step-track button.active,.step-track button.passed{background:#e1b156}.story-empty{min-height:70vh;display:grid;align-content:center;justify-items:center;gap:12px;color:var(--c-text-2)}@keyframes story-drift{from{transform:scale(1.02)}to{transform:scale(1.08) translate3d(-1%,0,0)}}@keyframes graph-spin{to{transform:rotate(360deg)}}.story-frame-enter-active,.story-frame-leave-active{transition:opacity .55s}.story-frame-enter-from,.story-frame-leave-to{opacity:0}@media(max-width:640px){.story-player{grid-template-rows:minmax(0,1fr) 74px}.story-stage header{padding-inline:14px}.story-copy{bottom:26px}.story-copy h1{font-size:2rem}.step-track{position:absolute;top:8px;width:calc(100% - 32px)}.story-controls{padding-top:18px}.story-controls>button:last-child{position:absolute;right:14px}}
@media(prefers-reduced-motion:reduce){.story-frame img{animation:none}.story-frame-enter-active,.story-frame-leave-active{transition:none}}
</style>

<template>
  <div class="journey-admin admin-page-shell">
    <header class="admin-page-head"><div><span>STORY ROUTES</span><h1>故事航线</h1><p>编排旅行停靠点与可播放的记忆故事。</p></div><a-button type="primary" @click="tab==='journeys'?openJourney():openStory()"><Icon name="ph:plus-bold" />{{ tab==='journeys'?'新建旅行':'新建故事' }}</a-button></header>
    <a-tabs v-model:activeKey="tab"><a-tab-pane key="journeys" tab="旅行" /><a-tab-pane key="stories" tab="故事" /></a-tabs>
    <div class="table-toolbar">
      <a-input v-model:value="keywordInput" allow-clear :placeholder="tab === 'journeys' ? '搜索旅行标题或简介' : '搜索故事标题或简介'" class="route-search" @press-enter="applySearch"><template #prefix><Icon name="ph:magnifying-glass" /></template></a-input>
      <a-button type="primary" @click="applySearch"><Icon name="ph:magnifying-glass-bold" /> 搜索</a-button>
      <a-button @click="resetSearch"><Icon name="ph:arrow-counter-clockwise-bold" /> 重置</a-button>
      <span class="toolbar-spacer" />
      <AdminRefreshButton :loading="loading" @click="loadAll" />
    </div>
    <div class="admin-table-shell">
      <a-table :data-source="pagedRoutes" :columns="routeColumns" row-key="id" size="small" :loading="loading" :pagination="false" :locale="{ emptyText: tab === 'journeys' ? '还没有旅行' : '还没有故事' }" :scroll="{ x: 720 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'"><div class="route-title"><strong>{{ record.title }}</strong><span>{{ record.description || '暂无简介' }}</span></div></template>
          <template v-else-if="column.key === 'status'"><a-tag :color="record.status === 'published' ? 'green' : record.status === 'private' ? 'purple' : 'default'">{{ statusText(record.status) }}</a-tag></template>
          <template v-else-if="column.key === 'count'">{{ tab === 'journeys' ? (record._count?.stops || 0) + ' 站' : (record._count?.steps || 0) + ' 步' }}</template>
          <template v-else-if="column.key === 'updatedAt'">{{ formatDate(record.updatedAt) }}</template>
          <template v-else-if="column.key === 'actions'"><div class="admin-row-actions"><a-button v-if="tab === 'stories' && record.status==='published'" type="link" size="small" @click="router.push(`/stories/${record.slug}`)"><Icon name="ph:play-bold" /> 播放</a-button><a-button type="link" size="small" @click="tab === 'journeys' ? openJourney(record) : openStory(record)"><Icon name="ph:pencil-simple-bold" /> 编辑</a-button><a-button type="link" size="small" danger @click="tab === 'journeys' ? removeJourney(record) : removeStory(record)"><Icon name="ph:trash-bold" /> 删除</a-button></div></template>
        </template>
      </a-table>
      <AdminPagination v-model:current="routePage" :page-size="routePageSize" :total="filteredRoutes.length" :show-size-changer="false" />
    </div>

    <a-modal v-model:open="journeyModal" :title="journeyForm.id?'编辑旅行':'新建旅行'" width="min(920px, calc(100vw - 24px))" :confirm-loading="saving" ok-text="保存" @ok="saveJourney">
      <a-form layout="vertical"><div class="form-grid"><a-form-item label="标题"><a-input v-model:value="journeyForm.title" /></a-form-item><a-form-item label="Slug"><a-input v-model:value="journeyForm.slug" /></a-form-item><a-form-item label="状态"><a-select v-model:value="journeyForm.status" :options="statusOptions" /></a-form-item><a-form-item label="主时间"><a-input v-model:value="journeyForm.happenedAt" type="datetime-local" /></a-form-item></div><a-form-item label="简介"><a-textarea v-model:value="journeyForm.description" :rows="2" /></a-form-item></a-form>
      <div class="editor-head"><b>停靠点</b><a-button size="small" @click="addStop"><Icon name="ph:plus-bold" />添加</a-button></div>
      <div class="sortable-list">
        <article v-for="(stop,index) in journeyForm.stops" :key="stop.key" draggable="true" @dragstart="dragIndex=index" @dragover.prevent @drop="moveItem(journeyForm.stops,index)">
          <Icon name="ph:dots-six-vertical-bold" class="drag" /><div class="step-number">{{ index+1 }}</div><div class="step-fields"><a-input v-model:value="stop.title" placeholder="停靠点标题" /><a-select v-model:value="stop.placeId" allow-clear show-search option-filter-prop="label" placeholder="选择地点" :options="placeOptions" /><a-input v-model:value="stop.occurredAt" type="datetime-local" /><a-select v-model:value="stop.locationVisibility" :options="visibilityOptions" /><a-textarea v-model:value="stop.narration" :rows="2" placeholder="这一站的旁白" /></div><button type="button" title="删除" @click="journeyForm.stops.splice(index,1)"><Icon name="ph:x-bold" /></button>
        </article>
      </div>
    </a-modal>

    <a-modal v-model:open="storyModal" :title="storyForm.id?'编辑故事':'新建故事'" width="min(1040px, calc(100vw - 24px))" :confirm-loading="saving" ok-text="保存" @ok="saveStory">
      <a-form layout="vertical"><div class="form-grid"><a-form-item label="标题"><a-input v-model:value="storyForm.title" /></a-form-item><a-form-item label="Slug"><a-input v-model:value="storyForm.slug" /></a-form-item><a-form-item label="状态"><a-select v-model:value="storyForm.status" :options="statusOptions" /></a-form-item><a-form-item label="关联旅行"><a-select v-model:value="storyForm.journeyId" allow-clear :options="journeyOptions" /></a-form-item></div><a-form-item label="简介"><a-textarea v-model:value="storyForm.description" :rows="2" /></a-form-item></a-form>
      <div class="editor-head"><b>故事步骤</b><div><a-button size="small" :loading="aiLoading" @click="recommendStory"><Icon name="ph:magic-wand-bold" />AI 编排</a-button><a-button size="small" :loading="aiLoading" :disabled="!storyForm.steps.length" @click="generateNarrations"><Icon name="ph:quotes-bold" />生成旁白</a-button><a-button size="small" @click="addStoryStep"><Icon name="ph:plus-bold" />添加</a-button></div></div>
      <div class="sortable-list story-steps">
        <article v-for="(step,index) in storyForm.steps" :key="step.key" draggable="true" @dragstart="dragIndex=index" @dragover.prevent @drop="moveItem(storyForm.steps,index)">
          <Icon name="ph:dots-six-vertical-bold" class="drag" /><div class="step-number">{{ index+1 }}</div><div class="step-fields"><a-select v-model:value="step.nodeId" show-search :filter-option="filterNode" placeholder="选择公开记忆" :options="nodeOptions" /><a-input v-model:value="step.title" placeholder="步骤标题（可选）" /><div class="inline-fields"><a-input-number v-model:value="step.durationSec" :min="2" :max="300" addon-after="秒" /><a-button @click="pickPhoto(step)"><Icon name="ph:image-bold" />{{ step.photoMediaId?'更换照片':'选择照片' }}</a-button><a-button @click="pickMusic(step)"><Icon name="ph:music-notes-bold" />{{ step.musicUrl?'更换音乐':'选择音乐' }}</a-button></div><a-textarea v-model:value="step.narration" :rows="2" placeholder="旁白草稿" /><a-input v-model:value="step.musicUrl" placeholder="音乐地址（可选）" /></div><button type="button" title="删除" @click="storyForm.steps.splice(index,1)"><Icon name="ph:x-bold" /></button>
        </article>
      </div>
    </a-modal>

    <a-modal v-model:open="aiDialog" title="AI 故事编排" ok-text="生成建议" :confirm-loading="aiLoading" @ok="runRecommendation"><a-form layout="vertical"><a-form-item label="主题"><a-input v-model:value="aiForm.theme" placeholder="例如：我的绍兴时光" /></a-form-item><a-form-item label="目标时长"><a-input-number v-model:value="aiForm.durationMinutes" :min="1" :max="60" addon-after="分钟" /></a-form-item></a-form></a-modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'

const api=useApi(),toast=useToast(),router=useRouter(),{openItems}=useMediaLibrary();const tab=ref('journeys'),loading=ref(true),saving=ref(false),aiLoading=ref(false),journeyModal=ref(false),storyModal=ref(false),aiDialog=ref(false);const journeys=ref<any[]>([]),stories=ref<any[]>([]),placeOptions=ref<any[]>([]),nodeOptions=ref<any[]>([]);let dragIndex=-1
const keywordInput=ref(''),keyword=ref(''),routePage=ref(1),routePageSize=10
const routeColumns=[{title:'名称',key:'title',minWidth:280},{title:'状态',key:'status',width:100},{title:'内容',key:'count',width:90},{title:'更新时间',key:'updatedAt',width:120},{title:'操作',key:'actions',width:230,fixed:'right' as const}]
const filteredRoutes=computed(()=>{const source=tab.value==='journeys'?journeys.value:stories.value;const query=keyword.value.toLowerCase();return query?source.filter((item:any)=>`${item.title} ${item.description||''}`.toLowerCase().includes(query)):source})
const pagedRoutes=computed(()=>filteredRoutes.value.slice((routePage.value-1)*routePageSize,routePage.value*routePageSize))
watch(tab,()=>{keywordInput.value='';keyword.value='';routePage.value=1})
function applySearch(){keyword.value=keywordInput.value.trim();routePage.value=1}function resetSearch(){keywordInput.value='';keyword.value='';routePage.value=1}
const statusOptions=[{label:'草稿',value:'draft'},{label:'公开',value:'published'},{label:'私密',value:'private'}],visibilityOptions=[{label:'地点私密',value:'private'},{label:'模糊公开',value:'blurred'},{label:'精确公开',value:'public'}]
const journeyForm=reactive<any>({id:'',title:'',slug:'',description:'',status:'draft',happenedAt:'',stops:[]});const storyForm=reactive<any>({id:'',title:'',slug:'',description:'',status:'draft',journeyId:null,steps:[]});const aiForm=reactive({theme:'我的绍兴时光',durationMinutes:5});const journeyOptions=computed(()=>journeys.value.map(i=>({label:i.title,value:i.id})))
onMounted(loadAll)
async function loadAll(){loading.value=true;try{const [j,s,p,n]=await Promise.all([api.get<any>('/journeys/admin/list',{limit:100}),api.get<any[]>('/stories/admin/list'),api.get<any>('/places',{scope:'admin',limit:100}),api.get<any[]>('/memory-relations/nodes')]);journeys.value=j.items||[];stories.value=s||[];placeOptions.value=(p.items||[]).map((i:any)=>({label:`${i.name}${i.city?` · ${i.city}`:''}`,value:i.id}));nodeOptions.value=n.map((i:any)=>({label:`${typeText(i.type)} · ${i.title}`,value:i.id}))}catch(e:any){toast.error(e?.message||'加载失败')}finally{loading.value=false}}
function resetJourney(){Object.assign(journeyForm,{id:'',title:'',slug:'',description:'',status:'draft',happenedAt:'',stops:[]})}function resetStory(){Object.assign(storyForm,{id:'',title:'',slug:'',description:'',status:'draft',journeyId:null,steps:[]})}
async function openJourney(item?: any) {
  resetJourney()
  if (item) {
    const data = await api.get<any>(`/journeys/admin/${item.id}`)
    Object.assign(journeyForm, {
      ...data,
      happenedAt: localDate(data.happenedAt),
      stops: data.stops.map((stop: any) => ({ ...stop, key: stop.id, occurredAt: localDate(stop.occurredAt) })),
    })
  }
  journeyModal.value = true
}
async function openStory(item?: any) {
  resetStory()
  if (item) {
    const data = await api.get<any>(`/stories/admin/${item.id}`)
    Object.assign(storyForm, {
      ...data,
      steps: data.steps.map((step: any) => ({ ...step, key: step.id, photoMediaId: step.photoMediaId || step.photoMedia?.id || null })),
    })
  }
  storyModal.value = true
}
function addStop(){journeyForm.stops.push({key:crypto.randomUUID(),title:'',placeId:null,occurredAt:'',narration:'',locationVisibility:'private',locationPrecision:'place'})}function addStoryStep(){storyForm.steps.push({key:crypto.randomUUID(),nodeId:null,title:'',narration:'',durationSec:8,photoMediaId:null,musicUrl:'',locationVisibility:'private',locationPrecision:'place'})}
function moveItem(items:any[],target:number){if(dragIndex<0||dragIndex===target)return;const [item]=items.splice(dragIndex,1);items.splice(target,0,item);dragIndex=-1}
async function saveJourney(){if(!journeyForm.title||!journeyForm.slug){toast.warning('请填写标题和 Slug');return}saving.value=true;try{const body={title:journeyForm.title,slug:journeyForm.slug,description:journeyForm.description||null,status:journeyForm.status,happenedAt:iso(journeyForm.happenedAt),stops:journeyForm.stops.map((s:any,sort:number)=>({placeId:s.placeId||null,sort,title:s.title,narration:s.narration||null,occurredAt:iso(s.occurredAt),locationVisibility:s.locationVisibility||'private',locationPrecision:s.locationPrecision||'place',locationExactConfirmedAt:s.locationExactConfirmedAt||null}))};journeyForm.id?await api.put(`/journeys/admin/${journeyForm.id}`,body):await api.post('/journeys/admin',body);journeyModal.value=false;await loadAll();toast.success('旅行已保存')}catch(e:any){toast.error(e?.message||'保存失败')}finally{saving.value=false}}
async function saveStory(){if(!storyForm.title||!storyForm.slug){toast.warning('请填写标题和 Slug');return}saving.value=true;try{const body={title:storyForm.title,slug:storyForm.slug,description:storyForm.description||null,status:storyForm.status,journeyId:storyForm.journeyId||null,steps:storyForm.steps.map((s:any,sort:number)=>({nodeId:s.nodeId||null,placeId:s.placeId||null,photoMediaId:s.photoMediaId||null,sort,title:s.title||null,narration:s.narration||null,musicUrl:s.musicUrl||null,musicStartSec:s.musicStartSec??null,musicEndSec:s.musicEndSec??null,durationSec:s.durationSec||8,locationVisibility:s.locationVisibility||'private',locationPrecision:s.locationPrecision||'place',locationExactConfirmedAt:s.locationExactConfirmedAt||null}))};storyForm.id?await api.put(`/stories/admin/${storyForm.id}`,body):await api.post('/stories/admin',body);storyModal.value=false;await loadAll();toast.success('故事已保存')}catch(e:any){toast.error(e?.message||'保存失败')}finally{saving.value=false}}
function removeJourney(item:any){Modal.confirm({title:'删除旅行',content:`确认删除「${item.title}」？`,okType:'danger',onOk:async()=>{await api.delete(`/journeys/admin/${item.id}`);await loadAll()}})}function removeStory(item:any){Modal.confirm({title:'删除故事',content:`确认删除「${item.title}」？`,okType:'danger',onOk:async()=>{await api.delete(`/stories/admin/${item.id}`);await loadAll()}})}
async function pickPhoto(step:any){const items=await openItems({multiple:false});if(items[0])step.photoMediaId=items[0].id}async function pickMusic(step:any){const items=await openItems({multiple:false});if(items[0])step.musicUrl=items[0].path}
function recommendStory(){aiDialog.value=true}async function runRecommendation(){if(!aiForm.theme.trim())return;aiLoading.value=true;try{const result=await api.post<any>('/memory-relations/ai/story',aiForm);storyForm.title=storyForm.title||result.title;storyForm.steps=result.steps.map((s:any)=>({...s,key:crypto.randomUUID(),photoMediaId:null,musicUrl:'',locationVisibility:'private',locationPrecision:'place'}));aiDialog.value=false;toast.success('建议已填入，可继续人工调整')}catch(e:any){toast.error(e?.message||'AI 编排失败')}finally{aiLoading.value=false}}
async function generateNarrations(){aiLoading.value=true;try{const result=await api.post<any[]>('/memory-relations/ai/narrations',{nodeIds:storyForm.steps.map((s:any)=>s.nodeId).filter(Boolean),theme:storyForm.title||aiForm.theme});const byId=new Map(result.map(i=>[i.nodeId,i.text]));storyForm.steps.forEach((s:any)=>{if(byId.has(s.nodeId))s.narration=byId.get(s.nodeId)});toast.success('旁白草稿已生成')}catch(e:any){toast.error(e?.message||'生成失败')}finally{aiLoading.value=false}}
function filterNode(input:string,option:any){return String(option.label).toLowerCase().includes(input.toLowerCase())}function typeText(t:string){return({post:'文章',moment:'瞬间',album:'相册',photo:'照片',place:'地点',library:'书影',journey:'旅行'}as any)[t]||t}function statusText(v:string){return({draft:'草稿',published:'已发布',private:'私密'}as any)[v]||v}function formatDate(v:string){return v?String(v).slice(0,10):''}function localDate(v:string){if(!v)return'';const d=new Date(v);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}function iso(v:string){return v?new Date(v).toISOString():null}
</script>

<style scoped>
.journey-admin{width:100%;margin:0 auto}.journey-admin>header,.editor-head,.inline-fields{display:flex;align-items:center}.route-search{width:min(340px,100%)}.route-title{display:flex;min-width:0;flex-direction:column;gap:4px}.route-title strong{color:var(--c-text);font-size:.82rem}.route-title span{overflow:hidden;color:var(--c-text-3);font-size:.68rem;text-overflow:ellipsis;white-space:nowrap}.form-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.editor-head{justify-content:space-between;margin:8px 0 10px}.editor-head>div{display:flex;gap:6px}.sortable-list{display:flex;max-height:55vh;flex-direction:column;gap:8px;overflow:auto}.sortable-list article{display:grid;grid-template-columns:20px 30px 1fr 28px;align-items:start;gap:8px;padding:10px;border:1px solid var(--border);border-radius:7px;background:var(--c-bg-2)}.drag{margin-top:9px;color:var(--c-text-3);cursor:grab}.step-number{display:grid;width:28px;height:28px;border-radius:50%;background:var(--c-primary-soft);color:var(--c-primary);font-size:.65rem;place-items:center}.step-fields{display:grid;grid-template-columns:1.2fr 1fr 180px 120px;gap:7px}.step-fields textarea{grid-column:1/-1}.story-steps .step-fields{grid-template-columns:1.2fr 1fr}.story-steps .inline-fields,.story-steps textarea,.story-steps .step-fields>input:last-child{grid-column:1/-1}.inline-fields{gap:7px}.sortable-list article>button{display:grid;width:26px;height:26px;border:0;background:none;color:var(--c-text-3);place-items:center}@media(max-width:760px){.form-grid{grid-template-columns:1fr 1fr}.step-fields{grid-template-columns:1fr}.step-fields>*{grid-column:1!important}.journey-admin>header{align-items:flex-start}}
</style>

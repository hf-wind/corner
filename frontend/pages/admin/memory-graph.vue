<template>
  <div class="graph-admin">
    <header class="page-header">
      <div><h1>记忆关系</h1><p>检查自动关系，修正图谱中的错误连接。</p></div>
      <a-button type="primary" :loading="rebuilding" @click="rebuild"><Icon name="ph:arrows-clockwise-bold" />重建图谱</a-button>
    </header>

    <section class="metrics" aria-label="图谱统计">
      <span><b>{{ graph.nodes.length }}</b>节点</span><span><b>{{ graph.relations.length }}</b>可见关系</span><span><b>{{ relationPage.total }}</b>全部关系</span><code>{{ graph.graphVersion || '尚未生成' }}</code>
    </section>

    <a-alert v-if="error" type="error" show-icon :message="error" closable @close="error = ''" />
    <a-spin :spinning="loading">
      <section class="preview-section">
        <div class="section-head"><h2>2D 数据预览</h2><span v-if="selected">{{ selected.title }}</span></div>
        <MemoryGraph2D :nodes="graph.nodes" :relations="graph.relations" :selected-id="selected?.id" @select="selected = $event" />
      </section>

      <section class="relation-section">
        <div class="section-head"><h2>关系管理</h2><a-button @click="createOpen = true"><Icon name="ph:plus-bold" />新建关系</a-button></div>
        <div class="filters">
          <a-input v-model:value="filters.search" allow-clear placeholder="搜索节点或关系" @pressEnter="loadRelations(1)" />
          <a-select v-model:value="filters.origin" allow-clear placeholder="来源" :options="originOptions" @change="loadRelations(1)" />
          <a-select v-model:value="filters.status" allow-clear placeholder="状态" :options="statusOptions" @change="loadRelations(1)" />
          <a-button title="刷新" @click="loadRelations(relationPage.page)"><Icon name="ph:magnifying-glass-bold" /></a-button>
        </div>
        <div v-if="relationPage.items.length" class="relation-list">
          <article v-for="relation in relationPage.items" :key="relation.id" class="relation-row" :class="{ hidden: relation.hidden }">
            <div class="relation-nodes"><b>{{ relation.source.title }}</b><Icon name="ph:arrow-right-bold" /><b>{{ relation.target.title }}</b></div>
            <div class="relation-meta"><span>{{ relationType(relation.type) }}</span><span>{{ originText(relation.origin) }}</span><span>权重 {{ Number(relation.weight).toFixed(2) }}</span><span>{{ evidenceText(relation.evidence) }}</span></div>
            <div class="relation-actions">
              <a-button size="small" @click="toggleHidden(relation)"><Icon :name="relation.hidden ? 'ph:eye-bold' : 'ph:eye-slash-bold'" />{{ relation.hidden ? '恢复' : '隐藏' }}</a-button>
              <a-button v-if="relation.status === 'candidate'" size="small" type="primary" @click="setStatus(relation, 'active')">采纳</a-button>
              <a-button v-if="relation.status === 'candidate'" size="small" danger @click="setStatus(relation, 'rejected')">拒绝</a-button>
            </div>
          </article>
        </div>
        <a-empty v-else description="暂无关系" />
        <a-pagination v-if="relationPage.total > relationPage.limit" v-model:current="relationPage.page" :page-size="relationPage.limit" :total="relationPage.total" size="small" @change="loadRelations" />
      </section>
    </a-spin>

    <a-modal v-model:open="createOpen" title="创建自定义关系" ok-text="创建" :confirm-loading="creating" @ok="createRelation">
      <a-form layout="vertical">
        <a-form-item label="起点"><a-select v-model:value="createForm.sourceId" show-search :filter-option="false" :options="nodeOptions" @search="searchNodes" /></a-form-item>
        <a-form-item label="终点"><a-select v-model:value="createForm.targetId" show-search :filter-option="false" :options="nodeOptions" @search="searchNodes" /></a-form-item>
        <a-form-item label="关系类型"><a-select v-model:value="createForm.type" :options="relationOptions" /></a-form-item>
        <a-form-item label="关系理由"><a-textarea v-model:value="createForm.reason" :rows="3" maxlength="300" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })
const api = useApi(); const toast = useToast()
const loading = ref(true); const rebuilding = ref(false); const creating = ref(false); const createOpen = ref(false); const error = ref(''); const selected = ref<any>(null)
const graph = reactive<any>({ graphVersion: '', nodes: [], relations: [] })
const relationPage = reactive<any>({ items: [], total: 0, page: 1, limit: 30 })
const filters = reactive({ search: '', origin: undefined as string | undefined, status: undefined as string | undefined })
const createForm = reactive({ sourceId: '', targetId: '', type: 'custom', reason: '' })
const nodeOptions = ref<any[]>([])
const originOptions = [{ label: '自动规则', value: 'automatic' }, { label: '人工创建', value: 'manual' }, { label: 'AI 候选', value: 'ai' }]
const statusOptions = [{ label: '已生效', value: 'active' }, { label: '待审核', value: 'candidate' }, { label: '已拒绝', value: 'rejected' }]
const relationOptions = [{ label: '自定义', value: 'custom' }, { label: '同一主题', value: 'same_theme' }, { label: '内容引用', value: 'reference' }, { label: '故事延续', value: 'story_sequence' }]

onMounted(async () => { await Promise.all([loadGraph(), loadRelations(1), searchNodes('')]); loading.value = false })
async function loadGraph(){ try { Object.assign(graph, await api.get('/memory-relations/graph', { limit: 200 })) } catch(e:any){ error.value=e?.message||'加载图谱失败' } }
async function loadRelations(page=1){ try { Object.assign(relationPage, await api.get('/memory-relations', { ...filters, page, limit: relationPage.limit })) } catch(e:any){ error.value=e?.message||'加载关系失败' } }
async function rebuild(){ rebuilding.value=true; try { const result=await api.post<any>('/memory-relations/rebuild'); toast.success(`已重建 ${result.nodes} 个节点、${result.relations} 条关系`); await Promise.all([loadGraph(),loadRelations(1),searchNodes('')]) } catch(e:any){ toast.error(e?.message||'重建失败') } finally { rebuilding.value=false } }
async function searchNodes(search:string){ try { const items=await api.get<any[]>('/memory-relations/nodes',{search}); nodeOptions.value=items.map(node=>({label:`${typeText(node.type)} · ${node.title}`,value:node.id})) } catch { nodeOptions.value=[] } }
async function toggleHidden(relation:any){ await updateRelation(relation,{hidden:!relation.hidden}) }
async function setStatus(relation:any,status:string){ await updateRelation(relation,{status}) }
async function updateRelation(relation:any,body:any){ try { Object.assign(relation,await api.patch(`/memory-relations/${relation.id}`,body)); await loadGraph() } catch(e:any){ toast.error(e?.message||'更新失败') } }
async function createRelation(){ if(!createForm.sourceId||!createForm.targetId){toast.warning('请选择两个节点');return} creating.value=true; try { await api.post('/memory-relations',{...createForm}); createOpen.value=false; Object.assign(createForm,{sourceId:'',targetId:'',type:'custom',reason:''}); await Promise.all([loadGraph(),loadRelations(1)]); toast.success('关系已创建') } catch(e:any){toast.error(e?.message||'创建失败')} finally{creating.value=false} }
function typeText(type:string){return ({post:'文章',moment:'瞬间',album:'相册',photo:'照片',place:'地点',library:'书影',journey:'旅行'} as any)[type]||type}
function originText(origin:string){return ({automatic:'自动规则',manual:'人工创建',ai:'AI 候选'} as any)[origin]||origin}
function relationType(type:string){return ({same_place:'同一地点',same_album:'同一相册',same_tag:'共同标签',time_adjacent:'时间相邻',reference:'内容引用',same_journey:'同一旅行',same_theme:'同一主题',story_sequence:'故事延续',custom:'自定义'} as any)[type]||type}
function evidenceText(value:any) {
  return value?.reason || value?.albumTitle || value?.stop || (value?.days !== undefined ? `相隔 ${value.days} 天` : '')
}
</script>

<style scoped>
.graph-admin{display:flex;flex-direction:column;gap:20px;width:min(1180px,100%);margin:0 auto}.page-header,.section-head,.metrics,.filters,.relation-row,.relation-nodes,.relation-meta,.relation-actions{display:flex;align-items:center}.page-header{justify-content:space-between;gap:18px}.page-header h1{margin:0;color:var(--c-text);font-size:1.5rem}.page-header p{margin:5px 0 0;color:var(--c-text-3);font-size:.78rem}.metrics{gap:20px;padding:12px 0;border-block:1px solid var(--border);color:var(--c-text-3);font-size:.75rem}.metrics span{display:flex;align-items:baseline;gap:5px}.metrics b{color:var(--c-text);font-size:1.05rem}.metrics code{margin-left:auto}.preview-section,.relation-section{display:flex;flex-direction:column;gap:12px}.section-head{justify-content:space-between}.section-head h2{margin:0;color:var(--c-text);font-size:1rem}.section-head>span{color:var(--c-primary);font-size:.75rem}.filters{gap:8px}.filters .ant-input-affix-wrapper{max-width:260px}.filters .ant-select{min-width:130px}.relation-list{border-top:1px solid var(--border)}.relation-row{gap:16px;min-height:70px;padding:12px 4px;border-bottom:1px solid var(--border)}.relation-row.hidden{opacity:.48}.relation-nodes{min-width:290px;gap:7px;color:var(--c-text-2);font-size:.78rem}.relation-nodes b{max-width:125px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.relation-meta{min-width:0;flex:1;gap:6px;flex-wrap:wrap}.relation-meta span{padding:2px 6px;border:1px solid var(--border);border-radius:4px;color:var(--c-text-3);font-size:.65rem}.relation-actions{gap:6px}.ant-pagination{align-self:flex-end}@media(max-width:760px){.page-header{align-items:flex-start}.metrics{gap:10px;flex-wrap:wrap}.metrics code{width:100%;margin:0}.filters{flex-wrap:wrap}.relation-row{align-items:flex-start;flex-direction:column}.relation-nodes{min-width:0}.relation-actions{width:100%;justify-content:flex-end}}
</style>

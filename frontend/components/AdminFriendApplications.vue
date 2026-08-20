<template>
  <section class="review-section" aria-labelledby="friend-review-title">
    <header class="review-section-head"><div><h2 id="friend-review-title">友链申请</h2><p>审核互链信息并同步加入友链资源。</p></div><AdminRefreshButton :loading="loading" @click="load(page)" /></header>
    <div class="table-toolbar">
      <a-input v-model:value="keyword" allow-clear placeholder="搜索站点名称、地址或邮箱" @press-enter="resetAndLoad"><template #prefix><Icon name="ph:magnifying-glass" /></template></a-input>
      <a-select v-model:value="status" style="width:130px"><a-select-option value="">全部状态</a-select-option><a-select-option value="pending">待审核</a-select-option><a-select-option value="approved">已通过</a-select-option><a-select-option value="rejected">已拒绝</a-select-option></a-select>
      <a-button type="primary" @click="resetAndLoad"><Icon name="ph:magnifying-glass-bold" /> 搜索</a-button>
      <a-button @click="resetFilters"><Icon name="ph:arrow-counter-clockwise-bold" /> 重置</a-button>
    </div>
    <div class="admin-table-shell">
      <a-table :data-source="filteredItems" :columns="columns" row-key="id" size="small" :loading="loading" :pagination="false" :scroll="{ x: 1080 }" :locale="{ emptyText: '暂无友链申请' }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'siteUrl'"><a :href="record.siteUrl" target="_blank">{{ record.siteUrl }}</a></template>
          <template v-else-if="column.key === 'status'"><a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag></template>
          <template v-else-if="column.key === 'aiReviewResult'"><a-tag :color="aiColor(record.aiReviewResult)">{{ aiText(record.aiReviewResult) }}</a-tag></template>
          <template v-else-if="column.key === 'createdAt'">{{ formatTime(record.createdAt) }}</template>
          <template v-else-if="column.key === 'actions'"><div class="admin-row-actions"><a-button type="link" size="small" @click="openDetail(record)"><Icon name="ph:eye-bold" /> 详情</a-button><a-button v-if="record.status !== 'approved'" type="link" size="small" @click="approve(record)"><Icon name="ph:check-bold" /> 通过</a-button><a-button v-if="record.status !== 'rejected'" type="link" size="small" danger @click="openReject(record)"><Icon name="ph:x-bold" /> 拒绝</a-button><a-button type="link" size="small" danger @click="remove(record)"><Icon name="ph:trash-bold" /> 删除</a-button></div></template>
        </template>
      </a-table>
      <AdminPagination v-model:current="page" :page-size="pageSize" :total="total" :show-size-changer="false" @change="load" />
    </div>

    <a-modal v-model:open="detail.open" title="友链申请详情" width="680px" :footer="null"><a-descriptions v-if="detail.record" bordered size="small" :column="1"><a-descriptions-item label="站点名称">{{ detail.record.siteName }}</a-descriptions-item><a-descriptions-item label="站点地址"><a :href="detail.record.siteUrl" target="_blank">{{ detail.record.siteUrl }}</a></a-descriptions-item><a-descriptions-item label="友链页面"><a :href="detail.record.friendPageUrl" target="_blank">{{ detail.record.friendPageUrl }}</a></a-descriptions-item><a-descriptions-item label="联系邮箱">{{ detail.record.contactEmail || '-' }}</a-descriptions-item><a-descriptions-item label="Logo">{{ detail.record.siteAvatar || '-' }}</a-descriptions-item><a-descriptions-item label="RSS">{{ detail.record.siteRssUrl || '-' }}</a-descriptions-item><a-descriptions-item label="描述">{{ detail.record.siteDescription || '-' }}</a-descriptions-item><a-descriptions-item label="AI 审核">{{ detail.record.aiReview || '-' }}</a-descriptions-item><a-descriptions-item label="拒绝原因">{{ detail.record.rejectReason || '-' }}</a-descriptions-item></a-descriptions></a-modal>
    <a-modal v-model:open="reject.open" title="拒绝友链申请" width="420px" ok-text="确认拒绝" @ok="confirmReject"><a-textarea v-model:value="reject.reason" :rows="4" placeholder="请输入拒绝理由" /></a-modal>
  </section>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
const api = useApi()
const toast = useToast()
const loading = ref(false)
const items = ref<any[]>([])
const status = ref('')
const keyword = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(0)
const detail = reactive({ open: false, record: null as any })
const reject = reactive({ open: false, record: null as any, reason: '' })
const filteredItems = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return query ? items.value.filter((item) => `${item.siteName} ${item.siteUrl} ${item.contactEmail}`.toLowerCase().includes(query)) : items.value
})
const columns = [{ title:'站点名称',dataIndex:'siteName',key:'siteName',width:150 },{ title:'站点 URL',key:'siteUrl',width:250 },{ title:'邮箱',dataIndex:'contactEmail',key:'contactEmail',width:180 },{ title:'状态',key:'status',width:90 },{ title:'AI 审核',key:'aiReviewResult',width:100 },{ title:'申请时间',key:'createdAt',width:150 },{ title:'操作',key:'actions',width:260,fixed:'right' as const }]
function statusColor(value:string){return value==='approved'?'green':value==='rejected'?'red':'orange'}
function statusText(value:string){return value==='approved'?'已通过':value==='rejected'?'已拒绝':'待审核'}
function aiColor(value?:string){return value?.includes('approved')?'blue':value?.includes('rejected')?'red':'orange'}
function aiText(value?:string){return ({approved:'AI 通过',rejected:'AI 拒绝',manual_approved:'人工通过',manual_rejected:'人工拒绝'} as Record<string,string>)[String(value)] || '待审核'}
function formatTime(value?:string){return value?String(value).slice(0,16).replace('T',' '):''}
async function load(target=page.value){page.value=target;loading.value=true;try{const params:any={page:target,limit:pageSize};if(status.value)params.status=status.value;const result=await api.get<any>('/friend-link/applications',params);items.value=result?.items||[];total.value=result?.total||0}catch(error:any){items.value=[];toast.error(error?.message||'友链申请加载失败')}finally{loading.value=false}}
function resetAndLoad(){page.value=1;void load(1)}
function resetFilters(){keyword.value='';status.value='';resetAndLoad()}
function openDetail(record:any){Object.assign(detail,{open:true,record})}
async function approve(record:any){try{Object.assign(record,await api.post<any>(`/friend-link/applications/${record.id}/approve`));toast.success('已通过并加入友链')}catch(error:any){toast.error(error?.message||'操作失败')}}
function openReject(record:any){Object.assign(reject,{open:true,record,reason:record.rejectReason||''})}
async function confirmReject(){if(!reject.reason.trim()){toast.warning('请输入拒绝理由');return}try{Object.assign(reject.record,await api.post<any>(`/friend-link/applications/${reject.record.id}/reject`,{reason:reject.reason.trim()}));reject.open=false;toast.success('已拒绝')}catch(error:any){toast.error(error?.message||'操作失败')}}
function remove(record:any){Modal.confirm({title:'删除友链申请',content:`确认删除「${record.siteName}」的申请？删除后无法恢复。`,okText:'删除',cancelText:'取消',okType:'danger',onOk:async()=>{try{await api.delete(`/friend-link/applications/${record.id}`);toast.success('已删除');await load(page.value)}catch(error:any){toast.error(error?.message||'删除失败')}}})}
onMounted(load)
</script>

<style scoped>
.review-section{margin-top:24px;padding-top:20px;border-top:1px solid var(--border)}.review-section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px}.review-section-head h2{margin:0;font-size:1rem}.review-section-head p{margin:3px 0 0;color:var(--c-text-3);font-size:.68rem}.table-toolbar{justify-content:flex-start}.table-toolbar :deep(.ant-input-affix-wrapper){width:min(360px,100%)}@media(max-width:640px){.review-section-head{align-items:flex-start;flex-direction:column}}
</style>

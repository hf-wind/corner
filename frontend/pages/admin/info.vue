<template>
  <div class="admin-page-shell system-page" :class="{ embedded }">
    <header v-if="!embedded" class="admin-page-head"><div><span>SYSTEM STATUS</span><h1>系统信息</h1><p>来自当前生产进程的运行状态，不使用前端硬编码信息。</p></div><AdminRefreshButton :loading="loading" @click="load" /></header>
    <a-spin :spinning="loading">
      <section class="system-status"><span :class="info.database === 'online' ? 'online' : 'offline'"><i />数据库 {{ info.database === 'online' ? '正常' : '不可用' }}</span><small>检查于 {{ formatTime(info.checkedAt) }}</small></section>
      <section class="system-grid">
        <article v-for="item in cards" :key="item.label"><span><Icon :name="item.icon" /></span><div><small>{{ item.label }}</small><strong>{{ item.value || '—' }}</strong><p>{{ item.note }}</p></div></article>
      </section>
      <section class="runtime-panel">
        <header><div><span>RUNTIME</span><h2>运行环境</h2></div><small>{{ info.environment }}</small></header>
        <dl><div><dt>应用</dt><dd>{{ info.application }}</dd></div><div><dt>前端</dt><dd>{{ info.frontend }}</dd></div><div><dt>后端</dt><dd>{{ info.backend }}</dd></div><div><dt>完整架构</dt><dd>{{ info.framework }}</dd></div><div><dt>Node.js</dt><dd>{{ info.nodeVersion }}</dd></div><div><dt>平台</dt><dd>{{ info.platform }} / {{ info.architecture }}</dd></div><div><dt>时区</dt><dd>{{ info.timezone }}</dd></div><div><dt>负载</dt><dd>{{ (info.loadAverage || []).join(' / ') || '—' }}</dd></div></dl>
      </section>
    </a-spin>
  </div>
</template>
<script setup lang="ts">
const { embedded = false } = defineProps<{ embedded?: boolean }>()

const api=useApi(); const loading=ref(true); const info=ref<any>({})
const cards=computed(()=>[
  {label:'服务运行时间',value:info.value.uptime,icon:'ph:clock-countdown-bold',note:'当前后端进程'},
  {label:'进程内存',value:info.value.memoryUsage,icon:'ph:memory-bold',note:`堆内存 ${info.value.heapUsage || '—'}`},
  {label:'宿主内存',value:info.value.hostMemory,icon:'ph:hard-drives-bold',note:'已使用 / 总量'},
  {label:'CPU 核心',value:info.value.cpuCores,icon:'ph:cpu-bold',note:'操作系统可见核心'},
])
function formatTime(value?:string){return value?new Date(value).toLocaleString('zh-CN',{hour12:false}):'—'}
async function load(){loading.value=true;try{info.value=await api.get('/stats/system')}catch{info.value={}}finally{loading.value=false}}
onMounted(load); useHead({title:'系统信息'})
</script>
<style scoped>
.system-page{width:min(1180px,100%);margin:0 auto}.system-status{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:11px 14px;border:1px solid var(--border);border-radius:8px;background:var(--ld-bg-card)}.system-status span{display:flex;align-items:center;gap:8px;font-size:.68rem}.system-status i{width:7px;height:7px;border-radius:50%}.system-status .online i{background:#43a977;box-shadow:0 0 0 4px rgb(67 169 119 / 11%)}.system-status .offline i{background:#d25b5b}.system-status small{color:var(--c-text-3);font-size:.56rem}.system-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.system-grid article{display:grid;grid-template-columns:38px minmax(0,1fr);gap:10px;padding:15px;border:1px solid var(--border);border-radius:8px;background:var(--ld-bg-card)}.system-grid article>span{display:grid;width:36px;height:36px;border-radius:8px;background:var(--c-primary-soft);color:var(--c-primary);place-items:center}.system-grid small,.system-grid p{color:var(--c-text-3);font-size:.54rem}.system-grid strong{display:block;margin-top:2px;font-size:.84rem}.system-grid p{margin:4px 0 0}.runtime-panel{margin-top:12px;padding:18px;border:1px solid var(--border);border-radius:8px;background:var(--ld-bg-card)}.runtime-panel header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.runtime-panel header span{color:var(--c-primary);font-size:.52rem;letter-spacing:.12em}.runtime-panel h2{margin:3px 0 0;font-size:.9rem}.runtime-panel header small{color:var(--c-text-3);font-size:.6rem}.runtime-panel dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin:0;border-top:1px solid var(--border);border-left:1px solid var(--border)}.runtime-panel dl>div{display:grid;grid-template-columns:90px minmax(0,1fr);border-right:1px solid var(--border);border-bottom:1px solid var(--border)}.runtime-panel dt,.runtime-panel dd{padding:10px;margin:0;font-size:.65rem}.runtime-panel dt{background:var(--c-bg-1);color:var(--c-text-3)}.runtime-panel dd{color:var(--c-text-2)}@media(max-width:900px){.system-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.system-grid,.runtime-panel dl{grid-template-columns:1fr}.runtime-panel dl>div{grid-template-columns:78px minmax(0,1fr)}}
</style>
<style scoped>
.system-page.embedded { padding: 0; }
</style>

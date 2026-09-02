<template>
  <div class="admin-page-shell logs-page">
    <header class="admin-page-head">
      <div><span>SYSTEM OBSERVABILITY</span><h1>系统日志</h1><p>查看后端服务启动与运行输出，支持自动刷新和级别筛选。</p></div>
      <div class="log-actions"><a-select v-model:value="level" allow-clear placeholder="全部级别" style="width: 130px"><a-select-option value="ERROR">ERROR</a-select-option><a-select-option value="WARN">WARN</a-select-option><a-select-option value="LOG">LOG</a-select-option><a-select-option value="DEBUG">DEBUG</a-select-option></a-select><a-button :loading="loading" @click="load"><Icon name="ph:arrows-clockwise-bold" />刷新</a-button></div>
    </header>
    <section class="log-toolbar"><a-input v-model:value="search" allow-clear placeholder="搜索日志内容" @press-enter="load" /><a-switch v-model:checked="autoRefresh" checked-children="自动" un-checked-children="手动" /><span>{{ checkedAt ? `更新于 ${formatDate(checkedAt)}` : '尚未加载' }}</span></section>
    <section class="terminal-panel" aria-live="polite"><div class="terminal-bar"><span /><span /><span /><code>{{ source || 'backend.log' }}</code><small>{{ items.length }} 行</small></div><pre v-if="items.length">{{ items.join('\n') }}</pre><a-empty v-else description="暂无日志" /></section>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const toast = useToast()
const items = ref<string[]>([])
const loading = ref(false)
const level = ref<string>()
const search = ref('')
const checkedAt = ref('')
const source = ref('')
const autoRefresh = ref(true)
let timer: ReturnType<typeof setInterval> | null = null

async function load() {
  loading.value = true
  try {
    const result = await api.get<any>('/logs', { lines: 500, level: level.value, search: search.value })
    items.value = result.items || []
    checkedAt.value = result.checkedAt || ''
    source.value = result.source || ''
  } catch (error: any) { toast.error(error?.message || '日志加载失败') }
  finally { loading.value = false }
}
function formatDate(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }
watch([level, autoRefresh], () => { if (!autoRefresh.value) return; void load() })
onMounted(() => { void load(); timer = setInterval(() => { if (autoRefresh.value) void load() }, 5000) })
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
useHead({ title: '系统日志' })
</script>

<style scoped>
.logs-page{min-height:100%}.log-actions,.log-toolbar{display:flex;align-items:center;gap:10px}.log-toolbar{margin:12px 0}.log-toolbar .ant-input{max-width:420px}.log-toolbar>span{color:var(--c-text-3);font-size:.6rem}.terminal-panel{overflow:hidden;border:1px solid var(--border);border-radius:8px;background:#111820;box-shadow:0 12px 30px rgb(0 0 0 / 16%)}.terminal-bar{display:flex;align-items:center;gap:6px;padding:10px 13px;border-bottom:1px solid rgb(255 255 255 / 9%);color:#9aabb8}.terminal-bar span{width:8px;height:8px;border-radius:50%;background:#e76f73}.terminal-bar span:nth-child(2){background:#e6b45c}.terminal-bar span:nth-child(3){background:#65bf91}.terminal-bar code{margin-left:7px;font:11px var(--font-mono);color:#b7c7d2}.terminal-bar small{margin-left:auto;color:#718492;font-size:10px}.terminal-panel pre{min-height:520px;max-height:calc(100vh - 250px);margin:0;padding:15px;overflow:auto;color:#c8d5dc;font:11px/1.65 var(--font-mono);white-space:pre-wrap;word-break:break-word}.terminal-panel :deep(.ant-empty){padding:80px 0}.terminal-panel :deep(.ant-empty-description){color:#8999a4}@media(max-width:640px){.admin-page-head{display:block}.log-actions{margin-top:12px}.log-toolbar{flex-wrap:wrap}.log-toolbar .ant-input{max-width:none;flex:1 1 100%}}
</style>

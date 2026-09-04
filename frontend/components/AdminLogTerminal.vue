<template>
  <section class="log-console" :class="{ compact }">
    <header class="log-console__controls">
      <a-input v-model:value="searchDraft" allow-clear placeholder="搜索日志" @press-enter="applySearch">
        <template #prefix><Icon name="ph:magnifying-glass" /></template>
      </a-input>
      <a-select v-model:value="level" allow-clear placeholder="全部级别">
        <a-select-option value="ERROR">ERROR</a-select-option>
        <a-select-option value="WARN">WARN</a-select-option>
        <a-select-option value="LOG">LOG</a-select-option>
        <a-select-option value="DEBUG">DEBUG</a-select-option>
      </a-select>
      <a-button type="text" :title="autoRefresh ? '暂停实时更新' : '继续实时更新'" @click="autoRefresh = !autoRefresh">
        <Icon :name="autoRefresh ? 'ph:pause-bold' : 'ph:play-bold'" />
      </a-button>
      <a-button type="text" title="立即刷新" :loading="refreshing" @click="load(true)">
        <Icon name="ph:arrows-clockwise-bold" />
      </a-button>
    </header>

    <div class="log-terminal">
      <div class="log-terminal__bar">
        <span /><span /><span />
        <code>{{ source || "backend.log" }}</code>
        <small><i :class="{ live: autoRefresh && active }" />{{ autoRefresh && active ? "LIVE" : "PAUSED" }} · {{ total }} 行</small>
      </div>
      <div ref="terminalRef" class="log-terminal__screen" @scroll="trackScroll">
        <div v-if="initialLoading" class="log-terminal__state is-loading"><Icon name="ph:circle-notch-bold" />正在接入日志流</div>
        <template v-else-if="items.length">
          <div v-for="(line, index) in items" :key="`${index}-${line}`" class="log-line" :class="lineClass(line)">
            <span>{{ String(index + 1).padStart(4, "0") }}</span><code>{{ line }}</code>
          </div>
        </template>
        <div v-else class="log-terminal__state"><Icon name="ph:terminal-window-bold" />当前筛选下没有日志</div>
      </div>
      <footer>
        <span>{{ checkedAt ? formatDate(checkedAt) : "等待连接" }}</span>
        <button v-if="!followTail" type="button" @click="resumeTail"><Icon name="ph:arrow-line-down-bold" />回到最新</button>
      </footer>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ active?: boolean; compact?: boolean }>(), { active: true, compact: false })
const api = useApi()
const toast = useToast()
const items = ref<string[]>([])
const total = ref(0)
const initialLoading = ref(true)
const refreshing = ref(false)
const level = ref<string>()
const searchDraft = ref("")
const search = ref("")
const checkedAt = ref("")
const source = ref("")
const autoRefresh = ref(true)
const followTail = ref(true)
const terminalRef = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setInterval> | null = null
let requestPending = false

async function load(manual = false) {
  if (requestPending || (!props.active && !manual)) return
  requestPending = true
  if (manual) refreshing.value = true
  try {
    const result = await api.get<any>("/logs", { lines: 800, level: level.value, search: search.value })
    items.value = [...(result.items || [])].reverse()
    total.value = result.total || 0
    checkedAt.value = result.checkedAt || ""
    source.value = result.source || ""
    if (followTail.value) await scrollToTail()
  } catch (error: any) {
    if (manual || initialLoading.value) toast.error(error?.message || "日志加载失败")
  } finally {
    initialLoading.value = false
    refreshing.value = false
    requestPending = false
  }
}

async function scrollToTail() {
  await nextTick()
  requestAnimationFrame(() => {
    if (terminalRef.value) terminalRef.value.scrollTop = terminalRef.value.scrollHeight
  })
}

function trackScroll() {
  const el = terminalRef.value
  if (!el) return
  followTail.value = el.scrollHeight - el.scrollTop - el.clientHeight < 36
}

function resumeTail() {
  followTail.value = true
  void scrollToTail()
}

function applySearch() {
  search.value = searchDraft.value.trim()
  void load(true)
}

function lineClass(line: string) {
  if (/\] (?:ERROR|FATAL)\b/.test(line)) return "is-error"
  if (/\] WARN\b/.test(line)) return "is-warn"
  if (/\] DEBUG\b/.test(line)) return "is-debug"
  return "is-log"
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false })
}

watch(level, () => void load(true))
watch(() => props.active, (value) => { if (value) void load() })
onMounted(() => {
  void load()
  timer = setInterval(() => { if (autoRefresh.value) void load() }, 2000)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.log-console { display:grid; gap:12px; min-width:0; }
.log-console__controls { display:grid; grid-template-columns:minmax(180px,420px) 132px 34px 34px; align-items:center; gap:8px; }
.log-console__controls :deep(.ant-btn) { display:grid; width:34px; height:34px; padding:0; place-items:center; }
.log-terminal { overflow:hidden; border:1px solid rgb(255 255 255 / 10%); border-radius:8px; background:#0c1218; box-shadow:0 16px 38px rgb(0 0 0 / 20%); }
.log-terminal__bar { display:flex; align-items:center; gap:6px; height:40px; padding:0 13px; border-bottom:1px solid rgb(255 255 255 / 8%); background:#121a22; color:#91a2ae; }
.log-terminal__bar > span { width:8px; height:8px; border-radius:50%; background:#e66c70; }
.log-terminal__bar > span:nth-child(2) { background:#e2b158; }
.log-terminal__bar > span:nth-child(3) { background:#62bd8d; }
.log-terminal__bar code { margin-left:6px; color:#b7c6cf; font:11px var(--font-mono); }
.log-terminal__bar small { display:flex; align-items:center; gap:6px; margin-left:auto; font:9px var(--font-mono); }
.log-terminal__bar small i { width:6px; height:6px; border-radius:50%; background:#667782; }
.log-terminal__bar small i.live { background:#62bd8d; box-shadow:0 0 0 4px rgb(98 189 141 / 12%); animation:log-pulse 1.6s ease-in-out infinite; }
.log-terminal__screen { min-height:420px; max-height:calc(100vh - 300px); overflow:auto; padding:10px 0; scrollbar-gutter:stable; }
.log-line { display:grid; grid-template-columns:48px minmax(0,1fr); min-height:24px; padding:3px 14px 3px 0; color:#b9c8d1; font:11px/1.65 var(--font-mono); }
.log-line:hover { background:rgb(255 255 255 / 3%); }
.log-line > span { padding-right:10px; color:#43515c; text-align:right; user-select:none; }
.log-line code { color:inherit; white-space:pre-wrap; overflow-wrap:anywhere; }
.log-line.is-error { color:#ff8d92; }
.log-line.is-warn { color:#e9bd6b; }
.log-line.is-debug { color:#7e99aa; }
.log-terminal__state { display:grid; min-height:320px; align-content:center; justify-items:center; gap:10px; color:#6f818e; font:11px var(--font-mono); }
.log-terminal__state :deep(svg) { font-size:24px; }
.log-terminal__state.is-loading .iconify { animation:log-spin .9s linear infinite; }
.log-terminal footer { display:flex; min-height:32px; align-items:center; justify-content:space-between; padding:0 13px; border-top:1px solid rgb(255 255 255 / 7%); color:#61727d; font:9px var(--font-mono); }
.log-terminal footer button { display:inline-flex; align-items:center; gap:4px; border:0; background:transparent; color:#91aaba; cursor:pointer; font:inherit; }
.compact .log-terminal__screen { min-height:360px; max-height:56vh; }
@keyframes log-pulse { 50% { opacity:.45; transform:scale(.82); } }
@keyframes log-spin { to { transform:rotate(360deg); } }
@media(max-width:640px) { .log-console__controls { grid-template-columns:minmax(0,1fr) 104px 34px 34px; } .log-terminal__screen,.compact .log-terminal__screen { min-height:320px; max-height:58vh; } .log-line { grid-template-columns:38px minmax(0,1fr); font-size:10px; } }
@media(prefers-reduced-motion:reduce) { .log-terminal__bar small i.live,.log-terminal__state .iconify { animation:none; } }
</style>

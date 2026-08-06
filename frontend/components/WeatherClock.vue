<template>
  <section class="weather-card" :class="[weatherTone, { 'is-loading': loading }]" aria-labelledby="weather-card-title">
    <span class="weather-orb" aria-hidden="true" />
    <div class="weather-sky" aria-hidden="true"><i /><i /><i /></div>
    <header class="weather-head">
      <div class="weather-place">
        <span id="weather-card-title"><Icon name="ph:map-pin-fill" /> {{ weather.city }}</span>
        <small>{{ dateStr }}</small>
      </div>
      <time>{{ timeStr }}</time>
    </header>

    <div class="weather-main">
      <span class="condition-icon"><Icon :name="weatherIcon" /></span>
      <div class="temperature"><strong>{{ weather.temperature }}</strong><sup>°</sup></div>
      <div class="condition-copy"><b>{{ weather.condition }}</b><span>体感 {{ weather.feelsLike }}°</span></div>
    </div>

    <div class="weather-divider" aria-hidden="true" />
    <footer class="weather-metrics">
      <span><Icon name="ph:drop-bold" /><b>{{ weather.humidity }}%</b><small>湿度</small></span>
      <span><Icon name="ph:wind-bold" /><b>{{ weather.windDirection }} {{ weather.windScale }}级</b><small>风力</small></span>
      <span><Icon name="ph:waveform-bold" /><b>{{ weather.stale ? '缓存' : '实时' }}</b><small>数据状态</small></span>
    </footer>
  </section>
</template>

<script setup lang="ts">
type WeatherData = {
  temperature: number
  feelsLike: number
  condition: string
  icon: string
  city: string
  humidity: number
  windDirection: string
  windScale: string
  stale?: boolean
}

const api = useApi()
const now = ref(new Date())
const weather = ref<WeatherData>({
  temperature: 0,
  feelsLike: 0,
  condition: '天气加载中',
  icon: '999',
  city: '绍兴',
  humidity: 0,
  windDirection: '微风',
  windScale: '0',
})
let timer: ReturnType<typeof setInterval>
let refreshTimer: ReturnType<typeof setInterval>
let idleHandle: number | null = null
const loading = ref(true)
let fetchedAt = 0

const iconMap: Record<string, string> = {
  sunny: 'ph:sun-bold',
  cloudy: 'ph:cloud-sun-bold',
  overcast: 'ph:cloud-bold',
  rain: 'ph:cloud-rain-bold',
  storm: 'ph:cloud-lightning-bold',
  snow: 'ph:snowflake-bold',
  fog: 'ph:cloud-fog-bold',
  unknown: 'ph:wind-bold',
}
const iconNumber = computed(() => Number.parseInt(weather.value.icon, 10))
const weatherKind = computed(() => {
  const code = iconNumber.value
  if ([100, 150].includes(code)) return 'sunny'
  if ((code >= 101 && code <= 103) || (code >= 151 && code <= 153)) return 'cloudy'
  if ([104, 154].includes(code)) return 'overcast'
  if ((code >= 300 && code <= 304) || (code >= 350 && code <= 351)) return 'storm'
  if (code >= 305 && code <= 399) return 'rain'
  if (code >= 400 && code <= 499) return 'snow'
  if (code >= 500 && code <= 515) return 'fog'
  return 'unknown'
})
const weatherIcon = computed(() => iconMap[weatherKind.value])
const weatherTone = computed(() => `weather-${weatherKind.value}`)
const timeStr = computed(() => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now.value))
const dateStr = computed(() => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(now.value))

async function loadWeather() {
  try {
    weather.value = await api.get<WeatherData>('/weather')
    fetchedAt = Date.now()
  } catch {
    weather.value.condition = '风来得有些慢'
  } finally {
    loading.value = false
  }
}

function onVisibilityChange() {
  if (!document.hidden && Date.now() - fetchedAt > 10 * 60_000) void loadWeather()
}

onMounted(() => {
  timer = setInterval(() => { now.value = new Date() }, 30_000)
  refreshTimer = setInterval(() => void loadWeather(), 15 * 60_000)
  document.addEventListener('visibilitychange', onVisibilityChange)
  if ('requestIdleCallback' in window) {
    idleHandle = window.requestIdleCallback(() => void loadWeather(), { timeout: 1200 })
  } else {
    idleHandle = window.setTimeout(() => void loadWeather(), 180)
  }
})

onUnmounted(() => {
  clearInterval(timer)
  clearInterval(refreshTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  if (idleHandle !== null) {
    if ('cancelIdleCallback' in window) window.cancelIdleCallback(idleHandle)
    else window.clearTimeout(idleHandle)
  }
})
</script>

<style scoped>
.weather-card {
  --weather-a: #ef7e9f;
  --weather-b: #ffd4df;
  position: relative;
  min-height: 190px;
  padding: 15px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--weather-a) 28%, var(--border));
  border-radius: 22px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--weather-b) 58%, var(--ld-bg-card)), color-mix(in srgb, var(--weather-a) 16%, var(--ld-bg-card)) 58%, var(--ld-bg-card));
  box-shadow: 0 16px 34px color-mix(in srgb, var(--weather-a) 17%, var(--ld-shadow));
  isolation: isolate;
}
.dark .weather-card,
:global(html.dark) .weather-card {
  --weather-a: #c75f91;
  --weather-b: #352445;
  background: linear-gradient(145deg, color-mix(in srgb, #211d3c 86%, var(--ld-bg-card)), color-mix(in srgb, var(--weather-a) 18%, var(--ld-bg-card)) 58%, var(--ld-bg-card));
  box-shadow: 0 18px 40px rgb(0 0 0 / 28%);
}
.weather-sunny { --weather-a: #ef8b52; --weather-b: #ffe0a7; }
.weather-cloudy { --weather-a: #7799c6; --weather-b: #d4e3f8; }
.weather-overcast { --weather-a: #7d879e; --weather-b: #c7d0df; }
.weather-rain, .weather-storm { --weather-a: #6b82c2; --weather-b: #c2c8f1; }
.weather-snow { --weather-a: #61a9d0; --weather-b: #d8f3ff; }
.weather-fog { --weather-a: #6fa59b; --weather-b: #d1eee2; }
.weather-orb { position: absolute; z-index: -1; top: -52px; right: -25px; width: 150px; height: 150px; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--weather-b) 82%, transparent), transparent 67%); }
.weather-sky { position: absolute; z-index: -1; inset: 0; opacity: .3; }
.weather-sky i { position: absolute; height: 1px; border-radius: 99px; background: linear-gradient(90deg, transparent, var(--weather-a), transparent); animation: weather-drift 7s ease-in-out infinite; }
.weather-sky i:nth-child(1) { top: 32px; right: -8px; width: 104px; }
.weather-sky i:nth-child(2) { top: 60px; right: 22px; width: 70px; animation-delay: -2s; }
.weather-sky i:nth-child(3) { bottom: 28px; left: -16px; width: 86px; animation-delay: -4s; }
.weather-rain .weather-sky i, .weather-storm .weather-sky i { width: 1px; height: 46px; background: linear-gradient(transparent, var(--weather-b)); transform: rotate(18deg); animation: weather-rain 1.4s linear infinite; }
.weather-rain .weather-sky i:nth-child(1), .weather-storm .weather-sky i:nth-child(1) { top: -8px; right: 28px; }
.weather-rain .weather-sky i:nth-child(2), .weather-storm .weather-sky i:nth-child(2) { top: 38px; right: 82px; }
.weather-rain .weather-sky i:nth-child(3), .weather-storm .weather-sky i:nth-child(3) { bottom: -6px; left: 35px; }
.weather-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.weather-place { display: flex; flex-direction: column; gap: 3px; }
.weather-head span { display: flex; align-items: center; gap: 4px; color: var(--c-text); font-size: .68rem; font-weight: 720; }
.weather-head span :deep(svg) { color: var(--weather-a); }
.weather-head small { color: var(--c-text-3); font-size: .53rem; }
.weather-head time { color: var(--c-text-2); font-family: var(--font-accent); font-size: .68rem; font-weight: 720; font-variant-numeric: tabular-nums; }
.weather-main { display: flex; align-items: center; gap: 10px; margin-top: 21px; }
.condition-icon { display: grid; width: 48px; height: 48px; border: 1px solid color-mix(in srgb, var(--weather-a) 28%, transparent); border-radius: 16px; background: color-mix(in srgb, var(--ld-bg-card) 52%, transparent); color: var(--weather-a); font-size: 1.7rem; place-items: center; animation: weather-float 4s ease-in-out infinite; }
.temperature { display: flex; align-items: flex-start; color: var(--c-text); line-height: 1; }
.temperature strong { font-family: var(--font-accent); font-size: 2.8rem; font-variant-numeric: tabular-nums; }
.temperature sup { margin: 2px 0 0 2px; color: var(--weather-a); font-size: .9rem; }
.condition-copy { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.condition-copy b { overflow: hidden; color: var(--c-text); font-size: .76rem; text-overflow: ellipsis; white-space: nowrap; }
.condition-copy span { color: var(--c-text-3); font-size: .52rem; }
.weather-divider { height: 1px; margin-top: 17px; border-radius: 99px; background: color-mix(in srgb, var(--weather-a) 28%, var(--border)); }
.weather-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 11px; }
.weather-metrics span { display: grid; min-width: 0; grid-template-columns: 15px minmax(0, 1fr); align-items: center; column-gap: 4px; color: var(--weather-a); }
.weather-metrics span :deep(svg) { grid-row: 1 / span 2; }
.weather-metrics b { overflow: hidden; color: var(--c-text-2); font-size: .57rem; text-overflow: ellipsis; white-space: nowrap; }
.weather-metrics small { color: var(--c-text-3); font-size: .47rem; }
@keyframes weather-drift { 50% { opacity: .35; transform: translateX(-16px); } }
@keyframes weather-rain { to { transform: translate3d(-14px, 55px, 0) rotate(18deg); opacity: 0; } }
@keyframes weather-float { 50% { transform: translateY(-4px) rotate(5deg); } }
@media (prefers-reduced-motion: reduce) { .weather-sky i, .condition-icon { animation: none !important; } }
</style>

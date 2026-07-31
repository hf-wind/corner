<template>
  <section class="weather-card" :class="weatherTone" aria-labelledby="weather-card-title">
    <span class="weather-orb" aria-hidden="true" />
    <div class="weather-sky" aria-hidden="true"><i /><i /><i /></div>
    <header>
      <div>
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

    <footer>
      <span><Icon name="ph:drop-bold" /><b>{{ weather.humidity }}%</b><small>湿度</small></span>
      <i />
      <span><Icon name="ph:wind-bold" /><b>{{ weather.windDirection }}</b><small>{{ weather.windScale }} 级</small></span>
      <em v-if="weather.stale" title="当前展示最近一次天气缓存">缓存</em>
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
const weather = ref<WeatherData>({ temperature: 0, feelsLike: 0, condition: '天气加载中', icon: '999', city: '绍兴', humidity: 0, windDirection: '微风', windScale: '0' })
let timer: ReturnType<typeof setInterval>

const iconMap: Record<string, string> = {
  sunny: 'ph:sun-bold', cloudy: 'ph:cloud-sun-bold', overcast: 'ph:cloud-bold', rain: 'ph:cloud-rain-bold',
  storm: 'ph:cloud-lightning-bold', snow: 'ph:snowflake-bold', fog: 'ph:cloud-fog-bold', unknown: 'ph:wind-bold',
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

onMounted(async () => {
  timer = setInterval(() => { now.value = new Date() }, 30_000)
  try { weather.value = await api.get<WeatherData>('/weather') } catch { weather.value.condition = '风来得有些慢' }
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.weather-card { --weather-a:#6b9de8; --weather-b:#c4dcfb; position:relative; min-height:190px; padding:16px; overflow:hidden; border:1px solid color-mix(in srgb,var(--weather-a) 24%,var(--border)); border-radius:17px; background:linear-gradient(145deg,color-mix(in srgb,var(--weather-a) 16%,var(--ld-bg-card)),color-mix(in srgb,var(--weather-b) 12%,var(--ld-bg-card))); box-shadow:0 12px 30px color-mix(in srgb,var(--weather-a) 14%,transparent); isolation:isolate; }
.weather-sunny { --weather-a:#e9a33d; --weather-b:#ffe5a8; }.weather-cloudy { --weather-a:#719bc5; --weather-b:#cbd9e7; }.weather-overcast { --weather-a:#708093; --weather-b:#c1c9d1; }.weather-rain,.weather-storm { --weather-a:#496f9c; --weather-b:#95abc2; }.weather-snow { --weather-a:#7aadd0; --weather-b:#e6f5ff; }.weather-fog { --weather-a:#82928f; --weather-b:#d3dcda; }
.weather-orb { position:absolute; z-index:-1; top:-45px; right:-28px; width:145px; height:145px; border-radius:50%; background:radial-gradient(circle,color-mix(in srgb,var(--weather-b) 78%,transparent),transparent 68%); }
.weather-sky { position:absolute; z-index:-1; inset:0; opacity:.24; }.weather-sky i { position:absolute; height:1px; border-radius:99px; background:linear-gradient(90deg,transparent,var(--weather-a),transparent); animation:weather-drift 7s ease-in-out infinite; }.weather-sky i:nth-child(1){top:32px;right:-8px;width:100px}.weather-sky i:nth-child(2){top:60px;right:22px;width:68px;animation-delay:-2s}.weather-sky i:nth-child(3){bottom:28px;left:-16px;width:85px;animation-delay:-4s}
header { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; } header>div { display:flex; flex-direction:column; gap:3px; } header span { display:flex; align-items:center; gap:4px; color:var(--c-text); font-size:.68rem; font-weight:720; } header span :deep(svg){color:var(--weather-a)} header small { color:var(--c-text-3); font-size:.53rem; } header time { color:var(--c-text-2); font-family:var(--font-accent); font-size:.68rem; font-weight:720; font-variant-numeric:tabular-nums; }
.weather-main { display:flex; align-items:center; gap:10px; margin-top:21px; }.condition-icon { display:grid; width:44px; height:44px; border:1px solid color-mix(in srgb,var(--weather-a) 25%,transparent); border-radius:15px; background:color-mix(in srgb,var(--ld-bg-card) 54%,transparent); color:var(--weather-a); font-size:1.65rem; place-items:center; }.temperature { display:flex; align-items:flex-start; color:var(--c-text); line-height:1; }.temperature strong { font-family:var(--font-accent); font-size:2.7rem; font-variant-numeric:tabular-nums; }.temperature sup { margin:2px 0 0 2px; color:var(--weather-a); font-size:.9rem; }.condition-copy { display:flex; min-width:0; flex-direction:column; gap:3px; }.condition-copy b { overflow:hidden; color:var(--c-text); font-size:.76rem; text-overflow:ellipsis; white-space:nowrap; }.condition-copy span { color:var(--c-text-3); font-size:.52rem; }
footer { position:relative; display:flex; align-items:center; gap:11px; margin-top:19px; padding-top:12px; border-top:1px solid color-mix(in srgb,var(--weather-a) 18%,var(--border)); } footer>span { display:grid; min-width:0; grid-template-columns:15px auto; align-items:center; column-gap:4px; color:var(--weather-a); } footer>span b { overflow:hidden; color:var(--c-text-2); font-size:.57rem; text-overflow:ellipsis; white-space:nowrap; } footer>span small { grid-column:2; color:var(--c-text-3); font-size:.47rem; } footer>i { width:1px; height:23px; background:var(--border); } footer em { margin-left:auto; padding:2px 5px; border-radius:99px; background:var(--c-bg-2); color:var(--c-text-3); font-size:.43rem; font-style:normal; }
@keyframes weather-drift { 50% { opacity:.35; transform:translateX(-16px); } }
@media(prefers-reduced-motion:reduce){.weather-sky i{animation:none}}
</style>

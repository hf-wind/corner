<template>
  <section
    class="weather-card"
    :class="[`weather-${weatherKind}`, { 'is-loading': loading }]"
    aria-label="当前天气"
  >
    <div class="weather-glow" aria-hidden="true" />

    <header class="weather-head">
      <span class="weather-city">{{ weather.city }}</span>
      <span class="weather-status">
        <Icon name="ph:pulse-bold" />
        {{ weather.stale ? "缓存" : "实时" }}
      </span>
    </header>

    <div class="weather-body">
      <span class="weather-icon">
        <Icon :name="weatherIcon" />
      </span>
      <div class="weather-main">
        <p class="weather-temp">{{ weather.temperature }}<i>°C</i></p>
        <p class="weather-cond">{{ weather.condition }}</p>
      </div>
    </div>

    <div class="weather-metrics">
      <div class="w-metric">
        <Icon name="ph:drop-bold" />
        <span>湿度</span>
        <strong>{{ weather.humidity }}%</strong>
      </div>
      <div class="w-metric">
        <Icon name="ph:wind-bold" />
        <span>风力</span>
        <strong>{{ weather.windDirection }} {{ weather.windScale }}</strong>
      </div>
      <div class="w-metric">
        <Icon name="ph:thermometer-simple-bold" />
        <span>体感</span>
        <strong>{{ weather.feelsLike }}°C</strong>
      </div>
    </div>

    <p v-if="weather.stale" class="weather-stale">
      <Icon name="ph:cloud-arrow-down-bold" />
      数据来自最近一次缓存，将在稍后自动刷新
    </p>
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
const weather = ref<WeatherData>({
  temperature: 0,
  feelsLike: 0,
  condition: '天气加载中',
  icon: '0',
  city: '绍兴',
  humidity: 0,
  windDirection: '微风',
  windScale: '0级',
})
let refreshTimer: ReturnType<typeof setInterval>
let idleHandle: number | null = null
const loading = ref(true)
let fetchedAt = 0

const ICON_KIND: Array<[string, number[]]> = [
  ['sunny', [0]],
  ['cloudy', [1, 2]],
  ['overcast', [3]],
  ['fog', [45, 48]],
  ['rain', [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]],
  ['snow', [71, 73, 75, 77, 85, 86]],
  ['storm', [95, 96, 99]],
]

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

const weatherKind = computed(() => {
  const code = Number.parseInt(weather.value.icon, 10)
  const match = ICON_KIND.find(([, codes]) => codes.includes(code))
  return match?.[0] ?? 'unknown'
})
const weatherIcon = computed(() => iconMap[weatherKind.value])

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
  refreshTimer = setInterval(() => void loadWeather(), 15 * 60_000)
  document.addEventListener('visibilitychange', onVisibilityChange)
  if ('requestIdleCallback' in window) {
    idleHandle = window.requestIdleCallback(() => void loadWeather(), { timeout: 1200 })
  } else {
    idleHandle = window.setTimeout(() => void loadWeather(), 180)
  }
})

onUnmounted(() => {
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
  --wx-bg: linear-gradient(160deg, #5aa7f0, #2f6fd8 62%, #2559b8);
  --wx-ink: #fff;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 16px 13px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, #ffffff 22%, transparent);
  border-radius: 18px;
  background: var(--wx-bg);
  box-shadow: 0 12px 30px color-mix(in srgb, #1d4e9e 30%, transparent);
  color: var(--wx-ink);
  isolation: isolate;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}
.weather-card:hover {
  box-shadow: 0 16px 38px color-mix(in srgb, #1d4e9e 40%, transparent);
  transform: translateY(-2px);
}

.weather-glow {
  position: absolute;
  z-index: -1;
  top: -64px;
  right: -52px;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 255 255 / 22%), transparent 68%);
  pointer-events: none;
}

/* ===== 天气氛围 ===== */
.weather-sunny { --wx-bg: linear-gradient(155deg, #ffb35c, #f78b3d 58%, #e06b2c); box-shadow: 0 12px 30px color-mix(in srgb, #d96a22 34%, transparent); }
.weather-cloudy { --wx-bg: linear-gradient(155deg, #8db8e8, #5f8fcb 60%, #4773ae); box-shadow: 0 12px 30px color-mix(in srgb, #3f6ba6 32%, transparent); }
.weather-overcast { --wx-bg: linear-gradient(155deg, #7d93ac, #5b7089 60%, #41556c); box-shadow: 0 12px 30px color-mix(in srgb, #3a4d63 34%, transparent); }
.weather-rain { --wx-bg: linear-gradient(155deg, #4f8fd6, #31599e 60%, #243f7d); box-shadow: 0 12px 30px color-mix(in srgb, #26498a 34%, transparent); }
.weather-storm { --wx-bg: linear-gradient(155deg, #6d5bbf, #45327e 62%, #2f2058); box-shadow: 0 12px 30px color-mix(in srgb, #3b2a6d 36%, transparent); }
.weather-snow { --wx-bg: linear-gradient(155deg, #a8c8ec, #7fa2cc 60%, #6488b5); box-shadow: 0 12px 30px color-mix(in srgb, #5b7ea9 32%, transparent); }
.weather-fog { --wx-bg: linear-gradient(155deg, #9aa7b5, #758392 62%, #5c6977); box-shadow: 0 12px 30px color-mix(in srgb, #55626f 32%, transparent); }

.weather-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.weather-city {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  opacity: 0.95;
}
.weather-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgb(255 255 255 / 14%);
  font-size: 0.52rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.weather-body {
  display: flex;
  align-items: center;
  gap: 14px;
}
.weather-icon {
  display: grid;
  width: 64px;
  height: 64px;
  flex: 0 0 64px;
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 18px;
  background: rgb(255 255 255 / 14%);
  font-size: 2.1rem;
  place-items: center;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 22%), 0 8px 18px rgb(0 0 0 / 12%);
}
.weather-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}
.weather-temp {
  margin: 0;
  font-family: var(--font-accent);
  font-size: 2.05rem;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 12px rgb(0 0 0 / 14%);
}
.weather-temp i {
  font-size: 1rem;
  font-style: normal;
  font-weight: 500;
  opacity: 0.88;
}
.weather-cond {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  opacity: 0.92;
}

.weather-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding-top: 11px;
  border-top: 1px solid rgb(255 255 255 / 18%);
}
.w-metric {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  text-align: center;
}
.w-metric > svg {
  font-size: 0.82rem;
  opacity: 0.85;
}
.w-metric span {
  font-size: 0.5rem;
  letter-spacing: 0.08em;
  opacity: 0.78;
}
.w-metric strong {
  max-width: 100%;
  overflow: hidden;
  font-size: 0.62rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weather-stale {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  font-size: 0.54rem;
  opacity: 0.8;
}
.weather-stale > svg {
  flex: 0 0 auto;
}

@media (prefers-reduced-motion: reduce) {
  .weather-card {
    transition: none;
  }
}
</style>

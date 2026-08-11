<template>
  <section
    class="weather-card"
    :class="{ 'is-loading': loading }"
    aria-label="当前天气"
  >
    <div class="weather-top">
      <span class="weather-hero">
        <svg
          v-if="weatherKind === 'sunny'"
          class="hero-sun"
          viewBox="0 0 80 80"
          fill="none"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M77.39 46.522c0 1.478-.086 2.974-.26 4.435 0 .035-.017.035-.017.07L61.72 46.921c.018-.14.018-.261.018-.4 0-11.983-9.757-21.74-21.74-21.74-11.982 0-21.738 9.757-21.738 21.74v.33l-15.392 4.14v-.035a37.706 37.706 0 0 1-.26-4.435c0-20.609 16.765-37.392 37.39-37.392 20.627 0 37.392 16.783 37.392 37.392Z"
            fill="#F95428"
          />
          <path
            d="M66.956 46.522c0 .452-.017.887-.034 1.322v.052L49.86 52.47a2.32 2.32 0 0 1 .243-.887c.8-1.583 1.2-3.288 1.2-5.061 0-6.227-5.078-11.305-11.305-11.305-6.226 0-11.304 5.078-11.304 11.305 0 1.773.4 3.478 1.2 5.06a2.4 2.4 0 0 1 .261 1.079l-17.043-4.574a1.026 1.026 0 0 1-.035-.244 31.56 31.56 0 0 1-.035-1.321c0-14.87 12.087-26.957 26.956-26.957 14.87 0 26.957 12.087 26.957 26.957Z"
            fill="#F5B420"
          />
          <path
            d="M77.391 46.522c0 1.478-.087 2.974-.26 4.435 0 .035-.018.035-.018.07l-15.391-4.105c.017-.14.017-.261.017-.4 0-11.983-9.756-21.74-21.739-21.74V9.13c20.626 0 37.391 16.783 37.391 37.392Z"
            fill="#EA3B18"
          />
          <path
            d="M66.957 46.522c0 .452-.017.887-.035 1.322v.052L49.861 52.47c.017-.296.105-.61.244-.887.8-1.583 1.2-3.288 1.2-5.061 0-6.227-5.079-11.305-11.305-11.305V19.565c14.87 0 26.957 12.087 26.957 26.957Z"
            fill="#F09C12"
          />
          <path
            d="M74.541 53.265a2.608 2.608 0 0 1-2.594-2.917c.15-1.262.227-2.549.227-3.826C72.174 28.78 57.74 14.348 40 14.348c-17.742 0-32.174 14.432-32.174 32.174 0 1.277.076 2.564.226 3.826a2.608 2.608 0 0 1-2.283 2.898c-1.401.175-2.726-.85-2.897-2.281a37.624 37.624 0 0 1-.264-4.443C2.608 25.904 19.381 9.13 40 9.13c20.618 0 37.39 16.774 37.39 37.392 0 1.482-.087 2.977-.262 4.443a2.609 2.609 0 0 1-2.587 2.3Z"
            fill="#E6563A"
          />
          <path
            d="M72.174 46.522c0 1.277-.077 2.564-.226 3.826a2.608 2.608 0 1 0 5.18.617 37.64 37.64 0 0 0 .263-4.443C77.391 25.904 60.618 9.13 40 9.13v5.218c17.741 0 32.174 14.432 32.174 32.174Z"
            fill="#D9472B"
          />
          <path
            d="m64.32 50.339-.124-.003a2.608 2.608 0 0 1-2.483-2.727c.017-.361.025-.723.025-1.088 0-11.987-9.752-21.739-21.739-21.739S18.26 34.534 18.26 46.522c0 .364.009.726.026 1.087a2.608 2.608 0 0 1-2.483 2.727c-1.473.051-2.662-1.046-2.728-2.485a29.3 29.3 0 0 1-.032-1.33c0-14.864 12.092-26.956 26.956-26.956 14.865 0 26.957 12.092 26.957 26.957 0 .446-.012.889-.032 1.33a2.608 2.608 0 0 1-2.604 2.487Z"
            fill="#FFC033"
          />
          <path
            d="M61.739 46.522c0 .364-.009.726-.025 1.087a2.608 2.608 0 1 0 5.21.243c.02-.44.033-.884.033-1.33 0-14.864-12.093-26.957-26.957-26.957v5.218c11.987 0 21.739 9.752 21.739 21.739Z"
            fill="#F9A926"
          />
          <path
            d="M52.44 55.357a2.608 2.608 0 0 1-2.329-3.781 11.157 11.157 0 0 0 1.194-5.054c0-6.233-5.072-11.305-11.305-11.305S28.696 40.29 28.696 46.522c0 1.777.402 3.477 1.194 5.053a2.608 2.608 0 1 1-4.66 2.344 16.317 16.317 0 0 1-1.752-7.397C23.479 37.412 30.89 30 40 30s16.522 7.412 16.522 16.522c0 2.6-.59 5.087-1.751 7.397a2.608 2.608 0 0 1-2.332 1.438Z"
            fill="#3AACE6"
          />
          <path
            d="M51.304 46.522c0 1.777-.402 3.477-1.194 5.053a2.608 2.608 0 1 0 4.66 2.344 16.316 16.316 0 0 0 1.752-7.397C56.522 37.412 49.11 30 40 30v5.217c6.233 0 11.304 5.072 11.304 11.305Z"
            fill="#2B9FD9"
          />
          <path
            d="m69.543 50.322-.102-.001a2.609 2.609 0 0 1-2.506-2.708 30.4 30.4 0 0 0 .022-1.091c0-14.864-12.092-26.957-26.957-26.957-14.864 0-26.956 12.092-26.956 26.957 0 .365.008.73.022 1.09a2.61 2.61 0 0 1-2.507 2.709 2.6 2.6 0 0 1-2.707-2.506 32.62 32.62 0 0 1-.026-1.293C7.826 28.78 22.26 14.348 40 14.348S72.174 28.78 72.174 46.522c0 .433-.009.863-.026 1.293a2.609 2.609 0 0 1-2.605 2.508Z"
            fill="#FF9F19"
          />
          <path
            d="M66.957 46.522c0 .365-.009.73-.022 1.091a2.61 2.61 0 0 0 5.213.202c.017-.43.026-.86.026-1.293C72.174 28.78 57.74 14.348 40 14.348v5.217c14.864 0 26.957 12.093 26.957 26.957Z"
            fill="#F28618"
          />
          <path
            d="M57.765 56.23a2.609 2.609 0 0 1-2.42-3.581 16.371 16.371 0 0 0 1.177-6.127C56.522 37.412 49.11 30 40 30s-16.522 7.412-16.522 16.522c0 2.119.396 4.18 1.177 6.127a2.609 2.609 0 0 1-1.449 3.392 2.612 2.612 0 0 1-3.391-1.45 21.559 21.559 0 0 1-1.554-8.07c0-11.986 9.752-21.738 21.739-21.738s21.739 9.752 21.739 21.739c0 2.787-.523 5.503-1.554 8.07a2.607 2.607 0 0 1-2.42 1.638Z"
            fill="#88CC2A"
          />
          <path
            d="M56.522 46.522c0 2.119-.396 4.18-1.177 6.127a2.609 2.609 0 0 0 4.84 1.943 21.559 21.559 0 0 0 1.554-8.07c0-11.987-9.752-21.74-21.739-21.74V30c9.11 0 16.522 7.412 16.522 16.522Z"
            fill="#7FB335"
          />
          <path
            d="M66.957 44.782c-4.253 0-8.207 2.105-10.623 5.516-6.448-1.604-12.856 3.352-12.856 10.137 0 5.754 4.681 10.434 10.435 10.434h13.044C74.149 70.87 80 65.02 80 57.827c0-7.192-5.85-13.044-13.043-13.044Z"
            fill="#DAE1E6"
          />
          <path
            d="M23.667 50.298c-2.417-3.411-6.37-5.516-10.624-5.516C5.851 44.782 0 50.633 0 57.826c0 7.192 5.85 13.043 13.043 13.043h13.044c5.754 0 10.435-4.68 10.435-10.434 0-6.774-6.397-11.744-12.855-10.137Z"
            fill="#EDF0F2"
          />
        </svg>
        <Icon v-else class="hero-icon" :name="weatherIcon" />
      </span>
      <span class="weather-rule" aria-hidden="true" />
      <div class="weather-copy">
        <p class="weather-city">{{ weather.city }}</p>
        <p class="weather-temp">{{ weather.temperature }}°C</p>
        <div class="weather-tip">
          <Icon name="ph:info-bold" />
          <p>{{ weather.condition }}</p>
        </div>
      </div>
    </div>

    <div class="weather-divider" aria-hidden="true" />

    <div class="weather-bottom">
      <div class="weather-metrics">
        <div class="metric-row">
          <Icon name="ph:wind-bold" />
          <i class="metric-dot" aria-hidden="true" />
          <p>风速</p>
          <i class="metric-dot" aria-hidden="true" />
          <p>{{ weather.windDirection }} {{ weather.windScale }}级</p>
        </div>
        <div class="metric-row">
          <Icon name="ph:pulse-bold" />
          <i class="metric-dot" aria-hidden="true" />
          <p>数据</p>
          <i class="metric-dot" aria-hidden="true" />
          <p>{{ weather.stale ? '缓存' : '实时' }}</p>
        </div>
        <div class="metric-row">
          <Icon name="ph:drop-bold" />
          <i class="metric-dot" aria-hidden="true" />
          <p>湿度</p>
          <i class="metric-dot" aria-hidden="true" />
          <p>{{ weather.humidity }}%</p>
        </div>
      </div>
      <div class="weather-feel">
        <div class="feel-icon-wrap">
          <svg
            class="feel-icon"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20.199 25.307c-1.343-6.396-6.887-10.646-12.383-9.492-5.497 1.153-8.864 7.274-7.521 13.67.829 3.949 3.259 7.078 6.29 8.625H4.328a1.505 1.505 0 1 0-1.376 2.114l.04-.002.038.002h11.944c.474 0 6.36-9.501 5.224-14.917Z"
              fill="#6DC82A"
            />
            <path
              d="M20.198 25.307c-1.342-6.396-6.886-10.646-12.382-9.492a8.827 8.827 0 0 0-1.7.54c.735 6.883 2.302 16.451 5.598 23.15l-.182.111c-.354.216-.7.43-.986.608h4.43c.473 0 6.36-9.501 5.222-14.917Z"
              fill="#5EAC24"
            />
            <path
              d="M47.705 29.485c1.343-6.396-2.024-12.517-7.52-13.67-5.497-1.154-11.04 3.096-12.383 9.492-1.137 5.416 4.75 14.917 5.223 14.917h11.944l.04-.002.039.002a1.506 1.506 0 1 0-1.377-2.115h-2.255c3.03-1.546 5.46-4.676 6.29-8.624Z"
              fill="#6DC82A"
            />
            <path
              d="M27.802 25.307c1.342-6.396 6.886-10.646 12.383-9.492.592.124 1.16.307 1.7.54-.736 6.883-2.303 16.451-5.599 23.15.06.035.12.073.182.111.354.216.7.43.986.608h-4.43c-.472 0-6.36-9.501-5.222-14.917Z"
              fill="#5EAC24"
            />
            <path
              d="M35.813 17.311H13.348l2.944 22.913h16.25l3.271-22.913Z"
              fill="#4E901E"
            />
            <path
              d="M33.648 40.267c6.508-11.695 6.905-32.555 6.905-32.555a6.09 6.09 0 0 0-12.17-.321h-8.766a6.09 6.09 0 0 0-12.17.321s.636 21.945 6.906 32.555c0-.12-3.453 2.05-3.453 2.05h3.935l-.723 2.532 3.255-1.446.603 2.17 2.452-4.051s.254-.41.26-.611c.004-.169-.126-.443-.126-.443-1.128-3.242-6.642-20.457 3.445-20.457 10.341 0 4.665 17.098 3.463 20.423 0 0-.146.366-.146.477 0 .206.261.612.261.612l2.451 4.05.603-2.17 3.256 1.447-.724-2.533H37.1s-3.452-2.17-3.452-2.05Z"
              fill="#91DC5A"
            />
            <path
              d="M11.098 43.081a.804.804 0 1 0 0-1.607.804.804 0 0 0 0 1.607Zm3.054 2.492a.804.804 0 1 0 0-1.608.804.804 0 0 0 0 1.608Zm3.778.804a.804.804 0 1 0 0-1.608.804.804 0 0 0 0 1.608Zm12.063 0a.804.804 0 1 0 0-1.608.804.804 0 0 0 0 1.608Zm3.9-.804a.804.804 0 1 0 0-1.608.804.804 0 0 0 0 1.608Zm3.18-2.492a.804.804 0 1 0 0-1.607.804.804 0 0 0 0 1.607Z"
              fill="#5EAC24"
            />
            <path
              d="M13.544 12.699a4.547 4.547 0 1 0 0-9.093 4.547 4.547 0 0 0 0 9.093Z"
              fill="#6DC82A"
            />
            <path
              d="M13.544 11.717A3.57 3.57 0 0 1 9.98 8.152a3.57 3.57 0 0 1 3.565-3.566 3.57 3.57 0 0 1 3.566 3.566 3.57 3.57 0 0 1-3.566 3.565Z"
              fill="#5EAC24"
            />
            <path
              d="M15.736 8.708h-4.384a.558.558 0 0 1-.556-.556c0-.306.25-.557.556-.557h4.384c.305 0 .556.25.556.557 0 .305-.25.556-.556.556Z"
              fill="#57565C"
            />
            <path
              d="M34.449 12.699a4.547 4.547 0 1 0 0-9.094 4.547 4.547 0 0 0 0 9.094Z"
              fill="#6DC82A"
            />
            <path
              d="M34.45 11.717a3.57 3.57 0 0 1-3.566-3.565 3.57 3.57 0 0 1 3.566-3.566 3.57 3.57 0 0 1 3.565 3.566 3.57 3.57 0 0 1-3.566 3.565Z"
              fill="#5EAC24"
            />
            <path
              d="M36.64 8.708h-4.383a.558.558 0 0 1-.556-.556c0-.306.25-.557.556-.557h4.384a.558.558 0 0 1 0 1.112Z"
              fill="#57565C"
            />
            <path
              d="M13.633 17.555c-.706-.008-2.058-.41-2.18-1.868a.736.736 0 0 1 1.467-.123c.038.456.557.512.724.518h20.713c.167-.006.686-.062.724-.518a.735.735 0 1 1 1.467.123c-.122 1.459-1.474 1.86-2.172 1.868H13.633Z"
              fill="#6DC82A"
            />
            <path
              d="M42.449 34.38a.736.736 0 0 1-.546-1.23c.313-.346.604-.728.865-1.134a.736.736 0 1 1 1.239.796 10.29 10.29 0 0 1-1.011 1.326.734.734 0 0 1-.547.243Zm2.375-4.764a.736.736 0 0 1-.721-.887c.453-2.155.198-4.32-.716-6.096a.736.736 0 0 1 1.308-.674c1.07 2.075 1.37 4.587.849 7.072a.736.736 0 0 1-.72.585Z"
              fill="#5EAC24"
            />
          </svg>
          <span class="feel-shadow" aria-hidden="true" />
        </div>
        <p class="feel-copy">体感 {{ weather.feelsLike }}°C</p>
      </div>
    </div>
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
  icon: '999',
  city: '绍兴',
  humidity: 0,
  windDirection: '微风',
  windScale: '0',
})
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
  display: flex;
  min-height: 10em;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  padding: 0.5em 1em;
  border: 1px solid color-mix(in srgb, var(--c-primary) 16%, transparent);
  border-radius: 1.5em;
  background: color-mix(in srgb, var(--c-primary) 11%, var(--ld-bg-card));
  color: var(--c-primary);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--c-primary) 8%, transparent);
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
}
.weather-card:hover {
  border-color: color-mix(in srgb, var(--c-primary) 30%, transparent);
  box-shadow: 0 6px 22px color-mix(in srgb, var(--c-primary) 12%, transparent);
}

.weather-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1em;
  width: 100%;
}
.weather-hero {
  display: grid;
  flex-shrink: 0;
  place-items: center;
}
.hero-sun {
  width: 4.9em;
  height: 4.9em;
}
.hero-icon {
  font-size: 3.5em;
}
.weather-rule {
  height: 4em;
  width: 1px;
  flex-shrink: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-primary) 50%, transparent);
}
.weather-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}
.weather-city {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 300;
  line-height: 1.35;
}
.weather-temp {
  margin: 0;
  font-family: var(--font-accent);
  font-size: 1.5em;
  font-weight: 600;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.weather-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.125em;
  font-size: 0.625rem;
  font-weight: 300;
  line-height: 1.35;
}
.weather-tip :deep(svg) {
  font-size: 0.95em;
  opacity: 0.85;
}
.weather-tip p {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weather-divider {
  height: 0.5px;
  width: 100%;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-primary) 50%, transparent);
}

.weather-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5em;
  width: 100%;
}
.weather-metrics {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  font-size: 0.75em;
}
.metric-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  padding: 0.25em;
}
.metric-row :deep(svg) {
  flex-shrink: 0;
  font-size: 1em;
}
.metric-row p {
  margin: 0;
  overflow: hidden;
  font-weight: 300;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.metric-dot {
  height: 0.5em;
  width: 1px;
  flex-shrink: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-primary) 50%, transparent);
}

.weather-feel {
  display: flex;
  width: 6rem;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  gap: 0.25em;
  padding: 0.25em 0;
  font-size: 0.625em;
}
.feel-icon-wrap {
  position: relative;
  z-index: 0;
  height: 48px;
  width: 48px;
}
.feel-icon {
  height: 48px;
  width: 48px;
  transition: transform 0.2s ease;
}
.weather-card:hover .feel-icon {
  transform: translateY(-8px);
}
.feel-shadow {
  position: absolute;
  bottom: 8px;
  left: 50%;
  z-index: -1;
  height: 4px;
  width: 32px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-primary) 45%, transparent);
  filter: blur(6px);
  transform: translateX(-50%);
  transition: width 0.2s ease, filter 0.2s ease;
}
.weather-card:hover .feel-shadow {
  width: 16px;
  filter: blur(4px);
}
.feel-copy {
  margin: 0;
  font-weight: 300;
  line-height: 1.3;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .feel-icon,
  .feel-shadow {
    transition: none;
  }
}
</style>

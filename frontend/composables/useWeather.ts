export type WeatherData = {
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

export type WeatherKind = 'sunny' | 'cloudy' | 'overcast' | 'fog' | 'rain' | 'snow' | 'storm' | 'unknown'

const ICON_KIND: Array<[WeatherKind, number[]]> = [
  ['sunny', [0]],
  ['cloudy', [1, 2]],
  ['overcast', [3]],
  ['fog', [45, 48]],
  ['rain', [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]],
  ['snow', [71, 73, 75, 77, 85, 86]],
  ['storm', [95, 96, 99]],
]

export const WEATHER_ICON_MAP: Record<WeatherKind, string> = {
  sunny: 'ph:sun-bold',
  cloudy: 'ph:cloud-sun-bold',
  overcast: 'ph:cloud-bold',
  rain: 'ph:cloud-rain-bold',
  storm: 'ph:cloud-lightning-bold',
  snow: 'ph:snowflake-bold',
  fog: 'ph:cloud-fog-bold',
  unknown: 'ph:wind-bold',
}

export function useWeather(options: { autoRefresh?: boolean } = {}) {
  const autoRefresh = options.autoRefresh !== false
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
  const loading = ref(true)
  let fetchedAt = 0

  const weatherKind = computed<WeatherKind>(() => {
    const code = Number.parseInt(weather.value.icon, 10)
    const match = ICON_KIND.find(([, codes]) => codes.includes(code))
    return match?.[0] ?? 'unknown'
  })
  const weatherIcon = computed(() => WEATHER_ICON_MAP[weatherKind.value])

  async function refresh() {
    try {
      weather.value = await api.get<WeatherData>('/weather')
      fetchedAt = Date.now()
    } catch {
      weather.value.condition = '风来得有些慢'
    } finally {
      loading.value = false
    }
  }

  let refreshTimer: ReturnType<typeof setInterval>
  let idleHandle: number | null = null

  function onVisibilityChange() {
    if (!document.hidden && Date.now() - fetchedAt > 10 * 60_000) void refresh()
  }

  onMounted(() => {
    if (autoRefresh) {
      refreshTimer = setInterval(() => void refresh(), 15 * 60_000)
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
    if ('requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(() => void refresh(), { timeout: 1200 })
    } else {
      idleHandle = window.setTimeout(() => void refresh(), 180)
    }
  })

  onUnmounted(() => {
    if (autoRefresh) {
      clearInterval(refreshTimer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    if (idleHandle !== null) {
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(idleHandle)
      else window.clearTimeout(idleHandle)
    }
  })

  return { weather, loading, weatherKind, weatherIcon, refresh }
}
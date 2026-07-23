<template>
  <div class="weather-clock-card">
    <div class="wc-header"><Icon name="ph:clock-bold" /> 时钟天气</div>
    <div class="wc-clock">
      <svg viewBox="0 0 180 60" class="clock-svg">
        <text x="90" y="32" text-anchor="middle" class="clock-time" data-allow-mismatch="text">{{ timeStr }}</text>
        <text x="90" y="52" text-anchor="middle" class="clock-date" data-allow-mismatch="text">{{ dateStr }}</text>
      </svg>
      <div class="wc-weather">
        <span class="wc-temp"><Icon name="ph:sun-bold" /> {{ temp }}</span>
        <span class="wc-city">{{ city }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const now = ref(new Date())
const mounted = ref(false)
const temp = ref('28°')
const city = ref('北京')
let timer: ReturnType<typeof setInterval>

onMounted(async () => {
  mounted.value = true
  now.value = new Date()
  timer = setInterval(() => { now.value = new Date() }, 1000)
  try {
    const w = await api.get<any>('/weather')
    temp.value = `${w.temperature}°`
    city.value = w.city
  } catch { /* keep default */ }
})
onUnmounted(() => { clearInterval(timer) })

const timeStr = computed(() => {
  const d = now.value
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

const dateStr = computed(() => {
  const d = now.value
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

function pad(n: number) { return n.toString().padStart(2, '0') }
</script>

<style scoped>
.weather-clock-card {
  background: var(--ld-bg-card);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 4px var(--ld-shadow);
  transition: all 0.2s;
}
.weather-clock-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 0.5em 1em var(--ld-shadow);
}
.wc-header {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--c-text-2);
  margin-bottom: 4px;
  letter-spacing: 0.05em;
}
.wc-clock {
  text-align: center;
}
.clock-svg {
  width: 100%;
  height: auto;
}
.clock-time {
  fill: var(--c-text);
  font-size: 26px;
  font-weight: 700;
  font-family: var(--font-heading);
}
.clock-date {
  fill: var(--c-text-2);
  font-size: 10px;
  font-family: var(--font-body);
}
.wc-weather {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 2px;
}
.wc-temp {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-primary);
}
.wc-city {
  font-size: 0.65rem;
  color: var(--c-text-2);
}
</style>

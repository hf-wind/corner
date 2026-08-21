<template>
  <section class="weather-card" :class="`weather-${displayKind}`" aria-label="当前天气">
    <header class="weather-head">
      <div><span class="weather-kicker">此刻天气</span><strong><Icon name="ph:map-pin-fill" />{{ weather.city }}</strong></div>
      <span class="weather-status" :class="{ stale: weather.stale }"><i />{{ weather.stale ? "缓存数据" : "实时更新" }}</span>
    </header>
    <div class="weather-primary">
      <div class="weather-temperature">
        <Transition name="weather-value" mode="out-in"><strong :key="loading ? 'loading' : weather.temperature">{{ loading ? "--" : weather.temperature }}<sup>°</sup></strong></Transition>
        <div><span class="weather-icon"><Icon :name="loading ? 'ph:cloud-bold' : weatherIcon" /></span><p>{{ loading ? "正在读取天气" : weather.condition }}</p></div>
      </div>
      <p class="weather-summary">{{ summary }}</p>
    </div>
    <dl class="weather-metrics">
      <div><dt><Icon name="ph:thermometer-simple-bold" />体感</dt><dd>{{ loading ? "--" : `${weather.feelsLike}°` }}</dd></div>
      <div><dt><Icon name="ph:drop-bold" />湿度</dt><dd>{{ loading ? "--" : `${weather.humidity}%` }}</dd></div>
      <div><dt><Icon name="ph:wind-bold" />风况</dt><dd>{{ loading ? "--" : `${weather.windDirection} ${weather.windScale}` }}</dd></div>
    </dl>
  </section>
</template>

<script setup lang="ts">
const { weather, loading, weatherKind, weatherIcon } = useWeather()
const displayKind = computed(() => (loading.value ? 'loading' : weatherKind.value))
const summary = computed(() => {
  if (loading.value) return '稍候片刻，正在同步绍兴的天气。'
  const copy: Record<string, string> = {
    sunny: '天色明朗，适合出门走走。', cloudy: '云量稍多，光线依然温和。', overcast: '天空偏阴，注意适时添衣。',
    fog: '能见度较低，出行请放慢速度。', rain: '有雨，出门记得带伞。', snow: '天气寒冷，注意路面湿滑。',
    storm: '天气不稳定，尽量减少外出。', unknown: '天气数据已更新，请留意体感变化。',
  }
  return weather.value.stale ? '当前展示最近一次可靠数据。' : copy[weatherKind.value]
})
</script>

<style scoped>
.weather-card{--weather-accent:#4c7691;position:relative;display:grid;gap:13px;min-height:172px;padding:16px;overflow:hidden;border:1px solid color-mix(in srgb,var(--border) 82%,transparent);border-radius:8px;background:color-mix(in srgb,var(--ld-bg-card) 96%,var(--weather-accent) 4%);box-shadow:0 8px 24px color-mix(in srgb,var(--ld-shadow) 28%,transparent);color:var(--c-text);isolation:isolate}.weather-card::after{display:none}.weather-sunny{--weather-accent:#d39142}.weather-cloudy{--weather-accent:#6085a0}.weather-overcast,.weather-fog{--weather-accent:#7a858d}.weather-rain{--weather-accent:#477e9f}.weather-snow{--weather-accent:#73a1ad}.weather-storm{--weather-accent:#6b6486}
.weather-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.weather-head>div{display:grid;gap:4px;min-width:0}.weather-kicker{color:var(--weather-accent);font-size:.55rem;font-weight:750;letter-spacing:.12em}.weather-head strong{display:flex;align-items:center;gap:4px;color:var(--c-text-3);font-size:.59rem;font-weight:600}.weather-head strong :deep(svg){color:var(--weather-accent)}.weather-status{display:inline-flex;min-height:24px;align-items:center;gap:6px;padding:0 9px;border:1px solid var(--border);border-radius:999px;color:var(--c-text-3);font-size:.52rem;white-space:nowrap}.weather-status i{width:5px;height:5px;border-radius:50%;background:#48a575;box-shadow:0 0 0 3px rgb(72 165 117 / 10%)}.weather-status.stale i{background:#c78a3d;box-shadow:0 0 0 3px rgb(199 138 61 / 10%)}
.weather-primary{display:grid;gap:7px}.weather-temperature{display:flex;align-items:center;justify-content:space-between;gap:14px}.weather-temperature>strong{color:var(--c-text);font-family:var(--font-accent);font-size:2.65rem;font-weight:720;line-height:1;font-variant-numeric:tabular-nums}.weather-temperature sup{margin-left:2px;color:var(--weather-accent);font-size:1rem;font-weight:600;vertical-align:top}.weather-temperature>div{display:flex;min-width:0;align-items:center;gap:8px}.weather-icon{display:grid;width:34px;height:34px;flex:0 0 34px;border-radius:50%;background:color-mix(in srgb,var(--weather-accent) 12%,transparent);color:var(--weather-accent);font-size:1.12rem;place-items:center}.weather-temperature p{overflow:hidden;margin:0;color:var(--c-text-2);font-size:.75rem;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.weather-summary{margin:0;color:var(--c-text-3);font-size:.57rem;line-height:1.6}
.weather-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0;padding-top:11px;border-top:1px solid color-mix(in srgb,var(--border) 74%,transparent)}.weather-metrics>div{min-width:0;padding:0 8px}.weather-metrics>div:first-child{padding-left:0}.weather-metrics>div+div{border-left:1px solid var(--border)}.weather-metrics dt{display:flex;align-items:center;gap:4px;color:var(--c-text-3);font-size:.5rem}.weather-metrics dt :deep(svg){color:var(--weather-accent)}.weather-metrics dd{overflow:hidden;margin:4px 0 0;color:var(--c-text-2);font-size:.59rem;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.weather-value-enter-active,.weather-value-leave-active{transition:opacity .18s ease,transform .24s ease}.weather-value-enter-from{opacity:0;transform:translateY(5px)}.weather-value-leave-to{opacity:0;transform:translateY(-4px)}@media(prefers-reduced-motion:reduce){.weather-value-enter-active,.weather-value-leave-active{transition:none}}
</style>

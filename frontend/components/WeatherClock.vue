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
const { weather, loading, weatherKind, weatherIcon } = useWeather()
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
  /* box-shadow: 0 12px 30px color-mix(in srgb, #1d4e9e 30%, transparent); */
  color: var(--wx-ink);
  isolation: isolate;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}
.weather-card:hover {
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
.weather-sunny { --wx-bg: linear-gradient(155deg, #ffb35c, #f78b3d 58%, #e06b2c);  }
.weather-cloudy { --wx-bg: linear-gradient(155deg, #8db8e8, #5f8fcb 60%, #4773ae); }
.weather-overcast { --wx-bg: linear-gradient(155deg, #7d93ac, #5b7089 60%, #41556c);  }
.weather-rain { --wx-bg: linear-gradient(155deg, #4f8fd6, #31599e 60%, #243f7d);  }
.weather-storm { --wx-bg: linear-gradient(155deg, #6d5bbf, #45327e 62%, #2f2058);  }
.weather-snow { --wx-bg: linear-gradient(155deg, #a8c8ec, #7fa2cc 60%, #6488b5);  }
.weather-fog { --wx-bg: linear-gradient(155deg, #9aa7b5, #758392 62%, #5c6977);  }

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

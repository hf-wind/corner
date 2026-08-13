<template>
  <section
    class="weather-card"
    :class="[`weather-${displayKind}`, { 'is-loading': loading }]"
    aria-label="当前天气"
  >
    <div class="wx-scene" aria-hidden="true">
      <span v-if="displayKind === 'sunny'" class="wx-rays" />
      <span v-if="displayKind === 'cloudy' || displayKind === 'overcast'" class="wx-cloud wx-cloud-a" />
      <span v-if="displayKind === 'cloudy'" class="wx-cloud wx-cloud-b" />
      <span v-if="displayKind === 'fog'" class="wx-mist" />
      <span v-if="displayKind === 'storm'" class="wx-bolt" />
      <template v-if="displayKind === 'rain'">
        <span v-for="n in 5" :key="`drop-${n}`" class="wx-drop" :style="dropStyle(n)" />
      </template>
      <template v-if="displayKind === 'snow'">
        <span v-for="n in 6" :key="`flake-${n}`" class="wx-flake" :style="flakeStyle(n)" />
      </template>
      <span class="wx-veil" />
    </div>

    <header class="weather-head">
      <span class="weather-kicker">此刻天气</span>
      <span class="weather-status">
        <Icon :name="weather.stale ? 'ph:cloud-arrow-down-bold' : 'ph:pulse-bold'" />
        {{ weather.stale ? '缓存' : '实时' }}
      </span>
    </header>

    <div class="weather-primary">
      <div class="weather-symbol">
        <Transition name="wx-swap" mode="out-in">
          <Icon v-if="loading" key="loading" name="ph:planet-bold" />
          <Icon v-else :key="weatherIcon" :name="weatherIcon" />
        </Transition>
      </div>
      <Transition name="wx-swap" mode="out-in">
        <div v-if="loading" key="loading" class="weather-reading">
          <p class="weather-temp">--<i>°</i></p>
          <div class="weather-copy">
            <strong>望风而行…</strong>
            <span><Icon name="ph:map-pin-bold" /> {{ weather.city }}</span>
          </div>
        </div>
        <div v-else key="weather" class="weather-reading">
          <p class="weather-temp">{{ weather.temperature }}<i>°</i></p>
          <div class="weather-copy">
            <strong>{{ weather.condition }}</strong>
            <span><Icon name="ph:map-pin-bold" /> {{ weather.city }}</span>
          </div>
        </div>
      </Transition>
    </div>

    <div class="weather-metrics">
      <div class="w-metric">
        <Icon name="ph:drop-bold" />
        <span>湿度</span>
        <Transition name="wx-num" mode="out-in">
          <strong v-if="loading" key="loading">--</strong>
          <strong v-else key="value">{{ weather.humidity }}%</strong>
        </Transition>
      </div>
      <div class="w-metric">
        <Icon name="ph:wind-bold" />
        <span>风力</span>
        <Transition name="wx-num" mode="out-in">
          <strong v-if="loading" key="loading">--</strong>
          <strong v-else key="value">{{ weather.windDirection }} {{ weather.windScale }}</strong>
        </Transition>
      </div>
      <div class="w-metric">
        <Icon name="ph:thermometer-simple-bold" />
        <span>体感</span>
        <Transition name="wx-num" mode="out-in">
          <strong v-if="loading" key="loading">--</strong>
          <strong v-else key="value">{{ weather.feelsLike }}°C</strong>
        </Transition>
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

const displayKind = computed(() => (loading.value ? 'loading' : weatherKind.value))

function dropStyle(n: number) {
  return {
    left: `${6 + n * 17}%`,
    animationDelay: `${(n * 0.37) % 1.2}s`,
    animationDuration: `${1.7 + (n % 3) * 0.35}s`,
  }
}

function flakeStyle(n: number) {
  return {
    left: `${5 + n * 15}%`,
    animationDelay: `${n * 0.55}s`,
    animationDuration: `${3.6 + (n % 3) * 0.8}s`,
  }
}
</script>

<style scoped>
.weather-card {
  --wx-bg: #667991;
  --wx-accent: #d9e4ef;
  position: relative;
  display: flex;
  min-height: 150px;
  flex-direction: column;
  padding: 15px;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 14px;
  background: var(--wx-bg);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--ld-shadow) 38%, transparent);
  color: #fff;
  isolation: isolate;
  transition: background-color .65s ease, box-shadow .35s ease, transform .35s cubic-bezier(.16, 1, .3, 1);
}
.weather-card:hover {
  box-shadow: 0 16px 34px color-mix(in srgb, var(--ld-shadow) 54%, transparent);
}
.weather-card::before {
  position: absolute;
  z-index: 2;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 22%);
  content: "";
  pointer-events: none;
}

.weather-sunny { --wx-bg: #d8863f; --wx-accent: #ffe4a6; }
.weather-cloudy { --wx-bg: #5d83ad; --wx-accent: #d7e8f8; }
.weather-overcast { --wx-bg: #647386; --wx-accent: #dce2e8; }
.weather-rain { --wx-bg: #416c9c; --wx-accent: #c4e5ff; }
.weather-snow { --wx-bg: #7695b5; --wx-accent: #f4fbff; }
.weather-storm { --wx-bg: #554b82; --wx-accent: #f3da82; }
.weather-fog { --wx-bg: #77838e; --wx-accent: #edf1f3; }

.wx-scene {
  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.wx-rays {
  position: absolute;
  top: -130px;
  right: -130px;
  width: 300px;
  height: 300px;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgb(255 255 255 / 26%) 9deg,
    transparent 18deg,
    transparent 45deg,
    rgb(255 255 255 / 22%) 54deg,
    transparent 63deg,
    transparent 90deg,
    rgb(255 255 255 / 26%) 99deg,
    transparent 108deg,
    transparent 135deg,
    rgb(255 255 255 / 22%) 144deg,
    transparent 153deg,
    transparent 180deg,
    rgb(255 255 255 / 26%) 189deg,
    transparent 198deg,
    transparent 225deg,
    rgb(255 255 255 / 22%) 234deg,
    transparent 243deg,
    transparent 270deg,
    rgb(255 255 255 / 26%) 279deg,
    transparent 288deg,
    transparent 315deg,
    rgb(255 255 255 / 22%) 324deg,
    transparent 333deg,
    transparent 360deg
  );
  opacity: .45;
  animation: wx-spin 30s linear infinite, wx-scene-in .6s ease-out both;
}

.wx-cloud {
  position: absolute;
  width: 66px;
  height: 20px;
  border-radius: 22px;
  background: rgb(255 255 255 / 52%);
  filter: blur(1px);
  animation: wx-drift 11s ease-in-out infinite alternate, wx-scene-in 0.6s ease-out both;
}
.wx-cloud::before,
.wx-cloud::after {
  position: absolute;
  border-radius: 50%;
  background: inherit;
  content: "";
}
.wx-cloud::before {
  top: -13px;
  left: 12px;
  width: 30px;
  height: 30px;
}
.wx-cloud::after {
  top: -7px;
  left: 40px;
  width: 19px;
  height: 19px;
}
.wx-cloud-a {
  top: 16%;
  left: -12%;
}
.wx-cloud-b {
  top: 46%;
  right: -16%;
  opacity: 0.72;
  animation-delay: -4.6s;
  animation-duration: 14s;
}

.wx-mist {
  position: absolute;
  top: 24%;
  left: -22%;
  right: -22%;
  height: 30px;
  border-radius: 40px;
  background: rgb(255 255 255 / 20%);
  filter: blur(8px);
  animation: wx-mist-move 8s ease-in-out infinite alternate, wx-scene-in 0.6s ease-out both;
}
.wx-mist::before,
.wx-mist::after {
  position: absolute;
  border-radius: 40px;
  background: inherit;
  filter: inherit;
  content: "";
}
.wx-mist::before {
  top: 26px;
  left: 3%;
  right: 3%;
  height: 24px;
  opacity: 0.72;
  animation: wx-mist-move 11s ease-in-out infinite alternate-reverse;
}
.wx-mist::after {
  top: -18px;
  left: 7%;
  right: 7%;
  height: 20px;
  opacity: 0.5;
  animation: wx-mist-move 9.5s ease-in-out infinite alternate;
}

.wx-bolt {
  position: absolute;
  top: 16%;
  right: 20%;
  width: 24px;
  height: 44px;
  background: #ffd97a;
  clip-path: polygon(56% 0, 18% 55%, 46% 55%, 32% 100%, 80% 42%, 50% 42%);
  filter: drop-shadow(0 0 10px rgb(255 220 120 / 70%));
  animation: wx-bolt-flash 3.6s steps(2, start) infinite;
}

.wx-drop {
  position: absolute;
  top: -24%;
  width: 1.5px;
  height: 26px;
  border-radius: 2px;
  background: linear-gradient(rgb(255 255 255 / 0%), rgb(255 255 255 / 52%));
  animation: wx-fall 1.9s ease-in infinite;
}

.wx-flake {
  position: absolute;
  top: -10%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgb(255 255 255 / 90%);
  box-shadow: 0 0 8px rgb(255 255 255 / 55%);
  animation: wx-snow 4.2s linear infinite;
}

.wx-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgb(255 255 255 / 12%), transparent 42%, rgb(7 16 30 / 12%));
  pointer-events: none;
}

.weather-head {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.weather-kicker {
  display: inline-flex;
  align-items: center;
  font-size: .62rem;
  font-weight: 750;
  letter-spacing: .12em;
  opacity: .82;
  text-shadow: 0 1px 8px rgb(0 0 0 / 12%);
}
.weather-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgb(255 255 255 / 15%);
  font-size: .52rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.weather-primary {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  padding: 15px 0 12px;
}
.weather-symbol {
  position: relative;
  display: grid;
  width: 52px;
  height: 52px;
  flex: 0 0 52px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 12px;
  background: rgb(255 255 255 / 11%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 20%);
  color: var(--wx-accent);
  font-size: 1.85rem;
  backdrop-filter: blur(8px);
  place-items: center;
}
.weather-symbol > svg {
  filter: drop-shadow(0 2px 8px rgb(0 0 0 / 18%));
}
.is-loading .weather-symbol > svg {
  animation: wx-orbit 5s linear infinite;
}
.weather-reading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}
.weather-temp {
  margin: 0;
  font-family: var(--font-accent);
  font-size: 2.7rem;
  font-weight: 760;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 14px rgb(0 0 0 / 14%);
}
.weather-temp i {
  font-size: 1.25rem;
  font-style: normal;
  font-weight: 500;
  vertical-align: top;
  opacity: .82;
}
.weather-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}
.weather-copy strong {
  overflow: hidden;
  font-size: .76rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.weather-copy span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: .56rem;
  opacity: .72;
}

.weather-metrics {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  padding-top: 9px;
  border-top: 1px solid rgb(255 255 255 / 18%);
}
.w-metric {
  display: grid;
  min-width: 0;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 1px 5px;
  text-align: left;
}
.w-metric > svg {
  grid-row: 1 / 3;
  font-size: .88rem;
  opacity: 0.85;
}
.w-metric span {
  font-size: .48rem;
  opacity: .66;
}
.w-metric strong {
  max-width: 100%;
  overflow: hidden;
  font-size: .55rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weather-stale {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px dashed rgb(255 255 255 / 16%);
  font-size: 0.52rem;
  opacity: 0.8;
}
.weather-stale > svg {
  flex: 0 0 auto;
}

.wx-swap-enter-active,
.wx-swap-leave-active,
.wx-num-enter-active,
.wx-num-leave-active {
  transition: opacity 0.32s ease, transform 0.32s ease;
}
.wx-swap-enter-from {
  opacity: 0;
  transform: scale(0.7) rotate(-24deg);
}
.wx-swap-leave-to {
  opacity: 0;
  transform: scale(0.7) rotate(24deg);
}
.wx-num-enter-from {
  opacity: 0;
  transform: translateY(5px);
}
.wx-num-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* ===== 关键帧 ===== */
@keyframes wx-scene-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes wx-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes wx-orbit {
  to {
    transform: rotate(360deg);
  }
}
@keyframes wx-drift {
  from {
    transform: translateX(-6px);
  }
  to {
    transform: translateX(16px);
  }
}
@keyframes wx-mist-move {
  from {
    transform: translateX(-12px);
  }
  to {
    transform: translateX(12px);
  }
}
@keyframes wx-bolt-flash {
  0%,
  62%,
  100% {
    opacity: 0.14;
  }
  65% {
    opacity: 1;
  }
  68% {
    opacity: 0.3;
  }
  71% {
    opacity: 1;
  }
}
@keyframes wx-fall {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(480%);
  }
}
@keyframes wx-snow {
  0% {
    opacity: 0;
    transform: translate(0, -8px);
  }
  18% {
    opacity: 0.95;
  }
  100% {
    opacity: 0;
    transform: translate(15px, 330%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .weather-card {
    transition: none;
  }
  .is-loading .weather-symbol > svg,
  .wx-rays {
    animation: none;
  }
  .wx-cloud,
  .wx-mist,
  .wx-bolt,
  .wx-drop,
  .wx-flake {
    animation: none;
  }
  .wx-swap-enter-active,
  .wx-swap-leave-active,
  .wx-num-enter-active,
  .wx-num-leave-active {
    transition: none;
  }
}
</style>

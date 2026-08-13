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
      <span class="weather-city"><Icon name="ph:map-pin-bold" /> {{ weather.city }}</span>
      <span class="weather-status">
        <Icon :name="weather.stale ? 'ph:cloud-arrow-down-bold' : 'ph:pulse-bold'" />
        {{ weather.stale ? '缓存' : '实时' }}
      </span>
    </header>

    <div class="wx-dial">
      <div class="wx-orb">
        <span class="wx-promp" aria-hidden="true" />
        <Transition name="wx-swap" mode="out-in">
          <Icon v-if="loading" key="loading" name="ph:planet-bold" />
          <Icon v-else :key="weatherIcon" :name="weatherIcon" />
        </Transition>
      </div>
      <Transition name="wx-swap" mode="out-in">
        <div v-if="loading" key="loading" class="wx-main">
          <p class="wx-temp">--<i>°C</i></p>
          <p class="wx-cond">望风而行…</p>
        </div>
        <div v-else key="weather" class="wx-main">
          <p class="wx-temp">{{ weather.temperature }}<i>°C</i></p>
          <p class="wx-cond">{{ weather.condition }}</p>
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
  --wx-bg: linear-gradient(160deg, #8fa8c8, #6d84a8 55%, #54698c);
  --wx-ink: #fff;
  --wx-sizing: 0.99;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 13px 15px 12px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, #ffffff 24%, transparent);
  border-radius: 20px;
  background: linear-gradient(160deg, #8fa8c8, #6d84a8 55%, #54698c);
  color: var(--wx-ink);
  isolation: isolate;
  transform: scale(var(--wx-sizing));
  transition: box-shadow 0.36s ease, transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), filter 0.36s ease;
}
.weather-card::before {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 14%;
  right: 14%;
  height: 1px;
  border-radius: 99px;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 52%), transparent);
  content: "";
  pointer-events: none;
}
.weather-card::after {
  position: absolute;
  z-index: 0;
  inset: 0;
  background: var(--wx-bg);
  content: "";
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.85s ease;
}
.weather-card:not(.is-loading)::after {
  opacity: 1;
}

/* ===== 天气氛围 ===== */
.weather-sunny { --wx-bg: linear-gradient(160deg, #ffd08a, #f7a44b 46%, #e0712f); }
.weather-cloudy { --wx-bg: linear-gradient(160deg, #9cc0ec, #6d96d0 55%, #4f7ab8); }
.weather-overcast { --wx-bg: linear-gradient(160deg, #8b9cb4, #68788f 58%, #4b5a70); }
.weather-rain { --wx-bg: linear-gradient(160deg, #5d9be0, #3a6cb8 55%, #274d91); }
.weather-snow { --wx-bg: linear-gradient(160deg, #c3d9f4, #9db9dd 55%, #7e9cc6); }
.weather-storm { --wx-bg: linear-gradient(160deg, #7a6ad1, #4f3f9e 58%, #352a74); }
.weather-fog { --wx-bg: linear-gradient(160deg, #aab6c4, #8392a6 58%, #64738a); }

.wx-scene {
  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.wx-rays {
  position: absolute;
  inset: -46px;
  border-radius: 50%;
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
  -webkit-mask: radial-gradient(circle, transparent 42%, #000 78%);
  mask: radial-gradient(circle, transparent 42%, #000 78%);
  animation: wx-spin 26s linear infinite, wx-scene-in 0.6s ease-out both;
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
  background: linear-gradient(180deg, rgb(255 255 255 / 9%), transparent 34%, transparent 72%, rgb(3 14 32 / 13%));
  pointer-events: none;
}

/* ===== 头部 ===== */
.weather-head {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.weather-city {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-shadow: 0 1px 8px rgb(0 0 0 / 12%);
}
.weather-city > svg {
  font-size: 0.72rem;
  opacity: 0.9;
}
.weather-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgb(255 255 255 / 15%);
  font-size: 0.5rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

/* ===== 中央罗盘 ===== */
.wx-dial {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 9px 0 7px;
}
.wx-orb {
  position: relative;
  display: grid;
  width: 64px;
  height: 64px;
  border: 1px solid rgb(255 255 255 / 34%);
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 26%, rgb(255 255 255 / 24%), transparent 52%),
    rgb(255 255 255 / 13%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 34%), 0 10px 24px rgb(6 22 48 / 16%);
  color: #fff;
  font-size: 1.85rem;
  place-items: center;
}
.wx-orb > svg {
  filter: drop-shadow(0 2px 8px rgb(0 0 0 / 18%));
}
.is-loading .wx-orb > svg {
  animation: wx-orbit 5s linear infinite;
}
.wx-promp {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 88px;
  height: 88px;
  border: 1px dashed rgb(255 255 255 / 32%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: wx-promp-rotate 22s linear infinite;
  pointer-events: none;
}
.wx-promp::after {
  position: absolute;
  top: -3px;
  left: 50%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgb(255 255 255 / 82%);
  box-shadow: 0 0 8px rgb(255 255 255 / 70%);
  content: "";
}

.wx-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 4px;
}
.wx-temp {
  margin: 0;
  font-family: var(--font-accent);
  font-size: 2.3rem;
  font-weight: 750;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 14px rgb(0 0 0 / 16%);
}
.wx-temp i {
  font-size: 1.05rem;
  font-style: normal;
  font-weight: 500;
  opacity: 0.88;
}
.wx-cond {
  margin: 1px 0 0;
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  opacity: 0.9;
}

/* ===== 指标 ===== */
.weather-metrics {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding-top: 10px;
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
  font-size: 0.8rem;
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
  font-size: 0.6rem;
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

/* ===== 过渡动画 ===== */
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
@keyframes wx-promp-rotate {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
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
  .weather-card::after {
    transition: none;
  }
  .is-loading .wx-orb > svg,
  .wx-promp,
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
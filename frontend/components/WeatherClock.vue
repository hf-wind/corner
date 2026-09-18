<template>
  <section class="weather-card" :class="`weather-${displayKind}`" aria-label="当前天气">
    <span class="weather-icon" aria-hidden="true">
      <Icon :name="loading ? 'ph:cloud-bold' : weatherIcon" />
    </span>
    <div class="weather-main">
      <strong class="weather-temp">
        <Transition name="weather-value" mode="out-in">
          <span :key="loading ? 'loading' : weather.temperature">
            {{ loading ? "--" : weather.temperature }}<sup>°</sup>
          </span>
        </Transition>
        <em>{{ loading ? "读取中" : weather.condition }}</em>
      </strong>
      <span class="weather-place">
        <Icon name="ph:map-pin-fill" />{{ weather.city }}<i v-if="!loading" aria-hidden="true" /><span v-if="!loading">体感 {{ weather.feelsLike }}°</span>
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
const { weather, loading, weatherKind, weatherIcon } = useWeather()
const displayKind = computed(() => (loading.value ? 'loading' : weatherKind.value))
</script>

<style scoped>
.weather-card {
  --weather-accent: #4c7691;
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  height: 100px;
  min-height: 100px;
  flex: 0 0 100px;
  padding: 0 18px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--ld-bg-card) 95%, var(--weather-accent) 5%);
  box-shadow: var(--ui-shadow-soft);
  color: var(--c-text);
  isolation: isolate;
  transition:
    transform 0.36s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.3s ease,
    box-shadow 0.36s ease,
    background-color 0.3s ease;
}

.weather-card::before {
  position: absolute;
  top: -26px;
  right: -26px;
  z-index: -1;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--weather-accent) 14%, transparent);
  filter: blur(10px);
  content: "";
  transition:
    transform 0.55s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.3s ease;
}

.weather-card::after {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    112deg,
    transparent 12%,
    color-mix(in srgb, var(--weather-accent) 8%, transparent) 46%,
    transparent 72%
  );
  content: "";
  opacity: 0;
  transform: translateX(-42%);
  transition:
    opacity 0.28s ease,
    transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.weather-card:hover {
  border-color: color-mix(in srgb, var(--weather-accent) 34%, var(--border));
  background: color-mix(in srgb, var(--ld-bg-card) 92%, var(--weather-accent) 8%);
  box-shadow:
    0 14px 32px color-mix(in srgb, var(--weather-accent) 13%, var(--ld-shadow)),
    0 1px 0 color-mix(in srgb, #fff 55%, transparent) inset;
  transform: translate3d(0, -3px, 0);
}

.weather-card:hover::before {
  opacity: 0.85;
  transform: translate3d(-10px, 10px, 0) scale(1.12);
}

.weather-card:hover::after {
  opacity: 1;
  transform: translateX(34%);
}

.weather-sunny { --weather-accent: #d39142; }
.weather-cloudy { --weather-accent: #6085a0; }
.weather-overcast, .weather-fog { --weather-accent: #7a858d; }
.weather-rain { --weather-accent: #477e9f; }
.weather-snow { --weather-accent: #73a1ad; }
.weather-storm { --weather-accent: #6b6486; }

.weather-icon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border: 1px solid color-mix(in srgb, var(--weather-accent) 22%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--weather-accent) 10%, transparent);
  color: var(--weather-accent);
  font-size: 1.3rem;
  place-items: center;
  transition:
    transform 0.42s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.3s ease;
}

.weather-card:hover .weather-icon {
  box-shadow: 0 8px 18px color-mix(in srgb, var(--weather-accent) 18%, transparent);
  transform: translate3d(0, -2px, 0) rotate(-5deg) scale(1.04);
}

.weather-main {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 3px;
}

.weather-temp {
  display: flex;
  align-items: baseline;
  gap: 9px;
  color: var(--c-text);
}

.weather-temp span {
  font-family: var(--font-accent);
  font-size: 1.72rem;
  font-weight: 720;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.weather-temp sup {
  margin-left: 1px;
  color: var(--weather-accent);
  font-size: 0.72rem;
  font-weight: 650;
  vertical-align: top;
}

.weather-temp em {
  overflow: hidden;
  color: var(--c-text-2);
  font-size: 0.72rem;
  font-style: normal;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weather-place {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  color: var(--c-text-3);
  font-size: 0.58rem;
  letter-spacing: 0.03em;
}

.weather-place :deep(svg) {
  color: var(--weather-accent);
}

.weather-place i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--c-text-3);
}

.weather-value-enter-active,
.weather-value-leave-active {
  transition: opacity 0.18s ease, transform 0.24s ease;
}

.weather-value-enter-from {
  opacity: 0;
  transform: translateY(5px);
}

.weather-value-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .weather-value-enter-active,
  .weather-value-leave-active {
    transition: none;
  }
}
</style>

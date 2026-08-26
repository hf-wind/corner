<template>
  <span
    class="liquid-progress"
    :class="{
      'is-empty': normalizedProgress <= 0,
      'is-full': normalizedProgress >= 100,
      'is-active': active,
    }"
    :style="{ height: `${normalizedProgress}%` }"
    aria-hidden="true"
  >
    <svg
      class="liquid-wave liquid-wave-back"
      viewBox="0 0 240 18"
      preserveAspectRatio="none"
      focusable="false"
    >
      <path
        d="M0 9 C10 6.5 20 6.5 30 9 C40 11.5 50 11.5 60 9 C70 6.5 80 6.5 90 9 C100 11.5 110 11.5 120 9 C130 6.5 140 6.5 150 9 C160 11.5 170 11.5 180 9 C190 6.5 200 6.5 210 9 C220 11.5 230 11.5 240 9 V18 H0 Z"
      />
    </svg>
    <svg
      class="liquid-wave liquid-wave-front"
      viewBox="0 0 240 18"
      preserveAspectRatio="none"
      focusable="false"
    >
      <path
        d="M0 9 C10 5 20 5 30 9 C40 13 50 13 60 9 C70 5 80 5 90 9 C100 13 110 13 120 9 C130 5 140 5 150 9 C160 13 170 13 180 9 C190 5 200 5 210 9 C220 13 230 13 240 9 V18 H0 Z"
      />
    </svg>
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    progress: number;
    active?: boolean;
  }>(),
  {
    active: false,
  },
);

const normalizedProgress = computed(() =>
  Math.min(100, Math.max(0, Number(props.progress) || 0)),
);
</script>

<style scoped>
.liquid-progress {
  --liquid-fill-top: color-mix(in srgb, var(--c-primary) 13%, transparent);
  --liquid-fill-bottom: color-mix(in srgb, var(--c-primary) 24%, transparent);
  --liquid-wave-front: color-mix(in srgb, var(--c-primary) 18%, transparent);
  --liquid-wave-back: color-mix(in srgb, var(--c-primary) 10%, transparent);
  --liquid-wave-height: 14px;
  --liquid-wave-front-duration: 7.8s;
  --liquid-wave-back-duration: 10.8s;
  --liquid-wave-front-active-duration: 5.8s;
  --liquid-wave-back-active-duration: 8.2s;
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  min-height: 0;
  background: linear-gradient(
    180deg,
    var(--liquid-fill-top),
    var(--liquid-fill-bottom)
  );
  opacity: 1;
  pointer-events: none;
  transition:
    height 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.24s ease;
  will-change: height;
}

.liquid-progress::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    104deg,
    transparent 12%,
    color-mix(in srgb, #fff 12%, transparent) 47%,
    transparent 76%
  );
  content: "";
}

.liquid-progress.is-empty {
  opacity: 0;
}

.liquid-wave {
  position: absolute;
  top: calc(var(--liquid-wave-height) * -0.52);
  left: 0;
  width: 200%;
  height: var(--liquid-wave-height);
  overflow: visible;
  transform: translate3d(-50%, 0, 0);
  will-change: transform;
}

.liquid-wave path {
  fill: var(--liquid-wave-front);
}

.liquid-wave-front {
  z-index: 2;
  animation: liquid-wave-forward var(--liquid-wave-front-duration) linear infinite;
}

.liquid-wave-back {
  z-index: 1;
  top: calc(var(--liquid-wave-height) * -0.42);
  opacity: 0.72;
  transform: translate3d(0, 0, 0);
  animation: liquid-wave-backward var(--liquid-wave-back-duration) linear infinite;
}

.liquid-wave-back path {
  fill: var(--liquid-wave-back);
}

.liquid-progress.is-active .liquid-wave-front {
  animation-duration: var(--liquid-wave-front-active-duration);
}

.liquid-progress.is-active .liquid-wave-back {
  animation-duration: var(--liquid-wave-back-active-duration);
}

.liquid-progress.is-full .liquid-wave {
  opacity: 0;
}

@keyframes liquid-wave-forward {
  to {
    transform: translate3d(0, 0, 0);
  }
}

@keyframes liquid-wave-backward {
  to {
    transform: translate3d(-50%, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .liquid-progress,
  .liquid-wave {
    animation: none;
    transition: none;
  }

  .liquid-wave-front {
    transform: translate3d(-25%, 0, 0);
  }

  .liquid-wave-back {
    transform: translate3d(-10%, 0, 0);
  }
}
</style>

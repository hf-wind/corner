<template>
  <svg
    class="activity-figure-svg"
    :class="[`figure-${kind}`]"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- 骑车小人 -->
    <g v-if="kind === 'ride'" class="figure-ride">
      <circle cx="25" cy="70" r="12" stroke="currentColor" stroke-width="2" fill="none" />
      <circle cx="75" cy="70" r="12" stroke="currentColor" stroke-width="2" fill="none" />
      <path d="M25 70 L40 45 L60 45 L75 70" stroke="currentColor" stroke-width="2" fill="none" />
      <circle cx="50" cy="30" r="8" stroke="currentColor" stroke-width="2" fill="none" />
      <path d="M40 45 L35 35" stroke="currentColor" stroke-width="2" />
      <path d="M60 45 L65 35" stroke="currentColor" stroke-width="2" />
      <path d="M50 38 L50 45" stroke="currentColor" stroke-width="2" />
    </g>

    <!-- 工作小人 -->
    <g v-else-if="kind === 'work'" class="figure-work">
      <circle cx="50" cy="25" r="8" stroke="currentColor" stroke-width="2" fill="none" />
      <path d="M50 33 L50 60" stroke="currentColor" stroke-width="2" />
      <path d="M30 45 L50 38 L70 45" stroke="currentColor" stroke-width="2" fill="none" />
      <path d="M50 60 L35 80" stroke="currentColor" stroke-width="2" />
      <path d="M50 60 L65 80" stroke="currentColor" stroke-width="2" />
      <rect x="25" y="70" width="50" height="5" rx="2" stroke="currentColor" stroke-width="2" fill="none" />
    </g>

    <!-- 休息小人 -->
    <g v-else-if="kind === 'rest'" class="figure-rest">
      <circle cx="50" cy="30" r="8" stroke="currentColor" stroke-width="2" fill="none" />
      <path d="M50 38 L50 55" stroke="currentColor" stroke-width="2" />
      <path d="M35 48 L50 42 L65 48" stroke="currentColor" stroke-width="2" fill="none" />
      <path d="M35 55 L65 55" stroke="currentColor" stroke-width="2" />
      <path d="M40 55 L40 75" stroke="currentColor" stroke-width="2" />
      <path d="M60 55 L60 75" stroke="currentColor" stroke-width="2" />
      <ellipse cx="50" cy="75" rx="20" ry="5" stroke="currentColor" stroke-width="2" fill="none" />
    </g>

    <!-- 闲逛小人 -->
    <g v-else class="figure-wander">
      <circle cx="50" cy="25" r="8" stroke="currentColor" stroke-width="2" fill="none" />
      <path d="M50 33 L50 55" stroke="currentColor" stroke-width="2" />
      <path d="M35 45 L50 38 L65 45" stroke="currentColor" stroke-width="2" fill="none" />
      <path d="M50 55 L35 80" stroke="currentColor" stroke-width="2" />
      <path d="M50 55 L65 80" stroke="currentColor" stroke-width="2" />
    </g>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  kind: 'ride' | 'work' | 'rest' | 'wander'
}>()
</script>

<style scoped>
.activity-figure-svg {
  width: 100%;
  height: 100%;
}

.figure-ride {
  animation: ride-bounce 1.5s ease-in-out infinite;
}

.figure-work {
  animation: work-type 0.8s ease-in-out infinite;
}

.figure-rest {
  animation: rest-breathe 3s ease-in-out infinite;
}

.figure-wander {
  animation: wander-walk 1.2s ease-in-out infinite;
}

@keyframes ride-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes work-type {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

@keyframes rest-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

@keyframes wander-walk {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(3px); }
}
</style>

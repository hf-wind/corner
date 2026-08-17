<template>
  <div
    class="global-bottom-dock"
    :class="[
      `phase-${phase}`,
      {
        'has-pagination': paginationVisible,
        'has-music': musicVisible,
      },
    ]"
    aria-label="页面快捷控制"
    :aria-hidden="phase === 'hidden' || phase === 'waiting'"
  >
    <div id="corner-pagination-dock" class="pagination-dock" />
    <div class="music-dock">
      <MusicCapsule @ready="onMusicReady" />
    </div>
  </div>
</template>

<script setup lang="ts">
import MusicCapsule from "~/components/MusicCapsule.vue";
import { useBottomDockState } from "~/composables/useBottomDockState";

type DockPhase =
  | "waiting"
  | "fused"
  | "separated"
  | "merging"
  | "solo"
  | "hidden";

const { hidden, contentReady, paginationVisible } = useBottomDockState();
const phase = ref<DockPhase>("waiting");
const musicReady = ref(false);
const musicVisible = ref(false);
let phaseTimer = 0;

function onMusicReady(payload: { visible: boolean }) {
  musicReady.value = true;
  musicVisible.value = payload.visible;
}

function clearPhaseTimer() {
  window.clearTimeout(phaseTimer);
  phaseTimer = 0;
}

function revealDock() {
  clearPhaseTimer();
  if (!contentReady.value || !musicReady.value) {
    phase.value = "waiting";
    return;
  }
  if (paginationVisible.value && musicVisible.value) {
    phase.value = "fused";
    phaseTimer = window.setTimeout(() => {
      if (!hidden.value) phase.value = "separated";
    }, 280);
    return;
  }
  phase.value = "solo";
}

watch(
  [contentReady, musicReady, paginationVisible],
  () => {
    if (!hidden.value) revealDock();
  },
  { immediate: true },
);

watch(
  hidden,
  (isHidden) => {
    clearPhaseTimer();
    if (!isHidden) {
      revealDock();
      return;
    }
    if (phase.value === "waiting" || phase.value === "hidden") {
      phase.value = "hidden";
      return;
    }
    phase.value = "merging";
    phaseTimer = window.setTimeout(
      () => {
        phase.value = "hidden";
      },
      paginationVisible.value && musicVisible.value ? 480 : 220,
    );
  },
  { immediate: true },
);

onUnmounted(clearPhaseTimer);
</script>

<style scoped>
.global-bottom-dock {
  --capsule-height: 34px;
  position: fixed;
  z-index: 900;
  bottom: max(14px, calc(env(safe-area-inset-bottom) + 10px));
  left: 50%;
  display: flex;
  width: max-content;
  max-width: calc(100vw - 28px);
  align-items: flex-end;
  justify-content: center;
  gap: 7px;
  pointer-events: none;
  transform: translate3d(-50%, 0, 0);
  transition:
    gap 0.48s cubic-bezier(0.22, 1.25, 0.36, 1),
    opacity 0.24s ease,
    transform 0.48s cubic-bezier(0.16, 1, 0.3, 1),
    visibility 0.24s;
}

.global-bottom-dock.phase-waiting,
.global-bottom-dock.phase-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translate3d(-50%, 13px, 0) scale(0.94);
}

.global-bottom-dock.phase-fused {
  gap: 0;
  animation: dock-condense-in 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.18) both;
}

.global-bottom-dock.phase-merging {
  gap: 0;
  transform: translate3d(-50%, 3px, 0) scale(0.985);
}

.pagination-dock,
.music-dock {
  transition:
    transform 0.5s cubic-bezier(0.22, 1.25, 0.36, 1),
    filter 0.28s ease;
}

.phase-fused .pagination-dock,
.phase-merging .pagination-dock {
  transform: translateX(5px) scaleX(1.018);
}

.phase-fused .music-dock,
.phase-merging .music-dock {
  transform: translateX(-5px) scaleX(1.018);
}

.phase-separated .pagination-dock,
.phase-separated .music-dock,
.phase-solo .pagination-dock,
.phase-solo .music-dock {
  transform: none;
}

.global-bottom-dock > * {
  pointer-events: auto;
}

.pagination-dock {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}

.pagination-dock:empty {
  display: none;
}

.global-bottom-dock:not(.has-music) .music-dock {
  display: none;
}

@keyframes dock-condense-in {
  from {
    opacity: 0;
    transform: translate3d(-50%, 10px, 0) scale(0.9, 0.82);
  }
  62% {
    opacity: 1;
    transform: translate3d(-50%, -1px, 0) scale(1.018, 1.035);
  }
  to {
    opacity: 1;
    transform: translate3d(-50%, 0, 0) scale(1);
  }
}

@media (max-width: 640px) {
  .global-bottom-dock {
    bottom: max(9px, calc(env(safe-area-inset-bottom) + 7px));
    max-width: calc(100vw - 16px);
    gap: 6px;
  }

  .global-bottom-dock:has(.music-capsule.is-expanded) .pagination-dock {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .global-bottom-dock,
  .pagination-dock,
  .music-dock {
    animation: none !important;
    transition: none !important;
  }
}
</style>

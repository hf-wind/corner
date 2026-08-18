<template>
  <div
    class="global-bottom-dock"
    :class="[
      { 'is-ready': dockReady },
      {
        'has-pagination': paginationVisible,
        'has-music': musicVisible,
      },
    ]"
    aria-label="页面快捷控制"
    :aria-hidden="!dockReady"
    @pointerenter="onDockPointerEnter"
    @pointerleave="onDockPointerLeave"
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

const { contentReady, paginationVisible, setAutoCollapsed } =
  useBottomDockState();
const musicReady = ref(false);
const musicVisible = ref(false);
const dockHovered = ref(false);
let autoCollapseTimer = 0;
const dockReady = computed(() => contentReady.value && musicReady.value);

function onMusicReady(payload: { visible: boolean }) {
  musicReady.value = true;
  musicVisible.value = payload.visible;
}

function clearAutoCollapseTimer() {
  window.clearTimeout(autoCollapseTimer);
  autoCollapseTimer = 0;
}

function scheduleAutoCollapse() {
  clearAutoCollapseTimer();
  if (
    dockHovered.value ||
    !contentReady.value ||
    !musicReady.value ||
    (!paginationVisible.value && !musicVisible.value)
  ) {
    return;
  }
  setAutoCollapsed(false);
  autoCollapseTimer = window.setTimeout(() => {
    setAutoCollapsed(true);
  }, 5000);
}

function canHoverDock(event: PointerEvent) {
  return (
    event.pointerType === "mouse" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

function onDockPointerEnter(event: PointerEvent) {
  if (!canHoverDock(event)) return;
  dockHovered.value = true;
  clearAutoCollapseTimer();
}

function onDockPointerLeave(event: PointerEvent) {
  if (!canHoverDock(event)) return;
  dockHovered.value = false;
  scheduleAutoCollapse();
}

watch(
  [contentReady, musicReady, paginationVisible, musicVisible],
  scheduleAutoCollapse,
  { immediate: true },
);

onUnmounted(() => {
  clearAutoCollapseTimer();
  dockHovered.value = false;
  setAutoCollapsed(false);
});
</script>

<style scoped>
.global-bottom-dock {
  --capsule-height: 30px;
  position: fixed;
  z-index: 1200;
  bottom: max(10px, env(safe-area-inset-bottom));
  left: 50%;
  display: flex;
  width: max-content;
  max-width: calc(100vw - 28px);
  align-items: flex-end;
  justify-content: center;
  gap: 7px;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translate3d(-50%, 10px, 0);
  transition:
    opacity 0.2s ease,
    transform 0.4s ease,
    visibility 0.2s;
}

.global-bottom-dock.is-ready {
  opacity: 1;
  visibility: visible;
  transform: translate3d(-50%, 0, 0);
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

@media (max-width: 640px) {
  .global-bottom-dock {
    bottom: max(10px, env(safe-area-inset-bottom));
    max-width: calc(100vw - 16px);
    gap: 6px;
  }

  .global-bottom-dock.has-pagination.has-music {
    width: 70px;
    max-width: 70px;
  }

  .global-bottom-dock.has-pagination.has-music .pagination-dock,
  .global-bottom-dock.has-pagination.has-music .music-dock {
    position: relative;
    display: block;
    width: 32px;
    height: var(--capsule-height);
    flex: 0 0 32px;
    overflow: visible;
  }

  .global-bottom-dock.has-pagination.has-music
    .pagination-dock
    > :deep(.pagination-anchor) {
    position: absolute;
    right: 0;
    bottom: 0;
  }

  .global-bottom-dock.has-pagination.has-music
    .music-dock
    > :deep(.music-capsule) {
    position: absolute;
    bottom: 0;
    left: 0;
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

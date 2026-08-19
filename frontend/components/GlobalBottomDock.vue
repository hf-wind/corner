<template>
  <div
    class="global-bottom-dock"
    :class="[
      { 'is-ready': dockReady },
      { 'is-space-theme': isSpaceTheme },
      {
        'is-music-active': activeBottomDock === 'music',
        'is-pagination-active': activeBottomDock === 'pagination',
      },
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

const {
  activeBottomDock,
  contentReady,
  paginationVisible,
  setActiveBottomDock,
  setAutoCollapsed,
} = useBottomDockState();
const musicReady = ref(false);
const route = useRoute();
const isSpaceTheme = computed(
  () => route.path === "/" || route.path === "/time/constellation",
);
const musicVisible = ref(false);
const initialDockPriorityApplied = ref(false);
const dockHovered = ref(false);
let autoCollapseTimer = 0;
const dockReady = computed(() => contentReady.value && musicReady.value);

function onMusicReady(payload: { visible: boolean }) {
  musicReady.value = true;
  musicVisible.value = payload.visible;
}

function applyInitialDockPriority() {
  if (
    initialDockPriorityApplied.value ||
    !musicReady.value ||
    !paginationVisible.value ||
    !musicVisible.value
  ) {
    return;
  }
  initialDockPriorityApplied.value = true;
  setAutoCollapsed(false);
  setActiveBottomDock("pagination");
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

watch([musicReady, paginationVisible, musicVisible], applyInitialDockPriority, {
  immediate: true,
});

watch(
  () => route.path,
  () => {
    initialDockPriorityApplied.value = false;
    void nextTick(applyInitialDockPriority);
  },
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
  view-transition-name: none;
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
    gap 0.42s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s ease,
    transform 0.4s ease,
    visibility 0.2s;
}

.global-bottom-dock.is-ready {
  opacity: 1;
  visibility: visible;
  transform: translate3d(-50%, 0, 0);
}

.global-bottom-dock.is-space-theme {
  --devtools-widget-bg: rgb(12 17 27 / 94%);
  --devtools-widget-fg: #f4f7fb;
  --devtools-widget-border: rgb(255 255 255 / 14%);
  --devtools-widget-shadow: rgb(0 0 0 / 38%);
  --ld-bg-card: #111827;
  --c-bg-2: #182235;
  --c-text: #f4f7fb;
  --c-text-2: #c5cfdd;
  --c-text-3: #8793a5;
  --border: rgb(255 255 255 / 12%);
}

.global-bottom-dock > * {
  pointer-events: auto;
}

.pagination-dock,
.music-dock {
  display: flex;
  min-width: 0;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  opacity: 1;
  visibility: visible;
  transform: translate3d(0, 0, 0) scale(1);
  transition:
    max-width 0.52s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.24s ease,
    visibility 0.24s,
    transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}

.pagination-dock {
  max-width: 132px;
}

.music-dock {
  max-width: 255px;
}

.pagination-dock:empty {
  display: none;
}

.global-bottom-dock:not(.has-music) .music-dock {
  display: none;
}

.global-bottom-dock.has-pagination.has-music.is-music-active .pagination-dock,
.global-bottom-dock.has-pagination.has-music.is-pagination-active .music-dock {
  max-width: 0;
  overflow: clip;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translate3d(0, 4px, 0) scale(0.88);
}

.global-bottom-dock.has-pagination.has-music:is(
    .is-music-active,
    .is-pagination-active
  ) {
  gap: 0;
}

@media (max-width: 640px) {
  .global-bottom-dock {
    bottom: max(10px, env(safe-area-inset-bottom));
    max-width: calc(100vw - 16px);
    gap: 6px;
  }

  .music-dock {
    max-width: 186px;
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

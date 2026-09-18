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
  >
    <div id="corner-pagination-dock" class="pagination-dock" />
    <div class="music-dock">
      <MusicCapsule @ready="onMusicReady" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useBottomDockState } from "@/composables/useBottomDockState";

const MusicCapsule = defineAsyncComponent(() => import("@/components/MusicCapsule.vue"));

const {
  activeBottomDock,
  contentReady,
  paginationVisible,
  setAutoCollapsed,
  setNearBottom,
} = useBottomDockState();
const musicReady = ref(false);
const route = useRoute();
const isSpaceTheme = computed(
  () => route.path === "/" || route.path === "/time/constellation",
);
const musicVisible = ref(false);
const dockReady = computed(() => contentReady.value && musicReady.value);

function onMusicReady(payload: { visible: boolean }) {
  musicReady.value = true;
  musicVisible.value = payload.visible;
}

watch(
  dockReady,
  (ready) => setAutoCollapsed(ready),
  { immediate: true },
);

// 捕获阶段监听所有滚动容器：接近底部时自动展开分页胶囊（与音乐胶囊互斥）
let nearBottomTick = 0;
function onScrollCapture(event: Event) {
  const target = event.target as Document | HTMLElement | null;
  if (!target) return;
  const now = Date.now();
  if (now - nearBottomTick < 120) return;
  nearBottomTick = now;
  let near = false;
  if (target instanceof Document) {
    const remaining = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
    near = remaining <= 64;
  } else if (target instanceof HTMLElement) {
    if (target.scrollHeight - target.clientHeight < 8) return;
    const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
    near = remaining <= 64;
  }
  setNearBottom(near);
}

onMounted(() => {
  window.addEventListener("scroll", onScrollCapture, { capture: true, passive: true });
});

watch(() => route.fullPath, () => setNearBottom(false));

onUnmounted(() => {
  setAutoCollapsed(false);
  window.removeEventListener("scroll", onScrollCapture, { capture: true } as never);
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
  max-width: 116px;
}

.music-dock {
  max-width: 186px;
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

<template>
  <div class="layout">
    <button
      class="mobile-menu-trigger"
      type="button"
      aria-label="打开导航菜单"
      :aria-expanded="mobileNavOpen"
      @click="mobileNavOpen = !mobileNavOpen"
    >
      <Icon :name="mobileNavOpen ? 'ph:x-bold' : 'ph:list-bold'" />
    </button>

    <Transition name="mobile-overlay">
      <button
        v-if="mobileNavOpen"
        class="mobile-nav-overlay"
        type="button"
        aria-label="关闭导航菜单"
        @click="mobileNavOpen = false"
      />
    </Transition>

    <div class="sidebar-shell" :class="{ open: mobileNavOpen }">
      <LeftSidebar @open-search="openSearch" />
    </div>

    <div ref="pageRef" class="layout-page">
      <slot />
    </div>
    <SearchModal :visible="showSearch" @close="showSearch = false" />
    <ClientOnly
      ><AiPet v-if="showContextAi" mode="context" :article="pageContext"
    /></ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { focusSearchHighlight } from "~/composables/useSearchHighlight";

const showSearch = ref(false);
const mobileNavOpen = ref(false);
const route = useRoute();
const pageRef = ref<HTMLElement | null>(null);
let highlightTimer: ReturnType<typeof setTimeout> | null = null;
const { selectedMemory } = useMemorySelection();
const showContextAi = computed(() =>
  /^\/(moments|library|places|albums|stories|journeys|time)\//.test(route.path),
);
const pageContext = computed(() => {
  const parts = route.path.split("/").filter(Boolean);
  const section = parts[0] || "";
  const profiles: Record<
    string,
    { type: string; scene: string; title: string }
  > = {
    moments: { type: "moment", scene: "moment", title: "瞬间" },
    library: { type: "library", scene: "library", title: "书影" },
    places: { type: "place", scene: "place", title: "地点记忆" },
    albums: { type: "album", scene: "album", title: "相册" },
    stories: { type: "story", scene: "story", title: "故事航线" },
    journeys: { type: "journey", scene: "journey", title: "旅程" },
  };
  const profile =
    section === "time"
      ? parts[1] === "map"
        ? { type: "map", scene: "map", title: "时光地图" }
        : { type: "constellation", scene: "constellation", title: "时光星图" }
      : profiles[section] || {
          type: section,
          scene: section,
          title: "当前页面",
        };
  const selected = selectedMemory.value;
  const selectedType =
    section === "albums" && selected?.type === "photo" ? "photo" : profile.type;
  const selectedId =
    selectedType === "photo"
      ? String(selected?.id || "").replace(/^photo:/, "")
      : "";
  return {
    type: selectedType,
    scene: selectedType,
    slug: selectedId || parts.at(-1) || "",
    sourceId: selectedId,
    title: selectedType === "photo" ? "当前照片" : profile.title,
    content: "",
  };
});

function openSearch() {
  mobileNavOpen.value = false;
  showSearch.value = true;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && mobileNavOpen.value) {
    mobileNavOpen.value = false;
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    openSearch();
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  focusRouteHighlight();
});
onUnmounted(() => document.removeEventListener("keydown", onKeydown));

function focusRouteHighlight() {
  const query = String(route.query.highlight || "");
  if (!query || !pageRef.value) return;
  let attempts = 0;
  const run = () => {
    attempts += 1;
    if (focusSearchHighlight(query, pageRef.value) || attempts >= 10) return;
    highlightTimer = window.setTimeout(run, 120);
  };
  nextTick(run);
}

watch(() => route.fullPath, focusRouteHighlight, { immediate: true });
onUnmounted(() => {
  if (highlightTimer !== null) window.clearTimeout(highlightTimer);
});

watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false;
  },
);
</script>

<style scoped>
.layout {
  display: flex;
  width: 100%;
  height: 100dvh;
  max-height: 100dvh;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.sidebar-shell {
  display: flex;
  flex: 0 0 var(--left-w);
  min-width: 0;
  position: relative;
  z-index: 30;
  overflow: visible;
  height: 100%;
  max-height: 100dvh;
}

.layout-page {
  display: flex;
  flex: 1;
  min-width: 0;
  height: 100%;
  max-height: 100dvh;
  overflow: hidden;
}

.mobile-menu-trigger,
.mobile-nav-overlay {
  display: none;
}

@media (max-width: 900px) {
  .mobile-menu-trigger {
    position: fixed;
    top: max(12px, env(safe-area-inset-top));
    left: max(12px, env(safe-area-inset-left));
    z-index: 11002;
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    border-radius: 13px;
    background: color-mix(in srgb, var(--ld-bg-card) 88%, transparent);
    color: var(--c-text);
    box-shadow: 0 8px 24px color-mix(in srgb, #000 14%, var(--ld-shadow));
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    font-size: 1.2rem;
    cursor: pointer;
  }

  .mobile-nav-overlay {
    position: fixed;
    inset: 0;
    z-index: 11000;
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: rgb(0 0 0 / 38%);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }

  .sidebar-shell {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 11001;
    width: min(82vw, 300px);
    height: 100dvh;
    padding-top: max(58px, calc(env(safe-area-inset-top) + 54px));
    background: var(--c-bg);
    box-shadow: 18px 0 48px rgb(0 0 0 / 18%);
    transform: translate3d(-105%, 0, 0);
    visibility: hidden;
    overflow: visible;
    transition:
      transform 0.24s ease,
      visibility 0.24s;
  }

  .sidebar-shell.open {
    transform: translate3d(0, 0, 0);
    visibility: visible;
  }

  .sidebar-shell :deep(.sidebar-left) {
    width: 100%;
    height: 100%;
    min-height: 0;
    padding-top: 4px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
    overflow: visible;
  }

  .sidebar-shell :deep(.sidebar-scroll) {
    flex: 1 1 auto;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .sidebar-shell :deep(.sidebar-bottom) {
    flex: 0 0 auto;
    overflow: visible;
  }

  .layout-page {
    width: 100%;
  }
}

.mobile-overlay-enter-active,
.mobile-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.mobile-overlay-enter-from,
.mobile-overlay-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-shell,
  .mobile-overlay-enter-active,
  .mobile-overlay-leave-active {
    transition: none;
  }
}
</style>

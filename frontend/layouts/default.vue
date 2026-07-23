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

    <div class="layout-page">
      <slot />
    </div>
    <SearchModal :visible="showSearch" @close="showSearch = false" />
  </div>
</template>

<script setup lang="ts">
const showSearch = ref(false)
const mobileNavOpen = ref(false)
const route = useRoute()

function openSearch() {
  mobileNavOpen.value = false
  showSearch.value = true
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && mobileNavOpen.value) {
    mobileNavOpen.value = false
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    openSearch()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
})
</script>

<style scoped>
.layout {
  display: flex;
  height: 100%;
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
}

.layout-page {
  display: flex;
  flex: 1;
  min-width: 0;
  height: 100%;
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
    transition: transform 0.24s ease, visibility 0.24s;
  }

  .sidebar-shell.open {
    transform: translate3d(0, 0, 0);
    visibility: visible;
  }

  .sidebar-shell :deep(.sidebar-left) {
    width: 100%;
    height: 100%;
    padding-top: 4px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
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

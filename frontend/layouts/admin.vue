<template>
  <a-config-provider :theme="themeConfig">
    <div
      class="admin-root"
      :class="{ 'sidebar-collapsed': effectiveCollapsed }"
    >
      <button
        class="admin-menu-trigger"
        type="button"
        aria-label="打开管理菜单"
        :aria-expanded="mobileNavOpen"
        @click="mobileNavOpen = !mobileNavOpen"
      >
        <Icon :name="mobileNavOpen ? 'ph:x-bold' : 'ph:list-bold'" />
      </button>
      <Transition name="admin-overlay">
        <button
          v-if="mobileNavOpen"
          class="admin-nav-overlay"
          type="button"
          aria-label="关闭管理菜单"
          @click="mobileNavOpen = false"
        />
      </Transition>
      <div class="sidebar-shell" :class="{ open: mobileNavOpen }">
        <LeftSidebar
          variant="admin"
          :collapsed="effectiveCollapsed"
          :allow-collapse="!isMobile"
          @toggle-collapse="toggleSidebar"
        />
      </div>
      <div class="admin-main">
        <slot />
        <GlobalMediaLibrary />
        <GlobalIconPicker />
      </div>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { theme } from "ant-design-vue";

const router = useRouter();
const route = useRoute();
const { resolvedTheme } = useTheme();
const { readStorage, refreshProfile, isLoggedIn, isAdmin, canAccessAdminPath } =
  useAuth();
const mobileNavOpen = ref(false);
const sidebarCollapsed = ref(false);
const isMobile = ref(false);
const effectiveCollapsed = computed(
  () => !isMobile.value && sidebarCollapsed.value,
);
let mobileQuery: MediaQueryList | null = null;
let syncMobile: (() => void) | null = null;
let previousBodyOverflow = "";

const isDark = computed(() => resolvedTheme.value === "dark");

const themeConfig = computed(() => ({
  algorithm: isDark.value ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    fontFamily: "var(--font-body)",
    fontFamilyCode: "var(--font-mono)",
  },
}));

async function guardPanel() {
  readStorage();
  if (!isLoggedIn.value) {
    router.push("/login");
    return;
  }
  try {
    await refreshProfile();
  } catch {
    /* keep local session */
  }
  if (!canAccessAdminPath(route.path)) {
    router.push("/admin/profile");
  }
}

onMounted(async () => {
  mobileQuery = window.matchMedia("(max-width: 900px)");
  syncMobile = () => {
    isMobile.value = Boolean(mobileQuery?.matches);
    if (!isMobile.value) mobileNavOpen.value = false;
  };
  syncMobile();
  mobileQuery.addEventListener("change", syncMobile);
  window.addEventListener("keydown", onKeydown);
  await guardPanel();
  sidebarCollapsed.value =
    isAdmin.value &&
    localStorage.getItem("corner-admin-sidebar-collapsed") === "1";
});

function toggleSidebar() {
  if (!isAdmin.value || isMobile.value) return;
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem(
    "corner-admin-sidebar-collapsed",
    sidebarCollapsed.value ? "1" : "0",
  );
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") mobileNavOpen.value = false;
}

watch(mobileNavOpen, (open) => {
  if (open && isMobile.value) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = previousBodyOverflow;
  }
});

watch(
  () => route.path,
  () => {
    mobileNavOpen.value = false;
    void guardPanel();
  },
);

onUnmounted(() => {
  if (syncMobile) mobileQuery?.removeEventListener("change", syncMobile);
  window.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = previousBodyOverflow;
});
</script>

<style scoped>
.admin-root {
  width: 100%;
  height: 100dvh;
  max-height: 100dvh;
  min-height: 0;
  display: flex;
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
  border-right: 1px solid var(--border);
  height: 100%;
  max-height: 100dvh;
  min-height: 0;
  overflow: hidden;
  transition:
    flex-basis 0.32s cubic-bezier(0.16, 1, 0.3, 1),
    width 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}
.admin-root.sidebar-collapsed .sidebar-shell {
  flex-basis: 72px;
  width: 72px;
}

.admin-main {
  background: var(--c-bg);
  padding: 20px 24px;
  overflow-y: auto;
  min-height: 0;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100dvh;
}

.admin-menu-trigger,
.admin-nav-overlay {
  display: none;
}

@media (max-width: 900px) {
  .admin-menu-trigger {
    position: fixed;
    top: max(12px, env(safe-area-inset-top));
    left: max(12px, env(safe-area-inset-left));
    z-index: 11002;
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    border-radius: 8px;
    background: color-mix(in srgb, var(--ld-bg-card) 92%, transparent);
    color: var(--c-text);
    box-shadow: 0 8px 24px rgb(0 0 0 / 14%);
    backdrop-filter: blur(14px);
    font-size: 1.2rem;
  }

  .admin-nav-overlay {
    position: fixed;
    inset: 0;
    z-index: 11000;
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: rgb(0 0 0 / 38%);
  }

  .sidebar-shell {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 11001;
    width: min(82vw, 300px);
    height: 100dvh;
    max-height: 100dvh;
    min-height: 0;
    padding-top: max(58px, calc(env(safe-area-inset-top) + 54px));
    background: var(--c-bg);
    box-shadow: 18px 0 48px rgb(0 0 0 / 18%);
    transform: translate3d(-105%, 0, 0);
    visibility: hidden;
    overflow: hidden;
    overscroll-behavior-y: contain;
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
    max-height: 100%;
    min-height: 0;
    padding-top: 4px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
    overflow: hidden;
  }

  .sidebar-shell :deep(.sidebar-scroll) {
    flex: 1 1 auto;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    padding-right: 2px;
  }

  .sidebar-shell :deep(.sidebar-bottom) {
    flex: 0 0 auto;
    margin-top: 0;
    overflow: visible;
  }

  .sidebar-shell :deep(.sidebar-bottom-scroll) {
    flex: 0 0 auto;
    overflow-y: visible;
  }

  .admin-main {
    width: 100%;
    padding: max(70px, calc(env(safe-area-inset-top) + 64px))
      max(12px, env(safe-area-inset-right))
      max(20px, env(safe-area-inset-bottom))
      max(12px, env(safe-area-inset-left));
    overflow-x: hidden;
  }
}

.admin-overlay-enter-active,
.admin-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.admin-overlay-enter-from,
.admin-overlay-leave-to {
  opacity: 0;
}
</style>

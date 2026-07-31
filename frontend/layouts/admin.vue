<template>
  <a-config-provider :theme="themeConfig">
    <div class="admin-root" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
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
        <button v-if="mobileNavOpen" class="admin-nav-overlay" type="button" aria-label="关闭管理菜单"
          @click="mobileNavOpen = false" />
      </Transition>
      <div class="sidebar-shell" :class="{ open: mobileNavOpen }">
        <LeftSidebar variant="admin" :collapsed="sidebarCollapsed" />
        <button class="sidebar-collapse" type="button" :title="sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'" :aria-label="sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'" @click="toggleSidebar">
          <Icon :name="sidebarCollapsed ? 'ph:caret-right-bold' : 'ph:caret-left-bold'" />
        </button>
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
import { theme } from 'ant-design-vue'

const router = useRouter()
const route = useRoute()
const { resolvedTheme } = useTheme()
const { readStorage, refreshProfile, isLoggedIn, canAccessAdminPath } = useAuth()
const mobileNavOpen = ref(false)
const sidebarCollapsed = ref(false)

const isDark = computed(() => resolvedTheme.value === 'dark')

const themeConfig = computed(() => ({
  algorithm: isDark.value ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    fontFamily: 'var(--font-body)',
    fontFamilyCode: 'var(--font-mono)',
  },
}))

async function guardPanel() {
  readStorage()
  if (!isLoggedIn.value) {
    router.push('/login')
    return
  }
  try {
    await refreshProfile()
  } catch { /* keep local session */ }
  if (!canAccessAdminPath(route.path)) {
    router.push('/admin/profile')
  }
}

onMounted(() => {
  sidebarCollapsed.value = localStorage.getItem('corner-admin-sidebar-collapsed') === '1'
  void guardPanel()
})

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('corner-admin-sidebar-collapsed', sidebarCollapsed.value ? '1' : '0')
}

watch(() => route.path, () => {
  mobileNavOpen.value = false
  void guardPanel()
})
</script>

<style scoped>
.admin-root {
  height: 100%;
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
  transition: flex-basis .32s cubic-bezier(.16,1,.3,1), width .32s cubic-bezier(.16,1,.3,1);
}
.admin-root.sidebar-collapsed .sidebar-shell { flex-basis:72px; width:72px; }
.sidebar-collapse { position:absolute; z-index:50; top:92px; right:-12px; display:grid; width:24px; height:36px; padding:0; border:1px solid var(--border); border-radius:8px; background:var(--ld-bg-card); box-shadow:0 5px 16px color-mix(in srgb,var(--ld-shadow) 45%,transparent); color:var(--c-text-3); cursor:pointer; place-items:center; transition:color .18s,transform .18s; }
.sidebar-collapse:hover { color:var(--c-primary); transform:translateX(1px); }

.admin-main {
  background: var(--c-bg);
  padding: 20px 24px;
  overflow-y: auto;
  min-height: 0;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
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
    padding-top: max(58px, calc(env(safe-area-inset-top) + 54px));
    background: var(--c-bg);
    box-shadow: 18px 0 48px rgb(0 0 0 / 18%);
    transform: translate3d(-105%, 0, 0);
    visibility: hidden;
    transition: transform 0.24s ease, visibility 0.24s;
  }
  .admin-root.sidebar-collapsed .sidebar-shell { width:min(82vw,300px); flex-basis:var(--left-w); }
  .sidebar-shell :deep(.sidebar-left.is-collapsed) { width:100%; padding-right:16px; padding-left:16px; }
  .sidebar-shell :deep(.is-collapsed .hero-text),.sidebar-shell :deep(.is-collapsed .hero-status),.sidebar-shell :deep(.is-collapsed .nav-label),.sidebar-shell :deep(.is-collapsed .user-name),.sidebar-shell :deep(.is-collapsed .user-badge),.sidebar-shell :deep(.is-collapsed .user-logout),.sidebar-shell :deep(.is-collapsed .user-back span) { display:revert; }
  .sidebar-shell :deep(.is-collapsed .search-box) { display:flex; }
  .sidebar-shell :deep(.is-collapsed .nav-item) { justify-content:flex-start; padding:7px 10px; }
  .sidebar-shell :deep(.is-collapsed .theme-pill) { width:fit-content; flex-direction:row; border-radius:1.2rem; }
  .sidebar-collapse { display:none; }

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

  .admin-main {
    width: 100%;
    padding: max(70px, calc(env(safe-area-inset-top) + 64px)) max(12px, env(safe-area-inset-right))
      max(20px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
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

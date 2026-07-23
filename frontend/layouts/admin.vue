<template>
  <a-config-provider :theme="themeConfig">
    <div class="admin-root">
      <div class="sidebar-shell">
        <LeftSidebar variant="admin" />
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
const { theme: appTheme } = useTheme()
const { readStorage, refreshProfile, isLoggedIn, canAccessAdminPath } = useAuth()
const systemDark = ref(false)

const isDark = computed(() => {
  if (appTheme.value === 'dark') return true
  if (appTheme.value === 'light') return false
  return systemDark.value
})

const themeConfig = computed(() => ({
  algorithm: isDark.value ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    fontFamily: 'var(--font-body)',
    fontFamilyCode: 'var(--font-mono)',
  },
}))

let removeMqListener: (() => void) | undefined

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
  void guardPanel()

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = mq.matches
  const onChange = (e: MediaQueryListEvent) => { systemDark.value = e.matches }
  mq.addEventListener('change', onChange)
  removeMqListener = () => mq.removeEventListener('change', onChange)
})

watch(() => route.path, () => { void guardPanel() })
onUnmounted(() => removeMqListener?.())
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
}

.admin-main {
  background: var(--c-bg);
  padding: 20px 24px;
  overflow-y: auto;
  min-height: 0;
  flex: 1;
  min-width: 0;
}
</style>

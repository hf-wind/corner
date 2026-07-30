<template>
  <component :is="activeLayout">
    <RouterView />
  </component>
  <GlobalToast v-if="toasts.length" />
  <SidebarMusicPlayer v-if="showPlayer" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const DefaultLayout = defineAsyncComponent(() => import('./layouts/default.vue'))
const AdminLayout = defineAsyncComponent(() => import('./layouts/admin.vue'))
const WelcomeLayout = defineAsyncComponent(() => import('./layouts/welcome.vue'))
const GlobalToast = defineAsyncComponent(() => import('./components/GlobalToast.vue'))
const SidebarMusicPlayer = defineAsyncComponent(() => import('./components/SidebarMusicPlayer.vue'))

const { init: initTypography } = useTypography()
const { init: initTheme } = useTheme()
const { readStorage, refreshProfile, isLoggedIn, isAdmin } = useAuth()
const { connectRealtime, disconnectRealtime, refreshUnread } = useNotifications()
const { toasts } = useToast()
const { siteTitle, loadSiteSettings } = useSiteSettings()
const route = useRoute()
const showPlayer = ref(false)
const clientProtection = useProductionClientProtection(isAdmin)
let playerIdleHandle: number | undefined

readStorage()
const sessionReady = ref(isLoggedIn.value)

const activeLayout = computed(() => {
  if (route.meta.layout === false) return WelcomeLayout
  if (route.meta.layout === 'admin') return AdminLayout
  if (route.meta.layout === 'welcome') return WelcomeLayout
  return DefaultLayout
})

onMounted(() => {
  clientProtection.start()
  void loadSiteSettings()
  initTheme()
  initTypography()
  if (sessionReady.value) {
    void refreshProfile()
    connectRealtime()
    void refreshUnread()
  }
  const schedule = window.requestIdleCallback || ((callback: IdleRequestCallback) => window.setTimeout(callback, 800))
  playerIdleHandle = schedule(() => { showPlayer.value = true }, { timeout: 1600 })
})

onUnmounted(() => {
  clientProtection.stop()
  disconnectRealtime()
  if (playerIdleHandle === undefined) return
  if (window.cancelIdleCallback) window.cancelIdleCallback(playerIdleHandle)
  else window.clearTimeout(playerIdleHandle)
})

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    connectRealtime()
    void refreshUnread()
  } else {
    disconnectRealtime(true)
  }
})

useHead(() => ({
  titleTemplate: (chunk) => {
    return chunk ? `${chunk} - ${siteTitle.value}` : siteTitle.value
  }
}))
</script>

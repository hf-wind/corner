<template>
  <BrowserOnly v-if="route.meta.layout !== false">
    <GlobalBottomDock />
  </BrowserOnly>
  <component :is="activeLayout">
    <RouterView v-slot="{ Component, route: viewRoute }">
      <Transition
        :name="
          isSpaceRoute
            ? undefined
            : viewRoute.meta.layout === 'admin'
              ? (isAdminEditorRoute(viewRoute.path) ? undefined : 'admin-page')
              : 'route-page'
        "
        :mode="viewRoute.meta.layout === 'admin' && !isAdminEditorRoute(viewRoute.path) ? 'out-in' : undefined"
      >
        <KeepAlive v-if="viewRoute.meta.keepAlive">
          <component :is="Component" :key="viewRoute.path" />
        </KeepAlive>
        <component v-else :is="Component" :key="viewRoute.path" />
      </Transition>
    </RouterView>
  </component>
  <GlobalToast v-if="toasts.length" />
  <LightConfirm />
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  onUnmounted,
  ref,
} from "vue";
import { RouterView, useRoute } from "vue-router";
import DefaultLayout from "./layouts/default.vue";
import AdminLayout from "./layouts/admin.vue";
import WelcomeLayout from "./layouts/welcome.vue";
import LightConfirm from "./components/LightConfirm.vue";
import { useVisitor } from "./composables/useVisitor";
import { trackUmamiPageview } from "./composables/useUmamiAnalytics";

const GlobalToast = defineAsyncComponent(
  () => import("./components/GlobalToast.vue"),
);
const { init: initTypography } = useTypography();
const { init: initTheme } = useTheme();
const { readStorage, refreshProfile, isLoggedIn, isAdmin } = useAuth();
const { connectRealtime, disconnectRealtime, refreshUnread } =
  useNotifications();
const visitor = useVisitor();
const { toasts } = useToast();
const { siteTitle, loadSiteSettings } = useSiteSettings();
const route = useRoute();
const isSpaceRoute = computed(
  () => route.path === "/" || route.path === "/time/constellation",
);
function isAdminEditorRoute(path: string) {
  return /^\/admin\/(?:posts|moments)\/(?:new|create)(?:\/|$)/.test(path);
}
const clientProtection = useProductionClientProtection(isAdmin);

readStorage();
const sessionReady = ref(isLoggedIn.value);

const activeLayout = computed(() => {
  if (route.meta.layout === false) return WelcomeLayout;
  if (route.meta.layout === "admin") return AdminLayout;
  if (route.meta.layout === "welcome") return WelcomeLayout;
  return DefaultLayout;
});

watch(
  () => route.path,
  () => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle(
      "space-route",
      isSpaceRoute.value,
    );
    document.documentElement.classList.toggle(
      "constellation-route",
      route.path === "/time/constellation",
    );
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      const dark = document.documentElement.classList.contains("dark");
      themeColor.setAttribute(
        "content",
        isSpaceRoute.value ? "#030712" : dark ? "#030b18" : "#eaf5ff",
      );
    }
  },
  { immediate: true },
);

watch(
  () => route.fullPath,
  (path) => {
    void trackUmamiPageview(path);
    if (typeof window !== 'undefined') {
      const contentType = path.startsWith('/circle') ? 'circle' : path.startsWith('/article/') ? 'article' : route.meta.layout === 'admin' ? 'admin' : 'page';
      visitor.queueEvent({ action: 'page_view', path, contentType, sourceId: path.split('/').filter(Boolean).pop() });
    }
  },
  { immediate: true },
);

onMounted(() => {
  clientProtection.start();
  void loadSiteSettings();
  initTheme();
  initTypography();
  window.addEventListener('pagehide', () => { void visitor.flushEvents(true) });
  if (sessionReady.value) {
    void refreshProfile();
    connectRealtime();
    void refreshUnread();
  }
});

onUnmounted(() => {
  clientProtection.stop();
  disconnectRealtime();
  void visitor.flushEvents();
});

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    void visitor.trackVisit();
    connectRealtime();
    void refreshUnread();
  } else {
    disconnectRealtime(true);
  }
});

useHead(() => ({
  titleTemplate: (chunk) => {
    return chunk ? `${chunk} - ${siteTitle.value}` : siteTitle.value;
  },
}));
</script>

<style>
::view-transition-group(root) {
  animation-duration: 0.72s;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

::view-transition-old(root) {
  animation: cosmic-route-out 0.46s cubic-bezier(0.55, 0, 0.8, 0.2) both;
}

::view-transition-new(root) {
  animation: cosmic-route-in 0.72s cubic-bezier(0.16, 1, 0.3, 1) both;
}

html[data-cosmic-transition="constellation"]::view-transition-new(root) {
  animation-name: constellation-route-in;
}

html[data-cosmic-transition="home"]::view-transition-new(root) {
  animation-name: home-route-in;
}

@keyframes cosmic-route-out {
  to {
    opacity: 0;
    transform: scale(1.025);
    filter: blur(3px);
  }
}

@keyframes cosmic-route-in {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
}

@keyframes constellation-route-in {
  from {
    opacity: 0;
    clip-path: circle(7% at 66% 50%);
    transform: scale(1.035);
  }
  to {
    opacity: 1;
    clip-path: circle(150% at 66% 50%);
    transform: scale(1);
  }
}

@keyframes home-route-in {
  from {
    opacity: 0;
    transform: translate3d(0, 14px, 0) scale(0.99);
  }
}

html.space-pending body::after {
  position: fixed;
  z-index: 2147483647;
  inset: 0;
  background: #020814;
  content: "";
  pointer-events: none;
}

.route-page-enter-active,
.route-page-leave-active {
  will-change: opacity, transform;
}

.layout-page,
.admin-main {
  position: relative;
}

.route-page-leave-active {
  position: absolute !important;
  z-index: 0;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.route-page-enter-active {
  position: relative;
  z-index: 1;
}

.route-page-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.route-page-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.route-page-enter-from {
  opacity: 0;
  transform: translate3d(0, 8px, 0);
}

.route-page-leave-to {
  opacity: 0;
  transform: translate3d(0, -3px, 0);
}

.route-page-enter-active .sidebar-right {
  transition:
    opacity 0.36s ease 0.05s,
    transform 0.48s cubic-bezier(0.22, 1, 0.36, 1) 0.05s;
}

.route-page-enter-from .sidebar-right {
  opacity: 0;
  transform: translate3d(14px, 0, 0);
}

.admin-page-enter-active {
  transition: opacity 0.2s ease;
}
.admin-page-enter-from {
  opacity: 0;
}
.admin-page-leave-active {
  transition: opacity 0.12s ease;
}
.admin-page-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(root),
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: 0.01ms;
  }

  .route-page-enter-active,
  .route-page-leave-active,
  .route-page-enter-active .sidebar-right {
    transition: none;
  }
}
</style>

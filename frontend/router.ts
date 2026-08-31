import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { setCompatRouter } from "./compat/runtime";
import { useFeatureFlags } from "./composables/useFeatureFlags";
import { importWithRetry } from "./utils/lazyImport";

function lazyRoute<T>(loader: () => Promise<T>) {
  return () => importWithRetry(loader);
}

const adminMeta = { layout: "admin", requiresAuth: true } as const;

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: lazyRoute(() => import("./pages/index.vue")),
    meta: { layout: "welcome" },
  },
  {
    path: "/home",
    component: lazyRoute(() => import("./pages/home.vue")),
    meta: { keepAlive: true },
  },
  {
    path: "/article/:slug",
    component: lazyRoute(() => import("./pages/article/[slug].vue")),
  },
  {
    path: "/archive",
    component: lazyRoute(() => import("./pages/archive.vue")),
  },
  {
    path: "/category",
    component: lazyRoute(() => import("./pages/category.vue")),
  },
  { path: "/tags", component: lazyRoute(() => import("./pages/tags.vue")) },
  {
    path: "/friends",
    component: lazyRoute(() => import("./pages/friends.vue")),
  },
  {
    path: "/guestbook",
    component: lazyRoute(() => import("./pages/guestbook.vue")),
  },
  { path: "/about", component: lazyRoute(() => import("./pages/about.vue")) },
  {
    path: "/changelog",
    component: lazyRoute(() => import("./pages/changelog.vue")),
  },
  {
    path: "/moments",
    component: lazyRoute(() => import("./pages/moments/index.vue")),
  },
  {
    path: "/circle",
    component: lazyRoute(() => import("./pages/circle.vue")),
  },
  {
    path: "/circle/read",
    component: lazyRoute(() => import("./pages/circle/read/[id].vue")),
  },
  {
    path: "/circle/read/:id",
    component: lazyRoute(() => import("./pages/circle/read/[id].vue")),
  },
  {
    path: "/moments/:slug",
    component: lazyRoute(() => import("./pages/moments/[slug].vue")),
  },
  {
    path: "/places/:slug",
    component: lazyRoute(() => import("./pages/places/[slug].vue")),
  },
  {
    path: "/time/map",
    component: lazyRoute(() => import("./pages/time/map.vue")),
  },
  {
    path: "/time/constellation",
    component: lazyRoute(() => import("./pages/time/constellation.vue")),
    meta: { layout: "welcome" },
  },
  {
    path: "/albums",
    component: lazyRoute(() => import("./pages/albums/index.vue")),
  },
  {
    path: "/albums/:slug",
    component: lazyRoute(() => import("./pages/albums/[slug].vue")),
  },
  {
    path: "/library",
    component: lazyRoute(() => import("./pages/library/index.vue")),
  },
  {
    path: "/library/:slug",
    component: lazyRoute(() => import("./pages/library/[slug].vue")),
  },
  {
    path: "/newsletter/confirm",
    component: lazyRoute(() => import("./pages/newsletter/confirm.vue")),
    meta: { layout: false },
  },
  {
    path: "/newsletter/unsubscribe",
    component: lazyRoute(() => import("./pages/newsletter/unsubscribe.vue")),
    meta: { layout: false },
  },
  {
    path: "/login",
    component: lazyRoute(() => import("./pages/login.vue")),
    meta: { layout: false },
  },
  {
    path: "/auth/github-callback",
    component: lazyRoute(() => import("./pages/auth/github-callback.vue")),
    meta: { layout: false },
  },
  {
    path: "/register",
    component: lazyRoute(() => import("./pages/register.vue")),
    meta: { layout: false },
  },

  {
    path: "/admin",
    component: lazyRoute(() => import("./pages/admin/index.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/about",
    component: lazyRoute(() => import("./pages/admin/about.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/backups",
    component: lazyRoute(() => import("./pages/admin/backups.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/albums",
    component: lazyRoute(() => import("./pages/admin/albums/index.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/albums/create",
    component: lazyRoute(() => import("./pages/admin/albums/create.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/albums/:id",
    component: lazyRoute(() => import("./pages/admin/albums/[id].vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/ai",
    component: lazyRoute(() => import("./pages/admin/ai/index.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/ai-native",
    redirect: { path: "/admin/ai", query: { tab: "chats" } },
    meta: adminMeta,
  },
  {
    path: "/admin/categories",
    component: lazyRoute(() => import("./pages/admin/categories.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/comments",
    component: lazyRoute(() => import("./pages/admin/comments.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/email",
    component: lazyRoute(() => import("./pages/admin/email.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/emoji",
    component: lazyRoute(() => import("./pages/admin/emoji.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/friend-applications",
    redirect: { path: "/admin/comments", query: { section: "applications" } },
    meta: adminMeta,
  },
  {
    path: "/admin/friends",
    component: lazyRoute(() => import("./pages/admin/friends.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/info",
    component: lazyRoute(() => import("./pages/admin/info.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/library",
    component: lazyRoute(() => import("./pages/admin/library/index.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/library/create",
    component: lazyRoute(() => import("./pages/admin/library/create.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/library/:id",
    component: lazyRoute(() => import("./pages/admin/library/[id].vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/logs",
    redirect: "/admin/info",
    meta: adminMeta,
  },
  {
    path: "/admin/media",
    component: lazyRoute(() => import("./pages/admin/media.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/messages",
    component: lazyRoute(() => import("./pages/admin/messages.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/newsletter",
    component: lazyRoute(() => import("./pages/admin/newsletter.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/visitor",
    component: lazyRoute(() => import("./pages/admin/visitor.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/memory-graph",
    component: lazyRoute(() => import("./pages/admin/memory-graph.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/moments",
    component: lazyRoute(() => import("./pages/admin/moments/index.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/circle",
    component: lazyRoute(() => import("./pages/admin/circle.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/changelog",
    component: lazyRoute(() => import("./pages/admin/changelog.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/moments/create",
    component: lazyRoute(() => import("./pages/admin/moments/create.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/moments/preview",
    component: lazyRoute(() => import("./pages/admin/moments/preview.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/moments/:slug",
    component: lazyRoute(() => import("./pages/admin/moments/[slug].vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/posts",
    component: lazyRoute(() => import("./pages/admin/posts/index.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/posts/create",
    component: lazyRoute(() => import("./pages/admin/posts/create.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/posts/preview",
    component: lazyRoute(() => import("./pages/admin/posts/preview.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/posts/:slug",
    component: lazyRoute(() => import("./pages/admin/posts/[slug].vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/profile",
    component: lazyRoute(() => import("./pages/admin/profile.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/settings",
    component: lazyRoute(() => import("./pages/admin/settings.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/tags",
    component: lazyRoute(() => import("./pages/admin/tags.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/analytics",
    component: lazyRoute(() => import("./pages/admin/analytics.vue")),
    meta: adminMeta,
  },
  {
    path: "/admin/users",
    component: lazyRoute(() => import("./pages/admin/users.vue")),
    meta: adminMeta,
  },
  {
    path: "/:pathMatch(.*)*",
    component: lazyRoute(() => import("./pages/404.vue")),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

setCompatRouter(router);

router.beforeEach(async (to) => {
  // Supabase may fall back to its Site URL when a redirect URL is not yet
  // allow-listed. Capture the OAuth hash at any route and send it through the
  // same callback handler instead of rendering the welcome page at "/".
  if (
    typeof window !== "undefined" &&
    to.path !== "/auth/github-callback" &&
    /(?:^#|&)access_token=|(?:^#|&)error=/.test(window.location.hash)
  ) {
    return {
      path: "/auth/github-callback",
      query: { redirect: "/home" },
      hash: window.location.hash,
    };
  }
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle(
      "space-pending",
      to.path === "/" || to.path === "/time/constellation",
    );
  }
  if (to.path === "/time/constellation") {
    const { constellationEnabled } = useFeatureFlags();
    if (!constellationEnabled) return "/home";
  }
  if (to.path === "/time/map") {
    const { mapEnabled } = useFeatureFlags();
    if (!mapEnabled) return "/home";
  }
  if (to.path === "/guestbook") {
    const { guestbookEnabled } = useFeatureFlags();
    if (!guestbookEnabled) return "/home";
  }
  if (
    to.path === "/albums" ||
    to.path.startsWith("/albums/") ||
    to.path === "/admin/albums" ||
    to.path.startsWith("/admin/albums/")
  ) {
    const { albumsEnabled } = useFeatureFlags();
    if (!albumsEnabled)
      return to.path.startsWith("/admin/") ? "/admin" : "/home";
  }
  if (!to.meta.requiresAuth) return true;

  const { useAuth } = await import("./composables/useAuth");
  const { isLoggedIn, user, refreshProfile, canAccessAdminPath } = useAuth();

  if (!isLoggedIn.value) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }

  if (!user.value?.role) {
    try {
      await refreshProfile();
    } catch {
      /* cached session remains usable */
    }
  }

  if (!canAccessAdminPath(to.path)) return "/admin/profile";
  return true;
});

router.afterEach((to) => {
  if (typeof document === "undefined") return;
  if (
    !to.meta.requiresAuth &&
    !["/login", "/register"].includes(to.path) &&
    to.fullPath.startsWith("/") &&
    !to.fullPath.startsWith("//")
  ) {
    useClientState().setSession('lastPublicRoute', to.fullPath);
  }
  window.requestAnimationFrame(() =>
    document.documentElement.classList.remove("space-pending"),
  );
});

router.onError((error, to) => {
  if (typeof document !== "undefined")
    document.documentElement.classList.remove("space-pending");

  const message = String(error instanceof Error ? error.message : error);
  const isModuleLoadError =
    /failed to fetch dynamically imported module|importing a module script failed|chunkloaderror/i.test(
      message,
    );
  if (!isModuleLoadError || typeof window === "undefined") return;

  // A stale dev-server graph or an old deployed chunk can recover after one reload.
  // Keep a per-route marker so a genuinely broken module cannot reload forever.
  const marker = `moduleReload:${to.fullPath}`;
  if (useClientState().getSession(marker, false) === true) {
    useClientState().removeSession(marker);
    return;
  }
  useClientState().setSession(marker, true);
  window.location.reload();
});

export default router;

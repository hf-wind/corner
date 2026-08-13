import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { setCompatRouter } from "./compat/runtime";
import { useFeatureFlags } from "./composables/useFeatureFlags";

const adminMeta = { layout: "admin", requiresAuth: true } as const;

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("./pages/index.vue"),
    meta: { layout: "welcome" },
  },
  { path: "/home", component: () => import("./pages/home.vue") },
  {
    path: "/article/:slug",
    component: () => import("./pages/article/[slug].vue"),
  },
  { path: "/archive", component: () => import("./pages/archive.vue") },
  { path: "/category", component: () => import("./pages/category.vue") },
  { path: "/tags", component: () => import("./pages/tags.vue") },
  { path: "/friends", component: () => import("./pages/friends.vue") },
  { path: "/guestbook", component: () => import("./pages/guestbook.vue") },
  { path: "/about", component: () => import("./pages/about.vue") },
  { path: "/moments", component: () => import("./pages/moments/index.vue") },
  {
    path: "/moments/:slug",
    component: () => import("./pages/moments/[slug].vue"),
  },
  {
    path: "/places/:slug",
    component: () => import("./pages/places/[slug].vue"),
  },
  { path: "/time/map", component: () => import("./pages/time/map.vue") },
  {
    path: "/time/constellation",
    component: () => import("./pages/time/constellation.vue"),
    meta: { layout: "welcome" },
  },
  { path: "/journeys", component: () => import("./pages/journeys/index.vue") },
  {
    path: "/journeys/:slug",
    component: () => import("./pages/journeys/[slug].vue"),
  },
  { path: "/stories", component: () => import("./pages/stories/index.vue") },
  {
    path: "/stories/share/:token",
    component: () => import("./pages/stories/share/[token].vue"),
  },
  {
    path: "/stories/:slug",
    component: () => import("./pages/stories/[slug].vue"),
  },
  { path: "/albums", component: () => import("./pages/albums/index.vue") },
  {
    path: "/albums/:slug",
    component: () => import("./pages/albums/[slug].vue"),
  },
  { path: "/library", component: () => import("./pages/library/index.vue") },
  {
    path: "/library/:slug",
    component: () => import("./pages/library/[slug].vue"),
  },
  {
    path: "/login",
    component: () => import("./pages/login.vue"),
    meta: { layout: false },
  },
  {
    path: "/register",
    component: () => import("./pages/register.vue"),
    meta: { layout: false },
  },

  {
    path: "/admin",
    component: () => import("./pages/admin/index.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/about",
    component: () => import("./pages/admin/about.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/albums",
    component: () => import("./pages/admin/albums/index.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/albums/create",
    component: () => import("./pages/admin/albums/create.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/albums/:id",
    component: () => import("./pages/admin/albums/[id].vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/ai",
    component: () => import("./pages/admin/ai/index.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/ai-native",
    component: () => import("./pages/admin/ai-native.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/categories",
    component: () => import("./pages/admin/categories.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/comments",
    component: () => import("./pages/admin/comments.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/email",
    component: () => import("./pages/admin/email.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/emoji",
    component: () => import("./pages/admin/emoji.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/friend-applications",
    component: () => import("./pages/admin/friend-applications.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/friends",
    component: () => import("./pages/admin/friends.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/info",
    component: () => import("./pages/admin/info.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/library",
    component: () => import("./pages/admin/library/index.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/journeys",
    component: () => import("./pages/admin/journeys.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/library/create",
    component: () => import("./pages/admin/library/create.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/library/:id",
    component: () => import("./pages/admin/library/[id].vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/logs",
    component: () => import("./pages/admin/logs.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/media",
    component: () => import("./pages/admin/media.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/messages",
    component: () => import("./pages/admin/messages.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/visitor",
    component: () => import("./pages/admin/visitor.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/memory-graph",
    component: () => import("./pages/admin/memory-graph.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/moments",
    component: () => import("./pages/admin/moments/index.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/moments/create",
    component: () => import("./pages/admin/moments/create.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/moments/preview",
    component: () => import("./pages/admin/moments/preview.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/moments/:slug",
    component: () => import("./pages/admin/moments/[slug].vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/posts",
    component: () => import("./pages/admin/posts/index.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/posts/create",
    component: () => import("./pages/admin/posts/create.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/posts/preview",
    component: () => import("./pages/admin/posts/preview.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/posts/:slug",
    component: () => import("./pages/admin/posts/[slug].vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/profile",
    component: () => import("./pages/admin/profile.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/settings",
    component: () => import("./pages/admin/settings.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/tags",
    component: () => import("./pages/admin/tags.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/analytics",
    component: () => import("./pages/admin/analytics.vue"),
    meta: adminMeta,
  },
  {
    path: "/admin/users",
    component: () => import("./pages/admin/users.vue"),
    meta: adminMeta,
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

setCompatRouter(router);

router.beforeEach(async (to) => {
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
  if (
    to.path === "/stories" ||
    to.path.startsWith("/stories/") ||
    to.path === "/journeys" ||
    to.path.startsWith("/journeys/")
  ) {
    const { storiesEnabled } = useFeatureFlags();
    if (!storiesEnabled) return "/home";
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
  window.requestAnimationFrame(() =>
    document.documentElement.classList.remove("space-pending"),
  );
  void trackVisitorVisit(to);
});

function pageTypeOf(path: string): string {
  if (path === "/" || path === "/home") return "home";
  if (path.startsWith("/article/")) return "post";
  if (path.startsWith("/albums/")) return "album";
  if (path === "/time/map") return "memory-map";
  if (path === "/time/constellation") return "memory-graph";
  if (path === "/guestbook") return "guestbook";
  if (path.startsWith("/journeys/")) return "journey";
  return "page";
}

function trackVisitorVisit(to: { path: string; name?: unknown }) {
  if (typeof document === "undefined") return;
  if (!navigator.onLine) return;
  if (to.path === "/") return;
  const pageType = pageTypeOf(to.path);
  import("./composables/useVisitor").then(({ useVisitor }) => {
    const visitor = useVisitor();
    const title = document.title || to.path;
    visitor.trackVisit(pageType, title, to.path);
  });
}

router.onError(() => {
  if (typeof document !== "undefined")
    document.documentElement.classList.remove("space-pending");
});

export default router;

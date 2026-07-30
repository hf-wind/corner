import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { setCompatRouter } from './compat/runtime'

const adminMeta = { layout: 'admin', requiresAuth: true } as const

const routes: RouteRecordRaw[] = [
  { path: '/', component: () => import('./pages/index.vue'), meta: { layout: 'welcome' } },
  { path: '/home', component: () => import('./pages/home.vue') },
  { path: '/article/:slug', component: () => import('./pages/article/[slug].vue') },
  { path: '/archive', component: () => import('./pages/archive.vue') },
  { path: '/category', component: () => import('./pages/category.vue') },
  { path: '/tags', component: () => import('./pages/tags.vue') },
  { path: '/friends', component: () => import('./pages/friends.vue') },
  { path: '/about', component: () => import('./pages/about.vue') },
  { path: '/moments', component: () => import('./pages/moments/index.vue') },
  { path: '/moments/:slug', component: () => import('./pages/moments/[slug].vue') },
  { path: '/places/:slug', component: () => import('./pages/places/[slug].vue') },
  { path: '/library', component: () => import('./pages/library/index.vue') },
  { path: '/library/:slug', component: () => import('./pages/library/[slug].vue') },
  { path: '/login', component: () => import('./pages/login.vue'), meta: { layout: false } },
  { path: '/register', component: () => import('./pages/register.vue'), meta: { layout: false } },

  { path: '/admin', component: () => import('./pages/admin/index.vue'), meta: adminMeta },
  { path: '/admin/about', component: () => import('./pages/admin/about.vue'), meta: adminMeta },
  { path: '/admin/ai', component: () => import('./pages/admin/ai/index.vue'), meta: adminMeta },
  { path: '/admin/categories', component: () => import('./pages/admin/categories.vue'), meta: adminMeta },
  { path: '/admin/comments', component: () => import('./pages/admin/comments.vue'), meta: adminMeta },
  { path: '/admin/email', component: () => import('./pages/admin/email.vue'), meta: adminMeta },
  { path: '/admin/emoji', component: () => import('./pages/admin/emoji.vue'), meta: adminMeta },
  { path: '/admin/friend-applications', component: () => import('./pages/admin/friend-applications.vue'), meta: adminMeta },
  { path: '/admin/friends', component: () => import('./pages/admin/friends.vue'), meta: adminMeta },
  { path: '/admin/info', component: () => import('./pages/admin/info.vue'), meta: adminMeta },
  { path: '/admin/library', component: () => import('./pages/admin/library/index.vue'), meta: adminMeta },
  { path: '/admin/library/create', component: () => import('./pages/admin/library/create.vue'), meta: adminMeta },
  { path: '/admin/library/:id', component: () => import('./pages/admin/library/[id].vue'), meta: adminMeta },
  { path: '/admin/logs', component: () => import('./pages/admin/logs.vue'), meta: adminMeta },
  { path: '/admin/media', component: () => import('./pages/admin/media.vue'), meta: adminMeta },
  { path: '/admin/messages', component: () => import('./pages/admin/messages.vue'), meta: adminMeta },
  { path: '/admin/moments', component: () => import('./pages/admin/moments/index.vue'), meta: adminMeta },
  { path: '/admin/moments/create', component: () => import('./pages/admin/moments/create.vue'), meta: adminMeta },
  { path: '/admin/moments/preview', component: () => import('./pages/admin/moments/preview.vue'), meta: adminMeta },
  { path: '/admin/moments/:slug', component: () => import('./pages/admin/moments/[slug].vue'), meta: adminMeta },
  { path: '/admin/posts', component: () => import('./pages/admin/posts/index.vue'), meta: adminMeta },
  { path: '/admin/posts/create', component: () => import('./pages/admin/posts/create.vue'), meta: adminMeta },
  { path: '/admin/posts/preview', component: () => import('./pages/admin/posts/preview.vue'), meta: adminMeta },
  { path: '/admin/posts/:slug', component: () => import('./pages/admin/posts/[slug].vue'), meta: adminMeta },
  { path: '/admin/profile', component: () => import('./pages/admin/profile.vue'), meta: adminMeta },
  { path: '/admin/settings', component: () => import('./pages/admin/settings.vue'), meta: adminMeta },
  { path: '/admin/tags', component: () => import('./pages/admin/tags.vue'), meta: adminMeta },
  { path: '/admin/analytics', component: () => import('./pages/admin/analytics.vue'), meta: adminMeta },
  { path: '/admin/users', component: () => import('./pages/admin/users.vue'), meta: adminMeta },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

setCompatRouter(router)

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  const { useAuth } = await import('./composables/useAuth')
  const { isLoggedIn, user, refreshProfile, canAccessAdminPath } = useAuth()

  if (!isLoggedIn.value) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (!user.value?.role) {
    try { await refreshProfile() } catch { /* cached session remains usable */ }
  }

  if (!canAccessAdminPath(to.path)) return '/admin/profile'
  return true
})

export default router

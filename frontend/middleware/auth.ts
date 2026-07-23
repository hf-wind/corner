export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client) return

  const { readStorage, isLoggedIn, user, canAccessAdminPath } = useAuth()
  readStorage()

  if (!isLoggedIn.value) {
    return navigateTo('/login')
  }

  // stale session without role: allow once, layout will refreshProfile
  if (!user.value?.role) return

  if (to.path.startsWith('/admin') && !canAccessAdminPath(to.path)) {
    return navigateTo('/admin/profile')
  }
})

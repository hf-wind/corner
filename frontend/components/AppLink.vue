<template>
  <RouterLink
    v-bind="$attrs"
    :to="resolvedTo"
    @pointerenter="prefetchRoute"
    @focus="prefetchRoute"
    @touchstart.passive="prefetchRoute"
  ><slot /></RouterLink>
</template>

<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ to: RouteLocationRaw }>()
const route = useRoute()
const router = useRouter()
const prefetchedLoaders = new WeakSet<Function>()

const resolvedTo = computed<RouteLocationRaw>(() => {
  if (
    typeof props.to !== 'string'
    || !['/login', '/register'].includes(props.to)
    || ['/login', '/register'].includes(route.path)
  ) return props.to

  return { path: props.to, query: { redirect: route.fullPath } }
})

function prefetchRoute() {
  const resolved = router.resolve(resolvedTo.value)
  for (const record of resolved.matched) {
    const loader = record.components?.default
    if (typeof loader !== 'function' || prefetchedLoaders.has(loader)) continue
    prefetchedLoaders.add(loader)
    Promise.resolve(loader()).catch(() => prefetchedLoaders.delete(loader))
  }
}
</script>

<template>
  <RouterLink v-bind="$attrs" :to="resolvedTo"><slot /></RouterLink>
</template>

<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ to: RouteLocationRaw }>()
const route = useRoute()

const resolvedTo = computed<RouteLocationRaw>(() => {
  if (
    typeof props.to !== 'string'
    || !['/login', '/register'].includes(props.to)
    || ['/login', '/register'].includes(route.path)
  ) return props.to

  return { path: props.to, query: { redirect: route.fullPath } }
})
</script>

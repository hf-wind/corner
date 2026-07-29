<template>
  <RouterLink v-bind="$attrs" :to="to"><slot /></RouterLink>
</template>

<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

defineOptions({ inheritAttrs: false })
defineProps<{ to: RouteLocationRaw }>()
</script>

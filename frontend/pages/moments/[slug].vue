<template><div /></template>

<script setup lang="ts">
const route = useRoute()
onMounted(() => {
  void navigateTo({ path: '/moments', query: { focus: String(route.params.slug || '') } }, { replace: true })
})
</script>

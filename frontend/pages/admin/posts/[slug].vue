<template>
  <AdminContentCreator mode="article" :slug="slug" />
</template>

<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
</script>

<template>
  <AdminMomentComposer :slug="slug" />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
</script>

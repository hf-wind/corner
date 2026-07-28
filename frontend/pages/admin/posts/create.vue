<template>
  <AdminAiCreator initial-mode="article" />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })
</script>

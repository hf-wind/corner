<template>
  <AdminMomentComposer />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })
</script>

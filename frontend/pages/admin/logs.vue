<template>
  <div>
    <a-card :bordered="false" class="list-card">
      <a-empty description="日志功能待实现" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })
</script>

<style scoped>
.list-card { border-radius:8px; }
</style>

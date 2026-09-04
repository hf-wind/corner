<template>
  <div class="admin-page-shell logs-page">
    <header class="admin-page-head">
      <div><span>SYSTEM OBSERVABILITY</span><h1>系统日志</h1><p>实时查看后端服务启动与运行输出。</p></div>
    </header>
    <AdminLogTerminal />
  </div>
</template>

<script setup lang="ts">
useHead({ title: "系统日志" })
</script>

<style scoped>
.logs-page { min-height:100%; }
</style>

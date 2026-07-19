<template>
  <div class="layout">
    <LeftSidebar @open-search="showSearch = true" />
    <slot />
    <SearchModal :visible="showSearch" @close="showSearch = false" />
  </div>
</template>

<script setup lang="ts">
const showSearch = ref(false)

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    showSearch.value = true
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
}
</style>

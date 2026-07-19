<template>
  <div class="layout">
    <LeftSidebar />
    <slot />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
}
</style>

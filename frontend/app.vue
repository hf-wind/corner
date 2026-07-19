<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
useHead({
  titleTemplate: (chunk) => {
    return chunk ? `${chunk} - 清欢小筑` : '清欢小筑'
  },
  bodyAttrs: {
    style: 'font-family: \'LXGW WenKai\', serif;'
  }
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <GlobalToast />
    <SidebarMusicPlayer />
  </ClientOnly>
</template>

<script setup lang="ts">
const { init: initTypography } = useTypography()

onMounted(() => {
  initTypography()
})

useHead({
  titleTemplate: (chunk) => {
    return chunk ? `${chunk} - 清欢小筑` : '清欢小筑'
  }
})
</script>

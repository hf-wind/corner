<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <SidebarMusicPlayer />
  </ClientOnly>
</template>

<script setup lang="ts">
const { init } = useTheme()
const { init: initTypography } = useTypography()

onMounted(() => {
  init()
  initTypography()
})

useHead({
  titleTemplate: (chunk) => {
    return chunk ? `${chunk} - 清欢小筑` : '清欢小筑'
  }
})
</script>

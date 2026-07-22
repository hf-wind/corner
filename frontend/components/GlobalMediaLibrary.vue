<template>
  <MediaLibraryModal
    v-model="state.visible"
    :multiple="state.multiple"
    @confirm="onConfirm"
  />
</template>

<script setup lang="ts">
const { state, onConfirm } = useMediaLibrary()
</script>

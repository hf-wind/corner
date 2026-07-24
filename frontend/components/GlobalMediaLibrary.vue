<template>
  <MediaLibraryModal
    v-model="state.visible"
    :multiple="state.multiple"
    :folder="state.folder"
    :compress-animated="state.compressAnimated"
    @confirm="onConfirm"
  />
</template>

<script setup lang="ts">
const { state, onConfirm } = useMediaLibrary()
</script>

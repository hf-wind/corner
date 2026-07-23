<template>
  <MediaLibraryModal
    v-model="state.visible"
    :multiple="state.multiple"
    :folder="state.folder"
    @confirm="onConfirm"
  />
</template>

<script setup lang="ts">
const { state, onConfirm } = useMediaLibrary()
</script>

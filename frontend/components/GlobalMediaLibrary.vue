<template>
  <MediaLibraryModal
    v-model="state.visible"
    :multiple="state.multiple"
    :folder="state.folder"
    :compress-animated="state.compressAnimated"
    :return-items="state.returnItems"
    @confirm="onConfirm"
    @cancel="onCancel"
  />
</template>

<script setup lang="ts">
const { state, onConfirm, onCancel } = useMediaLibrary()
</script>

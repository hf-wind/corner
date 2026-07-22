<template>
  <IconPickerModal v-model="state.visible" :icon="state.icon" @confirm="onConfirm" @cancel="onCancel" />
</template>

<script setup lang="ts">
const { state, onConfirm, onCancel } = useIconPicker()
</script>

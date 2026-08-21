<template>
  <Dropdown
    :model-value="modelValue"
    :options="options"
    :icon="icon"
    :label="label"
    :empty-text="emptyText"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  options: Array<{ value: string; label: string; icon?: string; count?: number }>
  icon?: string
  label?: string
  emptyText?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

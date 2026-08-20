<template>
  <a-button
    class="admin-refresh-button"
    :loading="loading"
    :disabled="disabled"
    :title="label"
    @click="$emit('click')"
  >
    <Icon name="ph:arrows-clockwise-bold" />
    <span>{{ label }}</span>
  </a-button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ loading?: boolean; disabled?: boolean; label?: string }>(), {
  loading: false,
  disabled: false,
  label: '刷新',
})
defineEmits<{ (event: 'click'): void }>()
</script>

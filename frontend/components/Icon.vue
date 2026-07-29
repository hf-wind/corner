<template>
  <IconifyIcon :icon="resolvedName" v-bind="$attrs" aria-hidden="true" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon as IconifyIcon, addIcon } from '@iconify/vue'
import icons from 'virtual:app-icons'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ name: string; weight?: string }>()

for (const [name, data] of Object.entries(icons)) addIcon(name, data)

const resolvedName = computed(() => {
  if (!props.weight || props.name.includes('-fill')) return props.name
  const [prefix, iconName] = props.name.split(':')
  return props.weight === 'fill' && prefix && iconName ? `${prefix}:${iconName}-fill` : props.name
})
</script>

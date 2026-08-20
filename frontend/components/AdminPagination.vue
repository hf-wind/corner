<template>
  <footer class="admin-pagination" :class="{ empty: !total }">
    <span class="admin-pagination-total">共 {{ total.toLocaleString('zh-CN') }} 条</span>
    <a-pagination
      :current="current"
      :page-size="pageSize"
      :total="total"
      :page-size-options="pageSizeOptions"
      :show-size-changer="showSizeChanger"
      :show-less-items="showLessItems"
      :disabled="disabled"
      size="small"
      @change="onChange"
      @show-size-change="onSizeChange"
    />
  </footer>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  current: number
  pageSize: number
  total: number
  pageSizeOptions?: string[]
  showSizeChanger?: boolean
  showLessItems?: boolean
  disabled?: boolean
}>(), {
  pageSizeOptions: () => ['10', '20', '50', '100'],
  showSizeChanger: true,
  showLessItems: true,
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:current', value: number): void
  (event: 'update:pageSize', value: number): void
  (event: 'change', page: number, pageSize: number): void
}>()

function onChange(page: number, pageSize: number) {
  emit('update:current', page)
  emit('change', page, pageSize)
}

function onSizeChange(page: number, pageSize: number) {
  emit('update:pageSize', pageSize)
  emit('update:current', page)
  emit('change', page, pageSize)
}
</script>

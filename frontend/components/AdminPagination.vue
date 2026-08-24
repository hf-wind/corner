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
      :locale="paginationLocale"
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

const paginationLocale = {
  items_per_page: '条/页', jump_to: '跳至', jump_to_confirm: '确定', page: '页',
  prev_page: '上一页', next_page: '下一页', prev_5: '向前 5 页', next_5: '向后 5 页',
  prev_3: '向前 3 页', next_3: '向后 3 页', page_size: '页大小',
}

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

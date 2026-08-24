<template>
  <footer class="admin-pagination">
    <span class="admin-pagination-total">共 {{ safeTotal.toLocaleString('zh-CN') }} 条</span>
    <div class="admin-pagination-pages">
    <a-pagination
      :current="current"
      :page-size="pageSize"
      :total="safeTotal"
      :show-size-changer="false"
      :show-less-items="true"
      :hide-on-single-page="false"
      :disabled="disabled"
      :locale="paginationLocale"
      size="small"
      @change="onChange"
      @show-size-change="onSizeChange"
    />
    </div>
  </footer>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  current: number
  pageSize: number
  total: number
  /** 保留旧调用方参数，后台分页统一由组件内部控制。 */
  pageSizeOptions?: string[]
  showSizeChanger?: boolean
  showLessItems?: boolean
  disabled?: boolean
}>(), {
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

const safeTotal = computed(() => Math.max(0, Number(props.total) || 0))

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

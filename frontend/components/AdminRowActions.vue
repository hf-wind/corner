<template>
  <div class="admin-row-actions">
    <a-button
      v-if="showEdit"
      type="link"
      size="small"
      @click="emit('edit')"
    >
      <Icon name="ph:pencil-simple-bold" /> 编辑
    </a-button>
    <a-button
      v-if="showPublish && record?.needsPublish"
      type="link"
      size="small"
      :loading="publishing"
      @click="emit('publish')"
    >
      <Icon name="ph:paper-plane-tilt-bold" /> 发布
    </a-button>
    <a-button
      v-if="showPreview && canPreview"
      type="link"
      size="small"
      @click="emit('preview')"
    >
      <Icon name="ph:eye-bold" /> 预览
    </a-button>
    <a-button
      v-if="showSettings"
      type="link"
      size="small"
      @click="emit('settings')"
    >
      <Icon name="ph:gear-six-bold" /> 设置
    </a-button>
    <a-button
      v-if="showDelete"
      type="link"
      size="small"
      danger
      @click="emit('delete')"
    >
      <Icon name="ph:trash-bold" /> 删除
    </a-button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    record?: any
    showEdit?: boolean
    showPreview?: boolean
    showPublish?: boolean
    showSettings?: boolean
    showDelete?: boolean
    publishing?: boolean
    previewOnlyPublished?: boolean
  }>(),
  {
    showEdit: true,
    showPreview: true,
    showPublish: true,
    showSettings: true,
    showDelete: true,
    publishing: false,
    previewOnlyPublished: false,
  },
)
const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'preview'): void
  (e: 'publish'): void
  (e: 'settings'): void
  (e: 'delete'): void
}>()

const canPreview = computed(() => {
  if (!props.showPreview) return false
  if (!props.previewOnlyPublished) return true
  return (
    props.record?.publishStatus === 'published' ||
    props.record?.status === 'published'
  )
})
</script>

<style scoped>
.admin-row-actions {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  white-space: nowrap;
}
</style>
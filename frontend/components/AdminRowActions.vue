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
      v-if="showPublish && (record?.needsPublish || (showUnpublish && record?.status === 'unpublished'))"
      type="link"
      size="small"
      :loading="publishing"
      @click="emit('publish')"
    >
      <Icon name="ph:paper-plane-tilt-bold" /> {{ record?.status === 'unpublished' ? '重新发布' : '发布' }}
    </a-button>
    <a-button
      v-if="showUnpublish && record?.status === 'published'"
      type="link"
      size="small"
      danger
      :loading="publishing"
      @click="emit('unpublish')"
    >
      <Icon name="ph:eye-slash-bold" /> 下架
    </a-button>
    <a-button
      v-if="showPreview && canPreview"
      type="link"
      size="small"
      @click="emit('preview')"
    >
      <Icon name="ph:eye-bold" /> 预览
    </a-button>
    <a-dropdown v-if="showSettings && settingsMenu" :trigger="['click']">
      <a-button type="link" size="small"><Icon name="ph:gear-six-bold" /> 设置 <Icon name="ph:caret-down-bold" /></a-button>
      <template #overlay>
        <a-menu @click="onSettingsMenuClick">
          <a-menu-item key="versions"><span class="settings-menu-item"><Icon name="ph:clock-counter-clockwise-bold" /> 版本记录</span></a-menu-item>
          <a-menu-item key="schedule"><span class="settings-menu-item"><Icon name="ph:clock-countdown-bold" /> 定时发布</span></a-menu-item>
          <a-menu-item key="privacy"><span class="settings-menu-item"><Icon name="ph:lock-key-bold" /> {{ record?.status === 'private' ? '恢复公开' : '设置私密' }}</span></a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
    <a-button v-else-if="showSettings" type="link" size="small" @click="emit('settings')"><Icon name="ph:gear-six-bold" /> 设置</a-button>
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
    showUnpublish?: boolean
    showSettings?: boolean
    showDelete?: boolean
    publishing?: boolean
    previewOnlyPublished?: boolean
    settingsMenu?: boolean
  }>(),
  {
    showEdit: true,
    showPreview: true,
    showPublish: true,
    showUnpublish: false,
    showSettings: true,
    showDelete: true,
    publishing: false,
    previewOnlyPublished: false,
    settingsMenu: false,
  },
)
const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'preview'): void
  (e: 'publish'): void
  (e: 'unpublish'): void
  (e: 'settings'): void
  (e: 'delete'): void
  (e: 'schedule'): void
  (e: 'privacy'): void
  (e: 'versions'): void
}>()

function onSettingsMenuClick({ key }: { key: string }) {
  if (key === 'versions') emit('versions')
  if (key === 'schedule') emit('schedule')
  if (key === 'privacy') emit('privacy')
}

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
.settings-menu-item { display:inline-flex; align-items:center; gap:8px; }
</style>

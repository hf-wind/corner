<template>
  <a-modal v-model:open="visible" title="选择图标" width="600px" @ok="handleConfirm" @cancel="handleCancel" destroyOnClose>
    <a-input v-model:value="search" placeholder="搜索图标…" size="small" style="margin-bottom:12px" allow-clear />
    <div class="icon-preview" v-if="selected">
      <Icon :name="selected" style="font-size:24px" />
      <span class="icon-preview-name">{{ selected }}</span>
    </div>
    <div class="icon-grid">
      <div
        v-for="name in filteredIcons" :key="name"
        class="icon-item" :class="{ active: selected === name }"
        @click="selected = name"
      >
        <Icon :name="name" style="font-size:20px" />
      </div>
      <div v-if="!filteredIcons.length" style="grid-column:1/-1;text-align:center;padding:24px;color:var(--c-text-3)">无匹配图标</div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  icon?: string
}>(), { modelValue: false, icon: '' })

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', icon: string): void
  (e: 'cancel'): void
}>()

const visible = ref(props.modelValue)
watch(() => props.modelValue, (v) => { visible.value = v })
watch(() => visible.value, (v) => { if (v) selected.value = props.icon })

const search = ref('')
const selected = ref(props.icon || '')

const icons = [
  'ph:folder-open-bold', 'ph:folder-simple-bold', 'ph:book-open-text-bold', 'ph:books-bold',
  'ph:code-bold', 'ph:file-text-bold', 'ph:article-bold', 'ph:terminal-window-bold',
  'ph:image-bold', 'ph:camera-bold', 'ph:video-camera-bold', 'ph:film-strip-bold',
  'ph:music-notes-bold', 'ph:headphones-bold', 'ph:microphone-stage-bold',
  'ph:star-bold', 'ph:heart-bold', 'ph:tag-bold', 'ph:tags-bold',
  'ph:lightbulb-filament-bold', 'ph:rocket-launch-bold', 'ph:fire-bold', 'ph:sparkle-bold',
  'ph:smiley-bold', 'ph:map-pin-bold', 'ph:globe-hemisphere-west-bold', 'ph:compass-bold',
  'ph:coffee-bold', 'ph:bicycle-bold', 'ph:mountains-bold', 'ph:cloud-sun-bold',
  'ph:flask-bold', 'ph:atom-bold', 'ph:brain-bold', 'ph:robot-bold',
  'ph:house-bold', 'ph:briefcase-bold', 'ph:wrench-bold', 'ph:palette-bold',
  'ph:game-controller-bold', 'ph:plant-bold', 'ph:fork-knife-bold', 'ph:airplane-tilt-bold',
  'ph:chat-circle-text-bold', 'ph:users-three-bold', 'ph:graduation-cap-bold', 'ph:bookmark-simple-bold',
]

const filteredIcons = computed(() => {
  if (!search.value) return icons
  const q = search.value.toLowerCase()
  return icons.filter((n) => n.toLowerCase().includes(q))
})

function handleConfirm() {
  emit('confirm', selected.value)
  visible.value = false
}

function handleCancel() {
  emit('update:modelValue', false)
  emit('cancel')
}
</script>

<style scoped>
.icon-preview { display:flex; align-items:center; gap:10px; padding:8px 12px; margin-bottom:12px; border:1px solid var(--border); border-radius:6px; background:var(--c-primary-soft); }
.icon-preview-name { font-size:0.85rem; color:var(--c-text); }
.icon-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(48px,1fr)); gap:8px; max-height:360px; overflow-y:auto; }
.icon-item { display:flex; align-items:center; justify-content:center; width:48px; height:48px; border-radius:8px; cursor:pointer; border:2px solid transparent; transition:all 0.15s; color:var(--c-text); }
.icon-item:hover { border-color:var(--c-primary); background:var(--c-primary-soft); }
.icon-item.active { border-color:var(--c-primary); background:var(--c-primary-soft); }
</style>

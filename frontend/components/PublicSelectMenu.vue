<template>
  <div ref="rootEl" class="public-select" :class="{ open, active: modelValue }">
    <button type="button" class="select-trigger" :aria-label="label" aria-haspopup="listbox" :aria-expanded="open" @click="open = !open">
      <Icon :name="icon" /><span>{{ selectedLabel }}</span><Icon name="ph:caret-down-bold" class="select-caret" />
    </button>
    <Transition name="select-pop">
      <div v-if="open" class="select-menu" role="listbox">
        <button v-for="option in options" :key="option.value" type="button" role="option" :aria-selected="modelValue === option.value" :class="{ selected: modelValue === option.value }" @click="choose(option.value)">
          <span><Icon :name="option.icon || icon" />{{ option.label }}</span><em v-if="option.count !== undefined">{{ option.count }}</em><Icon v-else-if="modelValue === option.value" name="ph:check-bold" class="option-check" />
        </button>
        <p v-if="!options.length">{{ emptyText }}</p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  options: Array<{ value: string; label: string; icon?: string; count?: number }>
  icon?: string
  label?: string
  emptyText?: string
}>(), {
  icon: 'ph:funnel-bold',
  label: '筛选',
  emptyText: '暂无可选项',
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const rootEl = ref<HTMLElement | null>(null)
const open = ref(false)
const selectedLabel = computed(() => props.options.find(option => option.value === props.modelValue)?.label || props.options[0]?.label || props.label)

function choose(value: string) { open.value = false; emit('update:modelValue', value) }
function closeOnOutside(event: PointerEvent) { if (!rootEl.value?.contains(event.target as Node)) open.value = false }
function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') open.value = false }
onMounted(() => { document.addEventListener('pointerdown', closeOnOutside); document.addEventListener('keydown', closeOnEscape) })
onUnmounted(() => { document.removeEventListener('pointerdown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape) })
</script>

<style scoped>
.public-select { position:relative; width:var(--public-select-width,132px); }
.select-trigger { display:flex; width:100%; height:34px; box-sizing:border-box; align-items:center; gap:7px; padding:0 9px; border:1px solid color-mix(in srgb,var(--border) 82%,transparent); border-radius:9px; background:color-mix(in srgb,var(--ld-bg-card) 96%,transparent); box-shadow:0 4px 14px color-mix(in srgb,var(--ld-shadow) 22%,transparent); color:var(--c-text-2); cursor:pointer; font:inherit; font-size:.62rem; transition:border-color .2s,background .2s,box-shadow .2s; }
.select-trigger>span { min-width:0; flex:1; overflow:hidden; text-align:left; text-overflow:ellipsis; white-space:nowrap; }
.select-trigger :deep(svg:first-child) { color:var(--c-primary); }.select-caret { transition:transform .22s ease; }.open .select-caret { transform:rotate(180deg); }
.active .select-trigger,.open .select-trigger { border-color:color-mix(in srgb,var(--c-primary) 42%,var(--border)); background:var(--c-primary-soft); color:var(--c-primary); box-shadow:0 0 0 3px color-mix(in srgb,var(--c-primary-soft) 58%,transparent); }
.select-menu { position:absolute; z-index:45; top:40px; right:0; width:max(100%,178px); max-height:280px; box-sizing:border-box; padding:7px; overflow-y:auto; border:1px solid color-mix(in srgb,var(--border) 82%,transparent); border-radius:11px; background:color-mix(in srgb,var(--ld-bg-card) 96%,transparent); box-shadow:0 16px 36px color-mix(in srgb,var(--ld-shadow) 58%,transparent); backdrop-filter:blur(18px); transform-origin:top right; }
.select-menu button { display:flex; width:100%; min-height:34px; align-items:center; justify-content:space-between; gap:8px; padding:7px 8px; border:0; border-radius:7px; background:transparent; color:var(--c-text-2); cursor:pointer; font:inherit; transition:background .15s,color .15s; }
.select-menu button:hover,.select-menu button.selected { background:var(--c-primary-soft); color:var(--c-primary); }
.select-menu button>span { display:flex; min-width:0; align-items:center; gap:6px; overflow:hidden; font-size:.62rem; text-overflow:ellipsis; white-space:nowrap; }
.select-menu em { min-width:22px; padding:2px 5px; border-radius:999px; background:var(--c-bg-2); color:var(--c-text-3); font-size:.5rem; font-style:normal; text-align:center; }.option-check { font-size:.7rem; }
.select-menu p { margin:3px; padding:9px 4px; color:var(--c-text-3); font-size:.56rem; line-height:1.6; text-align:center; }
.select-pop-enter-active,.select-pop-leave-active { transition:opacity .18s ease,transform .24s var(--ui-ease-out); }.select-pop-enter-from,.select-pop-leave-to { opacity:0; transform:translateY(-5px) scale(.98); }
@media (prefers-reduced-motion:reduce) { .select-pop-enter-active,.select-pop-leave-active,.select-caret { transition:none; } }
</style>

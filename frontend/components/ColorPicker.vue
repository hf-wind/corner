<template>
  <div class="color-picker">
    <div class="color-grid">
      <div
        v-for="c in colors" :key="c"
        class="color-swatch"
        :class="{ active: props.modelValue === c }"
        :style="{ background: c }"
        @click="emit('update:modelValue', c)"
      >
        <svg v-if="props.modelValue === c" class="check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div class="color-swatch transparent-swatch" :class="{ active: !props.modelValue }" @click="emit('update:modelValue', '')" />
    </div>
    <div class="custom-row">
      <span class="custom-preview" :style="{ background: validHex(props.modelValue) ? props.modelValue : 'transparent', borderColor: props.modelValue ? 'transparent' : 'var(--border)' }" />
      <input v-model="hexInput" class="custom-input" placeholder="#rrggbb" maxlength="7" @input="onHexInput" @blur="onHexBlur" />
      <span class="custom-hint">回车确认</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const hexInput = ref(props.modelValue || '')

watch(() => props.modelValue, (v) => { hexInput.value = v || '' })

const colors = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#eab308', '#f59e0b', '#f97316', '#ef4444', '#ec4899',
  '#a855f7', '#8b5cf6', '#64748b', '#78716c', '#000000',
]

function validHex(s: string) { return /^#[0-9a-f]{6}$/i.test(s) }

function onHexInput() {
  let v = hexInput.value.trim()
  if (v.length === 7 && validHex(v)) {
    emit('update:modelValue', v)
  }
}

function onHexBlur() {
  let v = hexInput.value.trim()
  if (v.length === 7 && validHex(v)) {
    emit('update:modelValue', v)
  } else if (v && !validHex(v)) {
    hexInput.value = props.modelValue || ''
  }
}
</script>

<style scoped>
.color-picker { display:flex; flex-direction:column; gap:10px; }
.color-grid { display:flex; flex-wrap:wrap; gap:8px; }
.color-swatch { width:30px; height:30px; border-radius:8px; cursor:pointer; border:2px solid transparent; transition:all 0.15s; flex-shrink:0; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
.color-swatch:hover { transform:scale(1.12); box-shadow:0 2px 8px rgba(0,0,0,0.15); }
.color-swatch.active { border-color:#fff; box-shadow:0 0 0 2px #fff, 0 0 0 4px rgba(128,128,128,0.35), 0 2px 8px rgba(0,0,0,0.12); transform:scale(1.1); }
.check { width:14px; height:14px; filter:drop-shadow(0 1px 1px rgba(0,0,0,0.3)); }
.transparent-swatch { background:linear-gradient(135deg,#fff 48%,#e8e8e8 48%,#e8e8e8 52%,#fff 52%); border:2px dashed var(--border); }
.transparent-swatch.active { border-color:var(--border); box-shadow:0 0 0 2px var(--c-bg), 0 0 0 4px rgba(128,128,128,0.3); }
.custom-row { display:flex; align-items:center; gap:8px; }
.custom-preview { width:24px; height:24px; border-radius:6px; flex-shrink:0; border:1px solid; }
.custom-input { flex:1; height:28px; border:1px solid var(--border); border-radius:6px; padding:0 8px; font-size:0.8rem; font-family:var(--font-mono); outline:none; background:var(--c-bg); color:var(--c-text); min-width:0; }
.custom-input:focus { border-color:var(--c-primary); }
.custom-hint { font-size:0.7rem; color:var(--c-text-4); white-space:nowrap; }
</style>

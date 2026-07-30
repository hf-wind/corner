<template>
  <section class="location-editor">
    <header><span><Icon name="ph:map-trifold-bold" />时间与地点</span><small>可选</small></header>
    <label>
      <span>发生时间</span>
      <input :value="happenedAt" type="datetime-local" @input="emit('update:happenedAt', ($event.target as HTMLInputElement).value)">
    </label>
    <label><span>发生地点</span><PlacePicker :model-value="place" @update:model-value="emit('update:place', $event)" @select="emit('source', $event.source)" /></label>
    <div v-if="place" class="privacy-grid">
      <label>
        <span>公开策略</span>
        <select :value="visibility" @change="changeVisibility(($event.target as HTMLSelectElement).value)">
          <option value="private">私密，不展示地点</option>
          <option value="blurred">模糊公开</option>
          <option value="public">精确公开</option>
        </select>
      </label>
      <label>
        <span>公开精度</span>
        <select :value="precision" :disabled="visibility === 'private'" @change="changePrecision">
          <option v-if="visibility === 'public'" value="exact">精确坐标</option>
          <template v-else>
            <option value="place">地点级</option>
            <option value="city">城市级</option>
            <option value="province">省份级</option>
          </template>
        </select>
      </label>
    </div>
    <p v-if="place && visibility === 'private'" class="privacy-note"><Icon name="ph:lock-key-bold" />前台不会返回地点名称、标识或坐标</p>
    <p v-else-if="place && visibility === 'blurred'" class="privacy-note"><Icon name="ph:shield-check-bold" />坐标将在服务端按所选精度脱敏</p>
    <p v-else-if="place" class="privacy-note exact"><Icon name="ph:warning-bold" />保存前将再次确认精确公开</p>
  </section>
</template>

<script setup lang="ts">
import type { Place } from '~/types/place'

const props = defineProps<{
  happenedAt: string
  place: Place | null
  visibility: 'public' | 'blurred' | 'private'
  precision: 'exact' | 'place' | 'city' | 'province'
}>()
const emit = defineEmits<{
  'update:happenedAt': [value: string]
  'update:place': [value: Place | null]
  'update:visibility': [value: 'public' | 'blurred' | 'private']
  'update:precision': [value: 'exact' | 'place' | 'city' | 'province']
  source: [value: 'manual' | 'map']
}>()

function changeVisibility(raw: string) {
  const visibility = raw as 'public' | 'blurred' | 'private'
  emit('update:visibility', visibility)
  if (visibility === 'public') emit('update:precision', 'exact')
  else if (props.precision === 'exact') emit('update:precision', 'place')
}

function changePrecision(event: Event) {
  emit('update:precision', (event.target as HTMLSelectElement).value as 'exact' | 'place' | 'city' | 'province')
}
</script>

<style scoped>
.location-editor { display:grid; gap:12px; padding-top:2px; }
.location-editor header { display:flex; align-items:center; justify-content:space-between; gap:10px; padding-bottom:9px; border-bottom:1px solid var(--border); }.location-editor header span { display:flex; align-items:center; gap:6px; color:var(--c-text-2); font-size:.75rem; font-weight:650; }.location-editor header small { color:var(--c-text-3); font-size:.58rem; }
.location-editor label { display:grid; gap:6px; color:var(--c-text-3); font-size:.68rem; }.location-editor input,.location-editor select { width:100%; height:34px; padding:0 9px; border:1px solid var(--border); border-radius:6px; outline:0; background:var(--c-bg); color:var(--c-text); font:inherit; font-size:.7rem; }.location-editor input:focus,.location-editor select:focus { border-color:var(--c-primary); box-shadow:0 0 0 3px var(--c-primary-soft); }.location-editor select:disabled { cursor:not-allowed; opacity:.58; }
.privacy-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; }.privacy-note { display:flex; align-items:flex-start; gap:5px; margin:0; color:var(--c-text-3); font-size:.58rem; line-height:1.55; }.privacy-note :deep(svg) { flex:0 0 auto; margin-top:2px; color:var(--c-primary); }.privacy-note.exact,.privacy-note.exact :deep(svg) { color:#b66b20; }
@media (max-width:520px) { .privacy-grid { grid-template-columns:1fr; } }
</style>

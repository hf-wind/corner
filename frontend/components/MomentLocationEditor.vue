<template>
  <section class="spacetime-editor" :class="{ open }">
    <button class="stamp-head" type="button" :aria-expanded="open" @click="open = !open">
      <span class="stamp-icon"><Icon name="ph:planet-bold" /></span>
      <span class="stamp-copy">
        <strong>时空印记</strong>
        <small>{{ summary }}</small>
      </span>
      <span class="stamp-state" :class="{ active: !!place || !!happenedAt }">{{ place || happenedAt ? '已记录' : '可选' }}</span>
      <Icon name="ph:caret-down-bold" class="stamp-caret" />
    </button>

    <Transition name="stamp-expand">
      <div v-if="open" class="stamp-body">
        <p class="stamp-intro">{{ context }}</p>
        <label class="field-label">
          <span>{{ dateLabel }}</span>
          <input :value="happenedAt" :type="dateType" @input="emit('update:happenedAt', ($event.target as HTMLInputElement).value)">
        </label>
        <label class="field-label"><span>关联地点</span><PlacePicker :model-value="place" @update:model-value="emit('update:place', $event)" @select="emit('source', $event.source)" /></label>

        <div v-if="place" class="privacy-grid">
          <label class="field-label">
            <span>前台可见范围</span>
            <a-select :value="visibility" :options="visibilityOptions" @change="changeVisibility" />
          </label>
          <label class="field-label">
            <span>位置精度</span>
            <a-select :value="precision" :disabled="visibility === 'private'" :options="precisionOptions" @change="changePrecision" />
          </label>
        </div>

        <div v-if="place" class="privacy-note" :class="visibility">
          <Icon :name="privacyIcon" />
          <span>{{ privacyText }}</span>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import type { Place } from '~/types/place'

const props = withDefaults(defineProps<{
  happenedAt: string
  place: Place | null
  visibility: 'public' | 'blurred' | 'private'
  precision: 'exact' | 'place' | 'city' | 'province'
  dateLabel?: string
  context?: string
  defaultOpen?: boolean
  dateType?: 'datetime-local' | 'month'
}>(), {
  dateLabel: '发生时间',
  context: '时间和地点会自动进入时光星图；不填写也不会影响内容发布。',
  defaultOpen: false,
  dateType: 'datetime-local',
})

const emit = defineEmits<{
  'update:happenedAt': [value: string]
  'update:place': [value: Place | null]
  'update:visibility': [value: 'public' | 'blurred' | 'private']
  'update:precision': [value: 'exact' | 'place' | 'city' | 'province']
  source: [value: 'manual' | 'map']
}>()

const open = ref(props.defaultOpen || !!props.place || !!props.happenedAt)
const visibilityOptions = [
  { value: 'private', label: '仅自己可见' },
  { value: 'blurred', label: '模糊公开' },
  { value: 'public', label: '精确公开' },
]
const precisionOptions = computed(() => props.visibility === 'public'
  ? [{ value: 'exact', label: '精确坐标' }]
  : [
      { value: 'place', label: '地点级' },
      { value: 'city', label: '城市级' },
      { value: 'province', label: '省份级' },
    ])

const summary = computed(() => {
  const time = props.happenedAt ? new Date(props.happenedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
  return [time, props.place?.name].filter(Boolean).join(' · ') || '让内容自然落入时间与地点'
})
const privacyIcon = computed(() => props.visibility === 'private' ? 'ph:lock-key-bold' : props.visibility === 'blurred' ? 'ph:shield-check-bold' : 'ph:warning-bold')
const privacyText = computed(() => props.visibility === 'private'
  ? '前台和公开接口不会返回地点名称、标识或坐标。'
  : props.visibility === 'blurred'
    ? '坐标会在服务端按所选精度脱敏后展示。'
    : '精确坐标会公开展示，保存时需要再次确认。')

function changeVisibility(raw: string) {
  const visibility = raw as 'public' | 'blurred' | 'private'
  emit('update:visibility', visibility)
  if (visibility === 'public') emit('update:precision', 'exact')
  else if (props.precision === 'exact') emit('update:precision', 'place')
}

function changePrecision(raw: string) {
  emit('update:precision', raw as 'exact' | 'place' | 'city' | 'province')
}
</script>

<style scoped>
.spacetime-editor { overflow:hidden; border:1px solid color-mix(in srgb,var(--border) 78%,transparent); border-radius:8px; background:linear-gradient(145deg,color-mix(in srgb,var(--c-primary) 4%,var(--ld-bg-card)),var(--ld-bg-card)); transition:border-color .25s ease,box-shadow .25s ease; }
.spacetime-editor.open { border-color:color-mix(in srgb,var(--c-primary) 25%,var(--border)); box-shadow:0 10px 28px color-mix(in srgb,var(--ld-shadow) 32%,transparent); }
.stamp-head { display:grid; width:100%; min-height:62px; grid-template-columns:36px minmax(0,1fr) auto 18px; align-items:center; gap:10px; padding:10px 12px; border:0; background:transparent; color:var(--c-text); cursor:pointer; text-align:left; font:inherit; }
.stamp-icon { display:grid; width:36px; height:36px; border-radius:8px; background:var(--c-primary-soft); color:var(--c-primary); font-size:1.05rem; place-items:center; }
.stamp-copy { display:flex; min-width:0; flex-direction:column; gap:3px; }.stamp-copy strong { font-size:.75rem; }.stamp-copy small { overflow:hidden; color:var(--c-text-3); font-size:.59rem; text-overflow:ellipsis; white-space:nowrap; }
.stamp-state { padding:3px 6px; border-radius:4px; background:var(--c-bg-2); color:var(--c-text-3); font-size:.55rem; }.stamp-state.active { background:var(--c-primary-soft); color:var(--c-primary); }
.stamp-caret { color:var(--c-text-3); transition:transform .25s ease; }.open .stamp-caret { transform:rotate(180deg); }
.stamp-body { display:grid; gap:13px; padding:2px 12px 14px; border-top:1px solid color-mix(in srgb,var(--border) 68%,transparent); }
.stamp-intro { margin:11px 0 -2px; color:var(--c-text-3); font-size:.61rem; line-height:1.65; }
.field-label { display:grid; gap:6px; color:var(--c-text-3); font-size:.65rem; }.field-label>input { width:100%; height:34px; padding:0 10px; border:1px solid var(--border); border-radius:6px; outline:0; background:var(--ld-bg-card); color:var(--c-text); font:inherit; font-size:.7rem; }.field-label>input:focus { border-color:var(--c-primary); box-shadow:0 0 0 3px var(--c-primary-soft); }
.privacy-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; }.privacy-grid :deep(.ant-select) { width:100%; }
.privacy-note { display:flex; align-items:flex-start; gap:7px; padding:9px 10px; border-radius:7px; background:var(--c-bg-2); color:var(--c-text-3); font-size:.59rem; line-height:1.55; }.privacy-note :deep(svg) { flex:0 0 auto; margin-top:2px; color:var(--c-primary); }.privacy-note.public,.privacy-note.public :deep(svg) { color:#b66b20; }
.stamp-expand-enter-active,.stamp-expand-leave-active { transition:opacity .2s ease,transform .25s cubic-bezier(.16,1,.3,1); transform-origin:top; }.stamp-expand-enter-from,.stamp-expand-leave-to { opacity:0; transform:translateY(-7px); }
@media(max-width:520px){.privacy-grid{grid-template-columns:1fr}.stamp-state{display:none}}
@media(prefers-reduced-motion:reduce){.stamp-caret,.stamp-expand-enter-active,.stamp-expand-leave-active{transition:none}}
</style>

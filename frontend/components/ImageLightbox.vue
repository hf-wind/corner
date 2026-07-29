<template>
  <Teleport to="body">
    <Transition name="lightbox-fade">
      <div
        v-if="modelValue"
        ref="dialogRef"
        class="image-lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="dialogLabel"
        tabindex="-1"
        @click.self="closeFromBackdrop"
      >
        <header class="lightbox-toolbar" @click.stop>
          <span class="lightbox-count">{{ safeIndex + 1 }} / {{ normalizedImages.length }}</span>
          <div class="lightbox-tools">
            <button type="button" title="缩小" aria-label="缩小图片" :disabled="scale <= minScale" @click="zoomBy(-0.25)"><Icon name="ph:magnifying-glass-minus-bold" /></button>
            <span>{{ Math.round(scale * 100) }}%</span>
            <button type="button" title="放大" aria-label="放大图片" :disabled="scale >= maxScale" @click="zoomBy(0.25)"><Icon name="ph:magnifying-glass-plus-bold" /></button>
            <button type="button" title="向左旋转" aria-label="向左旋转图片" @click="rotate(-90)"><Icon name="ph:arrow-counter-clockwise-bold" /></button>
            <button type="button" title="重置" aria-label="重置图片" @click="resetTransform"><Icon name="ph:arrows-in-simple-bold" /></button>
            <slot name="toolbar" :image="activeImage" :index="safeIndex" />
            <button ref="closeRef" type="button" class="lightbox-close" title="关闭" aria-label="关闭图片预览" @click="close"><Icon name="ph:x-bold" /></button>
          </div>
        </header>

        <button v-if="canNavigate" type="button" class="lightbox-nav lightbox-prev" title="上一张" aria-label="上一张图片" @click.stop="previous"><Icon name="ph:caret-left-bold" /></button>
        <button v-if="canNavigate" type="button" class="lightbox-nav lightbox-next" title="下一张" aria-label="下一张图片" @click.stop="next"><Icon name="ph:caret-right-bold" /></button>

        <div
          class="lightbox-stage"
          :class="{ panning: scale > 1, loading, failed }"
          @click.self="closeFromBackdrop"
          @dblclick.stop="toggleZoom"
          @wheel.prevent="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <div class="lightbox-canvas" :style="canvasStyle">
            <img
              v-if="activeImage"
              :key="activeImage.src"
              :src="activeImage.src"
              :alt="activeImage.alt"
              draggable="false"
              @load="onImageLoad"
              @error="onImageError"
            >
          </div>
          <div v-if="loading" class="lightbox-state"><Icon name="ph:spinner-gap-bold" class="spinning" /><span>正在加载</span></div>
          <div v-else-if="failed" class="lightbox-state"><Icon name="ph:image-broken-bold" /><span>图片加载失败</span></div>
        </div>

        <footer v-if="activeImage?.caption" class="lightbox-caption" @click.stop>
          <slot name="caption" :image="activeImage" :index="safeIndex">{{ activeImage.caption }}</slot>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
export type ImagePreviewItem = {
  src: string
  alt?: string
  caption?: string
  id?: string | number
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  images: Array<string | ImagePreviewItem>
  index?: number
  loop?: boolean
  minScale?: number
  maxScale?: number
  closeOnBackdrop?: boolean
  label?: string
}>(), {
  index: 0,
  loop: true,
  minScale: 0.5,
  maxScale: 4,
  closeOnBackdrop: true,
  label: '图片预览',
})

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  'update:index': [index: number]
  change: [index: number]
  close: []
}>()

const { mediaUrl } = useMediaUrl()
const dialogRef = ref<HTMLElement | null>(null)
const closeRef = ref<HTMLButtonElement | null>(null)
const scale = ref(1)
const rotation = ref(0)
const translateX = ref(0)
const translateY = ref(0)
const loading = ref(true)
const failed = ref(false)
const pointers = new Map<number, { x: number; y: number }>()
let gestureStart = { x: 0, y: 0, translateX: 0, translateY: 0 }
let pinchStartDistance = 0
let pinchStartScale = 1

const normalizedImages = computed<ImagePreviewItem[]>(() => props.images
  .map((item, index) => typeof item === 'string'
    ? { src: mediaUrl(item), alt: `${props.label} ${index + 1}` }
    : { ...item, src: mediaUrl(item.src), alt: item.alt || `${props.label} ${index + 1}` })
  .filter(item => Boolean(item.src)))

const safeIndex = computed(() => Math.min(Math.max(0, props.index), Math.max(0, normalizedImages.value.length - 1)))
const activeImage = computed(() => normalizedImages.value[safeIndex.value])
const canNavigate = computed(() => normalizedImages.value.length > 1)
const dialogLabel = computed(() => `${props.label}，第 ${safeIndex.value + 1} 张，共 ${normalizedImages.value.length} 张`)
const canvasStyle = computed(() => ({
  transform: `translate3d(${translateX.value}px, ${translateY.value}px, 0) scale(${scale.value}) rotate(${rotation.value}deg)`,
}))

watch(() => props.modelValue, (open) => {
  if (!import.meta.client) return
  document.body.classList.toggle('image-lightbox-open', open)
  if (open) {
    resetTransform()
    nextTick(() => (closeRef.value || dialogRef.value)?.focus())
  }
})

watch(activeImage, () => {
  loading.value = true
  failed.value = false
  resetTransform()
})

function clampScale(value: number) {
  return Math.min(props.maxScale, Math.max(props.minScale, value))
}

function zoomBy(delta: number) {
  scale.value = clampScale(Number((scale.value + delta).toFixed(2)))
  if (scale.value <= 1) {
    translateX.value = 0
    translateY.value = 0
  }
}

function toggleZoom() {
  scale.value = scale.value > 1 ? 1 : Math.min(2, props.maxScale)
  if (scale.value === 1) {
    translateX.value = 0
    translateY.value = 0
  }
}

function rotate(degrees: number) {
  rotation.value = (rotation.value + degrees) % 360
}

function resetTransform() {
  scale.value = 1
  rotation.value = 0
  translateX.value = 0
  translateY.value = 0
  pointers.clear()
}

function select(index: number) {
  const count = normalizedImages.value.length
  if (!count) return
  const nextIndex = props.loop ? (index + count) % count : Math.min(count - 1, Math.max(0, index))
  emit('update:index', nextIndex)
  emit('change', nextIndex)
}

function previous() { select(safeIndex.value - 1) }
function next() { select(safeIndex.value + 1) }

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function closeFromBackdrop() {
  if (props.closeOnBackdrop) close()
}

function onWheel(event: WheelEvent) {
  zoomBy(event.deltaY < 0 ? 0.2 : -0.2)
}

function pointerDistance() {
  const [first, second] = Array.from(pointers.values())
  return first && second ? Math.hypot(second.x - first.x, second.y - first.y) : 0
}

function onPointerDown(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture?.(event.pointerId)
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pointers.size === 1) {
    gestureStart = { x: event.clientX, y: event.clientY, translateX: translateX.value, translateY: translateY.value }
  } else if (pointers.size === 2) {
    pinchStartDistance = pointerDistance()
    pinchStartScale = scale.value
  }
}

function onPointerMove(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pointers.size === 2 && pinchStartDistance > 0) {
    scale.value = clampScale(pinchStartScale * (pointerDistance() / pinchStartDistance))
    return
  }
  if (pointers.size === 1 && scale.value > 1) {
    translateX.value = gestureStart.translateX + event.clientX - gestureStart.x
    translateY.value = gestureStart.translateY + event.clientY - gestureStart.y
  }
}

function onPointerUp(event: PointerEvent) {
  const startX = gestureStart.x
  const deltaX = event.clientX - startX
  pointers.delete(event.pointerId)
  if (!pointers.size && scale.value <= 1 && Math.abs(deltaX) > 56) {
    deltaX > 0 ? previous() : next()
  }
}

function onImageLoad() {
  loading.value = false
  failed.value = false
}

function onImageError() {
  loading.value = false
  failed.value = true
}

function onKeydown(event: KeyboardEvent) {
  if (!props.modelValue) return
  if (event.key === 'Escape') close()
  else if (event.key === 'ArrowLeft' && canNavigate.value) previous()
  else if (event.key === 'ArrowRight' && canNavigate.value) next()
  else if (event.key === '+' || event.key === '=') zoomBy(0.25)
  else if (event.key === '-') zoomBy(-0.25)
  else if (event.key === '0') resetTransform()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (props.modelValue) document.body.classList.remove('image-lightbox-open')
})
</script>

<style scoped>
.image-lightbox { position:fixed; z-index:3000; inset:0; display:grid; grid-template-rows:52px minmax(0,1fr) auto; overflow:hidden; background:rgb(7 9 13 / 94%); color:#fff; backdrop-filter:blur(10px); touch-action:none; }
.lightbox-toolbar { z-index:3; display:flex; min-width:0; align-items:center; justify-content:space-between; gap:12px; padding:8px 12px 4px 16px; }
.lightbox-count { color:rgb(255 255 255 / 68%); font-size:.72rem; font-variant-numeric:tabular-nums; }
.lightbox-tools { display:flex; height:38px; align-items:center; gap:2px; padding:3px; border:1px solid rgb(255 255 255 / 13%); border-radius:8px; background:rgb(255 255 255 / 7%); }
.lightbox-tools > span { width:42px; color:rgb(255 255 255 / 66%); font-size:.65rem; text-align:center; font-variant-numeric:tabular-nums; }
.lightbox-tools button,.lightbox-nav { display:grid; place-items:center; border:0; background:transparent; color:#fff; cursor:pointer; }
.lightbox-tools button { width:31px; height:31px; border-radius:6px; font-size:.95rem; }
.lightbox-tools button:hover,.lightbox-tools button:focus-visible { background:rgb(255 255 255 / 13%); outline:0; }
.lightbox-tools button:disabled { cursor:not-allowed; opacity:.32; }
.lightbox-tools .lightbox-close { margin-left:3px; background:rgb(255 255 255 / 10%); }
.lightbox-stage { position:relative; display:grid; min-width:0; min-height:0; place-items:center; overflow:hidden; cursor:zoom-in; }
.lightbox-stage.panning { cursor:grab; }.lightbox-stage.panning:active { cursor:grabbing; }
.lightbox-canvas { display:grid; max-width:calc(100vw - 132px); max-height:calc(100dvh - 116px); place-items:center; transform-origin:center; transition:transform .16s ease; will-change:transform; }
.lightbox-canvas img { display:block; max-width:100%; max-height:calc(100dvh - 116px); border-radius:6px; box-shadow:0 24px 80px rgb(0 0 0 / 55%); object-fit:contain; user-select:none; }
.lightbox-stage.panning .lightbox-canvas { transition:none; }
.lightbox-nav { position:absolute; z-index:3; top:50%; width:42px; height:52px; border:1px solid rgb(255 255 255 / 13%); border-radius:8px; background:rgb(255 255 255 / 7%); font-size:1.2rem; transform:translateY(-50%); }
.lightbox-nav:hover,.lightbox-nav:focus-visible { background:rgb(255 255 255 / 15%); outline:0; }
.lightbox-prev { left:14px; }.lightbox-next { right:14px; }
.lightbox-state { position:absolute; display:flex; align-items:center; gap:8px; color:rgb(255 255 255 / 64%); font-size:.72rem; pointer-events:none; }
.lightbox-caption { z-index:2; max-width:min(720px,calc(100vw - 32px)); justify-self:center; padding:7px 14px calc(12px + env(safe-area-inset-bottom)); color:rgb(255 255 255 / 72%); font-size:.72rem; line-height:1.5; text-align:center; }
.lightbox-fade-enter-active,.lightbox-fade-leave-active { transition:opacity .18s ease; }.lightbox-fade-enter-from,.lightbox-fade-leave-to { opacity:0; }
.spinning { animation:lightbox-spin .8s linear infinite; }@keyframes lightbox-spin { to { transform:rotate(360deg); } }
@media (max-width:640px) {
  .image-lightbox { grid-template-rows:48px minmax(0,1fr) auto; }
  .lightbox-toolbar { padding:6px 7px 3px 12px; }
  .lightbox-tools { gap:0; border:0; background:transparent; }
  .lightbox-tools > span,.lightbox-tools button[title="向左旋转"] { display:none; }
  .lightbox-tools button { width:34px; height:34px; }
  .lightbox-canvas { max-width:100vw; max-height:calc(100dvh - 96px); }
  .lightbox-canvas img { max-width:100vw; max-height:calc(100dvh - 96px); border-radius:0; }
  .lightbox-nav { top:auto; bottom:calc(14px + env(safe-area-inset-bottom)); width:38px; height:38px; border-radius:50%; transform:none; }
  .lightbox-prev { left:12px; }.lightbox-next { right:12px; }
  .lightbox-caption { padding-bottom:calc(58px + env(safe-area-inset-bottom)); }
}
@media (prefers-reduced-motion:reduce) { .lightbox-canvas,.lightbox-fade-enter-active,.lightbox-fade-leave-active { transition:none; } }
</style>

<style>
body.image-lightbox-open { overflow:hidden; }
</style>

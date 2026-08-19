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
          <span class="lightbox-count">
            <strong>{{ paddedIndex }}</strong
            ><i>/</i>{{ paddedTotal }}
          </span>
          <div class="lightbox-tools">
            <button
              type="button"
              title="缩小"
              aria-label="缩小图片"
              :disabled="scale <= minScale"
              @click="zoomBy(-0.25)"
            >
              <Icon name="ph:magnifying-glass-minus-bold" />
            </button>
            <span>{{ Math.round(scale * 100) }}%</span>
            <button
              type="button"
              title="放大"
              aria-label="放大图片"
              :disabled="scale >= maxScale"
              @click="zoomBy(0.25)"
            >
              <Icon name="ph:magnifying-glass-plus-bold" />
            </button>
            <button
              type="button"
              title="向左旋转"
              aria-label="向左旋转图片"
              @click="rotate(-90)"
            >
              <Icon name="ph:arrow-counter-clockwise-bold" />
            </button>
            <button
              type="button"
              title="重置"
              aria-label="重置图片"
              @click="resetTransform"
            >
              <Icon name="ph:arrows-in-simple-bold" />
            </button>
            <slot name="toolbar" :image="activeImage" :index="safeIndex" />
            <button
              ref="closeRef"
              type="button"
              class="lightbox-close"
              title="关闭"
              aria-label="关闭图片预览"
              @click="close"
            >
              <Icon name="ph:x-bold" />
            </button>
          </div>
        </header>

        <button
          v-if="canNavigate"
          type="button"
          class="lightbox-nav lightbox-prev"
          title="上一张"
          aria-label="上一张图片"
          @click.stop="previous"
        >
          <Icon name="ph:caret-left-bold" />
        </button>
        <button
          v-if="canNavigate"
          type="button"
          class="lightbox-nav lightbox-next"
          title="下一张"
          aria-label="下一张图片"
          @click.stop="next"
        >
          <Icon name="ph:caret-right-bold" />
        </button>

        <div
          class="lightbox-stage"
          :class="{ panning: scale > 1, dragging, loading, failed }"
          @click.self="closeFromBackdrop"
          @dblclick.stop="toggleZoom"
          @wheel.prevent="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        >
          <Transition :name="slideTransition">
            <div
              v-if="activeImage"
              :key="activeImage.id ?? activeImage.src"
              class="lightbox-slide"
            >
              <div class="lightbox-canvas" :style="canvasStyle">
                <img
                  :src="activeImage.src"
                  :alt="activeImage.alt"
                  draggable="false"
                  @load="onImageLoad"
                  @error="onImageError"
                />
              </div>
            </div>
          </Transition>
          <div v-if="loadingVisible" class="lightbox-state">
            <Icon name="ph:spinner-gap-bold" class="spinning" /><span
              >正在加载</span
            >
          </div>
          <div v-else-if="failed" class="lightbox-state">
            <Icon name="ph:image-broken-bold" /><span>图片加载失败</span>
          </div>
        </div>

        <footer class="lightbox-footer" @click.stop>
          <div v-if="activeImage?.caption" class="lightbox-caption">
            <slot name="caption" :image="activeImage" :index="safeIndex">{{
              activeImage.caption
            }}</slot>
          </div>
          <div
            v-if="canNavigate"
            class="lightbox-progress"
            role="progressbar"
            :aria-valuenow="safeIndex + 1"
            aria-valuemin="1"
            :aria-valuemax="normalizedImages.length"
          >
            <i :style="{ width: progressWidth }" />
          </div>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
export type ImagePreviewItem = {
  src: string;
  alt?: string;
  caption?: string;
  id?: string | number;
};

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    images: Array<string | ImagePreviewItem>;
    index?: number;
    loop?: boolean;
    minScale?: number;
    maxScale?: number;
    closeOnBackdrop?: boolean;
    label?: string;
  }>(),
  {
    index: 0,
    loop: true,
    minScale: 0.5,
    maxScale: 4,
    closeOnBackdrop: true,
    label: "图片预览",
  },
);

const emit = defineEmits<{
  "update:modelValue": [open: boolean];
  "update:index": [index: number];
  change: [index: number];
  close: [];
}>();

const { mediaUrl } = useMediaUrl();
const dialogRef = ref<HTMLElement | null>(null);
const closeRef = ref<HTMLButtonElement | null>(null);
const scale = ref(1);
const rotation = ref(0);
const translateX = ref(0);
const translateY = ref(0);
const swipeOffset = ref(0);
const dragging = ref(false);
const loading = ref(true);
const loadingVisible = ref(false);
const failed = ref(false);
const transitionDirection = ref<"next" | "prev">("next");
const pointers = new Map<number, { x: number; y: number }>();
let gestureStart = { x: 0, y: 0, time: 0, translateX: 0, translateY: 0 };
let pinchStartDistance = 0;
let pinchStartScale = 1;
let gestureWasPinch = false;
let gesturePointerType = "";
let previousFocus: HTMLElement | null = null;
let loadingTimer = 0;

const normalizedImages = computed<ImagePreviewItem[]>(() =>
  props.images
    .map((item, index) =>
      typeof item === "string"
        ? { src: mediaUrl(item), alt: `${props.label} ${index + 1}` }
        : {
            ...item,
            src: mediaUrl(item.src),
            alt: item.alt || `${props.label} ${index + 1}`,
          },
    )
    .filter((item) => Boolean(item.src)),
);
const safeIndex = computed(() =>
  Math.min(
    Math.max(0, props.index),
    Math.max(0, normalizedImages.value.length - 1),
  ),
);
const activeImage = computed(() => normalizedImages.value[safeIndex.value]);
const canNavigate = computed(() => normalizedImages.value.length > 1);
const paddedIndex = computed(() =>
  String(safeIndex.value + 1).padStart(2, "0"),
);
const paddedTotal = computed(() =>
  String(normalizedImages.value.length).padStart(2, "0"),
);
const progressWidth = computed(
  () => `${((safeIndex.value + 1) / normalizedImages.value.length) * 100}%`,
);
const dialogLabel = computed(
  () =>
    `${props.label}，第 ${safeIndex.value + 1} 张，共 ${normalizedImages.value.length} 张`,
);
const slideTransition = computed(
  () => `lightbox-slide-${transitionDirection.value}`,
);
const canvasStyle = computed(() => ({
  transform: `translate3d(${scale.value > 1 ? translateX.value : swipeOffset.value}px, ${translateY.value}px, 0) scale(${scale.value}) rotate(${rotation.value}deg)`,
}));

watch(
  () => props.modelValue,
  (open) => {
    if (!import.meta.client) return;
    document.body.classList.toggle("image-lightbox-open", open);
    if (open) {
      previousFocus = document.activeElement as HTMLElement | null;
      resetTransform();
      preloadNeighbors();
      nextTick(() => (closeRef.value || dialogRef.value)?.focus());
    } else {
      previousFocus?.focus?.();
      previousFocus = null;
    }
  },
  { immediate: true },
);
watch(activeImage, () => {
  loading.value = true;
  scheduleLoadingIndicator();
  failed.value = false;
  resetTransform();
  preloadNeighbors();
});

function scheduleLoadingIndicator() {
  window.clearTimeout(loadingTimer);
  loadingVisible.value = false;
  loadingTimer = window.setTimeout(() => {
    loadingVisible.value = loading.value;
  }, 180);
}

function preloadNeighbors() {
  if (!import.meta.client || normalizedImages.value.length < 2) return;
  const count = normalizedImages.value.length;
  for (const index of [safeIndex.value - 1, safeIndex.value + 1]) {
    const source = normalizedImages.value[(index + count) % count]?.src;
    if (source) new Image().src = source;
  }
}

function clampScale(value: number) {
  return Math.min(props.maxScale, Math.max(props.minScale, value));
}
function zoomBy(delta: number) {
  scale.value = clampScale(Number((scale.value + delta).toFixed(2)));
  if (scale.value <= 1) translateX.value = translateY.value = 0;
}
function toggleZoom() {
  scale.value = scale.value > 1 ? 1 : Math.min(2, props.maxScale);
  if (scale.value === 1) translateX.value = translateY.value = 0;
}
function rotate(degrees: number) {
  rotation.value = (rotation.value + degrees) % 360;
}
function resetTransform() {
  scale.value = 1;
  rotation.value = translateX.value = translateY.value = swipeOffset.value = 0;
  dragging.value = false;
  pointers.clear();
}
function select(index: number, direction?: "next" | "prev") {
  const count = normalizedImages.value.length;
  if (!count) return;
  const nextIndex = props.loop
    ? (index + count) % count
    : Math.min(count - 1, Math.max(0, index));
  if (nextIndex === safeIndex.value) {
    swipeOffset.value = 0;
    return;
  }
  transitionDirection.value =
    direction || (nextIndex > safeIndex.value ? "next" : "prev");
  emit("update:index", nextIndex);
  emit("change", nextIndex);
}
function previous() {
  select(safeIndex.value - 1, "prev");
}
function next() {
  select(safeIndex.value + 1, "next");
}
function close() {
  emit("update:modelValue", false);
  emit("close");
}
function closeFromBackdrop() {
  if (props.closeOnBackdrop) close();
}
function onWheel(event: WheelEvent) {
  zoomBy(event.deltaY < 0 ? 0.2 : -0.2);
}
function pointerDistance() {
  const [first, second] = Array.from(pointers.values());
  return first && second
    ? Math.hypot(second.x - first.x, second.y - first.y)
    : 0;
}
function onPointerDown(event: PointerEvent) {
  if (event.pointerType === "mouse" && scale.value <= 1) return;
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 1) {
    gestureStart = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      translateX: translateX.value,
      translateY: translateY.value,
    };
    gestureWasPinch = false;
    gesturePointerType = event.pointerType;
    dragging.value = true;
  } else if (pointers.size === 2) {
    pinchStartDistance = pointerDistance();
    pinchStartScale = scale.value;
    gestureWasPinch = true;
  }
}
function onPointerMove(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2 && pinchStartDistance > 0) {
    scale.value = clampScale(
      pinchStartScale * (pointerDistance() / pinchStartDistance),
    );
  } else if (pointers.size === 1 && scale.value > 1) {
    translateX.value = gestureStart.translateX + event.clientX - gestureStart.x;
    translateY.value = gestureStart.translateY + event.clientY - gestureStart.y;
  } else if (
    pointers.size === 1 &&
    gesturePointerType !== "mouse" &&
    canNavigate.value
  ) {
    swipeOffset.value = event.clientX - gestureStart.x;
  }
}
function finishPointer(event: PointerEvent, cancelled = false) {
  if (!pointers.has(event.pointerId)) return;
  const deltaX = event.clientX - gestureStart.x;
  const velocity =
    Math.abs(deltaX) / Math.max(1, performance.now() - gestureStart.time);
  pointers.delete(event.pointerId);
  if (pointers.size) return;
  dragging.value = false;
  if (
    !cancelled &&
    !gestureWasPinch &&
    gesturePointerType !== "mouse" &&
    scale.value <= 1 &&
    canNavigate.value &&
    (Math.abs(deltaX) > Math.min(72, window.innerWidth * 0.17) ||
      (Math.abs(deltaX) > 28 && velocity > 0.45))
  ) {
    deltaX > 0 ? previous() : next();
  } else {
    swipeOffset.value = 0;
  }
}
function onPointerUp(event: PointerEvent) {
  finishPointer(event);
}
function onPointerCancel(event: PointerEvent) {
  finishPointer(event, true);
}
function onImageLoad() {
  window.clearTimeout(loadingTimer);
  loading.value = false;
  loadingVisible.value = false;
  failed.value = false;
}
function onImageError() {
  window.clearTimeout(loadingTimer);
  loading.value = false;
  loadingVisible.value = false;
  failed.value = true;
}
function onKeydown(event: KeyboardEvent) {
  if (!props.modelValue) return;
  if (event.key === "Escape") close();
  else if (event.key === "ArrowLeft" && canNavigate.value) previous();
  else if (event.key === "ArrowRight" && canNavigate.value) next();
  else if (event.key === "+" || event.key === "=") zoomBy(0.25);
  else if (event.key === "-") zoomBy(-0.25);
  else if (event.key === "0") resetTransform();
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => {
  window.clearTimeout(loadingTimer);
  window.removeEventListener("keydown", onKeydown);
  if (props.modelValue) document.body.classList.remove("image-lightbox-open");
});
</script>

<style scoped>
.image-lightbox {
  position: fixed;
  z-index: 3000;
  inset: 0;
  display: grid;
  grid-template-rows: 54px minmax(0, 1fr) auto;
  overflow: hidden;
  background: color-mix(in srgb, var(--c-bg) 92%, transparent);
  color: var(--c-text);
  backdrop-filter: blur(18px) saturate(0.92);
  overscroll-behavior: none;
  touch-action: none;
}
.lightbox-toolbar {
  z-index: 4;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px 4px 18px;
}
.lightbox-count {
  display: flex;
  align-items: baseline;
  gap: 7px;
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
}
.lightbox-count strong {
  color: var(--c-text);
  font-size: 0.88rem;
}
.lightbox-count i {
  font-style: normal;
  opacity: 0.46;
}
.lightbox-tools {
  display: flex;
  height: 38px;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ld-bg-card) 90%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--ld-shadow) 42%, transparent);
}
.lightbox-tools > span {
  width: 42px;
  color: var(--c-text-3);
  font-size: 0.65rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.lightbox-tools button,
.lightbox-nav {
  display: grid;
  border: 0;
  background: transparent;
  color: var(--c-text);
  cursor: pointer;
  place-items: center;
}
.lightbox-tools button {
  width: 31px;
  height: 31px;
  border-radius: 6px;
  font-size: 0.95rem;
}
.lightbox-tools button:hover,
.lightbox-tools button:focus-visible {
  background: var(--c-primary-soft);
  color: var(--c-primary);
  outline: 0;
}
.lightbox-tools button:disabled {
  cursor: not-allowed;
  opacity: 0.32;
}
.lightbox-tools .lightbox-close {
  margin-left: 3px;
  background: color-mix(in srgb, var(--c-text) 7%, transparent);
}
.lightbox-stage {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  cursor: zoom-in;
  place-items: center;
}
.lightbox-stage.panning {
  cursor: grab;
}
.lightbox-stage.panning:active {
  cursor: grabbing;
}
.lightbox-slide {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
.lightbox-canvas {
  display: grid;
  max-width: calc(100vw - 132px);
  max-height: calc(100dvh - 116px);
  transform-origin: center;
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
  place-items: center;
}
.lightbox-canvas img {
  display: block;
  max-width: 100%;
  max-height: calc(100dvh - 116px);
  border-radius: 6px;
  box-shadow: 0 24px 80px color-mix(in srgb, #000 42%, transparent);
  object-fit: contain;
  user-select: none;
}
.lightbox-stage.dragging .lightbox-canvas {
  transition: none;
}
.lightbox-nav {
  position: absolute;
  z-index: 4;
  top: 50%;
  width: 42px;
  height: 52px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ld-bg-card) 82%, transparent);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--ld-shadow) 38%, transparent);
  font-size: 1.2rem;
  transform: translateY(-50%);
  backdrop-filter: blur(12px);
}
.lightbox-nav:hover,
.lightbox-nav:focus-visible {
  border-color: color-mix(in srgb, var(--c-primary) 28%, var(--border));
  background: var(--c-primary-soft);
  color: var(--c-primary);
  outline: 0;
}
.lightbox-prev {
  left: 14px;
}
.lightbox-next {
  right: 14px;
}
.lightbox-state {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--c-text-3);
  font-size: 0.72rem;
  pointer-events: none;
}
.lightbox-footer {
  z-index: 3;
  display: grid;
  width: min(720px, calc(100vw - 32px));
  justify-self: center;
  gap: 8px;
  padding: 7px 14px calc(13px + env(safe-area-inset-bottom));
}
.lightbox-caption {
  color: var(--c-text-2);
  font-size: 0.72rem;
  line-height: 1.5;
  text-align: center;
}
.lightbox-progress {
  width: min(220px, 52vw);
  height: 2px;
  justify-self: center;
  overflow: hidden;
  border-radius: 2px;
  background: color-mix(in srgb, var(--c-text) 12%, transparent);
}
.lightbox-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--c-primary);
  transition: width 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.lightbox-fade-enter-active,
.lightbox-fade-leave-active {
  transition: opacity 0.2s ease;
}
.lightbox-fade-enter-from,
.lightbox-fade-leave-to {
  opacity: 0;
}
.lightbox-slide-next-enter-active,
.lightbox-slide-next-leave-active,
.lightbox-slide-prev-enter-active,
.lightbox-slide-prev-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.lightbox-slide-next-enter-from,
.lightbox-slide-prev-leave-to {
  opacity: 0;
  transform: translate3d(6vw, 0, 0) scale(0.985);
}
.lightbox-slide-next-leave-to,
.lightbox-slide-prev-enter-from {
  opacity: 0;
  transform: translate3d(-6vw, 0, 0) scale(0.985);
}
.spinning {
  animation: lightbox-spin 0.8s linear infinite;
}
@keyframes lightbox-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .image-lightbox {
    grid-template-rows: 48px minmax(0, 1fr) auto;
  }
  .lightbox-toolbar {
    padding: 6px 7px 3px 13px;
  }
  .lightbox-tools {
    gap: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }
  .lightbox-tools > span,
  .lightbox-tools button[title="向左旋转"] {
    display: none;
  }
  .lightbox-tools button {
    width: 34px;
    height: 34px;
  }
  .lightbox-canvas {
    max-width: 100vw;
    max-height: calc(100dvh - 96px);
  }
  .lightbox-canvas img {
    max-width: 100vw;
    max-height: calc(100dvh - 96px);
    border-radius: 0;
    box-shadow: 0 14px 54px color-mix(in srgb, #000 30%, transparent);
  }
  .lightbox-nav {
    display: none;
  }
  .lightbox-footer {
    width: calc(100vw - 24px);
    padding-right: 4px;
    padding-bottom: calc(13px + env(safe-area-inset-bottom));
    padding-left: 4px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .lightbox-canvas,
  .lightbox-progress i,
  .lightbox-fade-enter-active,
  .lightbox-fade-leave-active,
  .lightbox-slide-next-enter-active,
  .lightbox-slide-next-leave-active,
  .lightbox-slide-prev-enter-active,
  .lightbox-slide-prev-leave-active {
    transition: none;
  }
}
</style>

<style>
body.image-lightbox-open {
  overflow: hidden;
}
</style>

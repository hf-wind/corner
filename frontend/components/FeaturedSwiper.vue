<template>
  <section
    v-if="!loading && featured.length"
    ref="swiperRef"
    class="featured-swiper content-reveal"
    :class="{ mounted, dragging, 'can-drag': canDrag }"
    aria-labelledby="featured-title"
    @mouseenter="pauseTimer"
    @mouseleave="restartTimer"
  >
    <SectionHead kicker="FEATURED" title="精选推荐" title-id="featured-title">
      <template #actions>
        <span class="featured-count"><strong>{{ formatIndex(currentIndex + 1) }}</strong><i>/</i>{{ formatIndex(featured.length) }}</span>
      </template>
    </SectionHead>

    <div
      class="featured-viewport"
      tabindex="0"
      aria-label="精选文章，支持键盘左右切换"
      @keydown.left.prevent="previousSlide"
      @keydown.right.prevent="nextSlide"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="featured-track" :style="trackStyle">
        <AppLink
          v-for="(item, i) in featured"
          :key="item.slug"
          :to="'/article/' + item.slug"
          class="featured-card"
          :class="{ active: i === currentIndex }"
          :style="{ width: `${cardWidth}px` }"
          :tabindex="i === currentIndex ? 0 : -1"
          @click="preventClickAfterDrag"
        >
          <img
            :src="coverUrl(item.cover)"
            :alt="item.title"
            :loading="i < 3 ? 'eager' : 'lazy'"
            :fetchpriority="i === currentIndex ? 'high' : 'low'"
            decoding="async"
            width="640"
            height="360"
          >
          <span class="featured-scrim" aria-hidden="true" />
          <div class="featured-copy">
            <span class="featured-date"><Icon name="ph:calendar-blank-bold" />{{ item.date }}</span>
            <h3>{{ item.title }}</h3>
            <span class="featured-open">阅读全文 <Icon name="ph:arrow-up-right-bold" /></span>
          </div>
        </AppLink>
      </div>
    </div>

    <div v-if="featured.length > 1" class="featured-nav" role="tablist" aria-label="精选推荐分页">
      <button
        v-for="(item, i) in featured"
        :key="i"
        type="button"
        class="featured-dot"
        :class="{ active: i === currentIndex }"
        role="tab"
        :aria-selected="i === currentIndex"
        :aria-label="`第 ${i + 1} 篇：${item.title}`"
        @click="goTo(i)"
      />
      <span class="featured-thumb" aria-hidden="true" :style="thumbStyle" />
    </div>
  </section>
</template>

<script setup lang="ts">
import SectionHead from '~/components/SectionHead.vue'
import { getDisplayImageUrl } from '~/utils/imagePerformance'

const api = useApi()
const featured = ref<any[]>([])
const loading = ref(true)
const currentIndex = ref(0)
const cardWidth = ref(320)
const containerWidth = ref(0)
const dragOffset = ref(0)
const dragging = ref(false)
const swiperRef = ref<HTMLElement>()
const mounted = ref(false)
const canDrag = ref(false)

const gap = 14
const dotStep = 14
let autoTimer: ReturnType<typeof setInterval>
let resizeObserver: ResizeObserver | null = null
let pointerInside = false
let pointerId: number | null = null
let pointerStart = 0
let didDrag = false

function coverUrl(source: string) {
  return getDisplayImageUrl(source, 640, 360)
}

function formatIndex(value: number) {
  return String(value).padStart(2, '0')
}

const trackOffset = computed(() => {
  const edge = containerWidth.value > 640 ? 0 : 8
  const trackWidth = featured.value.length * cardWidth.value + Math.max(0, featured.value.length - 1) * gap
  const maxTravel = Math.max(0, trackWidth - containerWidth.value + edge)
  const travel = Math.min(currentIndex.value * (cardWidth.value + gap), maxTravel)
  return edge - travel + dragOffset.value
})

const trackStyle = computed(() => ({
  transform: `translate3d(${trackOffset.value}px, 0, 0)`,
}))

const thumbStyle = computed(() => ({
  '--thumb-x': `${(currentIndex.value - (featured.value.length - 1) / 2) * dotStep}`,
} as Record<string, string>))

function goTo(index: number) {
  currentIndex.value = Math.min(Math.max(index, 0), featured.value.length - 1)
}

function nextSlide() {
  if (!featured.value.length) return
  goTo(currentIndex.value + 1)
}

function previousSlide() {
  goTo(currentIndex.value - 1)
}

function pauseTimer() {
  pointerInside = true
  clearInterval(autoTimer)
}

function restartTimer() {
  pointerInside = false
  clearInterval(autoTimer)
  startAutoScroll()
}

function startAutoScroll() {
  if (
    featured.value.length > 1
    && !pointerInside
    && !document.hidden
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    autoTimer = setInterval(() => {
      currentIndex.value = currentIndex.value >= featured.value.length - 1 ? 0 : currentIndex.value + 1
    }, 4500)
  }
}

function onVisibilityChange() {
  clearInterval(autoTimer)
  if (!document.hidden) startAutoScroll()
}

function onPointerDown(event: PointerEvent) {
  if (!canDrag.value) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  pointerId = event.pointerId
  pointerStart = event.clientX
  dragOffset.value = 0
  dragging.value = true
  didDrag = false
  pauseTimer()
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)
  document.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value || event.pointerId !== pointerId) return
  const delta = event.clientX - pointerStart
  dragOffset.value = delta
  if (Math.abs(delta) > 6) didDrag = true
}

function onPointerUp(event: PointerEvent) {
  if (!dragging.value || event.pointerId !== pointerId) return
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
  document.removeEventListener('pointercancel', onPointerUp)
  const threshold = Math.min(72, cardWidth.value * .22)
  if (dragOffset.value <= -threshold) nextSlide()
  else if (dragOffset.value >= threshold) previousSlide()
  dragging.value = false
  dragOffset.value = 0
  pointerId = null
  window.setTimeout(() => { didDrag = false }, 0)
  restartTimer()
}

function preventClickAfterDrag(event: MouseEvent) {
  if (didDrag) event.preventDefault()
}

function updateMeasurements() {
  if (!swiperRef.value) return
  const width = swiperRef.value.clientWidth
  containerWidth.value = width
  if (width <= 640) {
    cardWidth.value = Math.max(248, width - 30)
  } else {
    cardWidth.value = Math.max(250, (width - gap * 2) / 3)
  }
}

async function fetchFeatured() {
  try {
    const items = await api.get<any[]>('/posts/featured')
    featured.value = items.map((p: any) => ({
      slug: p.slug,
      cover: p.coverImage,
      title: p.title,
      date: p.publishedAt?.slice(0, 10) ?? '',
    }))
  } catch { /* keep empty */ }
  loading.value = false
  await nextTick()
  updateMeasurements()
  resizeObserver = new ResizeObserver(updateMeasurements)
  if (swiperRef.value) resizeObserver.observe(swiperRef.value)
  startAutoScroll()
}

onMounted(() => {
  canDrag.value = window.matchMedia('(hover: none), (pointer: coarse)').matches
  document.addEventListener('visibilitychange', onVisibilityChange)
  requestAnimationFrame(() => { mounted.value = true })
  void fetchFeatured()
})

onUnmounted(() => {
  clearInterval(autoTimer)
  resizeObserver?.disconnect()
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
  document.removeEventListener('pointercancel', onPointerUp)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.featured-swiper {
  position: relative;
  padding: 12px 0 22px;
  overflow: hidden;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity .5s ease, transform .5s ease;
}
.featured-swiper.mounted { opacity: 1; transform: translateY(0); }

.featured-count {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: .62rem;
  font-variant-numeric: tabular-nums;
  color: var(--c-text-3);
  letter-spacing: .04em;
}
.featured-count strong {
  color: var(--c-text);
  font-size: .9rem;
  font-weight: 680;
}
.featured-count i {
  font-style: normal;
  opacity: .45;
}

.featured-viewport {
  overflow: visible;
  outline: none;
  touch-action: pan-y pinch-zoom;
}
.featured-viewport:focus-visible { border-radius: 12px; outline: 2px solid var(--c-primary); outline-offset: 3px; }
.can-drag .featured-viewport { cursor: grab; }
.can-drag.dragging .featured-viewport { cursor: grabbing; }
.featured-track {
  display: flex;
  gap: 14px;
  transition: transform .58s cubic-bezier(.16, 1, .3, 1);
  will-change: transform;
}
.dragging .featured-track { transition: none; }

.featured-card {
  position: relative;
  display: block;
  height: 164px;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
  border-radius: 12px;
  background: var(--c-bg-2);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--ld-shadow) 34%, transparent);
  color: #fff;
  opacity: .7;
  transform: scale(.972);
  transform-origin: center;
  user-select: none;
  -webkit-user-drag: none;
  transition: opacity .4s ease, transform .55s cubic-bezier(.16, 1, .3, 1);
}
.featured-card.active { opacity: 1; transform: scale(1); }
.featured-card img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; transition: transform .7s cubic-bezier(.16, 1, .3, 1), filter .4s ease; }
.featured-card.active img { animation: featured-kenburns 9s linear both; }
.featured-card:not(.active):hover img { transform: scale(1.05); filter: saturate(1.06); }
.featured-scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgb(7 12 20 / 3%) 25%, rgb(7 12 20 / 82%) 100%); }
.featured-copy {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 15px;
  opacity: .85;
  transform: translateY(3px);
  transition: opacity .45s ease, transform .5s cubic-bezier(.16, 1, .3, 1);
}
.featured-card.active .featured-copy {
  opacity: 1;
  transform: translateY(0);
  transition-delay: .12s;
}
.featured-date { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 5px; font-size: .56rem; opacity: .72; }
.featured-copy h3 { display: -webkit-box; max-width: 92%; margin: 0; overflow: hidden; font-size: .84rem; line-height: 1.45; text-shadow: 0 2px 8px rgb(0 0 0 / 38%); -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.featured-open { display: inline-flex; max-height: 0; align-items: center; gap: 4px; overflow: hidden; font-size: .56rem; font-weight: 700; opacity: 0; transform: translateY(4px); transition: max-height .32s ease, margin .32s ease, opacity .28s ease, transform .32s ease; }
.featured-card:not(.active):hover .featured-open { max-height: 18px; margin-top: 7px; opacity: .86; transform: translateY(0); }

.featured-nav {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  margin-top: 10px;
}
.featured-dot {
  position: relative;
  z-index: 1;
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  margin: 0 4px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-text) 24%, transparent);
  cursor: pointer;
  transition: background .25s ease, transform .25s ease;
}
.featured-dot:hover {
  background: color-mix(in srgb, var(--c-text) 46%, transparent);
  transform: scale(1.25);
}
.featured-dot:focus-visible { outline: 2px solid color-mix(in srgb, var(--c-primary) 55%, transparent); outline-offset: 2px; }
.featured-dot.active { background: transparent; }
.featured-thumb {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18px;
  height: 6px;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--c-primary), color-mix(in srgb, var(--c-primary) 52%, #8fc1ff));
  box-shadow: 0 1px 8px color-mix(in srgb, var(--c-primary) 42%, transparent);
  transform: translate(-50%, -50%) translateX(calc(var(--thumb-x) * 1px));
  transition: transform .55s cubic-bezier(.16, 1, .3, 1);
  will-change: transform;
  pointer-events: none;
}

@keyframes featured-kenburns {
  from { transform: scale(1); }
  to { transform: scale(1.08); }
}

@media (prefers-reduced-motion: reduce) {
  .featured-swiper, .featured-track, .featured-card, .featured-card img, .featured-copy, .featured-open, .featured-dot, .featured-thumb { transition: none; }
  .featured-card.active img { animation: none; }
}

@media (max-width: 640px) {
  .featured-swiper { margin-inline: -4px; padding: 0 4px 19px; }
  .featured-count { margin-right: 0; }
  .featured-card { height: 172px; opacity: .56; transform: scale(.968); }
  .featured-card.active { opacity: 1; transform: scale(1); }
  .featured-copy { padding: 14px; }
  .featured-copy h3 { font-size: .9rem; }
  .featured-nav { margin-top: 8px; }
}
</style>

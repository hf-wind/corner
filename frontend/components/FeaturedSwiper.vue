<template>
  <div v-if="!loading && featured.length" class="swiper-3d-wrap" ref="swiperRef" :class="{ mounted }"
    @mouseenter="pauseTimer" @mouseleave="restartTimer">
    <div class="section-title">· 精选推荐</div>
    <div class="swiper-3d-track" :style="{ transform: `translateX(${trackOffset}px)` }">
      <NuxtLink v-for="(item, i) in featured" :key="item.slug" :to="'/article/' + item.slug" class="swiper-card-3d"
        :class="{ ...slideClasses(i), hovered: hoveredIndex === i }"
        @pointerenter="onPointerEnter(i)" @pointerleave="onPointerLeave">
        <img
          :src="coverUrl(item.cover)"
          :alt="item.title"
          :loading="i < 3 ? 'eager' : 'lazy'"
          :fetchpriority="i === currentIndex ? 'high' : 'low'"
          decoding="async"
          width="480"
          height="320"
        >
        <div class="swiper-overlay">
          <span v-if="i === currentIndex" class="feat-badge">精选</span>
          <h3>{{ item.title }}</h3>
          <span>{{ item.date }}</span>
        </div>
      </NuxtLink>
    </div>
    <div class="swiper-dots">
      <span v-for="(item, i) in featured" :key="i" class="dot" :class="{ active: i === currentIndex }"
        @click="goTo(i)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getDisplayImageUrl } from '~/utils/imagePerformance'

const props = withDefaults(defineProps<{ ready?: boolean }>(), { ready: true })
const api = useApi()
const featured = ref<any[]>([])
const loading = ref(true)

const currentIndex = ref(0)
const dir = ref(1)
const cardWidth = ref(220)
const swiperRef = ref<HTMLElement>()
const mounted = ref(false)
const initialized = ref(false)
const hoveredIndex = ref(-1)
let autoTimer: ReturnType<typeof setInterval>
let hoverTimer: ReturnType<typeof setTimeout>
let pointerInside = false

function coverUrl(source: string) {
  return getDisplayImageUrl(source, 480, 320)
}

const trackOffset = computed(() => {
  if (!swiperRef.value) return 0
  const cw = cardWidth.value
  const gap = 16
  const containerW = swiperRef.value.clientWidth
  return -(currentIndex.value * (cw + gap)) + (containerW - cw) / 2
})

function slideClasses(i: number) {
  return {
    active: i === currentIndex.value,
    prev: i === currentIndex.value - 1,
    next: i === currentIndex.value + 1,
  }
}

function goTo(index: number) {
  currentIndex.value = index
}

function nextSlide() {
  const last = featured.value.length - 1
  if (last < 2) return
  const next = currentIndex.value + dir.value
  if (next >= last) {
    dir.value = -1
    currentIndex.value = last - 1
  } else if (next <= 0) {
    dir.value = 1
    currentIndex.value = 1
  } else {
    currentIndex.value = next
  }
}

function pauseTimer() {
  pointerInside = true
  clearInterval(autoTimer)
}

function restartTimer() {
  pointerInside = false
  if (!initialized.value) return
  clearInterval(autoTimer)
  startAutoScroll()
}

function onPointerEnter(i: number) {
  clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => { hoveredIndex.value = i }, 100)
}

function onPointerLeave() {
  clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => { hoveredIndex.value = -1 }, 100)
}

function startAutoScroll() {
  if (
    featured.value.length > 2
    && !pointerInside
    && !document.hidden
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    autoTimer = setInterval(nextSlide, 3000)
  }
}

function onVisibilityChange() {
  clearInterval(autoTimer)
  if (!document.hidden) startAutoScroll()
}

function tryInit() {
  if (props.ready && !loading.value && !initialized.value) {
    initialized.value = true
    nextTick(() => {
      updateCardWidth()
      if (featured.value.length >= 3) currentIndex.value = 1
      mounted.value = true
      startAutoScroll()
      window.addEventListener('resize', recalcWidth)
    })
  }
}

let resizeTimer: ReturnType<typeof setTimeout>
function updateCardWidth() {
  if (!swiperRef.value) return
  const containerWidth = swiperRef.value.clientWidth
  if (window.matchMedia('(max-width: 640px)').matches) {
    cardWidth.value = Math.min(420, Math.max(240, containerWidth - 32))
    return
  }
  cardWidth.value = Math.max(180, (containerWidth - 48) / 3)
}

function recalcWidth() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(updateCardWidth, 100)
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
  tryInit()
}

watch(() => props.ready, tryInit)

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  fetchFeatured()
})

onUnmounted(() => {
  clearInterval(autoTimer)
  clearTimeout(hoverTimer)
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', recalcWidth)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.swiper-3d-wrap {
  position: relative;
  overflow: hidden;
  padding: 24px 0 32px;
  perspective: 800px;
  user-select: none;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.swiper-3d-wrap .section-title {
  font-size: 0.8rem;
  color: var(--c-text-2);
  letter-spacing: 0.12em;
  margin-bottom: 12px;
  padding-left: 4px;
}

.swiper-3d-wrap.mounted {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.swiper-3d-track {
  display: flex;
  gap: 16px;
  transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform;
}

.swiper-card-3d {
  flex: 0 0 v-bind('cardWidth + "px"');
  border-radius: 14px;
  overflow: hidden;
  position: relative;
  z-index: 1;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  display: block;
  background: var(--c-bg-2);
  transform-origin: center center;
  transform: scale(0.7);
  opacity: 0.4;
  transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.5s ease;
}

.swiper-card-3d.prev,
.swiper-card-3d.next {
  z-index: 2;
  transform: scale(0.86);
  opacity: 0.85;
}

.swiper-card-3d.prev {
  transform: scale(0.86) rotateY(6deg);
}

.swiper-card-3d.next {
  transform: scale(0.86) rotateY(-6deg);
}

.swiper-card-3d.active {
  z-index: 3;
  transform: scale(1);
  opacity: 1;
  box-shadow: 0 12px 40px color-mix(in srgb, var(--c-primary) 22%, transparent);
}

.swiper-card-3d.hovered {
  z-index: 4;
  transform: scale(1.02);
}

.swiper-card-3d.hovered.active {
  box-shadow: 0 16px 48px color-mix(in srgb, var(--c-primary) 30%, transparent);
}

.swiper-card-3d img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
}

.swiper-overlay {
  position: absolute;
  inset: 0;
  padding: 16px;
  background: linear-gradient(transparent 35%, rgba(0, 0, 0, 0.75) 88%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  color: #fff;
}

.swiper-card-3d.active .swiper-overlay {
  background: linear-gradient(transparent 35%, rgba(0, 0, 0, 0.75) 88%);
}

.swiper-overlay h3 {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 2px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.swiper-overlay span {
  font-size: 0.68rem;
  opacity: 0.75;
}

.feat-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 0.58rem;
  padding: 2px 10px;
  border-radius: 20px;
  background: rgba(20, 20, 20, 0.42);
  color: #fff;
  letter-spacing: 0.06em;
  font-weight: 500;
  opacity: 0;
  transform: translateY(-6px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.swiper-card-3d.active .feat-badge {
  opacity: 1;
  transform: translateY(0);
}

.swiper-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dot.active {
  width: 22px;
  border-radius: 4px;
  background: var(--c-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--c-primary) 40%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .swiper-3d-wrap,
  .swiper-3d-track,
  .swiper-card-3d,
  .feat-badge,
  .dot {
    transition: none;
  }
}

@media (max-width: 640px) {
  .swiper-3d-wrap {
    padding: 4px 0 24px;
    perspective: none;
  }

  .swiper-3d-wrap .section-title {
    margin-bottom: 10px;
  }

  .swiper-3d-track {
    gap: 16px;
    transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .swiper-card-3d,
  .swiper-card-3d.prev,
  .swiper-card-3d.next {
    transform: scale(0.94);
    opacity: 0.56;
  }

  .swiper-card-3d.active,
  .swiper-card-3d.hovered,
  .swiper-card-3d.hovered.active {
    transform: scale(1);
  }

  .swiper-card-3d img {
    height: 148px;
  }

  .swiper-overlay {
    padding: 13px;
  }

  .swiper-overlay h3 {
    font-size: 0.86rem;
  }

  .swiper-dots {
    margin-top: 9px;
  }
}
</style>

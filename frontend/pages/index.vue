<template>
  <div
    ref="pageEl"
    class="welcome-page"
    :class="{ 'intro-complete': introComplete, 'is-leaving': isLeaving }"
    @pointermove="handlePointerMove"
  >
    <canvas ref="particleCanvas" class="particle-canvas" aria-hidden="true" />

    <div class="aurora aurora-one" aria-hidden="true" />
    <div class="aurora aurora-two" aria-hidden="true" />
    <div class="grid-plane" aria-hidden="true" />
    <div class="page-vignette" aria-hidden="true" />

    <div class="corner-mark corner-mark-top" aria-hidden="true">
      <span>CORNER.INK</span><i /> <span>PERSONAL NOTES</span>
    </div>
    <div class="corner-mark corner-mark-bottom" aria-hidden="true">
      <span>{{ currentYear }}</span><i /> <span>KEEP CURIOSITY</span>
    </div>

    <main class="welcome-scene" aria-labelledby="welcome-title">
      <section class="hero-card">
        <div class="eyebrow" data-reveal>
          <span class="eyebrow-dot" />
          <span>听风于隅，漫写人间</span>
        </div>

        <div class="logo-stage" data-reveal aria-hidden="true">
          <span class="orbit orbit-outer"><i /></span>
          <span class="orbit orbit-inner"><i /></span>
          <span class="logo-halo" />
          <span class="logo-shell">
            <img src="/logo_192.png" alt="" width="104" height="104">
          </span>
          <span class="logo-badge"><Icon name="ph:sparkle-fill" /></span>
        </div>

        <h1 id="welcome-title" class="site-title" data-reveal :aria-label="siteTitle">
          <span v-for="(char, index) in titleChars" :key="index" class="title-char">{{ char }}</span>
        </h1>

        <p class="slogan" data-reveal>
          <span ref="typewriterEl" class="typewriter" />
          <span class="type-caret" aria-hidden="true" />
        </p>

        <div class="stats-row" data-reveal aria-label="站点统计">
          <div v-for="item in statItems" :key="item.label" class="stat-item">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>

        <button
          ref="enterButtonEl"
          class="enter-btn"
          type="button"
          data-reveal
          :disabled="isLeaving"
          @click="enterSite"
          @pointermove="handleButtonMove"
          @pointerleave="resetButtonPosition"
        >
          <span>进入风隅</span>
          <span class="enter-arrow"><Icon name="ph:arrow-right-bold" /></span>
        </button>

        <div class="scroll-cue" data-reveal aria-hidden="true">
          <span>EXPLORE</span><i />
        </div>
      </section>
    </main>

    <button class="theme-toggle" type="button" :aria-label="themeLabel" @click="toggleTheme">
      <span><Icon :name="themeIcon" /></span>
    </button>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'welcome' })

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  phase: number
}

interface OverviewStats {
  posts: number
  comments: number
  views: number
}

const router = useRouter()
const api = useApi()
const { resolvedTheme, setTheme } = useTheme()
const { siteTitle, siteDescription, loadSiteSettings } = useSiteSettings()

const pageEl = ref<HTMLElement | null>(null)
const particleCanvas = ref<HTMLCanvasElement | null>(null)
const typewriterEl = ref<HTMLSpanElement | null>(null)
const enterButtonEl = ref<HTMLButtonElement | null>(null)
const introComplete = ref(false)
const isLeaving = ref(false)
const displayStats = reactive<OverviewStats>({ posts: 0, comments: 0, views: 0 })
const statsReady = ref(false)
const titleChars = computed(() => [...siteTitle.value])
const currentYear = new Date().getFullYear()

let animationId = 0
let pointerFrame = 0
let resizeFrame = 0
let statsFrame = 0
let lastParticleFrame = 0
let typewriterTimer = 0
let introTimer = 0
let exitTimer = 0
let particles: Particle[] = []
let canvasContext: CanvasRenderingContext2D | null = null
let canvasWidth = 0
let canvasHeight = 0
let reduceMotion: MediaQueryList | null = null
let finePointer: MediaQueryList | null = null

const themeIcon = computed(() => resolvedTheme.value === 'dark' ? 'ph:sun-bold' : 'ph:moon-bold')
const themeLabel = computed(() => resolvedTheme.value === 'dark' ? '切换到浅色模式' : '切换到深色模式')
const statItems = computed(() => [
  { label: '文章', value: statsReady.value ? formatNumber(displayStats.posts) : '—' },
  { label: '评论', value: statsReady.value ? formatNumber(displayStats.comments) : '—' },
  { label: '阅读', value: statsReady.value ? formatNumber(displayStats.views) : '—' },
])

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value || 0)
}

function toggleTheme() {
  setTheme(resolvedTheme.value === 'dark' ? 'light' : 'dark')
}

function enterSite() {
  if (isLeaving.value) return
  isLeaving.value = true
  resetButtonPosition()
  exitTimer = window.setTimeout(() => void router.push('/home'), reduceMotion?.matches ? 0 : 460)
}

function runIntro() {
  const page = pageEl.value
  if (!page || reduceMotion?.matches) {
    introComplete.value = true
    initTypewriter(180)
    return
  }

  const revealItems = [...page.querySelectorAll<HTMLElement>('[data-reveal]')]
  revealItems.forEach((element, index) => element.animate([
    { opacity: 0, transform: `translate3d(0, ${index === 1 ? 28 : 20}px, 0) scale(${index === 1 ? 0.9 : 0.98})` },
    { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
  ], {
    duration: index === 1 ? 1050 : 760,
    delay: 120 + index * 92,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    fill: 'both',
  }))

  const titleLetters = [...page.querySelectorAll<HTMLElement>('.title-char')]
  titleLetters.forEach((letter, index) => {
    letter.animate([
      { opacity: 0, transform: 'translate3d(0, 22px, 0) rotate(5deg)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0) rotate(0)' },
    ], {
      duration: 700,
      delay: 520 + index * 72,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'both',
    })
  })

  introTimer = window.setTimeout(() => {
    introComplete.value = true
  }, 120 + (revealItems.length - 1) * 92 + 1080)
  initTypewriter(820)
}

function initTypewriter(delay = 0) {
  const slogan = [...siteDescription.value]
  let index = 0
  if (typewriterEl.value) typewriterEl.value.textContent = ''

  const typeCharacter = () => {
    const element = typewriterEl.value
    if (!element || index >= slogan.length) return
    const character = slogan[index++]
    element.textContent += character
    const pause = /[，。！？]/.test(character) ? 230 : 76 + Math.random() * 54
    typewriterTimer = window.setTimeout(typeCharacter, reduceMotion?.matches ? 0 : pause)
  }

  typewriterTimer = window.setTimeout(typeCharacter, reduceMotion?.matches ? 0 : delay)
}

async function loadStats() {
  try {
    const response = await api.get<OverviewStats>('/stats/overview')
    const target = {
      posts: Number(response?.posts || 0),
      comments: Number(response?.comments || 0),
      views: Number(response?.views || 0),
    }
    animateStats(target)
  } catch {
    // Welcome content is independent from the supplementary statistics.
  }
}

function animateStats(target: OverviewStats) {
  cancelAnimationFrame(statsFrame)
  statsReady.value = true
  if (reduceMotion?.matches) {
    Object.assign(displayStats, target)
    return
  }

  const startedAt = performance.now()
  const duration = 900
  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    displayStats.posts = Math.round(target.posts * eased)
    displayStats.comments = Math.round(target.comments * eased)
    displayStats.views = Math.round(target.views * eased)
    if (progress < 1) statsFrame = requestAnimationFrame(tick)
  }
  statsFrame = requestAnimationFrame(tick)
}

function handlePointerMove(event: PointerEvent) {
  if (!pageEl.value || !finePointer?.matches || reduceMotion?.matches) return
  const x = event.clientX / window.innerWidth - 0.5
  const y = event.clientY / window.innerHeight - 0.5
  cancelAnimationFrame(pointerFrame)
  pointerFrame = requestAnimationFrame(() => {
    pageEl.value?.style.setProperty('--scene-x', `${(-x * 8).toFixed(2)}px`)
    pageEl.value?.style.setProperty('--scene-y', `${(-y * 6).toFixed(2)}px`)
    pageEl.value?.style.setProperty('--grid-x', `${(x * 8).toFixed(2)}px`)
  })
}

function handleButtonMove(event: PointerEvent) {
  const button = enterButtonEl.value
  if (!button || !finePointer?.matches || reduceMotion?.matches) return
  const rect = button.getBoundingClientRect()
  const x = (event.clientX - rect.left - rect.width / 2) * 0.13
  const y = (event.clientY - rect.top - rect.height / 2) * 0.18
  button.style.setProperty('--button-x', `${x.toFixed(1)}px`)
  button.style.setProperty('--button-y', `${y.toFixed(1)}px`)
}

function resetButtonPosition() {
  enterButtonEl.value?.style.setProperty('--button-x', '0px')
  enterButtonEl.value?.style.setProperty('--button-y', '0px')
}

function resizeCanvas() {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => {
    const canvas = particleCanvas.value
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    canvasWidth = window.innerWidth
    canvasHeight = window.innerHeight
    canvas.width = Math.round(canvasWidth * dpr)
    canvas.height = Math.round(canvasHeight * dpr)
    canvasContext = canvas.getContext('2d')
    canvasContext?.setTransform(dpr, 0, 0, dpr, 0, 0)
    createParticles()
  })
}

function createParticles() {
  const count = canvasWidth < 640 ? 16 : Math.min(30, Math.max(20, Math.round(canvasWidth / 56)))
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    vx: (Math.random() - 0.5) * 0.1,
    vy: (Math.random() - 0.5) * 0.1,
    radius: 0.6 + Math.random() * 1.25,
    alpha: 0.16 + Math.random() * 0.34,
    phase: Math.random() * Math.PI * 2,
  }))
}

function renderParticles(now: number) {
  animationId = requestAnimationFrame(renderParticles)
  if (now - lastParticleFrame < 33) return
  lastParticleFrame = now
  const context = canvasContext
  if (!context) return
  context.clearRect(0, 0, canvasWidth, canvasHeight)
  const rgb = resolvedTheme.value === 'dark' ? '178, 207, 255' : '65, 102, 164'

  for (let index = 0; index < particles.length; index++) {
    const point = particles[index]
    point.x += point.vx
    point.y += point.vy
    if (point.x < -10) point.x = canvasWidth + 10
    if (point.x > canvasWidth + 10) point.x = -10
    if (point.y < -10) point.y = canvasHeight + 10
    if (point.y > canvasHeight + 10) point.y = -10

    const twinkle = point.alpha + Math.sin(now * 0.0008 + point.phase) * 0.08
    context.beginPath()
    context.arc(point.x, point.y, point.radius, 0, Math.PI * 2)
    context.fillStyle = `rgba(${rgb}, ${Math.max(0.06, twinkle)})`
    context.fill()

    for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex++) {
      const next = particles[nextIndex]
      const dx = point.x - next.x
      const dy = point.y - next.y
      const distanceSquared = dx * dx + dy * dy
      if (distanceSquared > 100 * 100) continue
      const opacity = (1 - Math.sqrt(distanceSquared) / 100) * 0.1
      context.beginPath()
      context.moveTo(point.x, point.y)
      context.lineTo(next.x, next.y)
      context.strokeStyle = `rgba(${rgb}, ${opacity})`
      context.lineWidth = 0.6
      context.stroke()
    }
  }

}

function handleVisibilityChange() {
  if (document.hidden) {
    cancelAnimationFrame(animationId)
    animationId = 0
  } else if (!animationId && !reduceMotion?.matches) {
    animationId = requestAnimationFrame(renderParticles)
  }
}

onMounted(() => {
  void loadSiteSettings()
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
  runIntro()
  resizeCanvas()
  if (!reduceMotion.matches) animationId = requestAnimationFrame(renderParticles)
  window.addEventListener('resize', resizeCanvas, { passive: true })
  document.addEventListener('visibilitychange', handleVisibilityChange)
  void loadStats()
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  cancelAnimationFrame(pointerFrame)
  cancelAnimationFrame(resizeFrame)
  cancelAnimationFrame(statsFrame)
  clearTimeout(typewriterTimer)
  clearTimeout(introTimer)
  clearTimeout(exitTimer)
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.welcome-page {
  --scene-x: 0px;
  --scene-y: 0px;
  --grid-x: 0px;
  position: relative;
  isolation: isolate;
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 560px;
  overflow: hidden;
  place-items: center;
  background:
    radial-gradient(circle at 50% 43%, color-mix(in srgb, var(--c-primary) 9%, transparent), transparent 32%),
    linear-gradient(145deg, var(--c-bg) 0%, color-mix(in srgb, var(--c-bg) 92%, var(--c-primary)) 52%, var(--c-bg) 100%);
  color: var(--c-text);
  font-family: var(--font-body);
}

.particle-canvas,
.page-vignette,
.grid-plane,
.aurora {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle-canvas { z-index: -2; width: 100%; height: 100%; }

.aurora {
  z-index: -3;
  width: 46vw;
  height: 46vw;
  border-radius: 50%;
  opacity: 0.62;
}

.aurora-one {
  inset: -20vw auto auto -14vw;
  background: radial-gradient(circle, color-mix(in srgb, var(--c-primary) 18%, transparent), transparent 68%);
  animation: aurora-drift-one 18s ease-in-out infinite alternate;
}

.aurora-two {
  inset: auto -18vw -22vw auto;
  background: radial-gradient(circle, rgba(115, 210, 208, 0.14), transparent 68%);
  animation: aurora-drift-two 22s ease-in-out infinite alternate;
}

.grid-plane {
  z-index: -4;
  inset: 44% -15% -38%;
  opacity: 0.32;
  background-image:
    linear-gradient(color-mix(in srgb, var(--c-primary) 11%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--c-primary) 11%, transparent) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: linear-gradient(to bottom, transparent, #000 35%, transparent 88%);
  transform: perspective(420px) rotateX(63deg) translate3d(var(--grid-x), 0, 0);
  transform-origin: center top;
}

.page-vignette {
  z-index: 4;
  border: clamp(7px, 1vw, 13px) solid color-mix(in srgb, var(--c-text) 4%, transparent);
  box-shadow: inset 0 0 120px color-mix(in srgb, var(--c-bg) 46%, transparent);
}

.welcome-scene {
  z-index: 1;
  width: min(94vw, 680px);
  padding: 32px;
  perspective: 1000px;
  transform: translate3d(var(--scene-x), var(--scene-y), 0);
  transition: opacity 0.38s ease, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.hero-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: clamp(34px, 5vh, 54px) clamp(24px, 6vw, 68px) 30px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
  border-radius: 34px;
  background:
    linear-gradient(150deg, color-mix(in srgb, var(--ld-bg-card) 92%, transparent), color-mix(in srgb, var(--ld-bg-card) 72%, transparent));
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.34) inset,
    0 24px 80px color-mix(in srgb, var(--c-text) 10%, transparent);
}

.hero-card::before {
  position: absolute;
  top: 0;
  left: 12%;
  width: 76%;
  height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--c-primary) 72%, white), transparent);
  content: '';
}

.hero-card::after {
  position: absolute;
  top: -40%;
  left: -55%;
  width: 34%;
  height: 180%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.14), transparent);
  content: '';
  pointer-events: none;
  transform: rotate(18deg);
  animation: card-shine 9s 2.2s ease-in-out infinite;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: clamp(22px, 3.5vh, 34px);
  color: var(--c-text-3);
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.16em;
}

.eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #45c98a;
  box-shadow: 0 0 0 4px rgba(69, 201, 138, 0.12), 0 0 14px rgba(69, 201, 138, 0.42);
  animation: status-pulse 2.8s ease-in-out infinite;
}

.logo-stage {
  position: relative;
  display: grid;
  width: 154px;
  height: 154px;
  place-items: center;
}

.logo-halo {
  position: absolute;
  width: 112px;
  height: 112px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-primary) 20%, transparent);
  box-shadow: 0 0 44px color-mix(in srgb, var(--c-primary) 24%, transparent);
  animation: halo-breathe 4s ease-in-out infinite;
}

.logo-shell {
  position: relative;
  display: grid;
  width: 104px;
  height: 104px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 30px;
  background: var(--ld-bg-card);
  box-shadow:
    0 0 0 7px color-mix(in srgb, var(--ld-bg-card) 78%, transparent),
    0 16px 38px color-mix(in srgb, var(--c-primary) 22%, transparent);
  place-items: center;
  transform: rotate(-3deg);
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.logo-stage:hover .logo-shell { transform: rotate(0) scale(1.035); }
.logo-shell img { display: block; width: 100%; height: 100%; object-fit: cover; }

.orbit {
  position: absolute;
  border: 1px solid color-mix(in srgb, var(--c-primary) 29%, transparent);
  border-radius: 50%;
}

.orbit i {
  position: absolute;
  top: 50%;
  left: -3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 12px color-mix(in srgb, var(--c-primary) 80%, transparent);
}

.orbit-outer { inset: 2px; animation: orbit-spin 14s linear infinite; }
.orbit-inner { inset: 14px; border-style: dashed; opacity: 0.64; animation: orbit-spin 11s linear infinite reverse; }
.orbit-inner i { top: auto; right: 9px; bottom: 8px; left: auto; width: 4px; height: 4px; }

.logo-badge {
  position: absolute;
  right: 17px;
  bottom: 15px;
  display: grid;
  width: 29px;
  height: 29px;
  border: 3px solid var(--ld-bg-card);
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  font-size: 0.72rem;
  place-items: center;
  animation: badge-float 3.2s ease-in-out infinite;
}

.site-title {
  display: flex;
  gap: 0.08em;
  margin: 18px 0 0;
  color: var(--c-text);
  font-family: var(--font-serif, var(--font-body));
  font-size: clamp(2.25rem, 6vw, 3.25rem);
  font-weight: 780;
  letter-spacing: 0.08em;
  line-height: 1.16;
}

.title-char { display: inline-block; }

.slogan {
  display: flex;
  min-height: 1.8em;
  align-items: center;
  margin: 12px 0 0;
  color: var(--c-text-2);
  font-size: clamp(0.82rem, 2vw, 0.96rem);
  font-weight: 400;
  letter-spacing: 0.09em;
  line-height: 1.8;
}

.type-caret {
  width: 1px;
  height: 1.05em;
  margin-left: 4px;
  background: var(--c-primary);
  animation: caret-blink 0.9s steps(1) infinite;
}

.stats-row {
  display: grid;
  width: min(100%, 340px);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: clamp(22px, 3.5vh, 34px);
  padding: 13px 0;
  border-block: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
}

.stat-item {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.stat-item + .stat-item::before {
  position: absolute;
  top: 18%;
  bottom: 18%;
  left: 0;
  width: 1px;
  background: color-mix(in srgb, var(--border) 78%, transparent);
  content: '';
}

.stat-item strong {
  color: var(--c-text);
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  font-weight: 760;
}

.stat-item span { color: var(--c-text-3); font-size: 0.61rem; letter-spacing: 0.12em; }

.enter-btn {
  --button-x: 0px;
  --button-y: 0px;
  display: inline-flex;
  min-width: 164px;
  height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 25px;
  padding: 5px 6px 5px 24px;
  border: 0;
  border-radius: 999px;
  background: var(--c-primary);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--c-primary) 28%, transparent);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 680;
  letter-spacing: 0.1em;
  transform: translate3d(var(--button-x), var(--button-y), 0);
  transition: box-shadow 0.3s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}

.enter-btn:hover { box-shadow: 0 15px 38px color-mix(in srgb, var(--c-primary) 38%, transparent); }
.enter-btn:focus-visible { outline: 3px solid color-mix(in srgb, var(--c-primary) 30%, transparent); outline-offset: 4px; }
.enter-btn:disabled { cursor: default; opacity: 0.75; }

.enter-arrow {
  display: grid;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  font-size: 0.9rem;
  place-items: center;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease;
}

.enter-btn:hover .enter-arrow { background: rgba(255, 255, 255, 0.27); transform: rotate(-10deg) translateX(2px); }

.scroll-cue {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
  color: var(--c-text-3);
  font-size: 0.49rem;
  letter-spacing: 0.22em;
}

.scroll-cue i { position: relative; width: 32px; height: 1px; overflow: hidden; background: var(--border); }
.scroll-cue i::after {
  position: absolute;
  inset: 0;
  background: var(--c-primary);
  content: '';
  transform: translateX(-100%);
  animation: cue-line 2.5s 1.6s ease-in-out infinite;
}

.theme-toggle {
  position: fixed;
  top: max(24px, env(safe-area-inset-top));
  right: max(28px, env(safe-area-inset-right));
  z-index: 6;
  display: grid;
  width: 44px;
  height: 44px;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--ld-bg-card) 88%, transparent);
  color: var(--c-text-2);
  cursor: pointer;
  place-items: center;
  transition: border-color 0.25s ease, color 0.25s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.theme-toggle span {
  display: grid;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--c-bg-1);
  place-items: center;
}

.theme-toggle:hover { border-color: var(--c-primary); color: var(--c-primary); transform: rotate(12deg); }
.theme-toggle:focus-visible { outline: 3px solid color-mix(in srgb, var(--c-primary) 28%, transparent); outline-offset: 3px; }

.corner-mark {
  position: fixed;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--c-text-3);
  font-size: 0.49rem;
  font-weight: 650;
  letter-spacing: 0.2em;
  writing-mode: vertical-rl;
}

.corner-mark i { width: 1px; height: 34px; background: color-mix(in srgb, var(--border) 85%, transparent); }
.corner-mark-top { top: 30px; left: 30px; }
.corner-mark-bottom { right: 31px; bottom: 30px; transform: rotate(180deg); }

.welcome-page:not(.intro-complete) [data-reveal] { opacity: 0; }
.welcome-page.is-leaving .welcome-scene { opacity: 0; transform: translate3d(0, -12px, 0) scale(0.96); }
.welcome-page.is-leaving .aurora { opacity: 0.2; transform: scale(1.18); transition: opacity 0.45s ease, transform 0.45s ease; }
.welcome-page.is-leaving .page-vignette { border-width: min(8vw, 82px); transition: border-width 0.46s cubic-bezier(0.65, 0, 0.35, 1); }

@keyframes orbit-spin { to { transform: rotate(360deg); } }
@keyframes halo-breathe { 50% { opacity: 0.58; transform: scale(1.12); } }
@keyframes badge-float { 50% { transform: translateY(-5px) rotate(8deg); } }
@keyframes status-pulse { 50% { box-shadow: 0 0 0 7px rgba(69, 201, 138, 0.04), 0 0 18px rgba(69, 201, 138, 0.5); } }
@keyframes caret-blink { 50% { opacity: 0; } }
@keyframes cue-line { 45%, 55% { transform: translateX(0); } 100% { transform: translateX(100%); } }
@keyframes aurora-drift-one { to { transform: translate3d(8vw, 5vh, 0) scale(1.12); } }
@keyframes aurora-drift-two { to { transform: translate3d(-7vw, -5vh, 0) scale(1.08); } }
@keyframes card-shine { 0%, 66% { left: -55%; } 86%, 100% { left: 135%; } }

@media (max-width: 680px) {
  .welcome-page { min-height: 100%; }
  .welcome-scene { width: 100%; padding: max(18px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
  .hero-card { padding: clamp(27px, 5vh, 40px) 19px 23px; border-radius: 27px; }
  .eyebrow { margin-bottom: 15px; font-size: 0.61rem; }
  .logo-stage { width: 130px; height: 130px; }
  .logo-shell { width: 88px; height: 88px; border-radius: 26px; }
  .logo-halo { width: 94px; height: 94px; }
  .logo-badge { right: 11px; bottom: 11px; }
  .site-title { margin-top: 12px; font-size: clamp(2rem, 11vw, 2.65rem); }
  .slogan { min-height: 3.35em; max-width: 92%; align-items: flex-start; justify-content: center; font-size: 0.78rem; line-height: 1.65; text-wrap: balance; }
  .stats-row { width: min(94%, 320px); margin-top: 17px; padding: 11px 0; }
  .enter-btn { margin-top: 20px; }
  .scroll-cue { margin-top: 16px; }
  .theme-toggle { top: max(15px, env(safe-area-inset-top)); right: max(15px, env(safe-area-inset-right)); width: 40px; height: 40px; }
  .corner-mark { display: none; }
  .grid-plane { inset: 46% -60% -40%; }
  .aurora { width: 90vw; height: 90vw; }
  .aurora-one { inset: -31vw auto auto -40vw; }
  .aurora-two { inset: auto -47vw -33vw auto; }
}

@media (max-height: 700px) {
  .hero-card { padding-top: 25px; padding-bottom: 19px; }
  .eyebrow { margin-bottom: 10px; }
  .logo-stage { width: 118px; height: 118px; }
  .logo-shell { width: 80px; height: 80px; border-radius: 23px; }
  .logo-halo { width: 86px; height: 86px; }
  .logo-badge { right: 8px; bottom: 8px; }
  .site-title { margin-top: 8px; font-size: 2rem; }
  .slogan { margin-top: 7px; }
  .stats-row { margin-top: 12px; padding: 8px 0; }
  .enter-btn { height: 44px; margin-top: 14px; }
  .enter-arrow { width: 32px; height: 32px; }
  .scroll-cue { margin-top: 10px; }
}

@media (prefers-reduced-motion: reduce) {
  .welcome-page *,
  .welcome-page *::before,
  .welcome-page *::after { scroll-behavior: auto !important; animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
  .welcome-page:not(.intro-complete) [data-reveal] { opacity: 1; }
  .welcome-scene,
  .aurora,
  .grid-plane { transform: none; }
}
</style>

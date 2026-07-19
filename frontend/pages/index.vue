<template>
  <div class="welcome-page">
    <canvas ref="particleCanvas" class="particle-canvas" />

    <div class="welcome-container">
      <div class="logo-ring">
        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face" alt="logo">
      </div>
      <div class="site-title">清欢小筑</div>
      <div class="slogan"><span ref="typewriterEl" class="typewriter" /></div>
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-num">128</span>
          <span class="stat-label">文章</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">2,340</span>
          <span class="stat-label">评论</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">56K</span>
          <span class="stat-label">访问</span>
        </div>
      </div>
      <button class="enter-btn" @click="enterSite">进入小筑</button>
    </div>

    <button class="theme-toggle" @click="toggleTheme"><Icon :name="themeIcon" /></button>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'welcome' })

const router = useRouter()

const particleCanvas = ref<HTMLCanvasElement | null>(null)
const typewriterEl = ref<HTMLSpanElement | null>(null)

const themeIcon = ref('ph:moon-bold')
let animationId = 0
let particles: Particle[] = []
let typewriterTimer = 0

interface Particle {
  x: number
  y: number
  r: number
  speed: number
  drift: number
  opacity: number
}

function enterSite() {
  router.push('/home')
}

function toggleTheme() {
  const html = document.documentElement
  html.classList.toggle('dark')
  themeIcon.value = html.classList.contains('dark') ? 'ph:sun-bold' : 'ph:moon-bold'
}

function initTypewriter() {
  const slogan = '雨过天晴云破处，这般颜色做将来'
  let ci = 0
  function typeChar() {
    if (ci < slogan.length && typewriterEl.value) {
      typewriterEl.value.textContent += slogan[ci++]
      typewriterTimer = window.setTimeout(typeChar, 100 + Math.random() * 60)
    }
  }
  typewriterTimer = window.setTimeout(typeChar, 1200)
}

function initParticles() {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const COUNT = 60

  function resize() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  function createParticle(): Particle {
    return {
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * canvas.height,
      r: 1.5 + Math.random() * 2.5,
      speed: 0.3 + Math.random() * 0.7,
      drift: (Math.random() - 0.5) * 0.4,
      opacity: 0.15 + Math.random() * 0.35,
    }
  }

  const pts: Particle[] = []
  for (let i = 0; i < COUNT; i++) {
    const p = createParticle()
    p.y = Math.random() * canvas.height
    pts.push(p)
  }
  particles = pts

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const isDark = document.documentElement.classList.contains('dark')
    const baseColor = isDark ? '180,200,230' : '100,120,160'
    particles.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${baseColor},${p.opacity})`
      ctx.fill()
      p.y += p.speed
      p.x += p.drift + Math.sin(p.y * 0.008) * 0.3
      if (p.y > canvas.height + 10) {
        Object.assign(p, createParticle())
        p.y = -10
      }
    })
    animationId = requestAnimationFrame(animate)
  }
  animate()
}

onMounted(() => {
  initTypewriter()
  initParticles()
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  clearTimeout(typewriterTimer)
})
</script>

<style scoped>
.welcome-page {
  font-family: 'LXGW WenKai', serif;
  background: var(--c-bg);
  color: var(--c-text);
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.4s, color 0.4s;
}

.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.welcome-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  text-align: center;
}

.logo-ring {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 0 3px var(--c-primary), 0 0 0 8px var(--c-primary-soft), 0 10px 40px rgba(0,0,0,0.1);
  animation: float-in 1s ease-out;
  flex-shrink: 0;
}

.logo-ring img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.site-title {
  font-size: 2.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  animation: fade-up 1s ease-out 0.3s both;
  color: var(--c-text);
}

.slogan {
  font-size: 1.05rem;
  color: var(--c-text-2);
  font-weight: 300;
  letter-spacing: 0.08em;
  animation: fade-up 1s ease-out 0.6s both;
}

.typewriter {
  display: inline-block;
  border-right: 2px solid var(--c-primary);
  animation: blink 0.8s step-end infinite;
}

.stats-row {
  display: flex;
  gap: 40px;
  margin-top: 10px;
  animation: fade-up 1s ease-out 0.9s both;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-num {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--c-primary);
}

.stat-label {
  font-size: 0.78rem;
  color: var(--c-text-2);
  letter-spacing: 0.1em;
}

.enter-btn {
  margin-top: 16px;
  padding: 12px 44px;
  border: 1.5px solid var(--c-primary);
  border-radius: 40px;
  background: transparent;
  color: var(--c-primary);
  font-family: inherit;
  font-size: 0.95rem;
  letter-spacing: 0.12em;
  cursor: pointer;
  transition: all 0.3s;
  animation: fade-up 1s ease-out 1.2s both;
}

.enter-btn:hover {
  background: var(--c-primary);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 6px 24px color-mix(in srgb, var(--c-primary) 40%, transparent);
}

.theme-toggle {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 10;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: var(--ld-bg-card);
  color: var(--c-text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  transition: all 0.3s;
  box-shadow: 0 2px 4px var(--ld-shadow);
}

.theme-toggle:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}

@keyframes float-in {
  from { opacity: 0; transform: scale(0.7) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes blink {
  from, to { border-color: transparent; }
  50% { border-color: var(--c-primary); }
}
</style>

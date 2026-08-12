<template>
  <div ref="rootRef" class="sea-scene" :class="{ 'sea-scene-disabled': disabled }">
    <canvas ref="canvasRef" class="sea-canvas" />
    <span v-if="splash" class="sea-splash-text">{{ splash }}</span>
    <div class="sea-bottles">
      <button
        v-for="b in bottles"
        :key="b.id"
        type="button"
        class="sea-bottle-item"
        :class="`seed-${b.seed % 6}`"
        :data-id="b.id"
        :style="bottleStyle(b)"
        :title="`来自时光海的一封信 · 已漂 ${b.chainLength} 段`"
        :disabled="disabled"
        @click="onClickBottle(b)"
      >
        <svg viewBox="0 0 64 84" class="bottle-svg" aria-hidden="true">
          <defs>
            <linearGradient id="bottle-glass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="rgba(255,255,255,.55)" />
              <stop offset="45%" stop-color="rgba(160,210,255,.22)" />
              <stop offset="100%" stop-color="rgba(90,150,220,.35)" />
            </linearGradient>
          </defs>
          <path d="M24 10h16v10h4v20a12 12 0 0 1-24 0V20h4z" fill="url(#bottle-glass)" stroke="rgba(255,255,255,.35)" stroke-width="1" />
          <path d="M26 12h12" stroke="rgba(255,255,255,.5)" stroke-width="2" stroke-linecap="round" />
          <rect x="25" y="6" width="14" height="5" rx="2" fill="rgba(180,120,70,.85)" />
          <path d="M20 26c8 3 16 3 24 0" stroke="rgba(255,255,255,.4)" fill="none" stroke-width="1.4" stroke-linecap="round" />
          <circle cx="20" cy="38" r="3" fill="rgba(255,255,255,.5)" />
          <path d="M24 34h16M24 40h16" stroke="rgba(255,255,255,.35)" stroke-width="1.6" stroke-linecap="round" />
          <rect x="27" y="26" width="10" height="14" rx="2" fill="rgba(245,240,225,.9)" transform="rotate(4 32 33)" />
          <path d="M29 30h6M29 34h6" stroke="rgba(140,110,80,.8)" stroke-width="1.2" stroke-linecap="round" />
          <path d="M28 22a10 10 0 0 1 8 0" stroke="rgba(255,255,255,.25)" fill="none" stroke-width="1.2" />
        </svg>
        <i class="bottle-initial">{{ b.chainLength }}段</i>
        <span class="bottle-hint">捞起这只</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { gsap } from "gsap";

export interface PeekBottle {
  id: string;
  nicknameFirstChar: string;
  chainLength: number;
  seed: number;
}

const props = withDefaults(
  defineProps<{
    bottles: PeekBottle[];
    disabled?: boolean;
  }>(),
  { disabled: false },
);
const emit = defineEmits<{ (e: "fish", bottle: PeekBottle): void }>();

const rootRef = ref<HTMLDivElement>();
const canvasRef = ref<HTMLCanvasElement>();
const splash = ref("");
let splashTimer: ReturnType<typeof setTimeout> | null = null;

function mulberry(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function bottleStyle(b: PeekBottle) {
  const rand = mulberry(b.seed + 17);
  const x = 6 + rand() * 84;
  const y = 30 + rand() * 44;
  return {
    left: `${x}%`,
    top: `${y}%`,
    "--bw": `${34 * (0.8 + rand() * 0.5)}px`,
    "--bh": `${46 * (0.8 + rand() * 0.5)}px`,
    "--br": `${-14 + rand() * 28}deg`,
  };
}

function showSplash(text: string) {
  splash.value = text;
  if (splashTimer) clearTimeout(splashTimer);
  splashTimer = setTimeout(() => (splash.value = ""), 2200);
}

// ===== Canvas 海面 =====
let ctx: CanvasRenderingContext2D | null = null;
let rafId = 0;
let reduceMotion = false;
const particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; size: number }> = [];

function resizeCanvas() {
  const root = rootRef.value;
  const canvas = canvasRef.value;
  if (!root || !canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = root.clientWidth * dpr;
  canvas.height = root.clientHeight * dpr;
  ctx = canvas.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawFrame(t: number) {
  const canvas = canvasRef.value;
  if (!ctx || !canvas) return;
  const w = canvas.width / Math.min(window.devicePixelRatio || 1, 2);
  const h = canvas.height / Math.min(window.devicePixelRatio || 1, 2);
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  const waveColors = ["rgba(120,180,255,.16)", "rgba(170,215,255,.10)", "rgba(255,255,255,.06)"];
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    ctx.strokeStyle = waveColors[layer];
    ctx.lineWidth = 1.6 - layer * 0.35;
    const amp = 5 + layer * 2.4;
    const speed = 0.0009 + layer * 0.00022;
    const freq = 0.012 + layer * 0.005;
    ctx.moveTo(0, h * (0.28 + layer * 0.2));
    for (let x = 0; x <= w; x += 4) {
      const y =
        h * (0.28 + layer * 0.2) +
        Math.sin(x * freq + t * speed) * amp +
        Math.sin(x * freq * 2.3 - t * speed * 1.6) * amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // 高光波点
  ctx.fillStyle = "rgba(255,255,255,.12)";
  for (let i = 0; i < 7; i++) {
    const px = (i * 137.5 + t * 0.012) % w;
    const py = h * 0.32 + Math.sin(px * 0.02 + t * 0.0011) * 12;
    ctx.beginPath();
    ctx.arc(px, py, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // 粒子
  ctx.globalCompositeOperation = "source-over";
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.16;
    p.life -= 0.022;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,230,255,${Math.max(p.life, 0) * 0.8})`;
    ctx.fill();
  }
}

function loop(time: number) {
  drawFrame(time);
  rafId = requestAnimationFrame(loop);
}

function burst(x: number, y: number, count = 18) {
  const root = rootRef.value;
  if (!root || reduceMotion) return;
  const rect = root.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 2.6;
    particles.push({
      x: x - rect.left,
      y: y - rect.top,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed - 2.2,
      life: 1,
      size: 1 + Math.random() * 2.2,
    });
  }
}

// ===== 漂浮与交互动画 =====
let floatTweens: gsap.core.Tween[] = [];
let launching = false;

function startFloat(el: HTMLElement, seed: number) {
  const rand = mulberry(seed * 7 + 3);
  const baseScale = 0.8 + rand() * 0.5;
  const baseRot = -14 + rand() * 28;
  gsap.set(el, {
    scale: baseScale,
    rotation: baseRot,
    transformOrigin: "50% 85%",
  });
  if (reduceMotion) return;
  const durY = 1.9 + rand() * 1.5;
  const durX = 4 + rand() * 3;
  const ampY = 5 + rand() * 5;
  const ampX = 9 + rand() * 14;
  const rotAmp = 2.4 + rand() * 3.2;
  const tweenY = gsap.to(el, {
    y: `+=${ampY}`,
    rotation: `+=${rotAmp}`,
    duration: durY,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
    delay: rand() * 2,
  });
  const tweenX = gsap.to(el, {
    x: `+=${ampX}`,
    duration: durX,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
    delay: rand() * 3,
  });
  floatTweens.push(tweenY, tweenX);
}

function animateBottles() {
  const root = rootRef.value;
  if (!root) return;
  root
    .querySelectorAll<HTMLElement>(".sea-bottle-item[data-id]:not(.is-animated)")
    .forEach((el) => {
      const id = el.dataset.id;
      const b = props.bottles.find((x) => x.id === id);
      if (!b) return;
      el.classList.add("is-animated");
      startFloat(el, b.seed);
    });
}

function onClickBottle(b: PeekBottle) {
  if (props.disabled || launching) return;
  const el = rootRef.value?.querySelector<HTMLElement>(`.sea-bottle-item[data-id="${b.id}"]`);
  if (!el) return;
  if (reduceMotion) {
    emit("fish", b);
    return;
  }
  launching = true;
  const rect = el.getBoundingClientRect();
  const rootRect = rootRef.value!.getBoundingClientRect();
  burst(rect.left - rootRect.left + rect.width / 2, rect.top - rootRect.top + rect.height / 2, 14);
  const tl = gsap.timeline({
    onComplete: () => {
      launching = false;
      floatTweens.forEach((t) => t.kill());
      floatTweens = [];
      rootRef.value
        ?.querySelectorAll<HTMLElement>(".sea-bottle-item")
        .forEach((item) => {
          item.classList.remove("is-animated");
          gsap.set(item, { clearProps: "transform" });
        });
      void nextTick().then(animateBottles);
      emit("fish", b);
    },
  });
  tl.to(el, { y: "-=70", rotation: "+=160", duration: 0.55, ease: "power2.in" }, 0)
    .to(el, { scale: 0.01, opacity: 0, duration: 0.28, ease: "power1.in" }, 0.55)
    .add(() => burst(rect.left - rootRect.left + rect.width / 2, rect.top - rootRect.top - 26, 22), 0.6);
}

function launch(cb?: () => void) {
  const root = rootRef.value;
  if (!root || reduceMotion) {
    cb?.();
    return;
  }
  launching = true;
  const rand = mulberry(Date.now() % 997 + 5);
  const el = document.createElement("button");
  el.type = "button";
  el.className = "sea-bottle-item seed-" + (rand() * 6 | 0);
  el.style.cssText = `left:0;top:38%;position:absolute;z-index:5;`;
  el.innerHTML = `<svg viewBox="0 0 64 84" class="bottle-svg" aria-hidden="true"><path d="M24 10h16v10h4v20a12 12 0 0 1-24 0V20h4z" fill="rgba(190,225,255,.4)" stroke="rgba(255,255,255,.4)" stroke-width="1"/><path d="M26 12h12" stroke="rgba(255,255,255,.5)" stroke-width="2" stroke-linecap="round"/><rect x="25" y="6" width="14" height="5" rx="2" fill="rgba(180,120,70,.85)"/></svg>`;
  root.querySelector(".sea-bottles")!.appendChild(el);
  gsap.set(el, { scale: 1, rotation: 0, transformOrigin: "50% 85%" });
  const w = root.clientWidth;
  const h = root.clientHeight;
  const targetX = 8 + rand() * 82;
  const targetY = 30 + rand() * 42;
  const tl = gsap.timeline({
    onComplete: () => {
      el.remove();
      launching = false;
      cb?.();
    },
  });
  tl.fromTo(
    el,
    { x: w * 1.15, y: -60, rotation: 90, opacity: 1 },
    { x: w * 0.52, y: h * 0.55, rotation: 30, duration: 1.05, ease: "none" },
    0,
  )
    .to(el, { x: w * 0.52, y: h * 0.6, duration: 0.22, ease: "power2.in" }, 1.05)
    .add(() => burst(w * 0.52, h * 0.6, 26), 1.26)
    .to(el, { opacity: 0, duration: 0.18 }, 1.26)
    .to(el, { opacity: 1, duration: 0.4 }, 1.5)
    .to(el, { x: w * (targetX / 100), y: h * (targetY / 100), duration: 1.1, ease: "power2.out" }, 1.62);
}

defineExpose({ launch });

watch(
  () => props.bottles.map((b) => b.id).join(","),
  () => {
    void nextTick().then(animateBottles);
  },
  { immediate: true },
);

onMounted(() => {
  reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  if (!reduceMotion) rafId = requestAnimationFrame(loop);
  void nextTick().then(animateBottles);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  window.removeEventListener("resize", resizeCanvas);
  floatTweens.forEach((t) => t.kill());
  floatTweens = [];
});
</script>

<style scoped>
.sea-scene {
  position: relative;
  width: 100%;
  height: 250px;
  overflow: hidden;
  border-radius: 18px;
  background:
    radial-gradient(120% 130% at 30% 20%, hsl(218deg 76% 52%), hsl(222deg 88% 34%) 46%, hsl(224deg 92% 18%) 78%, hsl(226deg 96% 10%));
  box-shadow: inset 0 -18px 40px rgb(4 12 32 / 55%), inset 0 12px 26px rgb(255 255 255 / 12%);
  isolation: isolate;
  user-select: none;
}
.sea-scene::before {
  position: absolute;
  z-index: 1;
  inset: -40px;
  border-radius: 50%;
  background: radial-gradient(circle at 24% 18%, rgb(214 235 255 / 14%), transparent 60%);
  content: "";
  pointer-events: none;
}
.sea-canvas {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.sea-bottles {
  position: absolute;
  z-index: 2;
  inset: 0;
}
.sea-bottle-item {
  position: absolute;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  animation: bottle-in 0.8s ease both;
  width: var(--bw, 34px);
  height: var(--bh, 46px);
  margin-left: calc(var(--bw, 34px) / -2);
  margin-top: calc(var(--bh, 46px) / -2);
  transition: filter 0.25s ease;
  filter: drop-shadow(0 8px 14px rgb(0 8 26 / 45%));
}
.sea-bottle-item.is-animated {
  opacity: 1;
}
.sea-bottle-item:hover:not(:disabled) {
  filter: drop-shadow(0 10px 20px rgb(140 200 255 / 55%)) brightness(1.25);
  z-index: 6;
}
.sea-bottle-item:disabled {
  cursor: not-allowed;
  filter: saturate(0.6);
}
.bottle-svg {
  width: 100%;
  height: 100%;
}
.bottle-initial {
  position: absolute;
  right: -8px;
  bottom: 2px;
  display: grid;
  min-width: 18px;
  height: 14px;
  padding: 0 4px;
  border: 2px solid rgb(10 24 46 / 85%);
  border-radius: 999px;
  background: #ffd9a0;
  color: #5a3d1a;
  font-size: 0.4rem;
  font-style: normal;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  place-items: center;
}
.bottle-hint {
  position: absolute;
  top: -26px;
  left: 50%;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgb(255 255 255 / 92%);
  color: #1c4a8c;
  font-size: 0.54rem;
  font-weight: 700;
  white-space: nowrap;
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}
.sea-bottle-item:hover .bottle-hint {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.seed-1 { --tint: hue-rotate(18deg); }
.seed-2 { --tint: hue-rotate(-16deg) saturate(1.15); }
.seed-3 { --tint: hue-rotate(40deg) saturate(1.1); }
.seed-4 { --tint: hue-rotate(-36deg); }
.seed-5 { --tint: hue-rotate(64deg) saturate(1.2); }
.sea-splash-text {
  position: absolute;
  z-index: 8;
  top: 50%;
  left: 50%;
  color: rgb(235 245 255 / 95%);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-shadow: 0 2px 10px rgb(0 20 60 / 60%);
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: splash-fade 2.2s ease both;
}
@keyframes bottle-in {
  from { opacity: 0; margin-top: calc(var(--bh, 46px) / -2 + 14px); }
}
@keyframes splash-fade {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  18% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) translateY(-10px); }
}
@media (prefers-reduced-motion: reduce) {
  .sea-bottle-item { animation: none; }
  .sea-splash-text { animation: none; }
}
</style>

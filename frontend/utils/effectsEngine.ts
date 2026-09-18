// 全站特效引擎 v2：点击爆发（烟花/星尘/爱心）+ 常驻氛围（花瓣/萤火/星光）。
// 全部运动基于时间步长（秒），高刷屏与低刷屏速度一致；
// 预渲染贴图 + 单 rAF 循环 + 粒子池上限，渲染只做 drawImage，不阻塞 UI。

export type ClickEffectKind = "none" | "fireworks" | "stardust" | "hearts";
export type AmbientEffectKind = "none" | "petals" | "fireflies" | "starlight";

export interface EffectConfig {
  clickEffect: ClickEffectKind;
  clickCount: number;
  clickSpeed: number;
  ambientEffect: AmbientEffectKind;
  ambientDensity: number;
  ambientSpeed: number;
}

export const DEFAULT_EFFECT_CONFIG: EffectConfig = {
  clickEffect: "stardust",
  clickCount: 26,
  clickSpeed: 1,
  ambientEffect: "starlight",
  ambientDensity: 16,
  ambientSpeed: 1,
};

type ParticleKind =
  | "spark"      // 烟花主体
  | "ember"      // 烟花余烬（重力下落闪烁）
  | "star"       // 星尘（点击）/ 星光（氛围）
  | "heart"
  | "petal"
  | "fly";

interface Sprite {
  canvas: HTMLCanvasElement;
  size: number;
}

interface Particle {
  active: boolean;
  ambient: boolean;
  kind: ParticleKind;
  sprite: Sprite | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  phase: number;
  freq: number;
  amp: number;
  twinkle: number;
  gravity: number;
  drag: number;
  depth: number;      // 0 远 ~ 1 近：影响尺寸与透明度层次
  spin: number;       // 花瓣 scaleX 摆动相位
  spinSpeed: number;
  fadePower: number;  // 淡出曲线指数
}

const MAX_CLICK_PARTICLES = 420;
const MAX_AMBIENT_PARTICLES = 180;
const MAX_PARTICLES = MAX_CLICK_PARTICLES + MAX_AMBIENT_PARTICLES;

function makeSprite(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, size);
  return { canvas, size };
}

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;
}

/** 烟花火星：核心炽白 → 主色 → 透明，三层光晕 */
function sparkSprite(color: string, size = 44): Sprite {
  return makeSprite(size, (ctx, s) => {
    const half = s / 2;
    const g = ctx.createRadialGradient(half, half, 0, half, half, half);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.18, color);
    g.addColorStop(0.42, withAlpha(color, 0.5));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/** 四芒星：细长尖芒 + 中心光点（星尘/星光共用） */
function starSprite(color: string, size = 52): Sprite {
  return makeSprite(size, (ctx, s) => {
    const half = s / 2;
    const glow = ctx.createRadialGradient(half, half, 0, half, half, half);
    glow.addColorStop(0, withAlpha(color, 0.55));
    glow.addColorStop(0.5, withAlpha(color, 0.16));
    glow.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, s, s);

    ctx.translate(half, half);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 4; i += 1) {
      const angle = (Math.PI / 2) * i;
      const spike = half * 0.92;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle - 0.12) * half * 0.1, Math.sin(angle - 0.12) * half * 0.1);
      ctx.lineTo(Math.cos(angle) * spike, Math.sin(angle) * spike);
      ctx.lineTo(Math.cos(angle + 0.12) * half * 0.1, Math.sin(angle + 0.12) * half * 0.1);
      ctx.closePath();
    }
    ctx.fill();
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, half * 0.3);
    core.addColorStop(0, "#ffffff");
    core.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** 爱心：渐变主体 + 顶部高光 */
function heartSprite(color: string, light: string, size = 48): Sprite {
  return makeSprite(size, (ctx, s) => {
    const half = s / 2;
    ctx.translate(half, half);
    ctx.scale(half / 16, half / 16);
    const g = ctx.createLinearGradient(0, -14, 0, 8);
    g.addColorStop(0, light);
    g.addColorStop(0.55, color);
    g.addColorStop(1, withAlpha(color, 0.82));
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-15, -7, -8.5, -17, 0, -8.5);
    ctx.bezierCurveTo(8.5, -17, 15, -7, 0, 6);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.shadowColor = withAlpha(color, 0.55);
    ctx.shadowBlur = 7;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(-5.4, -7.2, 3.4, 1.9, -0.65, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fill();
  });
}

/** 花瓣：双色渐变 + 顶端微缺口 + 叶脉，樱花感 */
function petalSprite(base: string, deep: string, size = 44): Sprite {
  return makeSprite(size, (ctx, s) => {
    const half = s / 2;
    ctx.translate(half, half);
    const w = half * 0.82;
    const g = ctx.createLinearGradient(0, -half, 0, half);
    g.addColorStop(0, base);
    g.addColorStop(1, deep);
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.92);
    ctx.bezierCurveTo(w, -half * 0.5, w * 0.9, half * 0.55, 0, half * 0.92);
    ctx.bezierCurveTo(-w * 0.9, half * 0.55, -w, -half * 0.5, 0, -half * 0.92);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    // 顶端微缺口
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.92);
    ctx.quadraticCurveTo(half * 0.1, -half * 0.7, 0, -half * 0.6);
    ctx.quadraticCurveTo(-half * 0.1, -half * 0.7, 0, -half * 0.92);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fill();
    // 叶脉
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.55);
    ctx.quadraticCurveTo(half * 0.08, 0, 0, half * 0.8);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

/** 萤火：小核心 + 大光晕，双层 */
function flySprite(color: string, size = 72): Sprite {
  return makeSprite(size, (ctx, s) => {
    const half = s / 2;
    const halo = ctx.createRadialGradient(half, half, 0, half, half, half);
    halo.addColorStop(0, withAlpha(color, 0.5));
    halo.addColorStop(0.35, withAlpha(color, 0.18));
    halo.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, s, s);
    const core = ctx.createRadialGradient(half, half, 0, half, half, half * 0.22);
    core.addColorStop(0, "#fffff2");
    core.addColorStop(0.5, withAlpha(color, 0.9));
    core.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, s, s);
  });
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("hsl(") || color.startsWith("hsla(")) {
    const body = color.replace(/^hsla?\(/, "").replace(/\)$/, "").split(",")[0];
    const rest = color.slice(color.indexOf("(") + 1, color.lastIndexOf(")"));
    const parts = rest.split(",").map((part) => part.trim());
    return `hsla(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
  }
  return color;
}

const FIREWORK_HUES = [28, 340, 205, 262, 48, 160];

export class EffectEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private config: EffectConfig = { ...DEFAULT_EFFECT_CONFIG };
  private particles: Particle[] = [];
  private rafId = 0;
  private running = false;
  private interactive: boolean;
  private hue = 152;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private lastFrame = 0;
  private time = 0;
  private sprites: {
    sparks: Sprite[];
    embers: Sprite[];
    stars: Sprite[];
    hearts: Sprite[];
    petals: Sprite[];
    fly: Sprite;
  } | null = null;

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']") ||
        target.closest(".no-click-effect"))
    ) {
      return;
    }
    this.burst(event.clientX, event.clientY);
  };

  private onVisibility = () => {
    if (document.hidden) this.pauseLoop();
    else if (this.running) this.resumeLoop();
  };

  private resizeListener = () => this.resize();

  constructor(canvas: HTMLCanvasElement, options?: { interactive?: boolean }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.interactive = options?.interactive ?? false;
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      this.particles.push({
        active: false,
        ambient: false,
        kind: "spark",
        sprite: null,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 4,
        rotation: 0,
        rotationSpeed: 0,
        phase: 0,
        freq: 0,
        amp: 0,
        twinkle: 0,
        gravity: 0,
        drag: 1,
      depth: 1,
      spin: 0,
      spinSpeed: 0,
      fadePower: 1,
    });
    }
    this.resize();
  }

  setPalette(hue: number) {
    this.hue = hue;
    this.buildSprites();
  }

  setConfig(config: EffectConfig) {
    const ambientChanged = config.ambientEffect !== this.config.ambientEffect;
    this.config = { ...config };
    if (ambientChanged) this.resetAmbient();
  }

  /** 在指定坐标（CSS 像素）触发一次点击特效 */
  burst(clientX: number, clientY: number) {
    if (this.config.clickEffect === "none" || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < -60 || y < -60 || x > rect.width + 60 || y > rect.height + 60) return;
    const count = Math.max(8, Math.round(this.config.clickCount));
    const speed = this.config.clickSpeed;
    if (this.config.clickEffect === "fireworks") this.burstFireworks(x, y, count, speed);
    else if (this.config.clickEffect === "stardust") this.burstStardust(x, y, count, speed);
    else this.burstHearts(x, y, count, speed);
    this.resumeLoop();
  }

  start() {
    if (this.running || !this.ctx) return;
    this.running = true;
    this.resetAmbient();
    window.addEventListener("resize", this.resizeListener, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    if (this.interactive) window.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    this.resumeLoop();
  }

  stop() {
    this.running = false;
    this.pauseLoop();
    window.removeEventListener("resize", this.resizeListener);
    document.removeEventListener("visibilitychange", this.onVisibility);
    if (this.interactive) window.removeEventListener("pointerdown", this.onPointerDown);
  }

  destroy() {
    this.stop();
    this.particles.length = 0;
  }

  /* ---------------- 特效编排 ---------------- */

  private burstFireworks(x: number, y: number, count: number, speed: number) {
    const half = Math.max(6, Math.round(count / 2));
    for (let i = 0; i < count; i += 1) {
      const isEmber = i >= half;
      const particle = this.acquire();
      if (!particle || !this.sprites) return;
      const index = isEmber ? i - half : i;
      const angle = (Math.PI * 2 * index) / half + (Math.random() - 0.5) * 0.22;
      const velocity = isEmber
        ? (1.1 + Math.random() * 1.6) * speed
        : (2.6 + Math.random() * 2.8) * speed;
      const sprite = isEmber
        ? this.sprites.embers[index % this.sprites.embers.length]
        : this.sprites.sparks[index % this.sprites.sparks.length];
      this.init(particle, isEmber ? "ember" : "spark", sprite, x, y);
      particle.vx = Math.cos(angle) * velocity * 60;
      particle.vy = Math.sin(angle) * velocity * 60 - (isEmber ? 20 : 40);
      particle.maxLife = isEmber ? 1.15 + Math.random() * 0.7 : 0.72 + Math.random() * 0.4;
      particle.life = particle.maxLife;
      particle.size = (isEmber ? 3.4 : 5) + Math.random() * (isEmber ? 2.6 : 4.4);
      particle.gravity = isEmber ? 150 : 62;
      particle.drag = isEmber ? 1.4 : 2.2;
      particle.twinkle = isEmber ? 9 + Math.random() * 8 : 0;
      particle.depth = 0.72 + Math.random() * 0.28;
      particle.fadePower = isEmber ? 1.15 : 1.6;
    }
  }

  private burstStardust(x: number, y: number, count: number, speed: number) {
    for (let i = 0; i < count; i += 1) {
      const particle = this.acquire();
      if (!particle || !this.sprites) return;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.7) * 52;
      const sprite = this.sprites.stars[i % this.sprites.stars.length];
      this.init(particle, "star", sprite, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * 0.7);
      particle.vx = Math.cos(angle) * (10 + Math.random() * 26) * speed;
      particle.vy = (-34 - Math.random() * 58) * speed;
      particle.maxLife = 1.15 + Math.random() * 0.85;
      particle.life = particle.maxLife;
      particle.size = 4.5 + Math.random() * 9;
      particle.rotation = Math.random() * Math.PI;
      particle.rotationSpeed = (Math.random() - 0.5) * 1.6;
      particle.phase = Math.random() * Math.PI * 2;
      particle.freq = 1.2 + Math.random() * 1.8;
      particle.amp = 8 + Math.random() * 16;
      particle.twinkle = 5 + Math.random() * 6;
      particle.drag = 0.6;
      particle.depth = 0.6 + Math.random() * 0.4;
      particle.fadePower = 1.25;
    }
  }

  private burstHearts(x: number, y: number, count: number, speed: number) {
    const hearts = Math.max(6, Math.round(count * 0.55));
    for (let i = 0; i < hearts; i += 1) {
      const particle = this.acquire();
      if (!particle || !this.sprites) return;
      const sprite = this.sprites.hearts[i % this.sprites.hearts.length];
      this.init(particle, "heart", sprite, x + (Math.random() - 0.5) * 46, y + (Math.random() - 0.5) * 22);
      particle.vx = (Math.random() - 0.5) * 26 * speed;
      particle.vy = (-52 - Math.random() * 70) * speed;
      particle.maxLife = 1.5 + Math.random() * 0.8;
      particle.life = particle.maxLife;
      particle.size = 9 + Math.random() * 12;
      particle.rotation = (Math.random() - 0.5) * 0.36;
      particle.rotationSpeed = (Math.random() - 0.5) * 0.8;
      particle.phase = Math.random() * Math.PI * 2;
      particle.freq = 1 + Math.random() * 1.4;
      particle.amp = 14 + Math.random() * 20;
      particle.drag = 0.35;
      particle.depth = 0.7 + Math.random() * 0.3;
      particle.fadePower = 1;
    }
    // 少量星尘点缀
    const dust = Math.max(4, Math.round(count * 0.28));
    for (let i = 0; i < dust; i += 1) {
      const particle = this.acquire();
      if (!particle || !this.sprites) return;
      this.init(particle, "star", this.sprites.stars[i % this.sprites.stars.length], x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 30);
      particle.vx = (Math.random() - 0.5) * 34 * speed;
      particle.vy = (-40 - Math.random() * 60) * speed;
      particle.maxLife = 0.9 + Math.random() * 0.6;
      particle.life = particle.maxLife;
      particle.size = 3 + Math.random() * 4.5;
      particle.phase = Math.random() * Math.PI * 2;
      particle.freq = 1.4;
      particle.amp = 6;
      particle.twinkle = 7;
      particle.drag = 0.6;
      particle.fadePower = 1.4;
    }
  }

  /* ---------------- 粒子生命周期 ---------------- */

  private init(
    particle: Particle,
    kind: ParticleKind,
    sprite: Sprite,
    x: number,
    y: number,
  ) {
    particle.active = true;
    particle.ambient = false;
    particle.kind = kind;
    particle.sprite = sprite;
    particle.x = x;
    particle.y = y;
    particle.vx = 0;
    particle.vy = 0;
    particle.rotation = 0;
    particle.rotationSpeed = 0;
    particle.phase = 0;
    particle.freq = 0;
    particle.amp = 0;
    particle.twinkle = 0;
    particle.gravity = 0;
    particle.drag = 1;
    particle.depth = 1;
    particle.spin = 0;
    particle.spinSpeed = 0;
    particle.fadePower = 1;
  }

  private acquire(): Particle | null {
    for (const particle of this.particles) {
      if (!particle.active) return particle;
    }
    return null;
  }

  /* ---------------- 氛围粒子 ---------------- */

  private ambientTarget(): number {
    if (this.config.ambientEffect === "none") return 0;
    return Math.min(MAX_AMBIENT_PARTICLES, Math.max(4, Math.round(this.config.ambientDensity)));
  }

  private resetAmbient() {
    for (const particle of this.particles) {
      if (particle.ambient) particle.active = false;
    }
    const target = this.ambientTarget();
    for (let i = 0; i < target; i += 1) this.spawnAmbient(true);
  }

  private spawnAmbient(initial: boolean): Particle | null {
    const particle = this.acquire();
    if (!particle || !this.sprites) return null;
    const speed = this.config.ambientSpeed;
    const kind = this.config.ambientEffect;
    particle.active = true;
    particle.ambient = true;
    particle.kind = kind === "petals" ? "petal" : kind === "fireflies" ? "fly" : "star";
    particle.maxLife = Infinity;
    particle.life = Infinity;
    particle.gravity = 0;
    particle.drag = 1;
    particle.fadePower = 1;

    if (kind === "petals") {
      particle.sprite = this.sprites.petals[Math.floor(Math.random() * this.sprites.petals.length)];
      particle.depth = 0.35 + Math.random() * 0.65;
      particle.x = Math.random() * this.width;
      particle.y = initial ? Math.random() * this.height : -30 - Math.random() * 80;
      particle.vx = (6 + Math.random() * 16) * speed * (0.4 + particle.depth * 0.6);
      particle.vy = (16 + Math.random() * 30) * speed * (0.4 + particle.depth * 0.6);
      particle.size = (10 + Math.random() * 13) * (0.55 + particle.depth * 0.45);
      particle.rotation = Math.random() * Math.PI * 2;
      particle.rotationSpeed = (Math.random() - 0.5) * 1.6;
      particle.phase = Math.random() * Math.PI * 2;
      particle.freq = 0.5 + Math.random() * 0.7;
      particle.amp = 18 + Math.random() * 30;
      particle.spin = Math.random() * Math.PI * 2;
      particle.spinSpeed = 0.9 + Math.random() * 1.8;
    } else if (kind === "fireflies") {
      particle.sprite = this.sprites.fly;
      particle.depth = 0.45 + Math.random() * 0.55;
      particle.x = Math.random() * this.width;
      particle.y = initial
        ? this.height * (0.25 + Math.random() * 0.75)
        : this.height + 24 + Math.random() * 40;
      particle.vy = -(5 + Math.random() * 10) * speed;
      particle.vx = 0;
      particle.size = (5 + Math.random() * 6) * (0.6 + particle.depth * 0.4);
      particle.phase = Math.random() * Math.PI * 2;
      particle.freq = 0.14 + Math.random() * 0.2;
      particle.amp = 26 + Math.random() * 42;
      particle.twinkle = 0.3 + Math.random() * 0.45; // 呼吸频率
    } else {
      particle.sprite = this.sprites.stars[Math.floor(Math.random() * this.sprites.stars.length)];
      particle.depth = 0.3 + Math.random() * 0.7;
      particle.x = Math.random() * this.width;
      particle.y = initial ? Math.random() * this.height : -16 - Math.random() * 40;
      particle.vx = (Math.random() - 0.5) * 5 * speed;
      particle.vy = (3.5 + Math.random() * 9) * speed * (0.4 + particle.depth * 0.6);
      particle.size = (2.4 + Math.random() * 4.4) * (0.55 + particle.depth * 0.45);
      particle.phase = Math.random() * Math.PI * 2;
      particle.freq = 0.2 + Math.random() * 0.3;
      particle.amp = 8 + Math.random() * 14;
      particle.twinkle = 0.5 + Math.random() * 0.9;
    }
    return particle;
  }

  private stepAmbient(dt: number) {
    const target = this.ambientTarget();
    let current = 0;
    for (const particle of this.particles) {
      if (particle.active && particle.ambient) current += 1;
    }
    if (current < target) this.spawnAmbient(false);

  }

  /* ---------------- 主循环 ---------------- */

  private resumeLoop() {
    if (!this.running || this.rafId || !this.ctx) return;
    this.lastFrame = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.lastFrame) / 1000 || 0.016);
      this.lastFrame = now;
      this.time += dt;
      this.frame(dt);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private pauseLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private frame(dt: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height);
    let ambientAlive = 0;
    let burstAlive = 0;

    for (const particle of this.particles) {
      if (!particle.active) continue;
      const lifeRatio = particle.maxLife === Infinity ? 1 : particle.life / particle.maxLife;

      if (!particle.ambient) {
        // 阻力按指数衰减，与帧率无关
        const dragFactor = Math.pow(1 - Math.min(0.9, particle.drag * dt), 1);
        particle.vx *= dragFactor;
        particle.vy = particle.vy * dragFactor + particle.gravity * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.life -= dt;
        if (particle.life <= 0) {
          particle.active = false;
          continue;
        }
        burstAlive += 1;
      } else {
        ambientAlive += 1;
        particle.x += particle.vx * dt + Math.sin(this.time * particle.freq + particle.phase) * particle.amp * dt;
        particle.y += particle.vy * dt;
        particle.rotation += particle.rotationSpeed * dt;
        particle.spin += particle.spinSpeed * dt;
        const margin = 80;
        if (
          particle.y < -margin ||
          particle.y > this.height + margin ||
          particle.x < -margin ||
          particle.x > this.width + margin
        ) {
          particle.active = false;
          continue;
        }
      }

      const sprite = particle.sprite;
      if (!sprite) continue;

      let alpha = 1;
      if (!particle.ambient) {
        // 前段快速淡入（爱心弹出），后段按曲线淡出
        const ageRatio = 1 - lifeRatio;
        const fadeIn = Math.min(1, ageRatio / 0.12);
        alpha = fadeIn * Math.pow(lifeRatio, particle.fadePower);
        if (particle.twinkle) alpha *= 0.7 + 0.3 * Math.sin(this.time * particle.twinkle + particle.phase);
      } else if (particle.kind === "fly") {
        // 萤火呼吸：多数时间微暗，周期性亮起
        const breath = 0.5 + 0.5 * Math.sin(this.time * particle.twinkle * Math.PI * 2 + particle.phase * 3);
        alpha = 0.1 + 0.85 * Math.pow(breath, 2.4);
      } else if (particle.kind === "star") {
        alpha = (0.22 + 0.68 * (0.5 + 0.5 * Math.sin(this.time * particle.twinkle * Math.PI * 2 + particle.phase * 5))) * (0.45 + particle.depth * 0.55);
      } else if (particle.kind === "petal") {
        alpha = 0.5 + particle.depth * 0.5;
      }

      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * particle.depth));
      const scale = (particle.size / 22) * (sprite.size / 52);
      const w = sprite.size * scale;
      const h = w;

      if (particle.kind === "petal") {
        // scaleX 摆动模拟 3D 翻转
        const squash = 0.3 + 0.7 * Math.abs(Math.sin(particle.spin));
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.scale(squash, 1);
        ctx.drawImage(sprite.canvas, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else if (particle.rotation) {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.drawImage(sprite.canvas, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(sprite.canvas, particle.x - w / 2, particle.y - h / 2, w, h);
      }
    }

    if (this.config.ambientEffect !== "none") this.stepAmbient(dt);
    else if (ambientAlive === 0 && burstAlive === 0) this.pauseLoop();

    ctx.globalAlpha = 1;
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    if (this.ctx) this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private buildSprites() {
    if (typeof document === "undefined") return;
    const hue = this.hue;
    const accent = hsl(hue, 72, 64);
    const fireworkColors = FIREWORK_HUES.map((h) => hsl(h, 90, 66));
    this.sprites = {
      sparks: fireworkColors.map((color) => sparkSprite(color)),
      embers: [hsl(hue, 85, 70), hsl(38, 96, 64), hsl(20, 92, 62)].map((color) => sparkSprite(color)),
      stars: ["#fff8e1", accent, hsl(46, 100, 78)].map((color) => starSprite(color)),
      hearts: [
        heartSprite(hsl(348, 84, 66), hsl(348, 90, 80)),
        heartSprite(hsl(326, 80, 70), hsl(326, 88, 84)),
        heartSprite(hsl(hue, 70, 68), hsl(hue, 80, 82)),
      ],
      petals: [
        petalSprite("rgba(255,235,240,0.94)", "rgba(255,183,205,0.88)"),
        petalSprite("rgba(255,245,248,0.95)", withAlpha(accent, 0.62)),
        petalSprite("rgba(255,224,232,0.92)", "rgba(250,168,196,0.85)"),
      ],
      fly: flySprite(hsl(hue, 90, 72)),
    };
  }
}

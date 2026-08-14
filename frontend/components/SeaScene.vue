<template>
  <div
    ref="rootRef"
    class="sea-scene"
    :class="[`sea-mode-${mode}`, `sea-phase-${dayPhase}`, { 'sea-scene-disabled': disabled }]"
  >
    <template v-if="mode === 'gl'">
      <canvas ref="glCanvasRef" class="sea-canvas sea-canvas-gl" />
    </template>
    <template v-else>
      <canvas ref="canvasRef" class="sea-canvas" />
      <span v-if="splash" class="sea-splash-text">{{ splash }}</span>
      <div class="sea-bottles">
        <span
          v-for="b in ambientBottles"
          :key="b.id"
          class="sea-bottle-item"
          :class="`seed-${b.seed % 6}`"
          :data-id="b.id"
          :style="bottleStyle(b)"
          title="漂在时光海上的瓶子"
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
          <i class="bottle-initial"><Icon name="ph:seal-check-fill" /></i>
        </span>
      </div>
    </template>
    <button
      type="button"
      class="sea-fish-control"
      :disabled="disabled"
      @click="fishRandom"
    >
      <span class="fish-icon"><Icon :name="disabled ? 'ph:circle-notch-bold' : 'ph:anchor-simple-bold'" :spin="disabled" /></span>
      <span>
        <strong>打捞一封来信</strong>
        <small>让潮汐替你选择一封陌生来信</small>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import * as THREE from "three";
import { gsap } from "gsap";

interface AmbientBottle {
  id: string;
  seed: number;
}

const ambientBottles: AmbientBottle[] = [
  { id: "ambient-1", seed: 137 },
  { id: "ambient-2", seed: 283 },
  { id: "ambient-3", seed: 419 },
  { id: "ambient-4", seed: 641 },
  { id: "ambient-5", seed: 857 },
];

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  { disabled: false },
);
const emit = defineEmits<{ (e: "fish"): void }>();

const rootRef = ref<HTMLDivElement>();
const canvasRef = ref<HTMLCanvasElement>();
const glCanvasRef = ref<HTMLCanvasElement>();
const splash = ref("");
let splashTimer: ReturnType<typeof setTimeout> | null = null;

const mode = ref<"gl" | "canvas">("canvas");
let reduceMotion = false;

function mulberry(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function bottleStyle(b: AmbientBottle) {
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

// =====================================================================
// GL 海面（THREE.js 低多边形场景）
// =====================================================================
type WeatherKind = "sunny" | "cloudy" | "overcast" | "fog" | "rain" | "snow" | "storm" | "unknown";
type DayPhase = "dawn" | "day" | "sunset" | "night";

function currentDayPhase(): DayPhase {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "sunset";
  return "night";
}

const dayPhase = ref<DayPhase>(currentDayPhase());
let phaseTimer: ReturnType<typeof setInterval> | null = null;

const PHASE_SKY: Record<DayPhase, { top: string; mid: string; bot: string; stars: number; moon?: boolean; sun?: boolean }> = {
  dawn: { top: "#52678e", mid: "#d79578", bot: "#f2c99f", stars: 14, sun: true },
  day: { top: "#4794df", mid: "#8bc6ea", bot: "#d9edf4", stars: 0, sun: true },
  sunset: { top: "#384a74", mid: "#c96764", bot: "#f0b878", stars: 8, sun: true },
  night: { top: "#040812", mid: "#101a34", bot: "#26385a", stars: 72, moon: true },
};

const SKY_THEME: Record<WeatherKind, { top: string; bot: string; sun?: boolean }> = {
  sunny: { top: "#4a9bff", bot: "#d2ebff", sun: true },
  cloudy: { top: "#7fa8d4", bot: "#d6e4f0" },
  overcast: { top: "#5f7596", bot: "#c2ccd6" },
  fog: { top: "#9aa5b3", bot: "#dadfe4" },
  rain: { top: "#4c6688", bot: "#aabccc" },
  snow: { top: "#8fb3d6", bot: "#e6f1fb" },
  storm: { top: "#3a3355", bot: "#8f8aa8" },
  unknown: { top: "#4a9bff", bot: "#d2ebff", sun: true },
};

const SEA_THEME: Record<WeatherKind, { deep: string; shallow: string; foam: string }> = {
  sunny: { deep: "#0a3d8c", shallow: "#2f7fd1", foam: "#dceeff" },
  cloudy: { deep: "#0d3a78", shallow: "#3d7bbd", foam: "#cfe0f2" },
  overcast: { deep: "#12315d", shallow: "#40648f", foam: "#b7c4d4" },
  fog: { deep: "#2c4a63", shallow: "#6d8aa3", foam: "#cdd6dd" },
  rain: { deep: "#0e2c50", shallow: "#35648f", foam: "#b8c9dc" },
  snow: { deep: "#24507f", shallow: "#5f8cb8", foam: "#e6f0fa" },
  storm: { deep: "#131a3a", shallow: "#334372", foam: "#8f9cbb" },
  unknown: { deep: "#0a3d8c", shallow: "#2f7fd1", foam: "#dceeff" },
};

const LIGHT_THEME: Record<WeatherKind, { dir: number; amb: number; tint: string }> = {
  sunny: { dir: 1.35, amb: 0.55, tint: "#fff2d6" },
  cloudy: { dir: 1.0, amb: 0.5, tint: "#ffffff" },
  overcast: { dir: 0.75, amb: 0.45, tint: "#dfe6f0" },
  fog: { dir: 0.8, amb: 0.5, tint: "#e8eef4" },
  rain: { dir: 0.6, amb: 0.42, tint: "#c9d6e6" },
  snow: { dir: 1.05, amb: 0.55, tint: "#ffffff" },
  storm: { dir: 0.5, amb: 0.4, tint: "#b6b3d4" },
  unknown: { dir: 1.35, amb: 0.55, tint: "#fff2d6" },
};

let renderer: THREE.WebGLRenderer | null = null;
let glScene: THREE.Scene | null = null;
let glCamera: THREE.PerspectiveCamera | null = null;
let glRafId = 0;
let glClock = 0;
let seaMesh: THREE.Mesh | null = null;
let skyTexture: THREE.CanvasTexture | null = null;
let sunMesh: THREE.Mesh | null = null;
let foamStop: THREE.Group | null = null;
let sandMesh: THREE.Mesh | null = null;
let shallowMesh: THREE.Mesh | null = null;
let sandTexture: THREE.CanvasTexture | null = null;
let cloudTexture: THREE.CanvasTexture | null = null;
let dirLight: THREE.DirectionalLight | null = null;
let ambLight: THREE.AmbientLight | null = null;
let weatherParticles: THREE.Points | null = null;
let cloudGroup: THREE.Group | null = null;
const glBottles = new Map<string, THREE.Group>();
const glAnimated = new Set<string>();
const waterTweens = new Map<string, gsap.core.Tween[]>();

const SEA_WIDTH = 22;
const SEA_DEPTH = 9;
const SEA_SEG_X = 96;
const SEA_SEG_Z = 42;
const SEA_Y = 0;

function waveY(x: number, z: number, t: number) {
  const w =
    Math.sin(x * 1.1 + t * 1.5) * 0.14 +
    Math.sin(x * 0.6 - t * 0.9 + z * 0.7) * 0.18 +
    Math.sin(z * 1.4 + t * 0.7) * 0.08;
  return w;
}

function makeSkyTexture(kind: WeatherKind): THREE.CanvasTexture {
  const weather = SKY_THEME[kind] ?? SKY_THEME.unknown;
  const phase = PHASE_SKY[dayPhase.value];
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 512;
  const ctx = cv.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, dayPhase.value === "day" ? weather.top : phase.top);
  grad.addColorStop(0.58, phase.mid);
  grad.addColorStop(1, dayPhase.value === "day" ? weather.bot : phase.bot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);
  const random = mulberry(20260814);
  for (let i = 0; i < phase.stars; i += 1) {
    const x = random() * 1024;
    const y = 18 + random() * 260;
    const r = 0.7 + random() * 1.7;
    ctx.fillStyle = `rgba(244,248,255,${0.28 + random() * 0.68})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (phase.sun) {
    const sunX = dayPhase.value === "sunset" ? 760 : dayPhase.value === "dawn" ? 710 : 790;
    const sunY = dayPhase.value === "sunset" ? 170 : dayPhase.value === "dawn" ? 150 : 92;
    const glow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 118);
    glow.addColorStop(0, "rgba(255,248,220,.95)");
    glow.addColorStop(0.24, "rgba(255,221,160,.48)");
    glow.addColorStop(1, "rgba(255,244,200,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 128, sunY - 128, 256, 256);
    ctx.fillStyle = dayPhase.value === "sunset" ? "#ffd39a" : "#fff6d2";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  if (phase.moon) {
    const moonX = 782;
    const moonY = 104;
    const glow = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 96);
    glow.addColorStop(0, "rgba(225,236,255,.5)");
    glow.addColorStop(1, "rgba(188,210,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(moonX - 105, moonY - 105, 210, 210);
    ctx.fillStyle = "#eef3ff";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 31, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(151,168,205,.22)";
    [[-9, -7, 5], [10, 7, 4], [5, -13, 3]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(moonX + x, moonY + y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildSeaGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(SEA_WIDTH, SEA_DEPTH, SEA_SEG_X, SEA_SEG_Z);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function makeSeaShader() {
  return {
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(SEA_THEME.sunny.deep) },
      uShallow: { value: new THREE.Color(SEA_THEME.sunny.shallow) },
      uFoam: { value: new THREE.Color(SEA_THEME.sunny.foam) },
    },
    vertexShader: `
      uniform float uTime;
      varying float vH;
      varying vec3 vWorld;
      void main() {
        float w = sin(position.x * 1.1 + uTime * 1.5) * 0.14
                + sin(position.x * 0.6 - uTime * 0.9 + position.z * 0.7) * 0.18
                + sin(position.z * 1.4 + uTime * 0.7) * 0.08;
        vec3 pos = position + vec3(0.0, w, 0.0);
        vH = w;
        vWorld = (modelMatrix * vec4(pos, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uFoam;
      varying float vH;
      varying vec3 vWorld;
      void main() {
        float f = smoothstep(-0.3, 0.35, vH);
        vec3 col = mix(uDeep, uShallow, f);
        float foam = smoothstep(0.16, 0.34, vH) * 0.7;
        col = mix(col, uFoam, foam);
        // 简单镜面高光
        float spark = pow(max(0.0, sin(vWorld.x * 2.1 + vWorld.z * 1.3) * sin(vWorld.z * 3.7 - vWorld.x * 1.9)), 6.0);
        col += vec3(0.9, 0.95, 1.0) * spark * 0.28;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  };
}

function buildBottleMesh(seed: number): THREE.Group {
  const group = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#a9d3ff",
    transparent: true,
    opacity: 0.42,
    roughness: 0.18,
    metalness: 0.05,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const cork = new THREE.MeshStandardMaterial({ color: "#a8784a", roughness: 0.9 });
  const scroll = new THREE.MeshStandardMaterial({ color: "#f2ead6", roughness: 0.8 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.85, 20), glass);
  body.position.y = 0.05;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 0.22, 16), glass);
  neck.position.y = 0.58;
  const corkMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.14, 16), cork);
  corkMesh.position.y = 0.68;
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.5, 16), scroll);
  paper.position.y = 0.05;
  paper.rotation.y = 0.6;
  group.add(body, neck, corkMesh, paper);
  group.userData = { seed };
  return group;
}

function normalizeBottlePos(seed: number) {
  const rand = mulberry(seed * 31 + 7);
  return {
    x: (rand() - 0.5) * (SEA_WIDTH - 4),
    z: (rand() - 0.5) * (SEA_DEPTH - 4.6) - 0.6,
    rot: rand() * Math.PI * 2,
    s: 0.95 + rand() * 0.5,
  };
}

function rebuildGlBottles() {
  if (!glScene) return;
  for (const g of glBottles.values()) {
    glScene.remove(g);
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m.dispose());
      }
    });
  }
  glBottles.clear();
  glAnimated.clear();
  for (const b of ambientBottles) {
    const g = buildBottleMesh(b.seed);
    const p = normalizeBottlePos(b.seed);
    g.position.set(p.x, waveY(p.x, p.z, glClock), p.z);
    g.rotation.y = p.rot;
    g.scale.setScalar(p.s);
    glScene.add(g);
    glBottles.set(b.id, g);
  }
}

function makeCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const cloud = context.createRadialGradient(128, 70, 8, 128, 70, 92);
  cloud.addColorStop(0, "rgba(255,255,255,.92)");
  cloud.addColorStop(0.48, "rgba(255,255,255,.62)");
  cloud.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = cloud;
  context.fillRect(0, 0, 256, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeSandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#ead8af");
  gradient.addColorStop(0.5, "#d9bd8c");
  gradient.addColorStop(1, "#c9a36f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 256);
  const random = mulberry(701);
  for (let i = 0; i < 420; i += 1) {
    const alpha = 0.06 + random() * 0.11;
    context.fillStyle = random() > 0.48 ? `rgba(255,247,221,${alpha})` : `rgba(112,76,43,${alpha})`;
    context.beginPath();
    context.ellipse(random() * 512, random() * 256, 0.5 + random() * 1.1, 0.35 + random() * 0.7, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 1.2);
  return texture;
}

function buildFoamLines(): THREE.Group {
  const group = new THREE.Group();
  for (let layer = 0; layer < 3; layer += 1) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i += 1) {
      const x = -SEA_WIDTH * 0.72 + (i / 96) * SEA_WIDTH * 1.44;
      points.push(new THREE.Vector3(x, 0.025 + layer * 0.007, 3.15 + layer * 0.2));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: layer === 0 ? "#ffffff" : "#dceeff",
      transparent: true,
      opacity: 0.62 - layer * 0.16,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.userData = { layer };
    group.add(line);
  }
  return group;
}

function buildCloud(count: number, color: string): THREE.Group {
  const group = new THREE.Group();
  const rand = mulberry(2026 + count);
  for (let i = 0; i < count; i++) {
    const material = new THREE.SpriteMaterial({
      map: cloudTexture,
      color,
      transparent: true,
      opacity: 0.42 + rand() * 0.25,
      depthWrite: false,
    });
    const cloud = new THREE.Sprite(material);
    cloud.position.set(rand() * 20 - 10, 3.4 + rand() * 1.7, -5 - rand() * 3);
    cloud.scale.set(3.2 + rand() * 3.6, 1.15 + rand() * 1.2, 1);
    group.add(cloud);
  }
  return group;
}

function updateWeatherVisual(kind: WeatherKind) {
  if (!glScene || !seaMesh) return;
  const sky = SKY_THEME[kind] ?? SKY_THEME.unknown;
  const sea = SEA_THEME[kind] ?? SEA_THEME.unknown;
  const light = LIGHT_THEME[kind] ?? LIGHT_THEME.unknown;

  if (skyTexture) skyTexture.dispose();
  skyTexture = makeSkyTexture(kind);
  glScene.background = skyTexture;

  const uniforms = (seaMesh.material as THREE.ShaderMaterial).uniforms;
  uniforms.uDeep.value.set(sea.deep);
  uniforms.uShallow.value.set(sea.shallow);
  uniforms.uFoam.value.set(sea.foam);

  if (dirLight) {
    dirLight.color.set(light.tint);
    dirLight.intensity = light.dir;
  }
  if (ambLight) ambLight.intensity = light.amb;

  if (sunMesh) {
    // 阳光无限远处方向随天气微调（仅色调变更即可）
  }

  if (cloudGroup) {
    glScene.remove(cloudGroup);
    cloudGroup.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) (mesh.material as THREE.Material).dispose();
    });
    cloudGroup = null;
  }
  let cloudN = 0;
  if (kind === "cloudy") cloudN = 4;
  else if (kind === "overcast" || kind === "fog") cloudN = 3;
  else if (kind === "snow") cloudN = 3;
  else if (kind === "rain" || kind === "storm") cloudN = 2;
  else cloudN = 1;
  cloudGroup = buildCloud(cloudN, kind === "storm" ? "#565070" : kind === "overcast" || kind === "rain" ? "#7f96b2" : "#ffffff");
  glScene.add(cloudGroup);

  rebuildWeatherParticles(kind);
}

function rebuildWeatherParticles(kind: WeatherKind) {
  if (!glScene) return;
  if (weatherParticles) {
    glScene.remove(weatherParticles);
    weatherParticles.geometry.dispose();
    (weatherParticles.material as THREE.Material).dispose();
    weatherParticles = null;
  }
  if (kind !== "rain" && kind !== "snow" && kind !== "storm") return;
  const isRain = kind === "rain" || kind === "storm";
  const count = isRain ? 260 : 160;
  const positions = new Float32Array(count * 3);
  const rand = mulberry(kind === "storm" ? 99 : 7);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = rand() * SEA_WIDTH - SEA_WIDTH / 2;
    positions[i * 3 + 1] = rand() * 7 - 1;
    positions[i * 3 + 2] = rand() * 9 - 4.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: isRain ? "#cfe0ff" : "#ffffff",
    size: isRain ? 0.06 : 0.09,
    transparent: true,
    opacity: isRain ? 0.75 : 0.95,
    depthWrite: false,
    sizeAttenuation: true,
  });
  weatherParticles = new THREE.Points(geo, mat);
  weatherParticles.userData = { isRain, speeds: Array.from({ length: count }, (_, i) => 1.6 + ((i * 7) % 13) / 10) };
  glScene.add(weatherParticles);
}

function initGl(): boolean {
  const canvas = glCanvasRef.value;
  const root = rootRef.value;
  if (!canvas || !root) return false;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch {
    return false;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(root.clientWidth, root.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dayPhase.value === "night" ? 0.82 : 1.02;

  glScene = new THREE.Scene();
  glScene.fog = new THREE.Fog(0x9db9d9, 14, 30);
  glCamera = new THREE.PerspectiveCamera(58, root.clientWidth / root.clientHeight, 0.1, 60);
  glCamera.position.set(0, 2.75, 7.8);
  glCamera.lookAt(0, -0.22, -1.2);

  cloudTexture = makeCloudTexture();
  sandTexture = makeSandTexture();

  const seaGeo = buildSeaGeometry();
  seaMesh = new THREE.Mesh(seaGeo, new THREE.ShaderMaterial(makeSeaShader()));
  seaMesh.position.y = SEA_Y;
  seaMesh.receiveShadow = false;
  glScene.add(seaMesh);

  // 沙滩（近前景，向镜头倾斜）
  const sandGeo = new THREE.PlaneGeometry(SEA_WIDTH * 1.65, 2.2, 32, 8);
  sandGeo.rotateX(-Math.PI / 2);
  sandMesh = new THREE.Mesh(
    sandGeo,
    new THREE.MeshStandardMaterial({
      color: "#ead9b5",
      map: sandTexture,
      roughness: 0.88,
      transparent: true,
      opacity: 0.96,
    }),
  );
  sandMesh.rotation.x = -0.05;
  sandMesh.position.set(0, -0.25, 4.45);
  glScene.add(sandMesh);

  // 浅水过渡带（近端浅色海水）
  const shallowGeo = new THREE.PlaneGeometry(SEA_WIDTH * 1.55, 1.2, 6, 2);
  shallowGeo.rotateX(-Math.PI / 2);
  shallowMesh = new THREE.Mesh(
    shallowGeo,
    new THREE.MeshStandardMaterial({
      color: "#bfe0f5",
      roughness: 0.6,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
    }),
  );
  shallowMesh.position.set(0, -0.03, 3.75);
  glScene.add(shallowMesh);

  // 浪花泡沫带（浅水与深水分界）
  foamStop = buildFoamLines();
  glScene.add(foamStop);

  dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(-4, 7, 5);
  glScene.add(dirLight);
  ambLight = new THREE.AmbientLight(0xffffff, 0.5);
  glScene.add(ambLight);

  updateWeatherVisual("unknown");
  rebuildGlBottles();

  glClock = 0;
  glRafId = requestAnimationFrame(glLoop);
  return true;
}

function glLoop() {
  if (!renderer || !glScene || !glCamera || !seaMesh) return;
  glClock += 0.016;
  (seaMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = glClock;

  const t = glClock;
  // 瓶子漂浮
  for (const [id, g] of glBottles) {
    if (glAnimated.has(id)) continue; // 动画中
    const p = normalizeBottlePos(g.userData.seed);
    g.position.y = waveY(p.x, p.z, t) + 0.02;
    g.rotation.y += 0.0016;
    g.rotation.z = Math.sin(t * 0.8 + g.position.x) * 0.05;
  }

  // 天气粒子
  if (weatherParticles) {
    const attr = weatherParticles.geometry.getAttribute("position") as THREE.BufferAttribute;
    const pos = attr.array as Float32Array;
    const { isRain, speeds } = weatherParticles.userData;
    const fall = isRain ? 8.5 : 1.9;
    for (let i = 0; i < pos.length / 3; i++) {
      let y = pos[i * 3 + 1] - fall * 0.016 * speeds[i];
      if (y < -0.9) {
        y = 6.4;
        pos[i * 3] = (Math.random() - 0.5) * SEA_WIDTH;
      }
      pos[i * 3 + 1] = y;
      if (!isRain) pos[i * 3] += 0.22 * 0.016;
    }
    attr.needsUpdate = true;
  }

  // 云漂移
  if (cloudGroup) {
    cloudGroup.children.forEach((m, i) => {
      m.position.x += 0.05 * 0.02 * (i % 2 === 0 ? 1 : -1);
      if (m.position.x > 12) m.position.x = -12;
      if (m.position.x < -12) m.position.x = 12;
    });
  }

  if (foamStop) {
    foamStop.children.forEach((child) => {
      const line = child as THREE.Line;
      const position = line.geometry.getAttribute("position") as THREE.BufferAttribute;
      const layer = Number(line.userData.layer || 0);
      for (let i = 0; i < position.count; i += 1) {
        const x = position.getX(i);
        position.setZ(i, 3.12 + layer * 0.2 + Math.sin(x * 0.52 + t * (0.72 + layer * 0.08)) * (0.055 + layer * 0.018));
      }
      position.needsUpdate = true;
    });
  }

  renderer.render(glScene, glCamera);
  if (!reduceMotion) glRafId = requestAnimationFrame(glLoop);
}

function glFishAnim(group: THREE.Group) {
  launching = true;
  const bottleId = [...glBottles.keys()].find((id) => glBottles.get(id) === group);
  if (bottleId) glAnimated.add(bottleId);
  if (reduceMotion) {
    group.removeFromParent();
    launching = false;
    rebuildGlBottles();
    emit("fish");
    return;
  }
  const target = { x: 9.4, y: 3.8, z: -4.6 };
  const tl = gsap.timeline({
    onComplete: () => {
      launching = false;
      rebuildGlBottles();
      emit("fish");
    },
  });
  tl.to(group.position, { y: 2.2, duration: 0.5, ease: "power2.out" }, 0)
    .to(group.rotation, { x: 2.4, z: 2.6, duration: 0.5, ease: "power2.out" }, 0)
    .to(group.position, { x: target.x, y: target.y, z: target.z, duration: 0.62, ease: "power1.in" }, 0.42)
    .to(group.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.3, ease: "power1.in" }, 0.78);
}

function glLaunch(cb?: () => void) {
  const root = rootRef.value;
  if (!root || !glScene) {
    cb?.();
    return;
  }
  if (reduceMotion) {
    cb?.();
    return;
  }
  if (launching) {
    cb?.();
    return;
  }
  launching = true;
  const seed = (Date.now() % 997) + 53;
  const g = buildBottleMesh(seed);
  const rand = mulberry(seed);
  const targetX = (rand() - 0.5) * (SEA_WIDTH - 4);
  const targetZ = (rand() - 0.5) * (SEA_DEPTH - 4.6) - 0.6;
  g.position.set(SEA_WIDTH / 2 + 2.6, 4.6, 2.8);
  g.rotation.z = 0.9;
  glScene.add(g);
  // 水花（落点）
  const splashRing = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.62, 10),
    new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
  );
  splashRing.rotation.x = -Math.PI / 2;

  const tl = gsap.timeline({
    onComplete: () => {
      glScene!.remove(g);
      g.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) (mesh.material as THREE.Material).dispose();
      });
      launching = false;
      cb?.();
    },
  });
  tl.to(g.position, { x: 0.4, z: 0.5, y: 1.7, duration: 1.0, ease: "power1.in" }, 0)
    .to(g.position, { y: waveY(0.4, 0.5, glClock), duration: 0.26, ease: "power2.in" }, 1.0)
    .add(() => {
      if (!glScene) return;
      splashRing.position.set(0.4, 0.02, 0.5);
      glScene.add(splashRing);
      gsap.fromTo(
        splashRing.scale,
        { x: 0.4, y: 0.4, z: 0.4 },
        { x: 1.4, y: 1.4, z: 1.4, duration: 0.7, ease: "power2.out" },
      );
      gsap.to(splashRing.material, { opacity: 0, duration: 0.7 }, 0);
      setTimeout(() => {
        glScene?.remove(splashRing);
        splashRing.geometry.dispose();
        (splashRing.material as THREE.Material).dispose();
      }, 760);
    }, 1.02)
    .to(g.position, { x: targetX, z: targetZ, duration: 1.25, ease: "power2.out" }, 1.15)
    .to(g.rotation, { z: 0, y: rand() * Math.PI * 2, duration: 1.25, ease: "power2.out" }, 1.15);

}

function disposeGl() {
  cancelAnimationFrame(glRafId);
  glRafId = 0;
  if (renderer) {
    renderer.domElement.style.cursor = "default";
  }
  if (glScene) {
    glScene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m.dispose());
      }
    });
    // 逐帧生成的玻璃材质已随 traverse 释放
  }
  if (skyTexture) skyTexture.dispose();
  if (sandTexture) sandTexture.dispose();
  if (cloudTexture) cloudTexture.dispose();
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  glScene = null;
  glCamera = null;
  seaMesh = null;
  sunMesh = null;
  foamStop = null;
  sandMesh = null;
  shallowMesh = null;
  dirLight = null;
  ambLight = null;
  weatherParticles = null;
  cloudGroup = null;
  sandTexture = null;
  cloudTexture = null;
}

// =====================================================================
// Canvas 降级海面（低端设备 / WebGL 不可用）
// =====================================================================
let ctx: CanvasRenderingContext2D | null = null;
let rafId = 0;
let canvasResizeObserver: ResizeObserver | null = null;
const particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; size: number }> = [];

function resizeCanvas() {
  const root = rootRef.value;
  const canvas = canvasRef.value;
  if (!root || !canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, root.clientWidth * dpr);
  canvas.height = Math.max(1, root.clientHeight * dpr);
  ctx = canvas.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawFrame(t: number) {
  const canvas = canvasRef.value;
  if (!ctx || !canvas) return;
  const w = canvas.width / Math.min(window.devicePixelRatio || 1, 2);
  const h = canvas.height / Math.min(window.devicePixelRatio || 1, 2);
  ctx.clearRect(0, 0, w, h);
  const kind = weatherKind.value;
  const weather = SKY_THEME[kind] ?? SKY_THEME.unknown;
  const phase = PHASE_SKY[dayPhase.value];
  const skyGradient = ctx.createLinearGradient(0, 0, 0, h);
  skyGradient.addColorStop(0, dayPhase.value === "day" ? weather.top : phase.top);
  skyGradient.addColorStop(0.52, phase.mid);
  skyGradient.addColorStop(1, dayPhase.value === "day" ? weather.bot : phase.bot);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < phase.stars; i += 1) {
    const px = ((i * 83.7 + 19) % 997) / 997 * w;
    const py = 12 + (((i * 47.3 + 11) % 211) / 211) * h * 0.42;
    const radius = 0.55 + (i % 4) * 0.28;
    ctx.fillStyle = `rgba(244,248,255,${0.3 + (i % 7) * 0.085})`;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const celestialX = w * 0.78;
  const celestialY = h * (dayPhase.value === "sunset" ? 0.26 : 0.17);
  if (phase.sun || phase.moon) {
    const glow = ctx.createRadialGradient(celestialX, celestialY, 3, celestialX, celestialY, h * 0.16);
    glow.addColorStop(0, phase.moon ? "rgba(226,237,255,.48)" : "rgba(255,239,188,.62)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(celestialX - h * 0.18, celestialY - h * 0.18, h * 0.36, h * 0.36);
    ctx.fillStyle = phase.moon ? "#eef3ff" : dayPhase.value === "sunset" ? "#ffd19a" : "#fff3c8";
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, h * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }

  const horizon = h * 0.29;
  const seaBottom = h * 0.84;
  const seaGradient = ctx.createLinearGradient(0, horizon, 0, seaBottom);
  seaGradient.addColorStop(0, dayPhase.value === "night" ? "rgba(43,76,126,.66)" : "rgba(91,165,207,.42)");
  seaGradient.addColorStop(0.48, dayPhase.value === "night" ? "rgba(18,55,104,.86)" : "rgba(31,113,171,.72)");
  seaGradient.addColorStop(1, dayPhase.value === "night" ? "rgba(8,34,76,.96)" : "rgba(7,69,132,.88)");
  ctx.fillStyle = seaGradient;
  ctx.fillRect(0, horizon, w, seaBottom - horizon + 8);

  ctx.globalCompositeOperation = "lighter";
  const waveColors = dayPhase.value === "night"
    ? ["rgba(124,168,224,.16)", "rgba(180,208,244,.10)", "rgba(255,255,255,.05)", "rgba(98,142,204,.08)"]
    : ["rgba(160,218,246,.2)", "rgba(218,242,251,.14)", "rgba(255,255,255,.1)", "rgba(91,173,219,.12)"];
  for (let layer = 0; layer < 4; layer += 1) {
    ctx.beginPath();
    ctx.strokeStyle = waveColors[layer];
    ctx.lineWidth = 1.35 - layer * 0.16;
    const amp = 3.8 + layer * 2;
    const speed = 0.00055 + layer * 0.00017;
    const freq = 0.009 + layer * 0.0035;
    for (let x = 0; x <= w; x += 3) {
      const y = horizon + h * (0.08 + layer * 0.125)
        + Math.sin(x * freq + t * speed) * amp
        + Math.sin(x * freq * 1.9 - t * speed * 1.35) * amp * 0.34;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  const sandTop = h * 0.81;
  const sandGradient = ctx.createLinearGradient(0, sandTop, 0, h);
  sandGradient.addColorStop(0, "#ead9b4");
  sandGradient.addColorStop(0.55, "#d8bc8a");
  sandGradient.addColorStop(1, "#c79e68");
  ctx.fillStyle = sandGradient;
  ctx.beginPath();
  ctx.moveTo(0, sandTop + 5);
  ctx.bezierCurveTo(w * 0.22, sandTop - 11, w * 0.38, sandTop + 13, w * 0.58, sandTop + 3);
  ctx.bezierCurveTo(w * 0.75, sandTop - 5, w * 0.87, sandTop + 11, w, sandTop - 3);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  for (let layer = 0; layer < 3; layer += 1) {
    ctx.strokeStyle = `rgba(255,255,255,${0.72 - layer * 0.2})`;
    ctx.lineWidth = 1.8 - layer * 0.35;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const y = sandTop - 3 - layer * 5 + Math.sin(x * 0.012 + t * (0.001 + layer * 0.00013)) * (4 + layer * 1.5);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(105,73,43,.15)";
  for (let i = 0; i < 48; i += 1) {
    const px = (i * 83.37 + 17) % w;
    const py = sandTop + 13 + ((i * 29.17) % Math.max(18, h - sandTop - 16));
    ctx.beginPath();
    ctx.ellipse(px, py, 0.55 + (i % 3) * 0.35, 0.35 + (i % 2) * 0.22, i * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

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
      const b = ambientBottles.find((x) => x.id === id);
      if (!b) return;
      el.classList.add("is-animated");
      startFloat(el, b.seed);
    });
}

function onClickBottle(b: AmbientBottle) {
  if (props.disabled || launching) return;
  const el = rootRef.value?.querySelector<HTMLElement>(`.sea-bottle-item[data-id="${b.id}"]`);
  if (!el) return;
  if (reduceMotion) {
    emit("fish");
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
      emit("fish");
    },
  });
  tl.to(el, { y: "-=70", rotation: "+=160", duration: 0.55, ease: "power2.in" }, 0)
    .to(el, { scale: 0.01, opacity: 0, duration: 0.28, ease: "power1.in" }, 0.55)
    .add(() => burst(rect.left - rootRect.left + rect.width / 2, rect.top - rootRect.top - 26, 22), 0.6);
}

let fishCursor = 0;
function fishRandom() {
  if (props.disabled || launching) return;
  const bottle = ambientBottles[fishCursor % ambientBottles.length];
  fishCursor += 1;
  if (mode.value === "gl") {
    const group = glBottles.get(bottle.id);
    if (group) glFishAnim(group);
    else emit("fish");
    return;
  }
  onClickBottle(bottle);
}

function canvasLaunch(cb?: () => void) {
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

function launch(cb?: () => void) {
  if (mode.value === "gl") glLaunch(cb);
  else canvasLaunch(cb);
}

const { weatherKind } = useWeather();

watch(weatherKind, (kind) => {
  if (mode.value === "gl") updateWeatherVisual(kind);
}, { immediate: true });

watch(dayPhase, () => {
  if (renderer) renderer.toneMappingExposure = dayPhase.value === "night" ? 0.82 : 1.02;
  if (mode.value === "gl") updateWeatherVisual(weatherKind.value);
});

function resizeGl() {
  const root = rootRef.value;
  if (!root || !renderer || !glCamera) return;
  renderer.setSize(root.clientWidth, root.clientHeight);
  glCamera.aspect = root.clientWidth / root.clientHeight;
  glCamera.updateProjectionMatrix();
}

defineExpose({ launch });

onMounted(() => {
  reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (initGl()) {
    mode.value = "gl";
    updateWeatherVisual(weatherKind.value);
    window.addEventListener("resize", resizeGl);
  } else {
    void nextTick().then(() => resizeCanvas());
    if (typeof ResizeObserver !== "undefined" && rootRef.value) {
      canvasResizeObserver = new ResizeObserver(() => resizeCanvas());
      canvasResizeObserver.observe(rootRef.value);
    }
    window.addEventListener("resize", resizeCanvas);
    if (!reduceMotion) rafId = requestAnimationFrame(loop);
    void nextTick().then(animateBottles);
  }
  phaseTimer = setInterval(() => {
    dayPhase.value = currentDayPhase();
  }, 60_000);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  window.removeEventListener("resize", resizeCanvas);
  window.removeEventListener("resize", resizeGl);
  canvasResizeObserver?.disconnect();
  canvasResizeObserver = null;
  floatTweens.forEach((t) => t.kill());
  floatTweens = [];
  if (phaseTimer) clearInterval(phaseTimer);
  phaseTimer = null;
  disposeGl();
});
</script>

<style scoped>
.sea-scene {
  position: relative;
  width: 100%;
  height: clamp(320px, 42vh, 390px);
  overflow: hidden;
  border-radius: 12px;
  background: #417fae;
  box-shadow: inset 0 -22px 48px rgb(4 12 32 / 34%), inset 0 1px 0 rgb(255 255 255 / 18%);
  isolation: isolate;
  user-select: none;
}
.sea-mode-gl {
  background: #7cb5d6;
}
.sea-phase-dawn { background: #8f7b85; }
.sea-phase-day { background: #74b7da; }
.sea-phase-sunset { background: #9a6870; }
.sea-phase-night { background: #0c1830; }
.sea-scene::before {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: linear-gradient(180deg, rgb(255 255 255 / 7%), transparent 34%, rgb(3 14 34 / 8%));
  content: "";
  pointer-events: none;
}
.sea-mode-canvas .sea-canvas {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.sea-canvas-gl {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
}
.sea-bottles {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
}
.sea-bottle-item {
  position: absolute;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: default;
  opacity: 0;
  animation: bottle-in 0.8s ease both;
  width: var(--bw, 34px);
  height: var(--bh, 46px);
  margin-left: calc(var(--bw, 34px) / -2);
  margin-top: calc(var(--bh, 46px) / -2);
  transition: filter 0.25s ease;
  filter: drop-shadow(0 8px 14px rgb(0 8 26 / 45%));
  pointer-events: none;
}
.sea-bottle-item.is-animated {
  opacity: 1;
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
.sea-fish-control {
  position: absolute;
  z-index: 10;
  left: 50%;
  bottom: 18px;
  display: grid;
  min-width: min(260px, calc(100% - 32px));
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 9px 13px 9px 9px;
  border: 1px solid rgb(255 255 255 / 28%);
  border-radius: 8px;
  background: rgb(12 28 48 / 72%);
  box-shadow: 0 12px 32px rgb(1 10 25 / 30%), inset 0 1px 0 rgb(255 255 255 / 12%);
  color: #f5f8fc;
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transform: translateX(-50%);
  transition: border-color .2s ease, background .2s ease, transform .2s ease;
}
.sea-fish-control:hover:not(:disabled) {
  border-color: rgb(255 255 255 / 55%);
  background: rgb(10 35 62 / 82%);
  transform: translateX(-50%) translateY(-2px);
}
.sea-fish-control:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
.sea-fish-control:disabled { cursor: not-allowed; opacity: .58; }
.fish-icon {
  display: grid;
  width: 38px;
  height: 38px;
  border-radius: 7px;
  background: rgb(255 255 255 / 13%);
  color: #d8edff;
  font-size: 1.08rem;
  place-items: center;
}
.sea-fish-control > span:last-child { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.sea-fish-control strong { overflow: hidden; font-size: .7rem; text-overflow: ellipsis; white-space: nowrap; }
.sea-fish-control small { overflow: hidden; color: rgb(226 237 247 / 72%); font-size: .49rem; text-overflow: ellipsis; white-space: nowrap; }
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
@media (max-width: 700px) {
  .sea-scene { height: 300px; }
  .sea-fish-control { bottom: 12px; min-width: min(240px, calc(100% - 24px)); }
}
</style>

<template>
  <div
    ref="rootRef"
    class="sea-scene"
    :class="[`sea-mode-${mode}`, { 'sea-scene-disabled': disabled }]"
  >
    <template v-if="mode === 'gl'">
      <canvas ref="glCanvasRef" class="sea-canvas sea-canvas-gl" />
    </template>
    <template v-else>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import * as THREE from "three";
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

// =====================================================================
// GL 海面（THREE.js 低多边形场景）
// =====================================================================
type WeatherKind = "sunny" | "cloudy" | "overcast" | "fog" | "rain" | "snow" | "storm" | "unknown";

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
let foamStop: THREE.Mesh | null = null;
let sandMesh: THREE.Mesh | null = null;
let shallowMesh: THREE.Mesh | null = null;
let dirLight: THREE.DirectionalLight | null = null;
let ambLight: THREE.AmbientLight | null = null;
let weatherParticles: THREE.Points | null = null;
let cloudGroup: THREE.Group | null = null;
const glBottles = new Map<string, THREE.Group>();
const glBottleData = new Map<string, PeekBottle>();
const glAnimated = new Set<string>();
const waterTweens = new Map<string, gsap.core.Tween[]>();

const SEA_WIDTH = 22;
const SEA_DEPTH = 9;
const SEA_SEG_X = 72;
const SEA_SEG_Z = 30;
const SEA_Y = 0;

function waveY(x: number, z: number, t: number) {
  const w =
    Math.sin(x * 1.1 + t * 1.5) * 0.14 +
    Math.sin(x * 0.6 - t * 0.9 + z * 0.7) * 0.18 +
    Math.sin(z * 1.4 + t * 0.7) * 0.08;
  return Math.floor(w * 4) / 4;
}

function makeSkyTexture(kind: WeatherKind): THREE.CanvasTexture {
  const theme = SKY_THEME[kind] ?? SKY_THEME.unknown;
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 256;
  const ctx = cv.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, theme.top);
  grad.addColorStop(1, theme.bot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  if (theme.sun) {
    const glow = ctx.createRadialGradient(392, 52, 4, 392, 52, 58);
    glow.addColorStop(0, "rgba(255,248,220,.95)");
    glow.addColorStop(0.32, "rgba(255,244,200,.5)");
    glow.addColorStop(1, "rgba(255,244,200,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(316, -24, 152, 152);
    ctx.fillStyle = "#fff8d8";
    ctx.beginPath();
    ctx.arc(392, 52, 22, 0, Math.PI * 2);
    ctx.fill();
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
        w = floor(w * 4.0) / 4.0;
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

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.85, 10), glass);
  body.position.y = 0.05;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 0.22, 8), glass);
  neck.position.y = 0.58;
  const corkMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.14, 8), cork);
  corkMesh.position.y = 0.68;
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.5, 8), scroll);
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
  glBottleData.clear();
  glAnimated.clear();
  for (const b of props.bottles) {
    const g = buildBottleMesh(b.seed);
    const p = normalizeBottlePos(b.seed);
    g.position.set(p.x, waveY(p.x, p.z, glClock), p.z);
    g.rotation.y = p.rot;
    g.scale.setScalar(p.s);
    glScene.add(g);
    glBottles.set(b.id, g);
    glBottleData.set(b.id, b);
  }
}

function buildCloud(count: number, color: string): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false });
  const rand = mulberry(2026 + count);
  for (let i = 0; i < count; i++) {
    const geo = new THREE.CircleGeometry(0.7 + rand(), 3);
    geo.rotateY(rand() * Math.PI);
    geo.rotateX(-0.4 - rand() * 0.5);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(rand() * 20 - 10, 3.4 + rand() * 1.6, -4 - rand() * 3);
    m.scale.x = 1.6 + rand() * 1.4;
    m.rotation.z = rand() * 1.2 - 0.6;
    group.add(m);
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

  glScene = new THREE.Scene();
  glScene.fog = new THREE.Fog(0x9db9d9, 14, 30);
  glCamera = new THREE.PerspectiveCamera(58, root.clientWidth / root.clientHeight, 0.1, 60);
  glCamera.position.set(0, 2.6, 7);
  glCamera.lookAt(0, -0.35, -1);

  const seaGeo = buildSeaGeometry();
  seaMesh = new THREE.Mesh(seaGeo, new THREE.ShaderMaterial(makeSeaShader()));
  seaMesh.position.y = SEA_Y;
  seaMesh.receiveShadow = false;
  glScene.add(seaMesh);

  // 沙滩（近前景，向镜头倾斜）
  const sandGeo = new THREE.PlaneGeometry(SEA_WIDTH * 1.6, 1.7, 8, 3);
  sandGeo.rotateX(-Math.PI / 2);
  sandMesh = new THREE.Mesh(
    sandGeo,
    new THREE.MeshStandardMaterial({
      color: "#e8d9b8",
      roughness: 0.95,
      flatShading: true,
      transparent: true,
      opacity: 0.96,
    }),
  );
  sandMesh.rotation.x = -0.05;
  sandMesh.position.set(0, -0.28, 4.3);
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
      opacity: 0.8,
      flatShading: true,
      depthWrite: false,
    }),
  );
  shallowMesh.position.set(0, -0.03, 3.75);
  glScene.add(shallowMesh);

  // 浪花泡沫带（浅水与深水分界）
  foamStop = new THREE.Mesh(
    new THREE.PlaneGeometry(SEA_WIDTH * 1.5, 0.24, 2, 1),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.5,
      roughness: 0.4,
      emissive: new THREE.Color("#d9ecff"),
      emissiveIntensity: 0.3,
      depthWrite: false,
    }),
  );
  foamStop.rotation.x = -Math.PI / 2;
  foamStop.position.set(0, 0.02, 3.35);
  glScene.add(foamStop);

  // 太阳（远景装饰）
  const sunGeo = new THREE.CircleGeometry(0.62, 8);
  sunMesh = new THREE.Mesh(sunGeo, new THREE.MeshBasicMaterial({ color: "#fff3c0", transparent: true, opacity: 0.85 }));
  sunMesh.position.set(7, 5.2, -10.5);
  sunMesh.lookAt(0, 1.5, 0);
  glScene.add(sunMesh);

  dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(-4, 7, 5);
  glScene.add(dirLight);
  ambLight = new THREE.AmbientLight(0xffffff, 0.5);
  glScene.add(ambLight);

  updateWeatherVisual("unknown");
  rebuildGlBottles();

  renderer.domElement.addEventListener("pointermove", onGlPointerMove);
  renderer.domElement.addEventListener("pointerdown", onGlPointerDown);

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

  renderer.render(glScene, glCamera);
  if (!reduceMotion) glRafId = requestAnimationFrame(glLoop);
}

function glScreenPoint(e: PointerEvent) {
  const canvas = renderer!.domElement;
  const rect = canvas.getBoundingClientRect();
  return new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  );
}

function glHitTest(e: PointerEvent) {
  if (!glScene || !glCamera) return null;
  const vec = glScreenPoint(e);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(vec, glCamera);
  const meshes: THREE.Object3D[] = [];
  for (const g of glBottles.values()) meshes.push(g);
  const hit = raycaster.intersectObjects(meshes, true);
  if (hit.length === 0) return null;
  let node: THREE.Object3D | null = hit[0].object;
  while (node && !glBottles.has(node.id) && node !== glScene) {
    node = node.parent;
  }
  if (!node) return null;
  const bottleId = [...glBottles.keys()].find((id) => glBottles.get(id) === node);
  return bottleId ? glBottles.get(bottleId)! : null;
}

let hoverBottle: THREE.Group | null = null;
function onGlPointerMove(e: PointerEvent) {
  if (!renderer) return;
  const hit = glHitTest(e);
  if (hoverBottle && hoverBottle !== hit) {
    gsap.killTweensOf(hoverBottle.scale);
    const p = normalizeBottlePos(hoverBottle.userData.seed);
    const st = hoverBottle.userData.scale ?? p.s;
    gsap.to(hoverBottle.scale, { x: st, y: st, z: st, duration: 0.3 });
    hoverBottle = null;
  }
  if (hit && hit !== hoverBottle) {
    hoverBottle = hit;
    gsap.killTweensOf(hit.scale);
    const p = normalizeBottlePos(hit.userData.seed);
    hit.userData.scale = hit.scale.x;
    gsap.to(hit.scale, { x: p.s * 1.18, y: p.s * 1.18, z: p.s * 1.18, duration: 0.3 });
  }
  renderer.domElement.style.cursor = hoverBottle && !props.disabled ? "pointer" : "default";
}

function onGlPointerDown(e: PointerEvent) {
  if (props.disabled || launching) return;
  const hit = glHitTest(e);
  if (!hit) return;
  const bottleId = [...glBottles.keys()].find((id) => glBottles.get(id) === hit);
  if (!bottleId) return;
  const data = glBottleData.get(bottleId);
  if (!data) return;
  glFishAnim(hit, data);
}

function glFishAnim(group: THREE.Group, data: PeekBottle) {
  launching = true;
  const bottleId = [...glBottles.keys()].find((id) => glBottles.get(id) === group);
  if (bottleId) glAnimated.add(bottleId);
  if (reduceMotion) {
    group.removeFromParent();
    launching = false;
    emit("fish", data);
    return;
  }
  const target = { x: 9.4, y: 3.8, z: -4.6 };
  const tl = gsap.timeline({
    onComplete: () => {
      launching = false;
      emit("fish", data);
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

  void nextTick().then(() => {
    if (props.bottles.some((b) => b.id === `launch-${seed}`)) return;
  });
}

function disposeGl() {
  cancelAnimationFrame(glRafId);
  glRafId = 0;
  if (renderer) {
    renderer.domElement.removeEventListener("pointermove", onGlPointerMove);
    renderer.domElement.removeEventListener("pointerdown", onGlPointerDown);
  }
  if (glScene) {
    glScene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.geometry) return;
      mesh.geometry.dispose();
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m.dispose());
      }
    });
    // 逐帧生成的玻璃材质已随 traverse 释放
  }
  if (skyTexture) skyTexture.dispose();
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
}

// =====================================================================
// Canvas 降级海面（低端设备 / WebGL 不可用）
// =====================================================================
let ctx: CanvasRenderingContext2D | null = null;
let rafId = 0;
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
  ctx.fillStyle = "rgba(255,255,255,.12)";
  for (let i = 0; i < 7; i++) {
    const px = (i * 137.5 + t * 0.012) % w;
    const py = h * 0.32 + Math.sin(px * 0.02 + t * 0.0011) * 12;
    ctx.beginPath();
    ctx.arc(px, py, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
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

const { weatherKind } = useWeather({ autoRefresh: false });

watch(weatherKind, (kind) => {
  if (mode.value === "gl") updateWeatherVisual(kind);
});

function resizeGl() {
  const root = rootRef.value;
  if (!root || !renderer || !glCamera) return;
  renderer.setSize(root.clientWidth, root.clientHeight);
  glCamera.aspect = root.clientWidth / root.clientHeight;
  glCamera.updateProjectionMatrix();
}

defineExpose({ launch });

watch(
  () => props.bottles.map((b) => b.id).join(","),
  () => {
    if (mode.value === "gl") {
      rebuildGlBottles();
    } else {
      void nextTick().then(animateBottles);
    }
  },
  { immediate: true },
);

onMounted(() => {
  reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (initGl()) {
    mode.value = "gl";
    window.addEventListener("resize", resizeGl);
  } else {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    if (!reduceMotion) rafId = requestAnimationFrame(loop);
    void nextTick().then(animateBottles);
  }
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  window.removeEventListener("resize", resizeCanvas);
  window.removeEventListener("resize", resizeGl);
  floatTweens.forEach((t) => t.kill());
  floatTweens = [];
  disposeGl();
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
.sea-mode-gl {
  background: linear-gradient(180deg, #8fc2f5, #cfe5fb 60%, #cfe5fb);
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
  touch-action: manipulation;
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
  cursor: pointer;
  opacity: 0;
  animation: bottle-in 0.8s ease both;
  width: var(--bw, 34px);
  height: var(--bh, 46px);
  margin-left: calc(var(--bw, 34px) / -2);
  margin-top: calc(var(--bh, 46px) / -2);
  transition: filter 0.25s ease;
  filter: drop-shadow(0 8px 14px rgb(0 8 26 / 45%));
  pointer-events: auto;
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